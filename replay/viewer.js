import { ReplayClock } from './state.js?v=gallery-1';
import { replayCopy } from './copy.js?v=gallery-1';

const root = document.querySelector('#replay');
if (root) initialize().catch((error) => {
  console.error('Replay initialization failed', error);
  const status = root.querySelector('.alf-load-status');
  status.textContent = document.documentElement.lang === 'zh-CN' ? '轨迹数据加载失败，请刷新后重试。' : 'Trajectory data could not load. Please reload to retry.';
});

async function initialize() {
  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => [...root.querySelectorAll(selector)];
  const shell = q('.alf-shell'), stage = q('.alf-stage');
  let language = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  const t = (key) => replayCopy[language][key];
  const episodeURL = new URL('./episodes.json', import.meta.url);
  const manifestURL = new URL('./scene.json', import.meta.url);
  const loadJSON = async (url) => { const response = await fetch(url, { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}: ${url.pathname}`); return response.json(); };
  const gallery = await loadJSON(episodeURL);
  let episode = gallery.episodes.find(item => item.id === gallery.defaultEpisode);
  let manifest = episode.scene;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clock = new ReplayClock(episode, reducedMotion.matches);
  const clocks = new Map([[episode.id, clock]]);
  let loadGeneration = 0;
  let room = null, roomPromise = null, renderState = 'idle', loadPercent = 0;
  let inView = false, frameId = 0, lastTime = 0, returning = null;
  let active = !document.querySelector('#replay-alfworld').hidden, manualPause = false;
  let renderedKey = '', fpsStarted = 0, fpsFrames = 0;
  let visibleStep = -1;
  let fullscreen = false, dragging = null;
  root.dataset.renderState = 'idle';
  q('.alf-step-range').max = String(episode.steps.length);

  // Build only text nodes from the imported log; exported HTML is never inserted.
  const list = q('.alf-actions'); list.replaceChildren();
  const initialButton = document.createElement('button');
  initialButton.type = 'button'; initialButton.className = 'alf-initial-step';
  initialButton.addEventListener('click', () => seek(0));
  q('.alf-trajectory-head').after(initialButton);
  function buildActions() {
    list.replaceChildren();
    episode.steps.forEach((step, index) => {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.className = 'alf-action'; button.dataset.turn = step.turn;
      const number = document.createElement('span'); number.className = 'alf-action-number'; number.textContent = String(index + 1).padStart(2, '0');
      const action = document.createElement('code'); action.textContent = step.rawAction || t('missingAction');
      button.append(number, action); button.addEventListener('click', () => seek(index + 1));
      li.append(button); list.append(li);
    });
    q('.alf-step-range').max = String(episode.steps.length);
    q('.alf-goal-original').textContent = episode.goal;
    q('.alf-before-text').textContent = episode.initialObservation;
    list.scrollTop = 0; visibleStep = -1;
  }
  function populateEpisodes() {
    const picker = q('.alf-episode'); picker.replaceChildren();
    for (const outcome of ['success', 'failure']) {
      const group = document.createElement('optgroup'); group.label = t(outcome);
      gallery.episodes.filter(item => item.outcome === outcome).forEach((item, index) => {
        const option = document.createElement('option'); option.value = item.id;
        option.textContent = `${String(index + 1).padStart(2, '0')} · ${item.label[language]}`;
        group.append(option);
      });
      picker.append(group);
    }
    picker.value = episode.id; picker.setAttribute('aria-label', t('episode'));
    q('.alf-task-goal').textContent = language === 'zh' ? episode.label.zh : episode.goal;
    q('.alf-outcome').textContent = t(episode.outcome);
    q('.alf-outcome').dataset.outcome = episode.outcome;
    shell.dataset.outcome = episode.outcome;
  }
  function selectEpisode(id) {
    if (id === episode.id) return;
    const reloadRoom = renderState !== 'idle';
    manualPause = false;
    clock.pause(); stopFrame(); returning = null; dragging = null; loadGeneration++;
    room?.dispose(); room = null; roomPromise = null;
    q('.alf-canvas')?.remove();
    episode = gallery.episodes.find(item => item.id === id); manifest = episode.scene;
    if (!clocks.has(id)) clocks.set(id, new ReplayClock(episode, reducedMotion.matches));
    clock = clocks.get(id); clock.pause();
    renderState = 'idle'; loadPercent = 0; renderedKey = '';
    q('.alf-speed').value = String(clock.speed);
    buildActions(); populateEpisodes(); updateUI();
    if (reloadRoom) loadRoom();
  }
  q('.alf-episode').addEventListener('change', event => selectEpisode(event.target.value));
  buildActions();

  function applyCopy() {
    qa('[data-replay-copy]').forEach((element) => { element.textContent = t(element.dataset.replayCopy); });
    qa('[data-replay-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.replayLabel)); });
    populateEpisodes();
    qa('.alf-action code').forEach((node,index) => { node.textContent = episode.steps[index].rawAction || t('missingAction'); });
    initialButton.textContent = `00  ${t('initial')}`;
    q('.alf-load-button').textContent = t(renderState === 'error' ? 'retry' : 'enter');
    q('.alf-expand').textContent = t(shell.classList.contains('alf-list-expanded') ? 'collapse' : 'expand');
    q('.alf-fullscreen').textContent = t(fullscreen ? 'exitFullscreen' : 'fullscreen');
    renderedKey = ''; updateUI();
  }

  function updateUI() {
    const key = [episode.id, language, clock.snapshot, clock.stepIndex, clock.phase, clock.playing, renderState, loadPercent].join('|');
    if (key === renderedKey) return;
    renderedKey = key;
    const step = episode.steps[clock.selectedStep];
    root.dataset.snapshot = String(clock.snapshot);
    root.dataset.phase = clock.phase;
    root.dataset.playing = String(clock.playing);
    root.dataset.renderState = renderState;
    q('.alf-play').textContent = t(clock.playing ? 'pause' : clock.snapshot === episode.steps.length && clock.phase === 'rest' ? 'replay' : 'play');
    q('.alf-play').disabled = renderState !== 'ready';
    q('.alf-previous').disabled = clock.snapshot === 0 && clock.phase !== 'action';
    q('.alf-next').disabled = clock.snapshot === episode.steps.length;
    q('.alf-step-range').value = String(clock.phase === 'action' ? clock.stepIndex : clock.snapshot);
    q('.alf-step-counter').textContent = `${clock.phase === 'action' ? clock.stepIndex + 1 : clock.snapshot} / ${episode.steps.length}`;
    initialButton.setAttribute('aria-pressed', String(clock.selectedStep < 0));
    qa('.alf-action').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === clock.selectedStep));
      button.classList.toggle('alf-completed', index < clock.snapshot);
      if (index === clock.selectedStep && index !== visibleStep && list.clientHeight) {
        const bounds = button.getBoundingClientRect(), viewport = list.getBoundingClientRect();
        if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom;
        else if (bounds.top < viewport.top) list.scrollTop -= viewport.top - bounds.top;
      }
    });
    visibleStep = clock.selectedStep;
    const completed = clock.snapshot === episode.steps.length && clock.phase !== 'action';
    q('.alf-held-value').textContent = clock.state.inventory.map(id => `${id}${clock.state.objectStates?.[id] ? ` (${t(clock.state.objectStates[id])})` : ''}`).join(', ') || t('empty');
    q('.alf-current-action').textContent = step ? step.rawAction || t('missingAction') : t('start');
    q('.alf-view-state').textContent = completed ? `${t('ended')} · ${t(episode.outcome)} · ${t('reward')} ${episode.reward.toFixed(1)}`
      : !step ? t('initial') : clock.phase === 'action' ? t('moving') : clock.phase === 'hold' ? t('feedback') : t('observed');
    q('.alf-look-hint').textContent = t(clock.playing ? 'look' : 'looking');
    q('.alf-before-text').textContent = step?.observationBefore || episode.initialObservation;
    q('.alf-after-text').textContent = !step ? t('statusInitial') : clock.phase === 'action' ? t('moving') : step.observationAfter || t('missing');
    q('.alf-model-text').textContent = step?.modelOutput || '';
    q('.alf-model-output').hidden = !step;
    q('.alf-evidence-tag').hidden = !completed || step?.stateEvidence !== 'valid-action-reconstruction';
    q('.alf-log-result').hidden = !completed;
    q('.alf-log-result').textContent = `${t(episode.outcome)} · ${t('reward')} ${episode.reward.toFixed(1)}`;
    q('.alf-caption-current').textContent = step ? `${t('turn')} ${step.turn} · ${t('valid')}: ${String(step.validAction)}` : t('initial');
    q('.alf-load-status').textContent = renderState === 'loading' ? `${t('loading')} · ${loadPercent}%`
      : renderState === 'error' ? t(root.dataset.failure === 'unsupported' ? 'unsupported' : root.dataset.failure === 'context' ? 'contextLost' : 'failed')
      : renderState === 'ready' ? t('ready') : t('source');
    q('.alf-load-button').hidden = renderState === 'loading' || renderState === 'ready';
    q('.alf-load-button').textContent = t(renderState === 'error' ? 'retry' : 'enter');
    q('.alf-load-progress').hidden = renderState !== 'loading';
    q('.alf-load-progress').value = loadPercent;
    q('.alf-canvas')?.setAttribute('aria-label', `${t('reconstruction')}. ${step?.rawAction || t('start')}`);
  }

  async function loadRoom() {
    if (roomPromise) return roomPromise;
    const generation = ++loadGeneration, selectedManifest = manifest;
    renderState = 'loading'; loadPercent = 0; delete root.dataset.failure; updateUI();
    roomPromise = (async () => {
      room?.dispose(); room = null;
      const canvas = document.createElement('canvas'); canvas.className = 'alf-canvas';
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', t('reconstruction'));
      q('.alf-canvas')?.remove(); q('.alf-canvas-host').append(canvas);
      try {
        const { RoomView } = await import('./room.js?v=gallery-1');
        const candidate = await RoomView.create(canvas, selectedManifest, manifestURL, percent => {
          if (generation !== loadGeneration) return;
          loadPercent = percent; updateUI();
        });
        if (generation !== loadGeneration) { candidate.dispose(); return null; }
        room = candidate; room.onDirty = requestDraw;
        canvas.addEventListener('webglcontextlost', event => {
          event.preventDefault(); if (generation !== loadGeneration) return;
          clock.pause(); root.dataset.failure = 'context'; renderState = 'error';
          roomPromise = null; stopFrame(); updateUI();
        });
        bindLook(canvas); renderState = 'ready'; updateUI();
        room.draw(clock); resumeAutomatically(); requestDraw(); return room;
      } catch (error) {
        if (generation !== loadGeneration) return null;
        root.dataset.failure = error.code === 'WEBGL_UNAVAILABLE' ? 'unsupported' : 'load';
        renderState = 'error'; roomPromise = null; clock.pause(); updateUI();
        console.warn('3D replay unavailable:', error.message); return null;
      }
    })();
    return roomPromise;
  }

  function stopFrame() { cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; }
  function requestDraw() {
    if (!frameId && room && renderState === 'ready' && inView && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function frame(now) {
    frameId = 0;
    if (!room || renderState !== 'ready' || !inView || document.hidden) { lastTime = 0; return; }
    const delta = lastTime ? Math.min(.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    if (returning) {
      returning.elapsed += delta;
      const fraction = Math.min(1, returning.elapsed / .35);
      const easing = 1 - fraction * fraction * (3 - 2 * fraction);
      room.lookYaw = returning.yaw * easing; room.lookPitch = returning.pitch * easing;
      if (fraction >= 1) returning = null;
    } else clock.tick(delta);
    updateUI(); room.draw(clock);
    if (clock.playing) {
      if (!fpsStarted) { fpsStarted = now; fpsFrames = 0; }
      fpsFrames++;
      if (now - fpsStarted >= 1500) {
        root.dataset.fps = (fpsFrames * 1000 / (now - fpsStarted)).toFixed(1);
        root.dataset.triangles = String(room.stats.triangles);
        fpsStarted = now; fpsFrames = 0;
      }
    } else { fpsStarted = 0; fpsFrames = 0; }
    if (clock.playing || returning) frameId = requestAnimationFrame(frame);
    else lastTime = 0;
  }

  function pause() { clock.pause(); returning = null; stopFrame(); updateUI(); requestDraw(); }
  function seek(snapshot) {
    manualPause = true;
    clock.seek(snapshot); returning = null;
    if (room) { room.lookYaw = 0; room.lookPitch = 0; }
    stopFrame(); updateUI(); requestDraw();
  }
  function play() {
    if (!room || renderState !== 'ready') return;
    if (clock.reducedMotion) { room.lookYaw = 0; room.lookPitch = 0; }
    else if (Math.abs(room.lookYaw) + Math.abs(room.lookPitch) > .001) returning = { yaw: room.lookYaw, pitch: room.lookPitch, elapsed: 0 };
    clock.play(); lastTime = 0; updateUI(); requestDraw();
  }

  function bindLook(canvas) {
    canvas.addEventListener('pointerdown', (event) => {
      if (clock.playing || renderState !== 'ready') return;
      dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.classList.add('alf-dragging');
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!dragging || dragging.id !== event.pointerId || clock.playing) return;
      room.lookYaw -= (event.clientX - dragging.x) * .004;
      room.lookPitch = Math.max(-.85, Math.min(.85, room.lookPitch - (event.clientY - dragging.y) * .004));
      dragging.x = event.clientX; dragging.y = event.clientY; requestDraw();
    });
    const release = () => { dragging = null; canvas.classList.remove('alf-dragging'); };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  }

  q('.alf-load-button').addEventListener('click', loadRoom);
  q('.alf-play').addEventListener('click', () => { manualPause = clock.playing; clock.playing ? pause() : play(); });
  q('.alf-previous').addEventListener('click', () => seek(clock.phase === 'action' ? clock.stepIndex : clock.snapshot - 1));
  q('.alf-next').addEventListener('click', () => seek(clock.phase === 'action' ? clock.stepIndex + 1 : clock.snapshot + 1));
  q('.alf-step-range').addEventListener('input', (event) => seek(Number(event.target.value)));
  q('.alf-speed').addEventListener('change', (event) => { clock.speed = Number(event.target.value); });
  q('.alf-expand').addEventListener('click', () => {
    const open = shell.classList.toggle('alf-list-expanded');
    q('.alf-expand').setAttribute('aria-expanded', String(open));
    q('.alf-expand').textContent = t(open ? 'collapse' : 'expand');
  });
  if (!shell.requestFullscreen && !shell.webkitRequestFullscreen) q('.alf-fullscreen').hidden = true;
  q('.alf-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.requestFullscreen) await shell.requestFullscreen();
      else shell.webkitRequestFullscreen();
    } catch { /* Fullscreen is optional; the embedded replay remains available. */ }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen = document.fullscreenElement === shell;
    q('.alf-fullscreen').textContent = t(fullscreen ? 'exitFullscreen' : 'fullscreen');
    room?.resize(); requestDraw();
  });
  shell.addEventListener('keydown', (event) => {
    if (/INPUT|SELECT|BUTTON|SUMMARY/.test(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); manualPause = clock.playing; clock.playing ? pause() : play(); }
    else if (event.code === 'ArrowLeft') { event.preventDefault(); seek(clock.snapshot - 1); }
    else if (event.code === 'ArrowRight') { event.preventDefault(); seek(clock.snapshot + 1); }
  });
  function resumeAutomatically() {
    if (!active || !inView || document.hidden) return;
    if (renderState === 'idle') { loadRoom(); return; }
    if (renderState === 'ready' && !manualPause && !reducedMotion.matches && !clock.playing) play();
  }
  new IntersectionObserver(([entry]) => {
    inView = active && entry.isIntersecting && entry.intersectionRatio >= .08;
    if (!inView) { clock.pause(); stopFrame(); updateUI(); }
    else { resumeAutomatically(); requestDraw(); }
  }, { threshold: [0,.08] }).observe(stage);
  document.addEventListener('scope:replaytabchange', (event) => {
    active = event.detail.tab === 'alfworld';
    if (!active) { inView = false; pause(); }
    else resumeAutomatically();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else { resumeAutomatically(); requestDraw(); } });
  document.addEventListener('scope:languagechange', (event) => { language = event.detail.language; applyCopy(); });
  reducedMotion.addEventListener('change', (event) => { clocks.forEach(item => { item.reducedMotion = event.matches; }); });
  window.addEventListener('pagehide', (event) => {
    clock.pause(); stopFrame();
    if (!event.persisted) room?.dispose();
  });
  window.addEventListener('pageshow', (event) => { if (event.persisted) { updateUI(); requestDraw(); } });
  applyCopy();
}
