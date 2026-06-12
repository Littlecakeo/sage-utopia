(function () {
  'use strict';

  const MODULE = 'expenses';
  let expenses = [];

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function say(text) { if (window.SageUI && window.SageUI.toast) window.SageUI.toast(text); }

  async function loadExpenses() {
    expenses = await (window.SageData?.loadAsync(MODULE) || Promise.resolve([]));
    render();
  }

  function renderStats() {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const monthTotal = expenses
      .filter(e => String(e.spent_at || e.date || '').startsWith(ym))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const counts = new Map();
    expenses.forEach(e => counts.set(e.category || '其他', (counts.get(e.category || '其他') || 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    setText('expenseMonth', monthTotal.toFixed(2));
    setText('expenseCount', expenses.length);
    setText('expenseTopCategory', top);
  }

  function card(e) {
    return `<div class="task-row" data-id="${esc(e.id)}">
      <div class="task-card-top">
        <div>
          <div class="task-title">${esc(e.category)} · ${Number(e.amount || 0).toFixed(2)} ${esc(e.currency || 'AUD')}</div>
          <div class="task-meta">${esc(e.spent_at || e.date || '')} · ${esc(e.merchant || '未填写用途')}</div>
        </div>
        <span class="task-badge soft">${esc(e.currency || 'AUD')}</span>
      </div>
      ${e.notes ? `<div class="task-note">${esc(e.notes)}</div>` : ''}
      <div class="task-actions">
        <button class="mini ghost" data-action="expense-edit" data-id="${esc(e.id)}">编辑</button>
        <button class="mini danger" data-action="expense-delete" data-id="${esc(e.id)}">删除</button>
      </div>
    </div>`;
  }

  function renderList() {
    const el = document.getElementById('expenseList');
    if (!el) return;
    el.innerHTML = expenses.length ? expenses.map(card).join('') : '<div class="empty">还没有支出记录。先保存一笔餐饮、交通或学习支出吧。</div>';
  }

  function renderHint() {
    const hint = document.getElementById('expenseSyncHint');
    if (hint) hint.textContent = window.SageCloudData?.localModeMessage?.() || '本地模式';
  }

  function render() {
    renderStats();
    renderList();
    renderHint();
  }

  function resetForm() {
    document.getElementById('expenseForm')?.reset();
    const id = document.getElementById('expenseId');
    const date = document.getElementById('expenseDate');
    if (id) id.value = '';
    if (date) date.value = todayISO();
    setText('expenseFormTitle', '新增支出');
    setText('expenseMode', '当前准备新增一条支出记录。');
  }

  function editExpense(id) {
    const e = expenses.find(item => item.id === id);
    if (!e) return;
    document.getElementById('expenseId').value = e.id;
    document.getElementById('expenseAmount').value = e.amount || '';
    document.getElementById('expenseCurrency').value = e.currency || 'AUD';
    document.getElementById('expenseCategory').value = e.category || '其他';
    document.getElementById('expenseDate').value = e.spent_at || e.date || todayISO();
    document.getElementById('expenseMerchant').value = e.merchant || '';
    document.getElementById('expenseNotes').value = e.notes || '';
    setText('expenseFormTitle', '编辑支出');
    setText('expenseMode', '正在编辑一条已有支出，保存后会更新云端数据。');
    document.getElementById('expenseFormSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('expenseId')?.value;
    const payload = {
      amount: Number(document.getElementById('expenseAmount')?.value || 0),
      currency: document.getElementById('expenseCurrency')?.value || 'AUD',
      category: document.getElementById('expenseCategory')?.value || '其他',
      spent_at: document.getElementById('expenseDate')?.value || todayISO(),
      merchant: document.getElementById('expenseMerchant')?.value.trim() || '',
      notes: document.getElementById('expenseNotes')?.value.trim() || '',
    };
    if (!payload.amount) return;
    if (id) {
      const updated = await window.SageData.cloudUpdate(MODULE, id, payload);
      expenses = expenses.map(item => item.id === id ? Object.assign({}, item, updated || payload) : item);
      say('支出已更新。');
    } else {
      const created = await window.SageData.cloudAdd(MODULE, Object.assign({ id: window.SageData.uid('exp') }, payload));
      expenses.unshift(created || payload);
      say('支出已保存。');
    }
    window.SageData.saveLocalOnly(MODULE, expenses);
    resetForm();
    render();
  }

  async function deleteExpense(id) {
    if (!confirm('确定删除这条支出吗？')) return;
    await window.SageData.cloudRemove(MODULE, id);
    expenses = expenses.filter(e => e.id !== id);
    window.SageData.saveLocalOnly(MODULE, expenses);
    render();
  }

  function bind() {
    document.getElementById('expenseForm')?.addEventListener('submit', saveExpense);
    document.getElementById('expenseCancelEdit')?.addEventListener('click', resetForm);
    document.getElementById('expenseList')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'expense-edit') editExpense(id);
      if (btn.getAttribute('data-action') === 'expense-delete') deleteExpense(id);
    });
  }

  async function init() {
    if (window.__financeInited) return;
    window.__financeInited = true;
    resetForm();
    bind();
    await loadExpenses();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
