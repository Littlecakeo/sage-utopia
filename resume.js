(function () {
  'use strict';

  const MODULE = 'portfolio';
  let profile = null;

  let projects = [];
  function save(list) { projects = list; window.SageData?.saveLocalOnly(MODULE, list); }
  function uid()      { return window.SageData?.uid('proj') || ('proj-' + Date.now()); }

  function esc(s) { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function say(text) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(text); }
  }

  function renderPortfolio() {
    const container = document.getElementById('portfolioGrid');
    if (!container) return;
    container.innerHTML = projects.length
      ? projects.map(p => `<div class="card" data-id="${p.id}">
          <h2>${esc(p.title)}</h2>
          <p class="hint">${esc(p.summary || '')}</p>
          ${p.role ? `<p class="hint" style="margin-top:4px"><strong>负责：</strong>${esc(p.role)}</p>` : ''}
          ${p.result ? `<p class="hint"><strong>成果：</strong>${esc(p.result)}</p>` : ''}
          <p class="hint">${p.is_public === false ? '仅自己可见' : '公开展示'}</p>
          ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="mini" style="margin-top:6px;display:inline-block">查看项目</a>` : ''}
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="mini ghost" data-action="portfolio-edit" data-id="${p.id}">编辑</button><button class="mini danger" data-action="portfolio-delete" data-id="${p.id}">删除</button></div>
        </div>`).join('')
      : '<div class="empty">还没有项目，点击上方「新增项目」添加。</div>';
    /* ── 事件委托 ── */
    if (!container.dataset._sagePortfolioBound) {
      container.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.getAttribute('data-action') === 'portfolio-edit') window.portfolioEdit(btn.getAttribute('data-id'));
        if (btn.getAttribute('data-action') === 'portfolio-delete') window.portfolioDelete(btn.getAttribute('data-id'));
      });
      container.dataset._sagePortfolioBound = '1';
    }
  }

  function renderProfile() {
    if (!profile) return;
    const name = document.querySelector('.profile-title, main .hero h1');
    if (name && profile.display_name) name.textContent = profile.display_name;
    const headline = document.getElementById('profileHeadline');
    const bio = document.getElementById('profileBio');
    if (headline && profile.headline) headline.textContent = profile.headline;
    if (bio && profile.bio) bio.textContent = profile.bio;
    setValue('profileId', profile.id || '');
    setValue('profileName', profile.display_name || '');
    setValue('profileHeadlineInput', profile.headline || '');
    setValue('profileEmail', profile.email || '');
    setValue('profileInstagram', profile.instagram_url || '');
    setValue('profileBioInput', profile.bio || '');
    const hint = document.getElementById('profileSyncHint');
    if (hint) hint.textContent = window.SageCloudData?.localModeMessage?.() || '本地模式';
  }

  window.portfolioAdd = async function (e) {
    e.preventDefault();
    const id = document.getElementById('portfolioId')?.value;
    const title = document.getElementById('portfolioTitle')?.value.trim();
    if (!title) return;
    const project = {
      title,
      summary: document.getElementById('portfolioSummary')?.value.trim() || '',
      role:    document.getElementById('portfolioRole')?.value.trim() || '',
      result:  document.getElementById('portfolioResult')?.value.trim() || '',
      link:    document.getElementById('portfolioLink')?.value.trim() || '',
      image:   '',
      image_url: '',
      is_public: document.getElementById('portfolioPublic')?.checked !== false,
    };
    if (id) {
      const updated = await window.SageData.cloudUpdate(MODULE, id, project);
      projects = projects.map(p => p.id === id ? Object.assign({}, p, updated || project) : p);
      save(projects); resetPortfolioForm(); renderPortfolio(); say('项目已更新！');
    } else {
      const created = await window.SageData.cloudAdd(MODULE, Object.assign({ id: uid() }, project));
      projects.unshift(created || Object.assign({ id: uid() }, project));
      save(projects); resetPortfolioForm(); renderPortfolio(); say('项目已添加！');
    }
  };

  window.portfolioEdit = function (id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    setValue('portfolioId', project.id);
    setValue('portfolioTitle', project.title);
    setValue('portfolioSummary', project.summary);
    setValue('portfolioRole', project.role);
    setValue('portfolioResult', project.result);
    setValue('portfolioLink', project.link);
    const pub = document.getElementById('portfolioPublic');
    if (pub) pub.checked = project.is_public !== false;
    document.getElementById('portfolioForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.portfolioDelete = async function (id) {
    if (!confirm('确定删除这个项目吗？')) return;
    await window.SageData.cloudRemove(MODULE, id);
    save(projects.filter(p => p.id !== id)); renderPortfolio();
  };

  async function saveProfile(e) {
    e.preventDefault();
    const id = document.getElementById('profileId')?.value;
    const payload = {
      display_name: document.getElementById('profileName')?.value.trim() || '桂维桢 / Sage',
      headline: document.getElementById('profileHeadlineInput')?.value.trim() || '',
      email: document.getElementById('profileEmail')?.value.trim() || '',
      instagram_url: document.getElementById('profileInstagram')?.value.trim() || '',
      bio: document.getElementById('profileBioInput')?.value.trim() || '',
      is_public: true,
    };
    if (id) {
      profile = await window.SageData.cloudUpdate('profile', id, payload);
    } else {
      profile = await window.SageData.cloudAdd('profile', Object.assign({ id: window.SageData.uid('profile') }, payload));
    }
    window.SageData.saveLocalOnly('profile', profile ? [profile] : []);
    renderProfile();
    say('公开资料已保存。');
  }

  function resetPortfolioForm() {
    document.getElementById('portfolioForm')?.reset();
    setValue('portfolioId', '');
    const pub = document.getElementById('portfolioPublic');
    if (pub) pub.checked = true;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  async function init() {
    if (window.__resumeInited) return;
    window.__resumeInited = true;
    projects = await (window.SageData?.loadAsync(MODULE) || Promise.resolve([]));
    const profiles = await (window.SageData?.loadAsync('profile') || Promise.resolve([]));
    profile = profiles[0] || null;
    const form = document.getElementById('portfolioForm');
    if (form) form.addEventListener('submit', window.portfolioAdd);
    document.getElementById('portfolioCancelEdit')?.addEventListener('click', resetPortfolioForm);
    document.getElementById('profileForm')?.addEventListener('submit', saveProfile);
    renderProfile();
    renderPortfolio();
    if (window.SageCloudSync) window.SageCloudSync.renderSyncUI();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.__sageResumeRefresh = function () { renderPortfolio(); };
})();
