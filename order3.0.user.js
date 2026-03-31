// ==UserScript==
// @name         Rolster order page stable name & email replace
// @namespace    local.rolster.bstage
// @version      1.3.0
// @description  Replace purchaser name and email on rolster order page with minimal flicker
// @match        https://rolster.bstage.in/shop/kr/order/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const OLD_NAMES = ['RUIRUI HOU', 'HOU RUIRUI'];
  const NEW_NAME = 'WEN WEN';
  const NEW_EMAIL = 'yuzip3942@naver.com';

  let scheduled = false;
  let rootObserver = null;

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function isEmailText(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(s));
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

  function schedule(delay = 120) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      init();
    }, delay);
  }

  function textEqualsAny(text, arr) {
    const t = normalizeText(text);
    return arr.some(x => t === x);
  }

  function replaceNodeText(el, newValue, markName) {
    if (!el) return false;
    if (el.dataset[markName] === '1') return false;
    if (normalizeText(el.textContent) === newValue) {
      el.dataset[markName] = '1';
      return false;
    }
    el.textContent = newValue;
    el.dataset[markName] = '1';
    return true;
  }

  function findPurchasedByLabel(doc = document) {
    return getLeafElements(doc).find(el => normalizeText(el.textContent) === 'Purchased by') || null;
  }

  function findPurchasedByContainer(doc = document) {
    const labelEl = findPurchasedByLabel(doc);
    if (!labelEl) return null;

    let cur = labelEl.parentElement;
    while (cur && cur !== doc.body) {
      const txt = normalizeText(cur.innerText || '');
      if (txt.includes('Purchased by')) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return labelEl.parentElement || null;
  }

  function patchCollapsedName(container) {
    if (!container) return 0;

    let changed = 0;
    const leafs = getLeafElements(container).filter(isVisible);

    for (const el of leafs) {
      const t = normalizeText(el.textContent);
      if (textEqualsAny(t, OLD_NAMES)) {
        if (replaceNodeText(el, NEW_NAME, 'hhCollapsedPatched')) changed++;
      }
    }

    return changed;
  }

  function findExpandedDetailsBlock(container) {
    if (!container) return null;

    const all = Array.from(container.querySelectorAll('div, section, article'));
    let best = null;
    let bestScore = -1;

    for (const el of all) {
      const txt = normalizeText(el.innerText || '');
      if (!txt) continue;
      if (!OLD_NAMES.some(n => txt.includes(n)) && !txt.includes(NEW_NAME) && !/@/.test(txt)) continue;

      const r = el.getBoundingClientRect();
      const score = r.width * r.height;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }

  function patchExpandedDetails(detailsRoot) {
    if (!detailsRoot) return 0;
    if (detailsRoot.dataset.hhExpandedDone === '1') return 0;

    let changed = 0;
    const leafs = getLeafElements(detailsRoot).filter(isVisible);

    for (const el of leafs) {
      const t = normalizeText(el.textContent);

      if (textEqualsAny(t, OLD_NAMES)) {
        if (replaceNodeText(el, NEW_NAME, 'hhExpandedNamePatched')) changed++;
        continue;
      }

      if (isEmailText(t)) {
        if (replaceNodeText(el, NEW_EMAIL, 'hhExpandedEmailPatched')) changed++;
      }
    }

    detailsRoot.dataset.hhExpandedDone = '1';
    return changed;
  }

  function watchExpandedBlock(container) {
    if (!container || container.dataset.hhWatchingExpanded === '1') return;
    container.dataset.hhWatchingExpanded = '1';

    const mo = new MutationObserver(() => {
      const details = findExpandedDetailsBlock(container);
      if (!details) return;

      const txt = normalizeText(details.innerText || '');
      const looksExpanded =
        txt.includes(NEW_NAME) ||
        OLD_NAMES.some(n => txt.includes(n)) ||
        /[^\s@]+@[^\s@]+\.[^\s@]+/.test(txt);

      if (!looksExpanded) return;

      patchExpandedDetails(details);
    });

    mo.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function initInDoc(doc) {
    const container = findPurchasedByContainer(doc);
    if (!container) return;

    patchCollapsedName(container);
    watchExpandedBlock(container);

    const details = findExpandedDetailsBlock(container);
    if (details) patchExpandedDetails(details);
  }

  function init() {
    if (!location.pathname.startsWith('/shop/kr/order/')) return;

    initInDoc(document);

    for (const fr of Array.from(document.querySelectorAll('iframe'))) {
      try {
        const d = fr.contentDocument;
        if (!d) continue;
        initInDoc(d);
      } catch (_) {}
    }
  }

  schedule(200);

  if (!rootObserver) {
    rootObserver = new MutationObserver(() => schedule(120));
    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.addEventListener('load', () => schedule(250));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule(150);
  });

  const _ps = history.pushState;
  history.pushState = function () {
    _ps.apply(this, arguments);
    schedule(180);
  };

  const _rs = history.replaceState;
  history.replaceState = function () {
    _rs.apply(this, arguments);
    schedule(180);
  };

  window.addEventListener('popstate', () => schedule(180));
})();
