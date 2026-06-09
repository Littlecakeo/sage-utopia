/**
 * edit-mode.js v2.1
 * ─────────────────────────────────────
 * Sage Utopia · 内容编辑模块
 * - IIFE 包裹，消除全局变量泄露
 * - 清理 PAGE_BY_HASH / SECTION_INDEX 中已删除的幽灵页面
 * - 仅导出 window.initSageEditMode
 */
(function () {
  'use strict';

  const EDIT_PREFIX = 'sage.edit.v2.';
  const EDITABLE_SELECTOR = '.brand .tag, main .desc, main .sub, main .hint, main .task-title, main .task-meta, main .task-note, main .date-pill, main .chip, main .link-card .tag, main .profile-list p, main .term-card p, main .decision-card p, main td:not(:first-child)';

  /* ── 当前 5 个有效页面 ── */
  const PAGE_BY_HASH = {
    home: 'index.html',
    study: 'study.html',
    career: 'career.html',
    growth: 'growth.html',
    resume: 'resume.html'
  };

  const SECTION_INDEX = {
    'index.html': [{ label: '快速新增', selector: '#quickAdd' }, { label: '操作区', selector: '#taskBoard' }],
    'study.html': [{ label: '换课', selector: '#planner' }, { label: '官方链接', selector: '#links' }, { label: '485', selector: '#visa' }, { label: '同步', selector: '#sync-study' }],
    'career.html': [{ label: '概览', selector: 'main .grid.three' }, { label: '求职列表', selector: 'main .section' }],
    'growth.html': [{ label: '概览', selector: 'main .grid.three' }, { label: '时间轴', selector: 'main .section' }],
    'resume.html': [{ label: '摘要', selector: 'main .hero' }, { label: '关于', selector: '#resume-about' }, { label: '联系', selector: '#resume-contact' }, { label: '作品', selector: '#resume-portfolio' }, { label: '技能', selector: '#resume-skills' }]
  };

  let dirty = false;

  function pathKey() {
    var h = (location.hash || '').replace('#', '');
    return PAGE_BY_HASH[h] || location.pathname.split('/').pop() || 'index.html';
  }

  function editableKey(index, el) {
    if (el && el.matches && el.matches('.brand .tag')) return EDIT_PREFIX + (el.closest('.mobile') ? 'mobile.brand.tag' : 'side.brand.tag');
    var tag = el ? el.tagName.toLowerCase() : '';
    var text = (el ? el.textContent : '').trim().slice(0, 24).replace(/[^\w\u4e00-\u9fa5]/g, '');
    var cls = el && el.className ? String(el.className).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) : '';
    return EDIT_PREFIX + pathKey() + '.' + index + '.' + tag + cls + text;
  }

  function getEditables() {
    return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(function (el) {
      if (el.matches('.brand .tag')) return true;
      return !el.closest('.nav') && !el.closest('.mobile') && !el.closest('script') && !el.closest('form') &&
        !el.closest('button') && !el.closest('textarea') && !el.closest('input') && !el.closest('select') &&
        !el.closest('.edit-save-dock') && !el.closest('.section-index') && !el.closest('.mobile-branches') &&
        !el.closest('thead') && !el.closest('.study-top-stats');
    });
  }

  function loadEdits() {
    getEditables().forEach(function (el, index) {
      var key = editableKey(index, el);
      el.dataset.editable = 'true';
      el.dataset.editKey = key;
      el.dataset.original = el.innerHTML;
      el.contentEditable = 'true';
      el.spellcheck = false;
      var saved = localStorage.getItem(key);
      if (saved !== null) {
        el.innerHTML = saved;
        el.dataset.original = saved;
      }
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
  }

  function markDirty() {
    dirty = true;
    document.body.classList.add('has-unsaved-edits');
  }

  function saveEdits() {
    getEditables().forEach(function (el, index) {
      var key = editableKey(index, el);
      el.dataset.editKey = key;
      localStorage.setItem(key, el.innerHTML);
      el.dataset.original = el.innerHTML;
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
    dirty = false;
    document.body.classList.remove('has-unsaved-edits');
    toast('已保存更改');
  }

  function discardEdits() {
    if (!dirty) return;
    getEditables().forEach(function (el) {
      el.innerHTML = el.dataset.original || '';
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
    dirty = false;
    document.body.classList.remove('has-unsaved-edits');
    toast('已放弃本次更改');
  }

  function toast(text) {
    var el = document.querySelector('.edit-toast');
    if (!el) {
      el = document.createElement('div'); el.className = 'edit-toast';
      document.body.appendChild(el);
    }
    el.textContent = text; el.classList.add('show');
    clearTimeout(window.__editToastTimer);
    window.__editToastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function addSaveDock() {
    if (document.querySelector('.edit-save-dock')) return;
    var dock = document.createElement('div'); dock.className = 'edit-save-dock';
    dock.innerHTML = '<span>有未保存的修改</span><button type="button" id="saveEditsBtn">保存更改</button><button type="button" class="quiet" id="discardEditsBtn">放弃更改</button>';
    document.body.appendChild(dock);
    document.getElementById('saveEditsBtn').addEventListener('click', saveEdits);
    document.getElementById('discardEditsBtn').addEventListener('click', discardEdits);
  }

  function cleanId(text, index) {
    return 'section-' + String(text || index).trim().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) + '-' + index;
  }

  function addSectionIndex() {
    document.querySelectorAll('.section-index').forEach(function (el) { el.remove(); });
    var entries = SECTION_INDEX[pathKey()] || SECTION_INDEX['index.html'];
    var links = entries.map(function (item, index) {
      var target = document.querySelector(item.selector);
      if (!target) return null;
      if (!target.id) target.id = cleanId(item.label, index);
      return { label: item.label, id: target.id };
    }).filter(Boolean);
    if (!links.length) return;
    var active = document.querySelector('.side .nav a.active');
    if (active) {
      var wrap = document.createElement('div'); wrap.className = 'section-index';
      wrap.innerHTML = '<p>本页分支</p>' + links.map(function (link) { return '<a href="#' + link.id + '">' + link.label + '</a>'; }).join('');
      active.insertAdjacentElement('afterend', wrap);
    }
  }

  function initSageEditMode() {
    addSectionIndex();
    loadEdits();
    addSaveDock();
  }

  /* ── 事件绑定 ── */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el && el.dataset && el.dataset.editable) markDirty();
  });

  document.addEventListener('focus', function (e) {
    var el = e.target;
    if (el && el.dataset && el.dataset.editable && !sessionStorage.getItem('sage.edit.hint')) {
      sessionStorage.setItem('sage.edit.hint', '1');
      toast('可以直接改内容，记得保存更改');
    }
  }, true);

  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ── 导出 ── */
  window.initSageEditMode = initSageEditMode;

  /* ── 初始化 + 加载 SPA 路由 ── */
  initSageEditMode();

  (function loadSageSiteShell() {
    if (document.querySelector('script[data-sage-site-shell]')) return;
    var s = document.createElement('script');
    s.src = 'site-shell.js?v=8';
    s.dataset.sageSiteShell = 'true';
    document.body.appendChild(s);
  })();

})();
