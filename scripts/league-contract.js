(() => {
  const tablist = document.querySelector('.contract-tabs');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }

  function tabFromHash() {
    return tabs.find(tab => `#${tab.getAttribute('aria-controls')}` === location.hash);
  }

  tabs.forEach(tab => {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => {
      selectTab(tab);
      history.replaceState(null, '', `#${panel.id}`);
    });
  });

  tablist.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
  });

  window.addEventListener('hashchange', () => selectTab(tabFromHash() || tabs[0]));
  selectTab(tabFromHash() || tabs[0]);
  tablist.hidden = false;
})();
