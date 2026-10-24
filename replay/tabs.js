const tabs = [...document.querySelectorAll('[data-replay-tab]')];
function select(name, focus = false) {
  tabs.forEach(button => {
    const active = button.dataset.replayTab === name;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) button.focus();
  });
  document.dispatchEvent(new CustomEvent('scope:replaytabchange', {detail:{tab:name}}));
}
tabs.forEach((button, index) => {
  button.addEventListener('click', () => select(button.dataset.replayTab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    select(tabs[next].dataset.replayTab, true);
  });
});
