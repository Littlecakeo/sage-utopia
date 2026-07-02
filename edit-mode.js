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
  const BRAND_TAG_KEY = EDIT_PREFIX + 'brand.tag';
  const LEGACY_BRAND_KEYS = [EDIT_PREFIX + 'mobile.brand.tag', EDIT_PREFIX + 'side.brand.tag'];
  const EDITABLE_SELECTOR = '.brand .tag, main .desc, main .sub, main .hint, main .task-title, main .task-meta, main .task-note, main .date-pill, main .chip, main .link-card .tag, main .profile-list p, main .term-card p, main .decision-card p, main td:not(:first-child), .resume-editable h2, .resume-editable h3, .resume-editable .task strong, .resume-editable .editable-text';

  /* ── 页面与分支索引 ── */
  const PAGE_BY_HASH = {
    home: 'index.html',
    study: 'study.html',
    career: 'career.html',
    portfolio: 'resume.html',
    resume: 'resume.html',
    about: 'about.html'
  };

  const SECTION_INDEX = {
    'index.html': [{ label: '操作区', selector: '#taskBoard' }],
    'study.html': [{ label: '课程', selector: '#planner' }, { label: '作业', selector: '#assignments' }, { label: '官方链接', selector: '#links' }, { label: '同步', selector: '#sync' }],
    'career.html': [{ label: '概览', selector: '#careerOverview' }, { label: '新增机会', selector: '#careerFormSection' }, { label: '求职列表', selector: '#careerListSection' }],
    'resume.html': [{ label: '摘要', selector: 'main .hero' }, { label: '关于', selector: '#resume-about' }, { label: '作品', selector: '#resume-portfolio' }, { label: '联系', selector: '#resume-contact' }, { label: '数据', selector: '#data-management' }],
    'about.html': [{ label: '关于', selector: '#resume-about' }, { label: '联系', selector: '#resume-contact' }]
  };

  let dirty = false;
  let activeEditable = null;
  let siteContentCache = new Map();

  function pathKey() {
    var h = (location.hash || '').replace('#', '');
    return PAGE_BY_HASH[h] || location.pathname.split('/').pop() || 'index.html';
  }

  function editableKey(index, el) {
    if (el && el.matches && el.matches('.brand .tag')) return BRAND_TAG_KEY;
    var tag = el ? el.tagName.toLowerCase() : '';
    var text = (el ? el.textContent : '').trim().slice(0, 24).replace(/[^\w\u4e00-\u9fa5]/g, '');
    var cls = el && el.className ? String(el.className).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) : '';
    return EDIT_PREFIX + pathKey() + '.' + index + '.' + tag + cls + text;
  }

  function savedBrandTag() {
    var saved = localStorage.getItem(BRAND_TAG_KEY);
    if (saved !== null) return saved;
    for (var i = 0; i < LEGACY_BRAND_KEYS.length; i += 1) {
      saved = localStorage.getItem(LEGACY_BRAND_KEYS[i]);
      if (saved !== null) return saved;
    }
    return null;
  }

  function syncBrandTags(source) {
    if (!source || !source.matches || !source.matches('.brand .tag')) return;
    document.querySelectorAll('.brand .tag').forEach(function (tag) {
      if (tag !== source) tag.innerHTML = source.innerHTML;
      tag.classList.toggle('editable-empty', !tag.textContent.trim());
    });
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

  async function loadSiteContent() {
    siteContentCache = new Map();
    if (!window.SageData) return;
    try {
      const rows = await window.SageData.loadAsync('siteContent');
      rows.forEach(function (row) {
        if (row.content_key) siteContentCache.set(row.content_key, row.html || '');
      });
    } catch (err) {
      toast(err.message || '页面文案加载失败，请检查云端连接。');
    }
  }

  async function loadEdits() {
    await loadSiteContent();
    getEditables().forEach(function (el, index) {
      var key = editableKey(index, el);
      el.dataset.editable = 'true';
      el.dataset.editKey = key;
      el.dataset.original = el.innerHTML;
      el.contentEditable = 'true';
      el.spellcheck = false;
      var saved = siteContentCache.has(key) ? siteContentCache.get(key) : localStorage.getItem(key);
      if (el.matches('.brand .tag') && !siteContentCache.has(key)) saved = savedBrandTag();
      if (saved !== null) {
        el.innerHTML = saved;
        el.dataset.original = saved;
      }
      if (el.matches('.brand .tag')) syncBrandTags(el);
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
  }

  function positionSaveDock(target) {
    var dock = document.querySelector('.edit-save-dock');
    var source = target || activeEditable;
    if (!dock || !source || !source.getBoundingClientRect) return;
    var rect = source.getBoundingClientRect();
    var dockRect = dock.getBoundingClientRect();
    var gap = 10;
    var left = rect.right + gap;
    var top = rect.top + Math.max(0, (rect.height - dockRect.height) / 2);
    if (left + dockRect.width > window.innerWidth - 10) {
      left = Math.min(Math.max(10, rect.left), window.innerWidth - dockRect.width - 10);
      top = rect.bottom + gap;
    }
    if (top + dockRect.height > window.innerHeight - 10) top = Math.max(10, rect.top - dockRect.height - gap);
    dock.style.left = Math.round(Math.max(10, left)) + 'px';
    dock.style.top = Math.round(Math.max(10, top)) + 'px';
  }

  function markDirty(target) {
    dirty = true;
    document.body.classList.add('has-unsaved-edits');
    positionSaveDock(target);
  }

  async function saveEdits() {
    var editables = getEditables();
    try {
      await Promise.all(editables.map(function (el, index) {
        var key = el.dataset.editKey || editableKey(index, el);
        el.dataset.editKey = key;
        localStorage.setItem(key, el.innerHTML);
        if (el.matches('.brand .tag')) localStorage.setItem(BRAND_TAG_KEY, el.innerHTML);
        if (!window.SageData) return Promise.resolve();
        return window.SageData.cloudUpsertBy('siteContent', 'content_key', key, {
          content_key: key,
          page_key: pathKey(),
          selector_hint: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
          html: el.innerHTML,
          plain_text: el.textContent.trim()
        });
      }));
    } catch (err) {
      toast(err.message || '保存失败，请先解锁管理模式并检查 Supabase。');
      return;
    }
    editables.forEach(function (el) {
      el.dataset.original = el.innerHTML;
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
    dirty = false;
    document.body.classList.remove('has-unsaved-edits');
    activeEditable = null;
    toast('已保存到云端');
  }

  function discardEdits() {
    if (!dirty) return;
    getEditables().forEach(function (el) {
      el.innerHTML = el.dataset.original || '';
      el.classList.toggle('editable-empty', !el.textContent.trim());
    });
    dirty = false;
    document.body.classList.remove('has-unsaved-edits');
    activeEditable = null;
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

  async function initSageEditMode() {
    addSectionIndex();
    document.body.classList.add('sage-edits-loading');
    try {
      await loadEdits();
    } finally {
      addSaveDock();
      document.body.classList.remove('sage-edits-loading');
      document.body.classList.add('sage-edits-ready');
      document.dispatchEvent(new CustomEvent('sage:edits-loaded'));
    }
  }

  /* ── 事件绑定 ── */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el && el.dataset && el.dataset.editable) {
      activeEditable = el;
      syncBrandTags(el);
      markDirty(el);
    }
  });

  document.addEventListener('focus', function (e) {
    var el = e.target;
    if (el && el.dataset && el.dataset.editable) {
      activeEditable = el;
      if (dirty) positionSaveDock(el);
      if (!sessionStorage.getItem('sage.edit.hint')) {
        sessionStorage.setItem('sage.edit.hint', '1');
        toast('可以直接改内容，记得保存更改');
      }
    }
  }, true);

  window.addEventListener('scroll', function () { if (dirty) positionSaveDock(); }, true);
  window.addEventListener('resize', function () { if (dirty) positionSaveDock(); });

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
    s.src = 'site-shell.js?v=10';
    s.dataset.sageSiteShell = 'true';
    document.body.appendChild(s);
  })();

})();
