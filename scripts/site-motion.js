/* Small, once-per-element effects for shared league pages. */
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!window.IntersectionObserver || !Element.prototype.animate) return;
  const stats = '.uti-intel-value, .home-score-total, #prizePoolTotal, [data-count-up]';
  const bars = '.uti-rank-bar, .team-page .track .bar, .cat .track .bar';
  const seen = new WeakSet();
  const running = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      observer.unobserve(el);
      if (preference.matches || !el.isConnected) continue;
      if (el.matches(bars)) {
        const animation = el.animate([
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)' }
        ], { duration: 600, easing: 'cubic-bezier(.2,.7,.3,1)' });
        const finish = () => animation.finish();
        running.add(finish);
        animation.finished.finally(() => running.delete(finish));
        continue;
      }
      // Only standalone numbers: leave records, dates, odds, and nested markup intact.
      const original = el.textContent;
      const match = original.trim().match(/^(\$?)(-?\d[\d,]*)(\.\d+)?(%)?$/);
      if (!match || el.children.length || el.closest('[aria-live]')) continue;
      const value = Number((match[2] + (match[3] || '')).replaceAll(',', ''));
      if (!Number.isFinite(value) || value === 0) continue;
      const decimals = (match[3] || '').length ? match[3].length - 1 : 0;
      const format = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: original.includes(',') });
      const started = performance.now();
      let frame;
      const oldLabel = el.getAttribute('aria-label');
      el.setAttribute('aria-label', original.trim());
      const finish = () => {
        cancelAnimationFrame(frame);
        el.textContent = original;
        if (oldLabel == null) el.removeAttribute('aria-label');
        else el.setAttribute('aria-label', oldLabel);
        running.delete(finish);
      };
      running.add(finish);
      const tick = now => {
        if (!el.isConnected || preference.matches) return finish();
        const progress = Math.min(1, (now - started) / 650);
        if (progress === 1) return finish();
        el.textContent = match[1] + format.format(value * (1 - (1 - progress) ** 3)) + (match[4] || '');
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
  }, { threshold: .3 });
  function scan(root) {
    const selector = stats + ', ' + bars;
    const elements = [...root.querySelectorAll(selector)];
    if (root.matches?.(selector)) elements.push(root);
    for (const el of elements) {
      if (seen.has(el)) continue;
      seen.add(el);
      observer.observe(el);
    }
  }
  function start() {
    scan(document);
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  preference.addEventListener('change', () => {
    if (preference.matches) for (const finish of [...running]) finish();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
