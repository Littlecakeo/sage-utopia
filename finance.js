/**
 * finance.js v1.0
 * ─────────────────────────────────────
 * Sage Utopia · 财务中心动态数据模块
 */
(function () {
  'use strict';

  const MODULE = 'finance';
  const CATEGORIES = ['房租', '餐饮', '交通', '购物', '学费', '其他'];
  const DEFAULT_BUDGET = 2200;

  function load()    { return window.SageData?.getAll(MODULE) || []; }
  function save(list) { window.SageData?.save(MODULE, list); }
  function uid()      { return window.SageData?.uid('fin') || ('fin-' + Date.now()); }
  function getBudget() { return Number(localStorage.getItem('sage.finance.budget') || DEFAULT_BUDGET); }
  function setBudget(v) { localStorage.setItem('sage.finance.budget', Number(v) || DEFAULT_BUDGET); }
  function currentMonth() { return new Date().toISOString().slice(0, 7); }

  function renderStats() {
    const list = load();
    const month = currentMonth();
    const budget = getBudget();
    const monthList = list.filter(r => r.date && r.date.startsWith(month));
    const total = monthList.reduce((s, r) => s + Number(r.amount || 0), 0);
    const pct = budget > 0 ? Math.round(total / budget * 100) : 0;

    setText('financeTotal', '$' + total.toLocaleString());
    setText('financeBudget', '$' + budget.toLocaleString());
    setText('financePct', pct + '%');
    setText('financeCount', monthList.length);
  }

  function renderCategoryBars() {
    const list = load();
    const month = currentMonth();
    const monthList = list.filter(r => r.date && r.date.startsWith(month));
    const totals = {};
    CATEGORIES.forEach(c => totals[c] = 0);
    monthList.forEach(r => { totals[r.category] = (totals[r.category] || 0) + Number(r.amount || 0); });
    const max = Math.max(1, ...Object.values(totals));

    const container = document.getElementById('financeBars');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(c => {
      const v = totals[c] || 0;
      const w = Math.round(v / max * 100);
      return v > 0 ? `<p>${esc(c)}</p><div class="bar"><span style="width:${w}%"></span></div>` : '';
    }).filter(Boolean).join('');
  }

  function renderList() {
    const list = load();
    const container = document.getElementById('financeList');
    if (!container) return;
    const sorted = [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    container.innerHTML = sorted.length
      ? sorted.map(financeCard).join('')
      : '<div class="empty">还没有收支记录，在下方新增一条吧。</div>';
  }

  function financeCard(r) {
    return `
      <div class="task-row" data-id="${r.id}">
        <div class="task-card-top">
          <div>
            <div class="task-title">${esc(r.category)} · $${Number(r.amount || 0).toLocaleString()}</div>
            <div class="task-meta">${esc(r.date || '')}${r.note ? ' · ' + esc(r.note) : ''}</div>
          </div>
        </div>
        <div class="task-actions">
          <button class="mini danger" onclick="financeDelete('${r.id}')">删除</button>
        </div>
      </div>`;
  }

  window.financeAdd = function (e) {
    e.preventDefault();
    const category = document.getElementById('financeCategory')?.value || '其他';
    const amount = Number(document.getElementById('financeAmount')?.value);
    if (!amount || amount <= 0) return;
    const record = {
      id: uid(), category, amount,
      note: document.getElementById('financeNote')?.value.trim() || '',
      date: document.getElementById('financeDate')?.value || new Date().toISOString().slice(0, 10),
    };
    const list = load(); list.unshift(record); save(list);
    document.getElementById('financeForm')?.reset();
    refresh(); say('已记录，理性消费～');
  };

  window.financeSetBudget = function () {
    const v = Number(document.getElementById('financeBudgetInput')?.value);
    if (!v || v <= 0) return;
    setBudget(v); refresh(); say('月度预算已更新。');
  };

  window.financeDelete = function (id) {
    if (!confirm('确定删除这条记录吗？')) return;
    save(load().filter(r => r.id !== id)); refresh();
  };

  function refresh() { renderStats(); renderCategoryBars(); renderList(); }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function say(text) {
    let el = document.getElementById('sageMessage');
    if (!el) { el = document.createElement('div'); el.id = 'sageMessage'; el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#334139;color:#fff;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:800;z-index:10000;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease'; document.body.appendChild(el); }
    el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(window.__sageMsgTimer); window.__sageMsgTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(8px)'; }, 2000);
  }

  function init() {
    if (window.__financeInited) return;
    window.__financeInited = true;
    const form = document.getElementById('financeForm');
    if (form) form.addEventListener('submit', window.financeAdd);
    const budgetForm = document.getElementById('financeBudgetForm');
    if (budgetForm) budgetForm.addEventListener('submit', function (e) { e.preventDefault(); window.financeSetBudget(); });
    refresh();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageFinanceRefresh = refresh;
})();
