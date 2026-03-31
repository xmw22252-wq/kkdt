// ==UserScript==
// @name         vConsole Toggle (Rolster Bstage Order)
// @namespace    https://example.local/
// @version      1.0.1
// @description  Toggle vConsole on/off via Violentmonkey menu. Loads vConsole from CDN when enabled.
// @match        https://rolster.bstage.in/shop/kr/order/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // vConsole CDN
  const VCONSOLE_URL = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js';

  // 是否启用：默认 false（不注入）
  const KEY = 'vconsole_enabled';
  const enabled = !!GM_getValue(KEY, false);

  // 菜单：开/关
  GM_registerMenuCommand(
    enabled ? '✅ vConsole: ON（点击关闭）' : '❌ vConsole: OFF（点击开启）',
    () => {
      GM_setValue(KEY, !enabled);
      location.reload();
    }
  );

  // URL 参数临时开启
  // 例如：https://rolster.bstage.in/shop/kr/order/2413379752847701?vconsole=1
  const urlEnabled = /(?:\?|&)vconsole=1(?:&|$)/.test(location.search);

  if (!enabled && !urlEnabled) return;

  // 避免重复注入
  if (window.__VCONSOLE__ || document.querySelector('#__vconsole')) return;

  function injectVConsole() {
    if (window.__VCONSOLE__ || document.querySelector('#__vconsole')) return;

    const s = document.createElement('script');
    s.src = VCONSOLE_URL;
    s.async = false;

    s.onload = function () {
      try {
        if (window.__VCONSOLE__ || document.querySelector('#__vconsole')) return;
        window.__VCONSOLE__ = new window.VConsole();
        console.log('[vConsole] injected successfully');
      } catch (err) {
        console.error('[vConsole] init failed:', err);
      }
    };

    s.onerror = function (err) {
      console.error('[vConsole] script load failed:', err);
    };

    (document.documentElement || document.head || document.body).appendChild(s);
  }

  // 尽早注入
  injectVConsole();
})();
