import { WebShopClock } from './state.js?v=gallery-1';
import { copy } from './copy.js?v=gallery-1';

const panel = document.querySelector('#replay-webshop');
if (panel) setup();
function setup() {
  const q = selector => panel.querySelector(selector);
  const qa = selector => [...panel.querySelectorAll(selector)];
  const shell = q('.ws-shell'), viewport = q('.ws-viewport'), page = q('.ws-page');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let language = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
  const t = key => copy[language][key] ?? key;
  let episodes = [], clock = null, episode = null, loading = false;
  const clocks = new Map(), scrollPositions = new Map();
  let active = !panel.hidden, inView = false, frameId = 0, lastTime = 0, expanded = false, manualPause = false;
  let pageKey = '', uiKey = '', animationKey = '', motion = null, cursor = {x:40,y:100};
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };
  function target(tag, className, text, value) {
    const node = element(tag, className, text); node.dataset.target = value.toLowerCase(); return node;
  }
  function illustration(product = {}) {
    const name = (product.name || '').toLowerCase();
    if (/sconce|wall lamp|wall light/.test(name)) return 'lamp';
    if (/screen protector|tempered glass/.test(name)) return 'protector';
    if (/pants|trousers/.test(name)) return 'pants';
    if (/shirt|henley|jacket|blouse|lingerie|tops/.test(name)) return 'shirt';
    if (/car mount|windshield|steelie/.test(name)) return 'mount';
    if (/case|rugged cover/.test(name) && !/earbuds/.test(name)) return 'case';
    if (/charger|charging pad/.test(name)) return 'charger';
    if (/headphone|headset|earbuds/.test(name)) return 'headphones';
    if (/monopod|camera stick/.test(name)) return 'camera';
    if (/adapter|cable/.test(name)) return 'cable';
    return 'generic';
  }
  function picture(kind, className = '') {
    const img = element('img', className);
    img.src = new URL(`../assets/webshop/${kind}.svg`, import.meta.url).href;
    img.alt = t('schematic'); img.width = 200; img.height = 160;
    return img;
  }
  function applyCopy() {
    const savedScroll = viewport.scrollTop;
    qa('[data-ws-copy]').forEach(node => { node.textContent = t(node.dataset.wsCopy); });
    qa('[data-ws-label]').forEach(node => node.setAttribute('aria-label', t(node.dataset.wsLabel)));
    q('.ws-address').textContent = t('address');
    if (episode) q('.ws-task').textContent = language === 'zh' ? episode.taskZh : episode.task;
    q('.ws-observation-detail summary').textContent = t('observation');
    shell.setAttribute('aria-label', language === 'zh' ? 'WebShop 动态轨迹回放' : 'WebShop trajectory replay');
    q('.ws-episode').setAttribute('aria-label', t('episode'));
    viewport.setAttribute('aria-label', t('readOnly'));
    q('.ws-trajectory').setAttribute('aria-label', t('actions'));
    if (episodes.length) {
      populatePicker();
      qa('.ws-action').forEach((button, index) => {
        button.querySelector('code').textContent = episode.steps[index].rawAction || t('missingAction');
      });
    }
    q('.ws-fullscreen').textContent = t(expanded || document.fullscreenElement === shell ? 'exitFullscreen' : 'fullscreen');
    pageKey = ''; uiKey = ''; animationKey = ''; motion = null;
    render();
    viewport.scrollTop = savedScroll;
  }
  function buildActions() {
    const list = q('.ws-actions'); list.replaceChildren();
    episode.steps.forEach((step, index) => {
      const li = element('li'), button = element('button', 'ws-action'); button.type = 'button';
      button.append(element('span', '', String(index + 1).padStart(2, '0')), element('code', '', step.rawAction || t('missingAction')));
      button.addEventListener('click', () => seek(index + 1));
      li.append(button); list.append(li);
    });
  }
  function populatePicker() {
    const picker = q('.ws-episode'); picker.replaceChildren();
    for (const outcome of ['success', 'failure']) {
      const group = element('optgroup'); group.label = t(outcome);
      episodes.filter(item => item.outcome === outcome).forEach((item,index) => {
        const option = element('option','',`${String(index+1).padStart(2,'0')} · ${item.label[language]}`);
        option.value = item.id; group.append(option);
      });
      picker.append(group);
    }
    picker.value = episode.id;
    q('.ws-meta').textContent = t(episode.outcome);
    q('.ws-meta').dataset.outcome = episode.outcome;
    shell.dataset.outcome = episode.outcome;
  }
  function selectEpisode(id) {
    if (episode) { pause(); scrollPositions.set(episode.id, viewport.scrollTop); }
    episode = episodes.find(item => item.id === id);
    manualPause = false;
    if (!clocks.has(id)) clocks.set(id, new WebShopClock(episode, reduced.matches));
    clock = clocks.get(id); clock.pause();
    q('.ws-episode').value = id;
    q('.ws-task').textContent = language === 'zh' ? episode.taskZh : episode.task;
    q('.ws-range').max = episode.steps.length;
    q('.ws-range').disabled = false;
    populatePicker();
    q('.ws-speed').value = clock.speed;
    pageKey = ''; uiKey = ''; animationKey = ''; motion = null;
    buildActions(); render(); viewport.scrollTop = scrollPositions.get(id) || 0;
    resumeAutomatically();
  }
  async function load() {
    if (loading || episodes.length) return;
    loading = true; q('.ws-load-error').hidden = true;
    try {
      const response = await fetch(new URL('./episodes.json', import.meta.url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.episodes?.length || !data.episodes.every(item => item.snapshots?.length === item.steps?.length + 1)) throw new Error('Invalid replay data');
      episodes = data.episodes;
      selectEpisode(data.defaultEpisode); applyCopy();
    } catch (error) {
      episodes = []; q('.ws-load-error').hidden = false;
      page.replaceChildren(element('p', 'ws-home-body', t('loadError')));
      console.warn('WebShop replay data unavailable:', error.message);
    } finally { loading = false; resumeAutomatically(); }
  }
  function icon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    const paths = {
      search:'m21 21-5.2-5.2M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
      cart:'M2 3h3l3 13h11l3-9H6M10 21h.01M18 21h.01',
      account:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
      menu:'M4 6h16M4 12h16M4 18h16',
    };
    const path = document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',paths[kind]);
    svg.append(path); return svg;
  }
  function storeHeader(container, state) {
    const head = element('header','ws-store-header');
    head.append(element('span','ws-store-logo','WebShop'));
    searchbar(head,state.query || '');
    const tools = element('div','ws-store-tools');
    const account = element('span','ws-store-tool'); account.append(icon('account'),element('span','',t('account')));
    const cart = element('span','ws-store-tool'); cart.append(icon('cart'),element('span','',t('cart')));
    tools.append(account,cart); head.append(tools); container.append(head);
    const categories = element('div','ws-category-nav');
    const all = element('span','ws-all-departments'); all.append(icon('menu'),document.createTextNode(t('departments')));
    categories.append(all);
    ['electronics','accessories','fashion','homeLiving'].forEach(key=>categories.append(element('span','',t(key))));
    container.append(categories);
  }
  function searchbar(container, value) {
    const bar = element('div','ws-searchbar');
    const input = target('input','','','search'); input.value = value; input.readOnly = true; input.tabIndex = -1;
    input.placeholder = t('searchPlaceholder'); input.setAttribute('aria-label',t('search'));
    const submit = target('span','ws-search-submit',null,'search'); submit.append(icon('search'));
    submit.setAttribute('aria-label',t('search'));
    bar.append(input,submit); container.append(bar);
  }
  function navigation(container, withPrev = false) {
    const nav = element('div','ws-store-nav');
    if (withPrev) nav.append(target('span','ws-back-link',t('prev'),'< prev>'),element('span','ws-breadcrumb-divider','|'));
    nav.append(element('span','',t('storefront')),element('span','ws-breadcrumb-divider','/'),target('span','',t('back'),'back to search'));
    if (withPrev) nav.append(element('span','ws-breadcrumb-divider','/'),element('span','ws-breadcrumb-current',t('productDetails')));
    container.append(nav);
  }
  function requirements(container, state) {
    const box = element('div','ws-requirements'); box.setAttribute('aria-label',t('requirements'));
    Object.entries(episode.constraints).forEach(([key,value]) => {
      let met = false, label;
      if (key === 'priceBelow') {
        const price = Number(state.currentProduct?.price?.replace('$',''));
        met = Number.isFinite(price) && price < value;
        label = `${t('budget')} < $${value}${met ? ' ✓' : ''}`;
      } else {
        met = state.selected[key] === value;
        label = `${t(key)}: ${value}${met ? ' ✓' : ''}`;
      }
      box.append(element('span',`ws-requirement${met?' is-met':''}`,label));
    });
    container.append(box);
  }
  function gallery(container, product) {
    const wrap = element('div','ws-gallery'); wrap.setAttribute('aria-label',t('gallery'));
    const thumbs = element('div','ws-thumbnails'); thumbs.setAttribute('aria-hidden','true');
    [0,1,2].forEach((_,index)=>{
      const thumb = element('div',`ws-thumbnail${index===0?' is-current':''}`);
      thumb.append(picture(illustration(product))); thumbs.append(thumb);
    });
    const image = element('div','ws-detail-image');
    image.append(picture(illustration(product)),element('p','',t('schematic')));
    wrap.append(thumbs,image); container.append(wrap);
  }
  function renderPage() {
    const state = clock.state;
    const key = `${episode.id}|${language}|${clock.snapshot}`;
    if (key === pageKey) return;
    pageKey = key;
    page.replaceChildren(); page.className = `ws-page ws-page--${state.page}`; viewport.scrollTop = 0;
    shell.dataset.snapshot = clock.snapshot; shell.dataset.page = state.page;
    storeHeader(page,state);
    const content = element('div','ws-store-content'); page.append(content);
    if (state.page === 'search') {
      const home = element('div','ws-home');
      const message = element('div','ws-home-message');
      message.append(element('p','ws-home-eyebrow',t('homeTag')),element('h3','',t('homeTitle')),element('p','ws-home-body',t('homeBody')));
      const art = element('div','ws-hero-art'); art.append(picture('mount'));
      home.append(message,art); content.append(home);
      const tiles = element('div','ws-category-tiles');
      [['electronics','charger'],['accessories','headphones'],['fashion','shirt']].forEach(([label,kind])=>{
        const tile = element('article','ws-category-tile'); tile.append(element('h4','',t(label)),picture(kind)); tiles.append(tile);
      });
      content.append(tiles);
    } else if (state.page === 'results') {
      navigation(content);
      const title = element('div','ws-results-heading');
      title.append(element('h3','',t('results')),element('span','',`${t('page')} ${state.pageNumber} · ${state.totalResults} ${t('resultCount')}`)); content.append(title);
      const layout = element('div','ws-results-layout');
      const sidebar = element('aside','ws-catalog-sidebar');
      sidebar.append(element('h4','',t('browse')));
      ['departments','electronics','accessories','fashion','homeLiving'].forEach((label,index)=>sidebar.append(element('p',index===0?'is-current':'',t(label))));
      sidebar.append(element('h4','',t('checklist'))); requirements(sidebar,state);
      const grid = element('div','ws-product-grid');
      state.products.forEach(product=>{
        const card = target('article','ws-product-card',null,product.id);
        const image = element('div','ws-card-image'); image.append(picture(illustration(product)),element('span','ws-schematic',t('schematic')));
        const body = element('div','ws-card-copy');
        const name = element('h4','ws-product-name',product.name); name.title = product.name;
        body.append(element('p','ws-product-id',product.id),name,element('p','ws-product-price',product.price),element('span','ws-view-product',`${t('viewDetails')} →`));
        card.append(image,body); grid.append(card);
      });
      layout.append(sidebar,grid); content.append(layout);
      const pagination=element('div','ws-pagination');
      pagination.append(element('span','ws-current-page',state.pageNumber),target('span','ws-page-next',t('nextPage'),'next >'));
      content.append(pagination);
    } else if (state.page === 'product') {
      navigation(content,true);
      const product = state.currentProduct, grid = element('div','ws-detail-grid');
      gallery(grid,product);
      const detail = element('div','ws-product-detail');
      detail.append(element('p','ws-product-id',product.id),element('h3','ws-detail-name',product.name));
      const rating = product.rating && product.rating !== 'N.A.' ? `${t('rating')}: ${product.rating}` : t('ratingUnavailable');
      detail.append(element('p','ws-rating',rating),element('p','ws-summary-price',product.price));
      Object.entries(product.optionGroups).forEach(([group,choices])=>{
        const section=element('div','ws-option-group'), heading=element('h4','',t(group));
        if(state.selected[group])heading.append(element('strong','',` : ${state.selected[group]}`));
        section.append(heading);
        const options=element('div','ws-options');
        choices.forEach(choice=>{
          const selected=state.selected[group]===choice;
          const node=target('span',`ws-option${selected?' is-selected':''}`,choice,choice);
          node.dataset.selected=String(selected); options.append(node);
        });
        section.append(options); detail.append(section);
      });
      const buybox=element('div','ws-buybox');
      buybox.append(element('span','ws-price-label',t('priceLabel')),element('p','ws-detail-price',product.price));
      const quantity=element('div','ws-quantity'); quantity.append(element('span','',t('quantity')),element('span','ws-quantity-value','1'));
      buybox.append(quantity,target('span','ws-buy',t('buy'),'buy now')); detail.append(buybox);
      grid.append(detail); content.append(grid);
      const links=element('div','ws-detail-links');
      ['description','features','reviews'].forEach(key=>links.append(target('span','',t(key),key)));
      content.append(links);
      const checklist=element('div','ws-detail-checklist'); checklist.append(element('h4','',t('checklist'))); requirements(checklist,state); content.append(checklist);
    } else if (state.page === 'description') {
      navigation(content,true);
      const links=element('div','ws-detail-links');
      ['description','features','reviews'].forEach(key=>links.append(element('span',key==='description'?'is-current':'',t(key))));
      content.append(links,element('p','ws-product-id',state.currentProduct?.id),element('h3','ws-description-title',t('description')),element('p','ws-description-body',state.description));
    } else if (state.page === 'ended') {
      const ended=element('div','ws-ended');
      ended.append(element('div','ws-ended-symbol',episode.outcome==='success'?'✓':'×'),element('h3','',t(episode.outcome)),element('p','ws-ended-reward',`${t('reward')} ${episode.reward.toFixed(1)}`));
      if(state.currentProduct){
        const item=element('div','ws-ended-item');
        item.append(picture(illustration(state.currentProduct)));
        const info=element('div','');info.append(element('p','ws-product-id',state.currentProduct.id),element('h4','ws-detail-name',state.currentProduct.name),element('p','ws-product-price',state.currentProduct.price));
        info.append(element('p','ws-terminal-note',Object.entries(state.selected).map(([key,value])=>`${t(key)}: ${value}`).join(' · ')));
        item.append(info);ended.append(item);
      }
      ended.append(element('p','ws-terminal-note',t('terminalEvidence')));content.append(ended);
    } else content.append(element('pre','ws-description-body',state.rawObservation||state.description));
  }
  function feedback(step) {
    if (!step) return t('startFeedback');
    if (clock.acting) return t('executing');
    if (!step.action || step.validAction === false) return t('invalid');
    if (step.observationAfter === null) return `${t('missingFeedback')}\n${t('ended')} · ${t('reward')} ${episode.reward.toFixed(1)}\n${t(episode.outcome)}${clock.state.page !== 'ended' ? `\n${t('noPurchase')}` : ''}`;
    if (step.observationAfter === step.observationBefore) return `${t('unchanged')}${Object.keys(clock.state.selected).length ? `\n${t('selectionEvidence')}` : ''}`;
    const state = clock.state;
    if (state.page === 'results') return `${t('results')} · ${state.products.length} / ${state.totalResults}`;
    if (state.page === 'product') return `${state.currentProduct.id}\n${state.currentProduct.name}\n${state.currentProduct.price}`;
    if (state.page === 'description') return t('description');
    return state.rawObservation || t('initial');
  }
  function renderUI() {
    const key = `${episode.id}|${language}|${clock.snapshot}|${clock.stepIndex}|${clock.phase}|${clock.playing}`;
    if (key === uiKey) return;
    uiKey = key;
    const step = episode.steps[clock.selectedStep];
    shell.dataset.playing = clock.playing; shell.dataset.phase = clock.phase;
    q('.ws-play').disabled = false;
    q('.ws-play').textContent = t(clock.playing ? 'pause' : clock.snapshot === episode.steps.length && clock.phase === 'rest' ? 'replay' : 'play');
    q('.ws-previous').disabled = clock.snapshot === 0 && !clock.acting;
    q('.ws-next').disabled = clock.snapshot === episode.steps.length;
    q('.ws-range').value = clock.snapshot;
    q('.ws-step-count').textContent = `${clock.acting ? clock.stepIndex + 1 : clock.snapshot} / ${episode.steps.length}`;
    q('.ws-stage-count').textContent = `${String(clock.snapshot).padStart(2,'0')} / ${String(episode.steps.length).padStart(2,'0')}`;
    q('.ws-initial').setAttribute('aria-pressed',String(clock.selectedStep < 0));
    qa('.ws-action').forEach((button,index) => {
      const changed = button.getAttribute('aria-pressed') !== String(index === clock.selectedStep);
      button.setAttribute('aria-pressed',String(index === clock.selectedStep));
      button.classList.toggle('is-complete',index < clock.snapshot);
      if (changed && index === clock.selectedStep && active) {
        const parent = q('.ws-actions');
        const bounds = button.getBoundingClientRect(), listBounds = parent.getBoundingClientRect();
        if (bounds.bottom > listBounds.bottom) parent.scrollTop += bounds.bottom - listBounds.bottom;
        else if (bounds.top < listBounds.top) parent.scrollTop -= listBounds.top - bounds.top;
      }
    });
    q('.ws-step-caption').textContent = step ? `${t('turn')} ${step.turn} · ${t('valid')}: ${step.validAction === null ? t('none') : step.validAction}` : t('initial');
    q('.ws-before').textContent = step?.observationBefore || episode.initialObservation;
    q('.ws-feedback').textContent = feedback(step);
    q('.ws-after').textContent = step?.observationAfter || t('missingFeedback');
    q('.ws-observation-detail').hidden = !step || clock.acting;
    q('.ws-model-detail').hidden = !step;
    q('.ws-output').textContent = step?.modelOutput || '';
    q('.ws-live-phase').textContent = clock.snapshot === episode.steps.length && !clock.acting
      ? `${t('ended')} · ${t(episode.outcome)} · ${t('reward')} ${episode.reward.toFixed(1)}`
      : clock.acting ? `${t('step')} ${clock.stepIndex + 1} · ${step.rawAction || t('missingAction')}`
      : step ? step.rawAction || t('missingAction') : t('initial');
  }
  function clearMotion() {
    qa('.ws-target-active').forEach(node => node.classList.remove('ws-target-active'));
    q('.ws-cursor').hidden = true; page.classList.remove('is-transitioning');
    q('.ws-ripple').style.opacity = '0'; motion = null; animationKey = '';
  }
  function animate() {
    if (!clock.acting || reduced.matches) { clearMotion(); return; }
    const step = episode.steps[clock.stepIndex];
    const key = `${episode.id}|${clock.stepIndex}|${pageKey}`;
    if (key !== animationKey) {
      clearMotion(); animationKey = key;
      const value = step.action?.type === 'search' ? 'search' : step.action?.target?.toLowerCase();
      const node = step.validAction === true && value ? [...page.querySelectorAll('[data-target]')].find(n => n.dataset.target === value) : null;
      if (node) {
        const r = node.getBoundingClientRect(), v = viewport.getBoundingClientRect();
        const targetScroll = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, viewport.scrollTop + (r.top + r.height / 2 - v.top) - viewport.clientHeight / 2));
        motion = {node, scrollStart:viewport.scrollTop, scrollEnd:targetScroll, x:cursor.x, y:cursor.y};
        node.classList.add('ws-target-active');
      } else {
        q('.ws-live-phase').textContent = step.action && step.validAction !== false ? t('targetMissing') : t('invalid');
      }
    }
    if (!motion) return;
    const p = clock.phase === 'locate' ? clock.progress : 1;
    const ease = p*p*(3-2*p);
    viewport.scrollTop = motion.scrollStart + (motion.scrollEnd - motion.scrollStart)*ease;
    const r = motion.node.getBoundingClientRect(), b = q('.ws-browser').getBoundingClientRect();
    const x = Math.max(5,Math.min(b.width - 25,r.left - b.left + r.width/2));
    const y = Math.max(40,Math.min(b.height - 30,r.top - b.top + r.height/2));
    cursor = {x:motion.x + (x-motion.x)*ease, y:motion.y + (y-motion.y)*ease};
    q('.ws-cursor').hidden = false; q('.ws-cursor').style.transform = `translate(${cursor.x}px,${cursor.y}px)`;
    const click = clock.phase === 'execute' && step.action.type === 'click';
    q('.ws-ripple').style.opacity = click ? String(1-clock.progress) : '0';
    q('.ws-ripple').style.transform = `scale(${0.5+clock.progress*1.7})`;
    if (step.action.type === 'search') {
      const input = page.querySelector('input');
      if (input) input.value = clock.phase === 'locate' ? '' : clock.phase === 'execute' ? step.action.target.slice(0,Math.ceil(step.action.target.length * clock.progress)) : step.action.target;
    }
    page.classList.toggle('is-transitioning',clock.phase === 'transition');
  }
  function render() {
    if (!clock) return;
    renderPage(); renderUI(); animate();
  }
  function stopFrame() { cancelAnimationFrame(frameId); frameId = 0; lastTime = 0; }
  function pause() { clock?.pause(); stopFrame(); render(); }
  function play() {
    if (!clock || !active || !inView) return;
    clock.play(); animationKey = ''; render(); requestFrame();
  }
  function seek(value) {
    if (!clock) return;
    manualPause = true;
    clock.seek(value); clearMotion(); stopFrame(); render();
    const step = episode.steps[clock.selectedStep];
    if (step?.action?.type === 'click') {
      const node = [...page.querySelectorAll('[data-target]')].find(n => n.dataset.target === step.action.target.toLowerCase());
      if (node) {
        const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();
        viewport.scrollTop += r.top-v.top-viewport.clientHeight/2+r.height/2;
      }
    }
  }
  function requestFrame() {
    if (!frameId && clock?.playing && active && inView && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function frame(now) {
    frameId = 0;
    if (!clock?.playing || !active || !inView || document.hidden) { lastTime=0; return; }
    const delta = lastTime ? Math.min(.1,(now-lastTime)/1000) : 0; lastTime = now;
    clock.tick(delta); render(); requestFrame();
  }
  q('.ws-play').addEventListener('click',()=>{manualPause=Boolean(clock?.playing);clock?.playing?pause():play();});
  q('.ws-previous').addEventListener('click',()=>seek(clock.acting?clock.stepIndex:clock.snapshot-1));
  q('.ws-next').addEventListener('click',()=>seek(clock.snapshot+1));
  q('.ws-initial').addEventListener('click',()=>seek(0));
  q('.ws-range').addEventListener('input',event=>seek(Number(event.target.value)));
  q('.ws-speed').addEventListener('change',event=>{if(clock) clock.speed=Number(event.target.value);});
  q('.ws-episode').addEventListener('change',event=>{if(episodes.length) selectEpisode(event.target.value);});
  q('.ws-retry').addEventListener('click',load);
  function expand(value) {
    expanded = value;
    shell.classList.toggle('ws-expanded', value);
    document.body.classList.toggle('ws-expanded-open', value);
    q('.ws-fullscreen').textContent = t(value ? 'exitFullscreen' : 'fullscreen');
    animationKey = ''; motion = null; render();
  }
  q('.ws-fullscreen').addEventListener('click',async()=>{
    if (expanded) { expand(false); return; }
    if (document.fullscreenElement === shell) { await document.exitFullscreen(); return; }
    try { await shell.requestFullscreen?.(); } catch { /* Fall back to a window-filling view. */ }
    if (document.fullscreenElement !== shell) expand(true);
  });
  document.addEventListener('fullscreenchange',()=>{
    q('.ws-fullscreen').textContent=t(document.fullscreenElement===shell?'exitFullscreen':'fullscreen');
    animationKey=''; motion=null; render();
  });
  shell.addEventListener('keydown',event=>{
    if (event.key === 'Escape' && expanded) { event.preventDefault(); expand(false); return; }
    if (/INPUT|SELECT|BUTTON|SUMMARY/.test(event.target.tagName)||!clock) return;
    if(event.code==='Space'){event.preventDefault();manualPause=clock.playing;clock.playing?pause():play();}
    if(event.code==='ArrowLeft'){event.preventDefault();seek(clock.acting?clock.stepIndex:clock.snapshot-1);}
    if(event.code==='ArrowRight'){event.preventDefault();seek(clock.snapshot+1);}
  });
  document.addEventListener('scope:languagechange',event=>{language=event.detail.language;applyCopy();});
  function resumeAutomatically() {
    if (!active || !inView || document.hidden) return;
    if (!episodes.length) { if (!loading) load(); return; }
    if (!manualPause && !reduced.matches && !clock.playing) play();
  }
  document.addEventListener('scope:replaytabchange',event=>{active=event.detail.tab==='webshop';if(!active)pause();else resumeAutomatically();});
  new IntersectionObserver(([entry])=>{
    inView=entry.isIntersecting && entry.intersectionRatio >= .08;
    if(!inView)pause();else resumeAutomatically();
  }, {threshold:[0,.08]}).observe(q('.ws-browser'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resumeAutomatically();});
  reduced.addEventListener('change',event=>{clocks.forEach(c=>{c.reducedMotion=event.matches;});clearMotion();render();});
  window.addEventListener('pagehide',pause);
  applyCopy(); if(active) load();
}
