import { flowCopy } from './copy.js';
import { distillationSignal, pairwiseBonus } from './math.js';

const root = document.querySelector('#method-flow');
if (root) initialize();

function initialize() {
  const section = root.closest('section');
  const q = selector => root.querySelector(selector);
  const qa = selector => [...root.querySelectorAll(selector)];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width: 820px)');
  let language = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  let stage = 0, elapsed = 0, playing = false, ended = false;
  let visible = false, autoplayStarted = false, interacted = false;
  let lastTime = 0, frameId = 0, selected = true;
  const durations = [5000, 6500, 8500, 6000, 6000];
  const keys = ['rollout', 'analyze', 'distill', 'reward', 'update'];
  const t = key => flowCopy[language][key];
  q('.mf-controls').hidden = false;
  const rewardExamples = qa('.mf-reward-example');
  rewardExamples.forEach(element => {
    const success = element.dataset.success === 'true';
    const others = rewardExamples.filter(other => other !== element && other.dataset.success === 'true');
    const bonus = pairwiseBonus(Number(element.dataset.length), others.map(other => Number(other.dataset.length)), success);
    element.querySelector('b').textContent = `b = ${bonus.toFixed(2)}`;
  });

  function signal() {
    const gap = Number(q('.mf-gap').value);
    const value = distillationSignal(gap, selected);
    q('.mf-gap-value').textContent = `${gap > 0 ? '+' : ''}${gap.toFixed(2)}`;
    q('.mf-gap').setAttribute('aria-valuetext', `${gap.toFixed(2)}; ${t('coefficient')}: ${value.toFixed(3)}`);
    q('.mf-signal-value').textContent = `${value > 0 ? '+' : ''}${value.toFixed(3)}`;
    q('.mf-mask-toggle').setAttribute('aria-pressed', String(selected));
    q('.mf-mask-toggle-text').textContent = t(selected ? 'maskOn' : 'maskOff');
    q('.mf-signal-explanation').textContent = t(!selected ? 'ignored' : gap > .001 ? 'reinforce' : gap < -.001 ? 'suppress' : 'agree');
    const path = Array.from({ length: 101 }, (_, i) => {
      const x = -4 + i * .08;
      return `${i ? 'L' : 'M'}${(20 + (x + 4) * 27.5).toFixed(2)},${(80 - 50 * distillationSignal(x, selected)).toFixed(2)}`;
    }).join(' ');
    q('.mf-curve-line').setAttribute('d', path);
    const x = 20 + (gap + 4) * 27.5, y = 80 - 50 * value;
    q('.mf-curve-point').setAttribute('cx', x);
    q('.mf-curve-point').setAttribute('cy', y);
    q('.mf-curve-guide').setAttribute('d', `M${x} 80V${y}H130`);
    root.dataset.coefficient = value.toFixed(3);
    root.dataset.selected = String(selected);
  }

  function update() {
    root.dataset.stage = String(stage);
    root.dataset.playing = String(playing && visible && !document.hidden);
    q('.mf-detail').setAttribute('aria-live', playing ? 'off' : 'polite');
    const copy = flowCopy[language].stages[stage];
    q('.mf-detail-category').textContent = copy.eyebrow;
    q('.mf-detail-index').textContent = `${String(stage + 1).padStart(2, '0')} / 05`;
    q('.mf-detail-title').textContent = copy.title;
    q('.mf-detail-body').textContent = copy.body;
    q('.mf-takeaway').textContent = copy.takeaway;
    qa('[data-detail]').forEach(element => { element.hidden = Number(element.dataset.detail) !== stage; });
    qa('[data-flow-stage]').forEach(button => {
      const index = Number(button.dataset.flowStage);
      button.setAttribute('aria-pressed', String(index === stage));
      button.classList.toggle('is-complete', index < stage);
      button.setAttribute('aria-label', `${button.closest('.mf-stage-progress') ? t('stage') + ' ' : ''}${index + 1}: ${t(keys[index])}`);
    });
    qa('[data-edge]').forEach(edge => edge.classList.toggle('is-active', Number(edge.dataset.edge) === stage));
    q('.mf-prev').disabled = stage === 0;
    q('.mf-next').disabled = stage === keys.length - 1;
    q('.mf-play-text').textContent = t(playing ? 'pause' : ended ? 'replay' : 'play');
    q('.mf-top-play-text').textContent = t(playing ? 'pause' : ended ? 'replay' : 'play');
    q('.mf-play-icon').textContent = playing ? 'Ⅱ' : ended ? '↻' : '▶';
    progress();
  }

  function applyCopy() {
    section.querySelectorAll('[data-flow-copy]').forEach(element => { element.textContent = t(element.dataset.flowCopy); });
    section.querySelectorAll('[data-flow-label]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.flowLabel)); });
    update(); signal();
  }
  function progress() { root.style.setProperty('--stage-progress', ended ? '1' : String(elapsed / durations[stage])); }
  function stopFrame() { cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; }
  function pause() { playing = false; stopFrame(); update(); }
  function play() {
    if (ended) { stage = 0; elapsed = 0; ended = false; }
    playing = true; update(); schedule();
  }
  function choose(index) {
    interacted = true; pause();
    stage = Math.max(0, Math.min(4, index)); elapsed = 0; ended = false; update();
  }
  function schedule() {
    if (playing && visible && !document.hidden && !frameId) frameId = requestAnimationFrame(frame);
  }
  function frame(now) {
    frameId = 0;
    if (!playing || !visible || document.hidden) { lastTime = 0; return; }
    if (lastTime) elapsed += Math.min(100, now - lastTime);
    lastTime = now;
    if (elapsed >= durations[stage]) {
      if (stage === 4) { ended = true; pause(); return; }
      stage++; elapsed = 0; update();
    } else progress();
    schedule();
  }

  q('.mf-play').addEventListener('click', () => { interacted = true; playing ? pause() : play(); });
  q('.mf-top-play').addEventListener('click', () => { interacted = true; playing ? pause() : play(); });
  qa('[data-flow-stage]').forEach(button => button.addEventListener('click', () => choose(Number(button.dataset.flowStage))));
  q('.mf-prev').addEventListener('click', () => choose(stage - 1));
  q('.mf-next').addEventListener('click', () => choose(stage + 1));
  q('.mf-gap').addEventListener('input', () => { interacted = true; pause(); signal(); });
  q('.mf-mask-toggle').addEventListener('click', () => { interacted = true; pause(); selected = !selected; signal(); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { interacted = true; pause(); return; }
    const button = event.target.closest('[data-flow-stage]');
    if (!button || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : Number(button.dataset.flowStage) + (event.key === 'ArrowRight' ? 1 : -1);
    choose(index);
    const group = button.closest('.mf-stage-progress') || q('.mf-board');
    group.querySelector(`[data-flow-stage="${stage}"]`).focus();
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { pause(); return; }
    if (!autoplayStarted && !interacted && !media.matches && !smallScreen.matches && !document.hidden) { autoplayStarted = true; play(); }
    else { update(); schedule(); }
  }, { threshold: 0, rootMargin: '-100px 0px -80px 0px' }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('scope:languagechange', event => { language = event.detail.language; applyCopy(); });
  media.addEventListener('change', () => { if (media.matches) pause(); });
  smallScreen.addEventListener('change', () => { if (smallScreen.matches) pause(); });
  window.addEventListener('pagehide', pause);
  applyCopy();
  initializeReveals(media);
}

function initializeReveals(media) {
  const elements = [...document.querySelectorAll('.section-heading, .insight-pair, .generalization, .analysis-pair > article, .method-takeaway')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -30px 0px', threshold: .05 });
  elements.forEach(element => {
    element.dataset.reveal = '';
    if (element.getBoundingClientRect().top < innerHeight || media.matches) element.classList.add('is-visible');
    else observer.observe(element);
  });
  document.documentElement.classList.add('motion-ready');
  // Native anchor navigation and browser search must never land on hidden text.
  document.addEventListener('focusin', event => event.target.closest('[data-reveal]')?.classList.add('is-visible'));
}
