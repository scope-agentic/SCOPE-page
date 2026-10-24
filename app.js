(() => {
  'use strict';
  const config = window.SCOPE_CONFIG;
  const copy = window.SCOPE_COPY;
  const results = window.SCOPE_RESULTS;
  const metricKeys = window.SCOPE_METRICS;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let language = 'en';
  let modelId = results[0].id;
  let figureTrigger = null;
  const dialog = $('#figure-dialog');
  const navigation = $('#navigation');
  const menu = $('.menu-toggle');
  const t = (key) => copy[language][key] ?? copy.en[key] ?? key;
  document.title = config.title;
  document.querySelector('meta[property="og:title"]').content = config.title;

  try {
    const saved = localStorage.getItem('scope-language');
    if (saved === 'zh' || saved === 'en') language = saved;
  } catch { /* Preferences are optional in privacy-restricted browsers. */ }

  function renderResults() {
    const model = results.find((item) => item.id === modelId);
    const rankings = Object.fromEntries(metricKeys.map((key) => [
      key, [...new Set(model.rows.map((row) => row.metrics[key]))].sort((a, b) => b - a),
    ]));
    const body = $('#results-body');
    body.replaceChildren();
    model.rows.forEach(({ method: name, type, metrics }) => {
      const row = document.createElement('tr');
      if (name === 'SCOPE') row.className = 'ours';
      const heading = document.createElement('th');
      heading.scope = 'row';
      const methodName = document.createElement('span');
      methodName.className = 'method-name';
      methodName.textContent = name;
      if (name === 'SCOPE') {
        const label = document.createElement('span');
        label.className = 'ours-label';
        label.textContent = t('results.ours');
        methodName.append(' ', label);
      }
      heading.append(methodName);
      row.append(heading);
      const guidance = document.createElement('td');
      guidance.className = 'guidance-type';
      guidance.textContent = t(`results.type.${type}`);
      row.append(guidance);
      metricKeys.forEach((key) => {
        const value = metrics[key];
        const cell = document.createElement('td');
        cell.dataset.metric = key;
        if (value === rankings[key][0]) {
          cell.className = 'result-best';
          const strong = document.createElement('strong');
          strong.className = 'result-number';
          strong.textContent = value.toFixed(1);
          strong.title = model.rows.filter((item) => item.metrics[key] === value).length > 1
            ? t('results.tie') : t('results.best');
          cell.append(strong);
        } else if (value === rankings[key][1]) {
          cell.className = 'result-second';
          const second = document.createElement('span');
          second.className = 'result-number';
          second.textContent = value.toFixed(1);
          second.title = t('results.second');
          cell.append(second);
        } else {
          const number = document.createElement('span');
          number.className = 'result-number';
          number.textContent = value.toFixed(1);
          cell.append(number);
        }
        row.append(cell);
      });
      body.append(row);
    });
    $('#model-caption').textContent = model.fullName;
    const scope = model.rows.find((row) => row.method === 'SCOPE').metrics;
    const seed = model.rows.find((row) => row.method === 'SEED').metrics;
    $('#selected-alf').textContent = scope.avg.toFixed(1);
    $('#selected-web').textContent = scope.success.toFixed(1);
    ['#gain-alf', '#gain-web'].forEach((selector, index) => {
      const unit = document.createElement('span');
      unit.textContent = t('results.pp');
      const metric = ['avg', 'success'][index];
      $(selector).replaceChildren(`+${(scope[metric] - seed[metric]).toFixed(1)} `, unit);
    });
    $$('[data-model]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.model === modelId)));
  }

  function refreshDialog() {
    if (!figureTrigger) return;
    const image = figureTrigger.querySelector('img');
    $('#dialog-image').src = image.src;
    $('#dialog-image').alt = image.alt;
    $('#dialog-image').style.setProperty('--figure-width', `${image.getAttribute('width')}px`);
    $('#dialog-caption').textContent = figureTrigger.closest('figure').querySelector('figcaption').textContent;
  }

  function safeWebUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function renderPublicInfo() {
    const authors = $('#authors');
    if (!config.anonymous && config.authors.length) {
      authors.replaceChildren();
      config.authors.forEach((author, index) => {
        if (index) authors.append(' · ');
        const url = safeWebUrl(author.url);
        const name = document.createElement(url ? 'a' : 'span');
        name.textContent = author.name;
        if (url) { name.href = url; name.target = '_blank'; name.rel = 'noopener'; }
        authors.append(name);
        if (author.affiliation) {
          const affiliation = document.createElement('span');
          affiliation.className = 'author-affiliation';
          affiliation.textContent = author.affiliation;
          authors.append(affiliation);
        }
      });
    } else authors.textContent = t('authors');
    // Anonymous previews do not expose unannounced public resources.
    $$('[data-public-resource]').forEach((link) => link.remove());
    if (!config.anonymous) {
      [['code', config.codeUrl], ['arxiv', config.arxivUrl]].forEach(([key, value]) => {
        const url = safeWebUrl(value);
        if (!url) return;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'button button-secondary';
        link.dataset.publicResource = key;
        link.textContent = `${t(key)} ↗`;
        $('#resource-links').append(link);
      });
    }
    $('#citation')?.remove();
    if (!config.anonymous && config.bibtex) {
      const details = document.createElement('details');
      details.id = 'citation';
      details.className = 'citation-block';
      const summary = document.createElement('summary');
      summary.textContent = t('citation');
      const code = document.createElement('pre');
      code.textContent = config.bibtex;
      details.append(summary, code);
      $('#analysis').after(details);
    }
    if (!config.anonymous) $('#publication-status').textContent = language === 'zh' ? '研究项目主页' : 'Research project';
  }

  function applyLanguage(nextLanguage, preservePosition = false) {
    const anchor = preservePosition
      ? $$('main > section').filter((section) => section.getBoundingClientRect().top <= 130).at(-1)
      : null;
    const previousTop = anchor?.getBoundingClientRect().top;
    language = nextLanguage;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    $$('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    $$('[data-i18n-alt]').forEach((element) => { element.alt = t(element.dataset.i18nAlt); });
    $$('[data-i18n-aria]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
    $$('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    navigation.setAttribute('aria-label', language === 'zh' ? '主导航' : 'Main navigation');
    document.querySelector('meta[name="description"]').content = language === 'zh'
      ? 'SCOPE：面向智能体强化学习的选择性关键步骤同策略自蒸馏。利用步骤级后见经验，提升任务完成率与交互效率。'
      : 'SCOPE: selective critical-step on-policy self-distillation for agentic reinforcement learning. Learn from step-specific hindsight for stronger, more efficient task completion.';
    renderResults();
    renderPublicInfo();
    refreshDialog();
    document.dispatchEvent(new CustomEvent('scope:languagechange', { detail: { language } }));
    try { localStorage.setItem('scope-language', language); } catch { /* Optional persistence. */ }
    if (anchor && !dialog.open) {
      const difference = anchor.getBoundingClientRect().top - previousTop;
      if (Math.abs(difference) > 1) window.scrollBy({ top: difference, behavior: 'instant' });
    }
  }

  function closeMenu() {
    navigation.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  window.matchMedia('(min-width: 701px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });
  $$('[data-lang]').forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.lang, true)));
  $$('[data-model]').forEach((button) => button.addEventListener('click', () => { modelId = button.dataset.model; renderResults(); }));

  $$('.figure-open').forEach((button) => button.addEventListener('click', () => {
    figureTrigger = button;
    refreshDialog();
    dialog.showModal();
    document.body.classList.add('modal-open');
    $('.dialog-scroll').scrollTo(0, 0);
  }));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    figureTrigger?.focus({ preventScroll: true });
  });

  let scrollPending = false;
  const sections = $$('main > section[id]');
  function updateNavigation() {
    const current = sections.filter((section) => section.getBoundingClientRect().top <= 150).at(-1)?.id;
    navigation.querySelectorAll('a').forEach((link) => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateNavigation); }
  }, { passive: true });
  applyLanguage(language);
  updateNavigation();
})();
