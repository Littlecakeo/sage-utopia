(function () {
  'use strict';

  function esc(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function card(p) {
    return `<div class="card">
      <h2>${esc(p.title)}</h2>
      <p class="hint">${esc(p.summary || '')}</p>
      ${p.role ? `<p class="hint"><strong>负责：</strong>${esc(p.role)}</p>` : ''}
      ${p.result ? `<p class="hint"><strong>成果：</strong>${esc(p.result)}</p>` : ''}
      ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="mini" style="margin-top:8px;display:inline-block">查看项目</a>` : ''}
    </div>`;
  }

  async function init() {
    if (window.__portfolioInited) return;
    window.__portfolioInited = true;
    const grid = document.getElementById('publicPortfolioGrid');
    if (!grid) return;
    const list = await (window.SageData?.loadAsync('portfolio') || Promise.resolve([]));
    const publicList = list.filter(p => p.is_public !== false);
    grid.innerHTML = publicList.length ? publicList.map(card).join('') : '<div class="empty">公开作品集还在整理中，很快会把项目放到这里。</div>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
