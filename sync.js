/**
 * sync.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · 同步中心（iCal 解析 + 持久化 + 任务导入）
 * 数据通过 sage-data.js 持久化到 localStorage
 */
(function () {
  'use strict';

  const MODULE = 'sync';

  /* ── 数据访问 ─────────────────────────────────────── */
  function load()    { return window.SageData?.getAll(MODULE) || []; }
  function save(list) { window.SageData?.save(MODULE, list); }
  function uid()      { return window.SageData?.uid('sync') || ('sync-' + Date.now()); }

  /* ── iCal 字段解析 ────────────────────────────────── */
  function field(block, name) {
    const line = block.split(/\r?\n/).find(x => x.startsWith(name + ':') || x.startsWith(name + ';'));
    if (!line) return '';
    return line.slice(line.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
  }

  function parseDate(v) {
    const c = (v || '').replace(/\D/g, '');
    return c.length >= 8 ? c.slice(0, 4) + '-' + c.slice(4, 6) + '-' + c.slice(6, 8) : '';
  }

  /* ── 解析 iCal 并持久化 ───────────────────────────── */
  window.parseIcs = function () {
    const raw = document.getElementById('ics')?.value.replace(/\r?\n[ \t]/g, '') || '';
    const resultEl = document.getElementById('result');
    if (!resultEl) return;

    if (!raw.includes('BEGIN:VCALENDAR')) {
      resultEl.innerHTML = '<p class="task">这看起来不是 iCal 内容。请寻找 Moodle 的导出日历或 .ics 内容。</p>';
      return;
    }

    const blocks = raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    if (!blocks.length) {
      resultEl.innerHTML = '<p class="task">没有找到事件。</p>';
      return;
    }

    // 解析并去重（基于 SUMMARY + DTSTART 组合）
    const existing = load();
    const existingKeys = new Set(existing.map(e => e.summary + '|' + e.date));
    const newEvents = [];

    blocks.slice(0, 30).forEach(b => {
      const summary = field(b, 'SUMMARY');
      const date = parseDate(field(b, 'DTSTART'));
      const key = summary + '|' + date;
      if (summary && !existingKeys.has(key)) {
        const event = {
          id: uid(),
          summary,
          date,
          source: 'Moodle',
          uid_ical: field(b, 'UID'),
          imported: false,
          createdAt: new Date().toISOString(),
        };
        newEvents.push(event);
        existingKeys.add(key);
      }
    });

    // 合并保存
    if (newEvents.length) {
      const merged = [...newEvents, ...existing];
      save(merged);
    }

    // 渲染结果
    const all = load();
    renderEvents(all);
    renderImportButton(all);

    if (newEvents.length) {
      say('已解析 ' + newEvents.length + ' 条新事件。');
    } else {
      say('没有新事件，可能已经全部同步过了。');
    }
  };

  /* ── 渲染事件列表 ─────────────────────────────────── */
  function renderEvents(events) {
    const resultEl = document.getElementById('result');
    if (!resultEl) return;

    const sorted = [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    resultEl.innerHTML = sorted.length
      ? sorted.map(e => `
          <div class="task" data-id="${e.id}">
            <strong>${esc(e.summary)}</strong>
            <p class="hint">${esc(e.date)} · ${esc(e.source)}${e.imported ? ' · 已导入任务' : ''}</p>
            ${!e.imported ? `<button class="mini" onclick="syncImportOne('${e.id}')" style="margin-top:4px">导入到任务</button>` : ''}
            <button class="mini danger" onclick="syncDelete('${e.id}')" style="margin-top:4px;margin-left:4px">删除</button>
          </div>`).join('')
      : '<p class="task">还没有同步过的事件。粘贴 iCal 内容开始。</p>';
  }

  /* ── 渲染"全部导入"按钮 ─────────────────────────── */
  function renderImportButton(events) {
    const btnEl = document.getElementById('syncImportAll');
    if (!btnEl) return;
    const unimported = events.filter(e => !e.imported).length;
    btnEl.style.display = unimported > 0 ? 'inline-block' : 'none';
    btnEl.textContent = '全部导入到任务列表 (' + unimported + ')';
  }

  /* ── 导入单条事件到任务系统 ──────────────────────── */
  window.syncImportOne = function (id) {
    const events = load();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return;

    const event = events[idx];

    // 导入到 tasks 模块
    const taskItems = JSON.parse(localStorage.getItem('sage.progress.items.v2') || '[]');
    taskItems.unshift({
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      section: 'task',
      title: event.summary,
      type: '学习任务',
      start: new Date().toISOString().slice(0, 10),
      due: event.date,
      total: 1,
      current: 0,
      unit: '项',
      done: false,
      note: '从同步中心导入（' + event.source + '）',
    });
    localStorage.setItem('sage.progress.items.v2', JSON.stringify(taskItems));

    // 标记已导入
    events[idx].imported = true;
    save(events);

    renderEvents(events);
    renderImportButton(events);
    say('已导入到任务列表。');
  };

  /* ── 全部导入 ─────────────────────────────────────── */
  window.syncImportAll = function () {
    const events = load();
    const unimported = events.filter(e => !e.imported);
    if (!unimported.length) return;

    const taskItems = JSON.parse(localStorage.getItem('sage.progress.items.v2') || '[]');
    unimported.forEach(event => {
      taskItems.unshift({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        section: 'task',
        title: event.summary,
        type: '学习任务',
        start: new Date().toISOString().slice(0, 10),
        due: event.date,
        total: 1,
        current: 0,
        unit: '项',
        done: false,
        note: '从同步中心导入（' + event.source + '）',
      });
      event.imported = true;
    });
    localStorage.setItem('sage.progress.items.v2', JSON.stringify(taskItems));
    save(events);

    renderEvents(events);
    renderImportButton(events);
    say('已导入 ' + unimported.length + ' 条任务。');
  };

  /* ── 删除事件 ─────────────────────────────────────── */
  window.syncDelete = function (id) {
    if (!confirm('确定删除这条同步记录吗？')) return;
    save(load().filter(e => e.id !== id));
    const all = load();
    renderEvents(all);
    renderImportButton(all);
  };

  /* ── 工具函数 ──────────────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function say(text) {
    let el = document.getElementById('sageMessage');
    if (!el) { el = document.createElement('div'); el.id = 'sageMessage'; el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#334139;color:#fff;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:800;z-index:10000;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease'; document.body.appendChild(el); }
    el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(window.__sageMsgTimer); window.__sageMsgTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(8px)'; }, 2000);
  }

  /* ── 初始化 ────────────────────────────────────────── */
  function init() {
    if (window.__syncInited) return;
    window.__syncInited = true;
    // 渲染已有的事件
    const all = load();
    if (all.length) {
      renderEvents(all);
      renderImportButton(all);
    }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageSyncRefresh = function () { const all = load(); renderEvents(all); renderImportButton(all); };
})();
