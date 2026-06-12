/**
 * tasks.js v2.1
 * ─────────────────────────────────────
 * Sage Utopia · 任务管理模块
 * - IIFE 包裹，消除全局变量泄露
 * - 通过 SageData 统一数据层读写
 * - _prevCurrent 改用内存 Map，不再污染 localStorage
 */
(function () {
  'use strict';

  const MODULE = 'tasks';
  const OLD_KEY = 'sage.progress.items.v1';

  /* ── 默认数据 ── */
  const defaults = [
    { id: 'progress-book', section: 'progress', title: '读完一本传播学相关书', type: '阅读', start: '2026-06-05', due: '2026-07-05', total: 320, current: 48, unit: '页', done: false, note: '每天记录看到第几页。' },
    { id: 'progress-portfolio', section: 'progress', title: '整理作品集首页', type: '作品集', start: '2026-06-05', due: '2026-06-16', total: 5, current: 1, unit: '步', done: false, note: '封面、项目简介、负责内容、成果展示、联系方式。' },
    { id: 'habit-reading', section: 'habit', title: '每天阅读 20 分钟', type: '阅读习惯', start: '2026-06-05', due: '', total: 30, current: 3, unit: '天', done: false, note: '适合记录连续天数或本月完成次数。' },
    { id: 'habit-portfolio', section: 'habit', title: '每周更新一次作品集', type: '成长习惯', start: '2026-06-05', due: '', total: 12, current: 1, unit: '次', done: false, note: '每次只补充一个小地方也算。' },
    { id: 'task-moodle', section: 'task', title: '检查 Moodle 作业截止日期', type: '学习任务', start: '2026-06-05', due: '2026-06-08', total: 1, current: 0, unit: '项', done: false, note: '同步中心可以辅助整理。' }
  ];

  let items = [];
  const prevCurrents = new Map(); // 内存缓存 completeItem 前的进度，不持久化到 localStorage

  const sectionMeta = {
    progress: { title: '进度追踪', empty: '这里放长期目标，比如读完一本书、整理作品集、完成课程项目。' },
    habit: { title: '习惯养成', empty: '这里放每天或每周重复的小习惯，比如阅读、运动、复盘。' },
    task: { title: '任务清单', empty: '这里放一次性待办，比如提交作业、投递申请、整理文件。' }
  };

  /* ── 工具函数 ── */
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function num(v, fallback) { var n = Number(v); return (v === '' || v === null || v === undefined || !Number.isFinite(n)) ? (fallback || 0) : n; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function pct(item) { var t = Math.max(num(item.total, 1), 1); return Math.round(clamp(num(item.current, 0) / t, 0, 1) * 100); }
  function normalize(item) { return Object.assign({}, item, { section: item.section || guessSection(item.type), total: Math.max(num(item.total, 1), 1), current: num(item.current, 0), unit: item.unit || '项' }); }
  function guessSection(type) { if (type && String(type).indexOf('习惯') !== -1) return 'habit'; if (['阅读', '作品集', '成长'].indexOf(type) !== -1) return 'progress'; return 'task'; }
  function escapeHTML(s) { return String(s).replace(/[&<>'"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]; }); }
  function defaultUnit(section) { return section === 'habit' ? '天' : section === 'progress' ? '步' : '项'; }
  function isDueSoon(item) { if (item.done || !item.due) return false; var d = new Date(item.due + 'T00:00:00'); var now = new Date(todayISO() + 'T00:00:00'); var diff = (d - now) / 86400000; return diff >= 0 && diff <= 7; }
  function isOverdue(item) { if (item.done || !item.due) return false; var d = new Date(item.due + 'T00:00:00'); var now = new Date(todayISO() + 'T00:00:00'); return (d - now) / 86400000 < 0; }

  /* ── 数据读写（通过 SageData 统一数据层） ── */
  function loadItems() {
    try {
      var list = window.SageData ? window.SageData.getAll(MODULE) : null;
      if (!list || !list.length) {
        // v1 → v2 迁移
        var old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
        list = old ? old.map(normalize) : defaults;
      }
      items = list.map(normalize);
      saveItems();
    } catch {
      items = defaults;
      saveItems();
    }
  }

  function saveItems() {
    if (window.SageData) {
      window.SageData.save(MODULE, items);
    } else {
      // fallback：SageData 未加载时直接写 localStorage
      try { localStorage.setItem('sage.progress.items.v2', JSON.stringify(items)); } catch (e) { console.error('[tasks] save error:', e); }
    }
  }

  /* ── 用户操作 ── */
  function quickType(section, type) {
    var elS = document.getElementById('itemSection'); if (elS) elS.value = section;
    var elT = document.getElementById('itemType'); if (elT) elT.value = type;
    var elF = document.getElementById('itemTitle'); if (elF) elF.focus();
    var board = document.getElementById('taskBoard'); if (board) board.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addItem(e) {
    e.preventDefault();
    var title = document.getElementById('itemTitle').value.trim();
    if (!title) return;
    var total = Math.max(num(document.getElementById('itemTotal').value, 1), 1);
    var current = clamp(num(document.getElementById('itemCurrent').value, 0), 0, total);
    var section = document.getElementById('itemSection').value;
    items.unshift({
      id: window.SageData ? window.SageData.uid('item') : ('item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
      section: section, title: title,
      type: document.getElementById('itemType').value.trim() || sectionMeta[section].title,
      start: document.getElementById('itemStart').value,
      due: document.getElementById('itemDue').value,
      total: total, current: current,
      unit: document.getElementById('itemUnit').value.trim() || defaultUnit(section),
      done: current >= total,
      note: ''
    });
    document.getElementById('itemForm').reset();
    saveItems(); renderItems();
    say('已收好啦。它已经放进对应分区，可以直接记录进度。');
  }

  function updateProgress(id) {
    var input = document.getElementById('progress-' + id);
    items = items.map(function (item) {
      if (item.id !== id) return item;
      var total = Math.max(num(item.total, 1), 1);
      var current = clamp(num(input.value, item.current), 0, total);
      return Object.assign({}, item, { current: current, done: current >= total });
    });
    saveItems(); renderItems();
    say('进度更新好了。慢慢推进也很厉害。');
  }

  function completeItem(id) {
    items = items.map(function (item) {
      if (item.id !== id) return item;
      prevCurrents.set(id, item.current); // 内存缓存，不持久化到 localStorage
      return Object.assign({}, item, { current: Math.max(num(item.total, 1), 1), done: true });
    });
    saveItems(); renderItems();
    say('完成啦，给今天的自己一点掌声。');
  }

  function restoreItem(id) {
    items = items.map(function (item) {
      if (item.id !== id) return item;
      var prev = prevCurrents.get(id);
      var restored = prev != null ? prev : Math.min(num(item.current, 0), Math.max(num(item.total, 1) - 1, 0));
      prevCurrents.delete(id);
      return Object.assign({}, item, { done: false, current: restored });
    });
    saveItems(); renderItems();
    say('已恢复，继续加油。');
  }

  function deleteItem(id) {
    if (!confirm('确定删除这一项吗？')) return;
    items = items.filter(function (item) { return item.id !== id; });
    saveItems(); renderItems();
  }

  /* ── 通知（委托 SageUI） ── */
  function say(text) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(text); }
  }

  /* ── UI 渲染 ── */
  function itemCard(item) {
    var percent = pct(item);
    var unit = item.unit || '项';
    var overdue = isOverdue(item);
    return '<details class="task-row task-collapsible ' + (item.done ? 'done' : '') + '">' +
      '<summary class="task-summary"><div class="task-card-top"><div>' +
      '<div class="task-title">' + escapeHTML(item.title) + '</div>' +
      '<div class="task-meta">' + escapeHTML(item.type) + ' · ' + item.current + '/' + item.total + ' ' + escapeHTML(unit) + ' · ' + percent + '%</div></div>' +
      '<span class="task-badge ' + (overdue ? 'overdue' : '') + '">' + (item.done ? '已完成' : overdue ? '已过期' : percent >= 70 ? '接近完成' : '进行中') + '</span></div></summary>' +
      '<div class="task-details">' +
      '<div class="progress-track"><span class="progress-fill" style="width:' + percent + '%"></span></div>' +
      '<div class="progress-line"><span>进度 ' + percent + '%</span><span>' + item.current + '/' + item.total + ' ' + escapeHTML(unit) + '</span></div>' +
      '<div class="date-row">' + (item.start ? '<span class="date-pill">开始 ' + item.start + '</span>' : '') + (item.due ? '<span class="date-pill ' + (overdue ? 'overdue' : '') + '">计划截止 ' + item.due + '</span>' : '<span class="date-pill">长期保持</span>') + '</div>' +
      '<div class="progress-update"><input class="field" id="progress-' + item.id + '" type="number" min="0" max="' + item.total + '" value="' + item.current + '" placeholder="更新当前进度">' +
      '<button class="mini ghost" data-action="update" data-id="' + item.id + '">记录</button></div>' +
      '<div class="task-actions">' +
      '<button class="mini ghost" data-action="' + (item.done ? 'restore' : 'complete') + '" data-id="' + item.id + '">' + (item.done ? '恢复' : '完成') + '</button>' +
      '<button class="mini danger" data-action="delete" data-id="' + item.id + '">删除</button>' +
      '</div></div></details>';
  }

  function fillSection(section) {
    var list = items.filter(function (item) { return item.section === section; });
    var active = list.filter(function (item) { return !item.done && pct(item) < 100; });
    var done = list.filter(function (item) { return item.done || pct(item) >= 100; });
    var listEl = document.getElementById(section + 'List');
    var doneEl = document.getElementById(section + 'Done');
    var countEl = document.getElementById(section + 'Count');
    var avgEl = document.getElementById(section + 'Avg');
    if (listEl) listEl.innerHTML = active.length ? active.map(itemCard).join('') : '<div class="empty">' + sectionMeta[section].empty + '</div>';
    if (doneEl) doneEl.innerHTML = done.length ? done.map(itemCard).join('') : '<div class="empty">完成后会出现在这里。</div>';
    if (countEl) countEl.textContent = active.length;
    if (avgEl) avgEl.textContent = list.length ? Math.round(list.reduce(function (s, item) { return s + pct(item); }, 0) / list.length) + '%' : '0%';
  }

  function renderItems() {
    fillSection('progress'); fillSection('habit'); fillSection('task');
    var open = items.filter(function (item) { return !item.done && pct(item) < 100; }).length;
    var soon = items.filter(isDueSoon).length;
    var average = items.length ? Math.round(items.reduce(function (s, item) { return s + pct(item); }, 0) / items.length) : 0;
    var done = items.filter(function (item) { return item.done || pct(item) >= 100; }).length;
    var el = function (id) { return document.getElementById(id); };
    if (el('openCount')) el('openCount').textContent = open;
    if (el('todayCount')) el('todayCount').textContent = soon;
    if (el('weekCount')) el('weekCount').textContent = average + '%';
    if (el('doneCount')) el('doneCount').textContent = done;
  }

  /* ── 事件委托：处理所有 data-action 按钮（替代 onclick 拼接，消除 XSS 风险） ── */
  function handleTaskAction(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (!id) return;
    switch (action) {
      case 'update': updateProgress(id); break;
      case 'complete': completeItem(id); break;
      case 'restore': restoreItem(id); break;
      case 'delete': deleteItem(id); break;
    }
    e.preventDefault();
  }

  function bindTaskContainer() {
    ['progressList', 'habitList', 'taskList', 'progressDone', 'habitDone', 'taskDone'].forEach(function (cid) {
      var el = document.getElementById(cid);
      if (el && !el.dataset._sageTasksBound) {
        el.addEventListener('click', handleTaskAction);
        el.dataset._sageTasksBound = '1';
      }
    });
  }

  /* ── 导出 ── */
  window.SageTasks = {
    addItem: addItem, deleteItem: deleteItem, updateProgress: updateProgress,
    completeItem: completeItem, restoreItem: restoreItem, quickType: quickType,
    loadItems: loadItems, renderItems: renderItems, bindTaskContainer: bindTaskContainer
  };

  /* ── 初始化 ── */
  var _itemForm = document.getElementById('itemForm');
  if (_itemForm) _itemForm.addEventListener('submit', addItem);
  loadItems();
  renderItems();
  bindTaskContainer();

})();
