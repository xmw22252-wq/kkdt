// ==UserScript==
// @name         Rolster order page name & email replace
// @namespace    local.rolster.bstage
// @version      1.1.0
// @description  Replace purchaser name and email on rolster order page
// @match        https://rolster.bstage.in/shop/kr/order/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ===== 原名字 / 新名字 =====
  const OLD_NAMES = [
    'RUIRUI HOU',
    'HOU RUIRUI',
  ];
  const NEW_NAME = 'WEN WEN';

  // ===== 邮箱 =====
  const NEW_EMAIL = 'yuzip3942@naver.com';

  let scheduled = false;
  let lastApplied = 0;

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      run();
    }, 120);
  }

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function getLeafElements(root = document) {
    return Array.from(root.querySelectorAll('*')).filter(el => {
      return el.children.length === 0;
    });
  }

  function replaceExactText(ROOT, oldValue, newValue) {
    const leafs = getLeafElements(ROOT);
    let changed = 0;

    for (const el of leafs) {
      const t = normalizeText(el.textContent);
      if (t === oldValue) {
        el.textContent = newValue;
        changed++;
      }
    }

    return changed;
  }

  function replaceName(ROOT) {
    let total = 0;
    for (const oldName of OLD_NAMES) {
      total += replaceExactText(ROOT, oldName, NEW_NAME);
    }
    return total;
  }

  // ===== 新增：邮箱替换（自动识别 email 格式）=====
  function replaceEmail(ROOT) {
    const leafs = getLeafElements(ROOT);
    let changed = 0;

    for (const el of leafs) {
      const t = normalizeText(el.textContent);

      // 简单判断是不是邮箱
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
        el.textContent = NEW_EMAIL;
        changed++;
      }
    }

    return changed;
  }

  function run() {
    if (!location.pathname.startsWith('/shop/kr/order/')) return;

    const now = Date.now();
    if (now - lastApplied < 500) return;

    let changed = 0;

    // 主文档
    changed += replaceName(document);
    changed += replaceEmail(document);

    // iframe
    for (const fr of Array.from(document.querySelectorAll('iframe'))) {
      try {
        const d = fr.contentDocument;
        if (!d) continue;
        changed += replaceName(d);
        changed += replaceEmail(d);
      } catch (_) {}
    }

    if (changed > 0) {
      lastApplied = now;
    }
  }

  // ===== 触发 =====
  schedule();

  const mo = new MutationObserver(() => schedule());
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule();
  });

  const _ps = history.pushState;
  history.pushState = function () {
    _ps.apply(this, arguments);
    schedule();
  };

  const _rs = history.replaceState;
  history.replaceState = function () {
    _rs.apply(this, arguments);
    schedule();
  };

  window.addEventListener('popstate', () => schedule());
  window.addEventListener('load', () => schedule());
  window.addEventListener('click', () => schedule(), true);

  setInterval(() => schedule(), 1500);
})();
