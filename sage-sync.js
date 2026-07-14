/**
 * sage-sync.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · iCal 同步模块
 * 从 Moodle iCal 解析事件、同步到任务系统
 * 从 study.js 抽取为独立模块
 *
 * 导出：
 *   window.SageSync = { init, load, parse, importOne, importAll, delete, render }
 * 向后兼容：
 *   window.parseIcsStudy, window.importSyncOne, window.importSyncAll, window.syncDelete
 */
(function () {
  'use strict';

  var MODULE = 'sync';
  var _initDone = false;

  /* ── 数据访问 ─────────────────────────────────── */
  function load() {
    return (window.SageData && window.SageData.getAll(MODULE)) || [];
  }

  function save(list) {
    if (window.SageData) { window.SageData.save(MODULE, list); }
  }

  function uid() {
    return (window.SageData && window.SageData.uid('sync')) || ('sync-' + Date.now());
  }

  /* ── iCal 字段解析 ────────────────────────────── */
  function field(block, name) {
    var line = block.split(/\r?\n/).find(function(x) {
      return x.indexOf(name + ':') === 0 || x.indexOf(name + ';') === 0;
    });
    if (!line) return '';
    return line.slice(line.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
  }

  function parseDate(v) {
    var c = (v || '').replace(/\D/g, '');
    return c.length >= 8 ? c.slice(0, 4) + '-' + c.slice(4, 6) + '-' + c.slice(6, 8) : '';
  }

  function esc(s) {
    return String(s).replace(/[&<>'"]/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c];
    });
  }

  function toast(t) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(t); }
  }

  /* ── 渲染事件列表 ───────────────────────────────── */
  function render(events) {
    var resultEl = document.getElementById('syncResult');
    if (!resultEl) return;

    var importBtn = document.getElementById('syncImportBtn');

    var sorted = events.slice().sort(function(a, b) {
      return (a.date || '').localeCompare(b.date || '');
    });

    if (sorted.length) {
      resultEl.innerHTML = sorted.map(function(e) {
        return '<div class="task" data-id="' + esc(e.id) + '">' +
          '<strong>' + esc(e.summary) + '</strong>' +
          '<p class="hint">' + esc(e.date) + ' · ' + esc(e.source) + (e.imported ? ' · 已导入任务' : '') + '</p>' +
          (!e.imported ? '<button class="mini" data-action="sync-import" data-id="' + esc(e.id) + '" style="margin-top:4px">导入到任务</button>' : '') +
          '<button class="mini danger" data-action="sync-delete" data-id="' + esc(e.id) + '" style="margin-top:4px;margin-left:4px">删除</button>' +
          '</div>';
      }).join('');
    } else {
      resultEl.innerHTML = '<p class="task">还没有同步过的事件。粘贴 iCal 内容开始。</p>';
    }

    if (importBtn) {
      var unimported = 0;
      for (var i = 0; i < events.length; i++) {
        if (!events[i].imported) { unimported++; }
      }
      importBtn.style.display = unimported > 0 ? 'inline-block' : 'none';
      importBtn.textContent = '全部导入任务 (' + unimported + ')';
    }
  }

  /* ── 解析 iCal ─────────────────────────────────── */
  function parseIcsStudy() {
    var inputEl = document.getElementById('icsInput');
    var raw = (inputEl && inputEl.value || '').replace(/\r?\n[ \t]/g, '');
    var resultEl = document.getElementById('syncResult');
    if (!resultEl) return;

    if (!raw || raw.indexOf('BEGIN:VCALENDAR') === -1) {
      resultEl.innerHTML = '<p class="task">这看起来不是 iCal 内容。请寻找 Moodle 的导出日历或 .ics 内容。</p>';
      return;
    }

    var blocks = raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    if (!blocks.length) {
      resultEl.innerHTML = '<p class="task">没有找到事件。</p>';
      return;
    }

    var existing = load();
    var existingKeys = {};
    for (var i = 0; i < existing.length; i++) {
      existingKeys[existing[i].summary + '|' + existing[i].date] = true;
    }

    var newEvents = [];
    for (var j = 0; j < Math.min(blocks.length, 30); j++) {
      var b = blocks[j];
      var summary = field(b, 'SUMMARY');
      var date = parseDate(field(b, 'DTSTART'));
      var key = summary + '|' + date;
      if (summary && !existingKeys[key]) {
        var event = {
          id: uid(),
          summary: summary,
          date: date,
          source: 'Moodle',
          uid_ical: field(b, 'UID'),
          imported: false,
          createdAt: new Date().toISOString()
        };
        newEvents.push(event);
        existingKeys[key] = true;
      }
    }

    if (newEvents.length) {
      save(newEvents.concat(existing));
    }

    var all = load();
    render(all);

    if (newEvents.length) {
      toast('已解析 ' + newEvents.length + ' 条新事件。');
    } else {
      toast('没有新事件，可能已经全部同步过了。');
    }
  }

  /* ── 导入单条 → 任务系统 ────────────────────────── */
  function importOne(id) {
    var events = load();
    var idx = -1;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;

    var event = events[idx];
    var taskItems = (window.SageData && window.SageData.getAll('tasks')) || [];
    taskItems.unshift({
      id: (window.SageData && window.SageData.uid('item')) || ('item-' + Date.now()),
      section: 'task',
      title: event.summary,
      type: '学习任务',
      start: new Date().toISOString().slice(0, 10),
      due: event.date,
      total: 1,
      current: 0,
      unit: '项',
      done: false,
      note: '从同步中心导入（' + event.source + '）'
    });
    if (window.SageData) { window.SageData.save('tasks', taskItems); }

    events[idx].imported = true;
    save(events);
    render(events);
    toast('已导入到任务列表。');
  }

  /* ── 全部导入 ───────────────────────────────────── */
  function importAll() {
    var events = load();
    var unimported = [];
    for (var i = 0; i < events.length; i++) {
      if (!events[i].imported) { unimported.push(events[i]); }
    }
    if (!unimported.length) return;

    var taskItems = (window.SageData && window.SageData.getAll('tasks')) || [];
    for (var j = 0; j < unimported.length; j++) {
      var e = unimported[j];
      taskItems.unshift({
        id: (window.SageData && window.SageData.uid('item')) || ('item-' + Date.now()),
        section: 'task',
        title: e.summary,
        type: '学习任务',
        start: new Date().toISOString().slice(0, 10),
        due: e.date,
        total: 1,
        current: 0,
        unit: '项',
        done: false,
        note: '从同步中心导入（' + e.source + '）'
      });
    }
    if (window.SageData) { window.SageData.save('tasks', taskItems); }

    var unimportedIds = {};
    for (var k = 0; k < unimported.length; k++) {
      unimportedIds[unimported[k].id] = true;
    }
    for (var m = 0; m < events.length; m++) {
      if (unimportedIds[events[m].id]) { events[m].imported = true; }
    }
    save(events);
    render(events);
    toast('已导入 ' + unimported.length + ' 条任务。');
  }

  /* ── 删除事件 ───────────────────────────────────── */
  function deleteEvent(id) {
    if (!confirm('确定删除这条同步记录吗？')) return;
    var events = load();
    var filtered = [];
    for (var i = 0; i < events.length; i++) {
      if (events[i].id !== id) { filtered.push(events[i]); }
    }
    save(filtered);
    render(load());
  }

  /* ── 绑定事件委托 ────────────────────────────────── */
  function bind() {
    var resultEl = document.getElementById('syncResult');
    if (!resultEl || resultEl.dataset._sageSyncBound) return;
    resultEl.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');
      if (action === 'sync-import') { importOne(id); }
      if (action === 'sync-delete') { deleteEvent(id); }
    });
    resultEl.dataset._sageSyncBound = '1';
  }

  /* ── 初始化 ─────────────────────────────────────── */
  function init() {
    if (_initDone) return;
    _initDone = true;
    bind();
    var all = load();
    if (all.length) { render(all); }
  }

  /* ── 向后兼容（study.html 中的 onclick） ──────────── */
  window.parseIcsStudy = parseIcsStudy;
  window.importSyncOne = importOne;
  window.importSyncAll = importAll;
  window.syncDelete = deleteEvent;

  /* ── 导出 ────────────────────────────────────────── */
  window.SageSync = {
    init: init,
    load: load,
    parse: parseIcsStudy,
    importOne: importOne,
    importAll: importAll,
    delete: deleteEvent,
    render: render
  };

  window.__sageSyncLoaded = true;
})();
