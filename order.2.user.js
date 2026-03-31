// ==UserScript==
// @name         Rolster order page name & email replace
// @namespace    local.rolster.bstage
// @version      1.2.0
// @description  Replace purchaser name and email on rolster order page without jumping
// @match        https://rolster.bstage.in/shop/kr/order/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const OLD_NAMES = [
    'RUIRUI HOU',
    'HOU RUIRUI',
  ];
  const NEW_NAME = 'WEN WEN';
  const NEW_EMAIL = 'yuzip3942@naver.com';

  let scheduled = false;
  let lastApplied = 0;

  function schedule(delay = 120) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      run();
    }, delay);
  }

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function getLeafElements(root = document) {
    return Array.from(root.querySelectorAll('*')).filter(el => el.children.length === 0);
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      parseFloat(cs.opacity || '1') > 0
    );
  }

  function replaceExactText(root, oldValue, newValue) {
    let changed = 0;
    const leafs = getLeafElements(root);

    for (const el of leafs) {
      if (el.dataset.hhPatched === '1') continue;

      const t = normalizeText(el.textContent);
      if (t === oldValue) {
        el.textContent = newValue;
        el.dataset.hhPatched = '1';
        changed++;
      }
    }

    return changed;
  }

  function replaceNames(root) {
    let total = 0;
    for (const oldName of OLD_NAMES) {
      total += replaceExactText(root, oldName, NEW_NAME);
    }
    return total;
  }

  function replacePurchasedByEmail(root) {
    let changed = 0;
    const leafs = getLeafElements(root);

    const labelEl = leafs.find(el => normalizeText(el.textContent) === 'Purchased by');
    if (!labelEl) return 0;

    let container = labelEl.parentElement;
    while (container && container !== document.body) {
      const txt = normalizeText(container.innerText || '');
      if (txt.includes('Purchased by') && (txt.includes(NEW_NAME) || OLD_NAMES.some(n => txt.includes(n)))) {
        break;
      }
      container = container.parentElement;
    }

    if (!container || container === document.body) return 0;

    const insideLeafs = getLeafElements(container).filter(isVisible);

    for (const el of insideLeafs) {
      if (el.dataset.hhEmailPatched === '1') continue;

      const t = normalizeText(el.textContent);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
        el.textContent = NEW_EMAIL;
        el.dataset.hhEmailPatched = '1';
        changed++;
      }
    }

    return changed;
  }

  function runInDoc(doc) {
    let changed = 0;
    changed += replaceNames(doc);
    changed += replacePurchasedByEmail(doc);
    return changed;
  }

  function run() {
    if (!location.pathname.startsWith('/shop/kr/order/')) return;

    const now = Date.now();
    if (now - lastApplied < 400) return;

    let changed = 0;

    changed += runInDoc(document);

    for (const fr of Array.from(document.querySelectorAll('iframe'))) {
      try {
        const d = fr.contentDocument;
        if (!d) continue;
        changed += runInDoc(d);
      } catch (_) {}
    }

    if (changed > 0) lastApplied = now;
  }

  schedule(200);

  const mo = new MutationObserver(() => schedule(150));
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule(150);
  });

  window.addEventListener('load', () => schedule(250));

  const _ps = history.pushState;
  history.pushState = function () {
    _ps.apply(this, arguments);
    schedule(200);
  };

  const _rs = history.replaceState;
  history.replaceState = function () {
    _rs.apply(this, arguments);
    schedule(200);
  };

  window.addEventListener('popstate', () => schedule(200));

  setInterval(() => schedule(300), 2000);
})();
