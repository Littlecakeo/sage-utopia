/**
 * growth.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · 成长记录动态数据模块
 */
(function () {
  'use strict';

  const MODULE = 'growth';
  const MOODS = ['平静', '开心', '疲惫', '兴奋', '焦虑', '满足', '迷茫'];

  function load()    { return window.SageData?.getAll(MODULE) || []; }
  function save(list) { window.SageData?.save(MODULE, list); }
  function uid()      { return window.SageData?.uid('grow') || ('grow-' + Date.now()); }

  function renderStats() {
    const list = load();
    const keywords = new Set();
    list.forEach(e => (e.tags || []).forEach(t => keywords.add(t)));
    setText('growthCount',   list.length);
    setText('growthKeywords', keywords.size);
    setText('growthMood',    list.length ? list[0].mood : '—');
  }

  function renderTimeline() {
    const list = load();
    const container = document.getElementById('growthTimeline');
    if (!container) return;
    container.innerHTML = list.length
      ? list.map(entryCard).join('')
      : '<div class="empty">还没有成长记录，在下方写一条吧。</div>';
  }

  function entryCard(e) {
    const tagsHtml = (e.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('');
    return `
      <div class="task-row" data-id="${e.id}">
        <div class="task-card-top">
          <div>
            <div class="task-title">${esc(e.date)} · ${esc(e.mood)}</div>
            <div class="task-meta">${esc(e.content || '')}</div>
          </div>
        </div>
        ${tagsHtml ? `<div class="chips">${tagsHtml}</div>` : ''}
        <div class="task-actions">
          <button class="mini danger" data-action="growth-delete" data-id="${e.id}">删除</button>
        </div>
      </div>`;
  }

  window.growthAdd = function (e) {
    e.preventDefault();
    const content = document.getElementById('growthContent')?.value.trim();
    if (!content) return;
    const entry = {
      id: uid(),
      date: document.getElementById('growthDate')?.value || new Date().toISOString().slice(0, 10),
      mood: document.getElementById('growthMoodSelect')?.value || '平静',
      content,
      tags: parseTags(document.getElementById('growthTags')?.value || ''),
      createdAt: new Date().toISOString(),
    };
    const list = load(); list.unshift(entry); save(list);
    document.getElementById('growthForm')?.reset();
    const dateInput = document.getElementById('growthDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    refresh(); say('已记录，今天的你也很好。');
  };

  window.growthDelete = function (id) {
    if (!confirm('确定删除这条记录吗？')) return;
    save(load().filter(e => e.id !== id)); refresh();
  };

  function parseTags(str) {
    return str.split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean).map(s => s.startsWith('#') ? s : '#' + s);
  }

  function refresh() { renderStats(); renderTimeline(); bindGrowthActions(); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function say(text) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(text); }
  }

  /* ── 事件委托（替代 onclick，消除 XSS 风险） ── */
  function bindGrowthActions() {
    var el = document.getElementById('growthTimeline');
    if (!el || el.dataset._sageGrowthBound) return;
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="growth-delete"]');
      if (!btn) return;
      window.growthDelete(btn.getAttribute('data-id'));
    });
    el.dataset._sageGrowthBound = '1';
  }

  function init() {
    if (window.__growthInited) return;
    window.__growthInited = true;
    const form = document.getElementById('growthForm');
    if (form) form.addEventListener('submit', window.growthAdd);
    const dateInput = document.getElementById('growthDate');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    refresh();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageGrowthRefresh = refresh;
})();
