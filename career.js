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

  let jobs = [];
  function save(list) { jobs = list; window.SageData?.saveLocalOnly(MODULE, list); }
  function uid()      { return window.SageData?.uid('job') || ('job-' + Date.now()); }

  function renderStats() {
    setText('careerTotal',    jobs.length);
    setText('careerInterview', jobs.filter(j => j.status === '面试中').length);
    setText('careerOffer',    jobs.filter(j => j.status === '已录取').length);
  }

  function renderList() {
    const listEl  = document.getElementById('careerList');
    const doneEl  = document.getElementById('careerDone');
    if (!listEl) return;

    const active = jobs.filter(j => !['已录取', '已拒绝'].includes(j.status));
    const done   = jobs.filter(j =>  ['已录取', '已拒绝'].includes(j.status));

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
        ${j.application_date || j.date ? `<div class="date-row"><span class="date-pill">${esc(j.status === '面试中' ? '面试 ' : '申请 ') + esc(j.application_date || j.date)}</span></div>` : ''}
        ${j.note ? `<div class="task-note">${esc(j.note)}</div>` : ''}
        ${j.link ? `<a class="tiny-link" href="${esc(j.link)}" target="_blank" rel="noreferrer">职位链接</a>` : ''}
        <div class="task-actions">
          <select class="field mini" data-action="status" data-id="${j.id}">
            ${STATUS.map(s => `<option value="${s}" ${s === j.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="mini ghost" data-action="career-edit" data-id="${j.id}">编辑</button>
          <button class="mini danger" data-action="career-delete" data-id="${j.id}">删除</button>
        </div>
      </div>`;
  }

  window.careerAdd = async function (e) {
    e.preventDefault();
    const id = document.getElementById('careerId')?.value;
    const company = document.getElementById('careerCompany')?.value.trim();
    const position = document.getElementById('careerPosition')?.value.trim();
    if (!company) return;
    const job = {
      company, position: position || '',
      status: document.getElementById('careerStatus')?.value || '收藏',
      location: document.getElementById('careerLocation')?.value.trim() || '',
      application_date: document.getElementById('careerDate')?.value || null,
      link: document.getElementById('careerLink')?.value.trim() || '',
      note: document.getElementById('careerNote')?.value.trim() || '',
    };
    if (id) {
      const updated = await window.SageData.cloudUpdate(MODULE, id, job);
      jobs = jobs.map(item => item.id === id ? Object.assign({}, item, updated || job) : item);
      save(jobs); resetCareerForm(); refresh(); say('申请记录已更新。');
    } else {
      const created = await window.SageData.cloudAdd(MODULE, Object.assign({ id: uid() }, job));
      jobs.unshift(created || Object.assign({ id: uid() }, job));
      save(jobs); resetCareerForm(); refresh(); say('已记录，加油！');
    }
  };

  window.careerSetStatus = async function (id, status) {
    const idx = jobs.findIndex(j => j.id === id);
    if (idx === -1) return; jobs[idx].status = status;
    await window.SageData.cloudUpdate(MODULE, id, { status });
    save(jobs);
    refresh(); say('状态已更新。');
  };

  window.careerEdit = function (id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    setValue('careerId', job.id);
    setValue('careerCompany', job.company);
    setValue('careerPosition', job.position);
    setValue('careerLocation', job.location);
    setValue('careerDate', job.application_date || job.date || '');
    setValue('careerStatus', job.status || '收藏');
    setValue('careerLink', job.link || '');
    setValue('careerNote', job.note || '');
    setText('careerFormTitle', '编辑机会');
    setText('careerMode', '正在编辑一条已有申请记录。');
    document.getElementById('careerFormSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.careerDelete = async function (id) {
    if (!confirm('确定删除这条求职记录吗？')) return;
    await window.SageData.cloudRemove(MODULE, id);
    save(jobs.filter(j => j.id !== id)); refresh();
  };

  function resetCareerForm() {
    document.getElementById('careerForm')?.reset();
    setValue('careerId', '');
    setText('careerFormTitle', '新增机会');
    setText('careerMode', '当前准备新增一条申请记录。');
  }

  async function loadJobs() {
    jobs = await (window.SageData?.loadAsync(MODULE) || Promise.resolve([]));
  }

  function refresh() { renderStats(); renderList(); bindCareerActions(); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
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
        if (action === 'career-edit' && id) { window.careerEdit(id); }
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

  async function init() {
    if (window.__careerInited) return;
    window.__careerInited = true;
    const form = document.getElementById('careerForm');
    if (form) form.addEventListener('submit', window.careerAdd);
    document.getElementById('careerCancelEdit')?.addEventListener('click', resetCareerForm);
    await loadJobs();
    refresh();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageCareerRefresh = refresh;
})();
