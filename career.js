/**
 * career.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · 求职中心动态数据模块
 * 数据通过 sage-data.js 持久化到 localStorage
 */
(function () {
  'use strict';

  const MODULE = 'career';
  const STATUS = ['收藏', '已申请', '面试中', '已录取', '已拒绝'];

  function load()    { return window.SageData?.getAll(MODULE) || []; }
  function save(list) { window.SageData?.save(MODULE, list); }
  function uid()      { return window.SageData?.uid('job') || ('job-' + Date.now()); }

  function renderStats() {
    const list = load();
    setText('careerTotal',    list.length);
    setText('careerInterview', list.filter(j => j.status === '面试中').length);
    setText('careerOffer',    list.filter(j => j.status === '已录取').length);
  }

  function renderList() {
    const list    = load();
    const listEl  = document.getElementById('careerList');
    const doneEl  = document.getElementById('careerDone');
    if (!listEl) return;

    const active = list.filter(j => !['已录取', '已拒绝'].includes(j.status));
    const done   = list.filter(j =>  ['已录取', '已拒绝'].includes(j.status));

    listEl.innerHTML = active.length
      ? active.map(jobCard).join('')
      : '<div class="empty">还没有求职记录，在下方新增一条吧。</div>';

    if (doneEl) {
      doneEl.innerHTML = done.length
        ? done.map(jobCard).join('')
        : '<div class="empty">已结束的申请会出现在这里。</div>';
    }
  }

  function jobCard(j) {
    const sc = { '收藏':'soft', '已申请':'blue', '面试中':'peach', '已录取':'soft', '已拒绝':'danger' }[j.status] || 'soft';
    return `
      <div class="task-row" data-id="${j.id}">
        <div class="task-card-top">
          <div>
            <div class="task-title">${esc(j.company)} · ${esc(j.position)}</div>
            <div class="task-meta">${esc(j.status)} · ${esc(j.location || '')}</div>
          </div>
          <span class="task-badge ${sc}">${esc(j.status)}</span>
        </div>
        ${j.date ? `<div class="date-row"><span class="date-pill">${esc(j.status === '面试中' ? '面试 ' : '申请 ') + j.date}</span></div>` : ''}
        ${j.note ? `<div class="task-note">${esc(j.note)}</div>` : ''}
        <div class="task-actions">
          <select class="field mini" data-action="status" data-id="${j.id}">
            ${STATUS.map(s => `<option value="${s}" ${s === j.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="mini danger" data-action="career-delete" data-id="${j.id}">删除</button>
        </div>
      </div>`;
  }

  window.careerAdd = function (e) {
    e.preventDefault();
    const company = document.getElementById('careerCompany')?.value.trim();
    const position = document.getElementById('careerPosition')?.value.trim();
    if (!company) return;
    const job = {
      id: uid(), company, position: position || '',
      status: document.getElementById('careerStatus')?.value || '收藏',
      location: document.getElementById('careerLocation')?.value.trim() || '',
      date: document.getElementById('careerDate')?.value || '',
      note: document.getElementById('careerNote')?.value.trim() || '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const list = load(); list.unshift(job); save(list);
    document.getElementById('careerForm')?.reset();
    refresh(); say('已记录，加油！');
  };

  window.careerSetStatus = function (id, status) {
    const list = load(); const idx = list.findIndex(j => j.id === id);
    if (idx === -1) return; list[idx].status = status; save(list);
    refresh(); say('状态已更新。');
  };

  window.careerDelete = function (id) {
    if (!confirm('确定删除这条求职记录吗？')) return;
    save(load().filter(j => j.id !== id)); refresh();
  };

  function refresh() { renderStats(); renderList(); bindCareerActions(); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function say(text) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(text); }
  }

  /* ── 事件委托（替代 onclick/onchange，消除 XSS 风险） ── */
  function bindCareerActions() {
    ['careerList', 'careerDone'].forEach(function (cid) {
      var el = document.getElementById(cid);
      if (!el || el.dataset._sageCareerBound) return;
      el.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (action === 'career-delete' && id) { window.careerDelete(id); }
      });
      el.addEventListener('change', function (e) {
        var sel = e.target.closest('[data-action="status"]');
        if (!sel) return;
        window.careerSetStatus(sel.getAttribute('data-id'), sel.value);
      });
      el.dataset._sageCareerBound = '1';
    });
  }

  function init() {
    if (window.__careerInited) return;
    window.__careerInited = true;
    const form = document.getElementById('careerForm');
    if (form) form.addEventListener('submit', window.careerAdd);
    refresh();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageCareerRefresh = refresh;
})();
