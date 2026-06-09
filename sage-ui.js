/**
 * sage-ui.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · 共享 UI 工具模块
 * 统一 toast 通知，消除各模块中 say()/toast() 的重复实现
 * 单一定时器队列，防止多 toast 互斥
 */
(function () {
  'use strict';

  var timer = null;

  function ensureToast(id, cssText) {
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = cssText;
    document.body.appendChild(el);
    return el;
  }

  /**
   * toast(text, duration?)
   * 底部居中的通知泡，duration 默认 2000ms
   */
  function toast(text, duration) {
    duration = duration || 2000;
    var el = ensureToast('sageToast',
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#334139;color:#fff;' +
      'border-radius:999px;padding:10px 16px;font-size:13px;font-weight:800;z-index:10000;' +
      'opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease'
    );
    el.textContent = text;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(timer);
    timer = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(8px)';
    }, duration);
  }

  window.SageUI = { toast: toast };

})();
