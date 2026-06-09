(function () {
  'use strict';

  const MODULE = 'portfolio';

  function load()    { return window.SageData?.getAll(MODULE) || []; }
  function save(list) { window.SageData?.save(MODULE, list); }
  function uid()      { return window.SageData?.uid('proj') || ('proj-' + Date.now()); }

  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function say(text) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(text); }
  }

  function renderPortfolio() {
    const list = load();
    const container = document.getElementById('portfolioGrid');
    if (!container) return;
    container.innerHTML = list.length
      ? list.map(p => `<div class="card" data-id="${p.id}">
          <h2>${esc(p.title)}</h2>
          <p class="hint">${esc(p.summary || '')}</p>
          ${p.role ? `<p class="hint" style="margin-top:4px"><strong>负责：</strong>${esc(p.role)}</p>` : ''}
          ${p.result ? `<p class="hint"><strong>成果：</strong>${esc(p.result)}</p>` : ''}
          ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="mini" style="margin-top:6px;display:inline-block">查看项目</a>` : ''}
          <div style="margin-top:8px"><button class="mini danger" data-action="portfolio-delete" data-id="${p.id}">删除</button></div>
        </div>`).join('')
      : '<div class="empty">还没有项目，点击上方「新增项目」添加。</div>';
    /* ── 事件委托 ── */
    if (!container.dataset._sagePortfolioBound) {
      container.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action="portfolio-delete"]');
        if (!btn) return;
        window.portfolioDelete(btn.getAttribute('data-id'));
      });
      container.dataset._sagePortfolioBound = '1';
    }
  }

  window.portfolioAdd = function (e) {
    e.preventDefault();
    const title = document.getElementById('portfolioTitle')?.value.trim();
    if (!title) return;
    const project = {
      id: uid(), title,
      summary: document.getElementById('portfolioSummary')?.value.trim() || '',
      role:    document.getElementById('portfolioRole')?.value.trim() || '',
      result:  document.getElementById('portfolioResult')?.value.trim() || '',
      link:    document.getElementById('portfolioLink')?.value.trim() || '',
      image:   '',
    };
    const list = load(); list.unshift(project); save(list);
    document.getElementById('portfolioForm')?.reset();
    renderPortfolio(); say('项目已添加！');
  };

  window.portfolioDelete = function (id) {
    if (!confirm('确定删除这个项目吗？')) return;
    save(load().filter(p => p.id !== id)); renderPortfolio();
  };

  function init() {
    if (window.__resumeInited) return;
    window.__resumeInited = true;
    const form = document.getElementById('portfolioForm');
    if (form) form.addEventListener('submit', window.portfolioAdd);
    renderPortfolio();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageResumeRefresh = function () { renderPortfolio(); };
})();
