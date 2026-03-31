// ==UserScript==
// @name         Rolster order page text-node replace
// @namespace    local.rolster.bstage
// @version      3.0.0
// @description  Replace purchaser name and email on rolster order page via text nodes
// @match        https://rolster.bstage.in/shop/kr/order/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const OLD_NAMES = ['RUIRUI HOU', 'HOU RUIRUI'];
  const NEW_NAME = 'WEN WEN';
  const NEW_EMAIL = 'yuzip3942@naver.com';

  let observerStarted = false;

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function isEmailText(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(s));
  }

  function isVisibleElement(el) {
    if (!el || el.nodeType !== 1) return true;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
      return false;
    }
    return true;
  }

  function getTextNodes(root) {
    const out = [];
    if (!root) return out;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
          const text = normalizeText(node.nodeValue);
          if (!text) return NodeFilter.FILTER_REJECT;

          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;

          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      out.push(node);
    }
    return out;
  }

  function replaceNameTextNodes(root) {
    let changed = 0;
    const nodes = getTextNodes(root);

    for (const node of nodes) {
      const text = normalizeText(node.nodeValue);
      if (OLD_NAMES.includes(text) && text !== NEW_NAME) {
        node.nodeValue = node.nodeValue.replace(text, NEW_NAME);
        changed++;
      }
    }

    return changed;
  }

  function findPurchasedByContainer(rootDoc = document) {
    const textNodes = getTextNodes(rootDoc.body || rootDoc);

    for (const node of textNodes) {
      const text = normalizeText(node.nodeValue);
      if (text !== 'Purchased by') continue;

      let el = node.parentElement;
      while (el && el !== rootDoc.body) {
        const blockText = normalizeText(el.innerText || '');
        if (blockText.includes('Purchased by')) {
          return el;
        }
        el = el.parentElement;
      }

      return node.parentElement || null;
    }

    return null;
  }

  function replaceEmailNearPurchasedBy(rootDoc = document) {
    const container = findPurchasedByContainer(rootDoc);
    if (!container) return 0;

    let changed = 0;
    const nodes = getTextNodes(container);

    for (const node of nodes) {
      const text = normalizeText(node.nodeValue);

      if (OLD_NAMES.includes(text) && text !== NEW_NAME) {
        node.nodeValue = node.nodeValue.replace(text, NEW_NAME);
        changed++;
        continue;
      }

      if (isEmailText(text) && text !== NEW_EMAIL) {
        node.nodeValue = node.nodeValue.replace(text, NEW_EMAIL);
        changed++;
      }
    }

    return changed;
  }

  function patchDocument(doc) {
    let changed = 0;

    changed += replaceNameTextNodes(doc.body || doc);
    changed += replaceEmailNearPurchasedBy(doc);

    return changed;
  }

  function run() {
    if (!location.pathname.startsWith('/shop/kr/order/')) return;

    patchDocument(document);

    for (const fr of Array.from(document.querySelectorAll('iframe'))) {
      try {
        const d = fr.contentDocument;
        if (!d) continue;
        patchDocument(d);
      } catch (_) {}
    }
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          const parent = m.target && m.target.parentElement;
          if (parent) {
            patchDocument(document);
            break;
          }
        }

        if (m.addedNodes && m.addedNodes.length) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 || n.nodeType === 3) {
              patchDocument(document);
              return;
            }
          }
        }
      }
    });

    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  run();
  startObserver();

  window.addEventListener('load', run);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) run();
  });

  const _ps = history.pushState;
  history.pushState = function () {
    _ps.apply(this, arguments);
    setTimeout(run, 150);
  };

  const _rs = history.replaceState;
  history.replaceState = function () {
    _rs.apply(this, arguments);
    setTimeout(run, 150);
  };

  window.addEventListener('popstate', () => setTimeout(run, 150));
})();
