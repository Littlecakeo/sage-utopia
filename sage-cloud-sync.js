/* ═══════════════════════════════════════════════════════════════
 *  Sage Cloud Sync v1.0 — GitHub Gist 云同步引擎
 *  通过私有 Gist 实现跨设备数据同步，零后端部署
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── 常量 ────────────────────────────────────────────────
  var GIST_DESC = 'Sage Utopia Cloud Sync Data';
  var GIST_FILE = 'sage-utopia-data.json';
  var STORAGE_PREFIX = 'sage.cloud.';
  var SYNC_VERSION = 1;
  var DEBOUNCE_MS = 3000;        // 数据变更后等待 3 秒再推送
  var PULL_INTERVAL_MS = 300000; // 每 5 分钟自动拉取一次
  var API_BASE = 'https://api.github.com';

  // ── 6 个数据模块 ──────────────────────────────────────
  var MODULES = ['tasks', 'study', 'career', 'growth', 'portfolio', 'sync'];

  // ── 状态 ────────────────────────────────────────────────
  var _token = null;
  var _gistId = null;
  var _status = 'disconnected'; // disconnected | connecting | connected | syncing | error
  var _lastSyncAt = null;
  var _autoSyncEnabled = false;
  var _debounceTimer = null;
  var _pullTimer = null;
  var _pendingModules = []; // 待推送的模块数组
  var _isPushing = false;
  var _isPulling = false;
  var _statusMessage = '';

  // ── Token 存储 ─────────────────────────────────────────
  function loadToken() {
    _token = localStorage.getItem(STORAGE_PREFIX + 'token') || null;
    _gistId = localStorage.getItem(STORAGE_PREFIX + 'gistId') || null;
    _autoSyncEnabled = localStorage.getItem(STORAGE_PREFIX + 'auto') === 'true';
  }

  function saveToken(token, gistId) {
    _token = token;
    _gistId = gistId;
    localStorage.setItem(STORAGE_PREFIX + 'token', token);
    if (gistId) localStorage.setItem(STORAGE_PREFIX + 'gistId', gistId);
  }

  function clearToken() {
    _token = null;
    _gistId = null;
    localStorage.removeItem(STORAGE_PREFIX + 'token');
    localStorage.removeItem(STORAGE_PREFIX + 'gistId');
    _status = 'disconnected';
    _statusMessage = '未连接';
    stopAutoSync();
    dispatchStatus();
  }

  // ── GitHub API 封装 ──────────────────────────────────────
  async function apiRequest(path, options) {
    if (!_token) throw new Error('Not authenticated');
    var headers = {
      'Authorization': 'Bearer ' + _token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (options && options.headers) {
      var keys = Object.keys(options.headers);
      for (var i = 0; i < keys.length; i++) headers[keys[i]] = options.headers[keys[i]];
    }
    var resp = await fetch(API_BASE + path, Object.assign({}, options || {}, { headers: headers }));
    if (resp.status === 401) {
      clearToken();
      throw new Error('Token 已失效，请重新连接');
    }
    if (resp.status === 403) {
      var err = await resp.json().catch(function() { return {}; });
      throw new Error('权限不足: ' + (err.message || 'Token 可能缺少 Gist 读写权限'));
    }
    if (resp.status === 429) {
      var retryAfter = resp.headers.get('Retry-After');
      var waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new Error('API 请求过于频繁，' + waitSec + ' 秒后重试');
    }
    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      throw new Error(errData.message || ('API error ' + resp.status));
    }
    return resp.json();
  }

  // ── 哈希计算（Cyrb53 轻量哈希）──────────────────────
  function hashData(data) {
    var h1 = 0xdeadbeef;
    var h2 = 0x41c6ce57;
    var str = JSON.stringify(data);
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // ── 创建空数据载体 ───────────────────────────────────
  function createEmptyPayload() {
    var modules = {};
    for (var i = 0; i < MODULES.length; i++) {
      modules[MODULES[i]] = { hash: '', updatedAt: '', data: [] };
    }
    return {
      version: SYNC_VERSION,
      updatedAt: new Date().toISOString(),
      syncedBy: 'sage-utopia',
      modules: modules
    };
  }

  // ── Gist 查找或创建 ──────────────────────────────────
  async function findOrCreateGist() {
    var page = 1;
    var found = null;
    // 搜索用户 Gist（最多 3 页）
    while (!found && page <= 3) {
      var gists = await apiRequest('/gists?per_page=100&page=' + page);
      for (var i = 0; i < gists.length; i++) {
        if (gists[i].description === GIST_DESC) { found = gists[i]; break; }
      }
      if (gists.length < 100) break;
      page++;
    }
    if (found) return found;

    // 未找到则创建
    var payload = {
      description: GIST_DESC,
      public: false,
      files: {}
    };
    payload.files[GIST_FILE] = { content: JSON.stringify(createEmptyPayload(), null, 2) };
    var gist = await apiRequest('/gists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return gist;
  }

  // ── 构建模块数据快照 ────────────────────────────────
  function buildModuleSnapshot(mod) {
    var data = window.SageData ? window.SageData.getAll(mod) : [];
    return {
      hash: hashData(data),
      updatedAt: new Date().toISOString(),
      data: data
    };
  }

  // ── Push（推送本地 → Gist）─────────────────────────
  async function push(moduleNames) {
    if (!_token || !_gistId || _isPushing) return;
    _isPushing = true;
    setStatus('syncing', '正在同步...');

    try {
      var gist = await apiRequest('/gists/' + _gistId);
      var file = gist.files[GIST_FILE];
      var remote = file ? JSON.parse(file.content) : createEmptyPayload();

      // 更新指定模块
      var mods = moduleNames || MODULES;
      for (var i = 0; i < mods.length; i++) {
        remote.modules[mods[i]] = buildModuleSnapshot(mods[i]);
      }
      remote.updatedAt = new Date().toISOString();

      // 写回 Gist
      var updatePayload = { description: GIST_DESC, files: {} };
      updatePayload.files[GIST_FILE] = { content: JSON.stringify(remote, null, 2) };
      await apiRequest('/gists/' + _gistId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      _lastSyncAt = new Date();
      _pendingModules = [];
      setStatus('connected', '已同步');
    } catch (err) {
      console.error('[sage-cloud-sync] push error:', err);
      setStatus('error', '推送失败: ' + err.message);
    } finally {
      _isPushing = false;
      dispatchStatus();
    }
  }

  // ── Pull（拉取 Gist → 本地）─────────────────────────
  async function pull() {
    if (!_token || !_gistId || _isPulling) return;
    _isPulling = true;
    setStatus('syncing', '正在拉取...');

    try {
      var gist = await apiRequest('/gists/' + _gistId);
      var file = gist.files[GIST_FILE];
      if (!file) throw new Error('Gist 数据文件缺失');
      var remote = JSON.parse(file.content);

      var pulled = 0;
      for (var i = 0; i < MODULES.length; i++) {
        var mod = MODULES[i];
        if (!remote.modules[mod]) continue;
        var remoteMod = remote.modules[mod];
        var localData = window.SageData ? window.SageData.getAll(mod) : [];
        var localHash = hashData(localData);

        // LWW: 比较 updatedAt
        var remoteTime = new Date(remoteMod.updatedAt).getTime();
        var localTime = getLocalModuleTime(mod);
        var remoteIsNewer = remoteTime > localTime;

        if (remoteIsNewer && remoteMod.hash !== localHash) {
          if (window.SageData && Array.isArray(remoteMod.data)) {
            window.SageData.save(mod, remoteMod.data);
            setLocalModuleTime(mod, remoteMod.updatedAt);
            pulled++;
          }
        }
      }

      _lastSyncAt = new Date();
      setStatus('connected', pulled > 0 ? '已拉取 ' + pulled + ' 个模块更新' : '已是最新');
    } catch (err) {
      console.error('[sage-cloud-sync] pull error:', err);
      setStatus('error', '拉取失败: ' + err.message);
    } finally {
      _isPulling = false;
      dispatchStatus();
    }
  }

  // ── 本地模块时间戳（LWW 判断依据）────────────────────
  function getLocalModuleTime(mod) {
    return new Date(localStorage.getItem(STORAGE_PREFIX + 'mod.' + mod + '.time') || 0).getTime();
  }
  function setLocalModuleTime(mod, iso) {
    localStorage.setItem(STORAGE_PREFIX + 'mod.' + mod + '.time', iso);
  }

  // ── SageData 集成：监听 sage-data-changed 事件 ──────
  function hookSageData() {
    window.addEventListener('sage-data-changed', function (e) {
      if (!_token || !_gistId) return;
      var mod = e.detail && e.detail.module;
      if (!mod || MODULES.indexOf(mod) === -1) return;

      setLocalModuleTime(mod, new Date().toISOString());

      // 添加到待推送队列（去重）
      if (_pendingModules.indexOf(mod) === -1) {
        _pendingModules.push(mod);
      }
      schedulePush();
    });
  }

  function schedulePush() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      if (_pendingModules.length > 0) {
        push(_pendingModules.slice());
      }
    }, DEBOUNCE_MS);
  }

  // ── 自动同步 ──────────────────────────────────────────
  function startAutoSync() {
    if (_autoSyncEnabled) return; // 防止重复启动
    _autoSyncEnabled = true;
    localStorage.setItem(STORAGE_PREFIX + 'auto', 'true');

    // 立即拉取一次
    pull().catch(function () {});
    // 定时拉取
    _pullTimer = setInterval(function () {
      if (_token && _gistId && !_isPulling && !_isPushing) {
        pull().catch(function () {});
      }
    }, PULL_INTERVAL_MS);
    // 监听网络恢复
    window.addEventListener('online', onOnline);
  }

  function stopAutoSync() {
    _autoSyncEnabled = false;
    localStorage.setItem(STORAGE_PREFIX + 'auto', 'false');
    if (_pullTimer) { clearInterval(_pullTimer); _pullTimer = null; }
    window.removeEventListener('online', onOnline);
  }

  function onOnline() {
    if (!_token || !_gistId) return;
    setStatus('connected', '网络已恢复，正在同步...');
    pull().then(function () {
      if (_pendingModules.length > 0) {
        push(_pendingModules.slice());
      }
    }).catch(function () {});
  }

  // ── 状态管理 ──────────────────────────────────────────
  function setStatus(status, message) {
    _status = status;
    _statusMessage = message || getStatusMessage(status);
    dispatchStatus();
  }

  function getStatusMessage(s) {
    switch (s || _status) {
      case 'disconnected': return '未连接';
      case 'connecting': return '正在连接...';
      case 'connected': return '已连接';
      case 'syncing': return '正在同步...';
      case 'error': return '同步出错';
      default: return '未知';
    }
  }

  function dispatchStatus() {
    window.dispatchEvent(new CustomEvent('sage-cloud-sync-status', {
      detail: {
        status: _status,
        message: _statusMessage,
        lastSyncAt: _lastSyncAt,
        connected: !!_token && !!_gistId,
        autoSync: _autoSyncEnabled,
        gistId: _gistId
      }
    }));
  }

  // ── 连接 GitHub ────────────────────────────────────────
  async function connect(token) {
    token = (token || '').trim();
    if (!token) throw new Error('请输入 GitHub Token');

    setStatus('connecting', '正在验证 Token...');
    try {
      var user = await apiRequest('/user');
      if (!user.login) throw new Error('Token 验证失败');

      var gist = await findOrCreateGist();
      saveToken(token, gist.id);

      setStatus('connected', '已连接 (' + user.login + ')');
      startAutoSync();
      return user;
    } catch (err) {
      setStatus('error', '连接失败: ' + err.message);
      throw err;
    }
  }

  // ── 初始化 ──────────────────────────────────────────────
  function init() {
    loadToken();
    if (_token && _gistId) {
      setStatus('connecting', '正在恢复连接...');
      apiRequest('/user').then(function (user) {
        setStatus('connected', '已连接 (' + user.login + ')');
        if (_autoSyncEnabled) startAutoSync();
      }).catch(function () {
        clearToken();
      });
    }
    hookSageData();
    dispatchStatus();
  }

  // ── 时间格式化 ────────────────────────────────────────
  function formatTime(date) {
    if (!date) return '从未';
    var d = new Date(date);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }

  // ── HTML 转义 ──────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>'"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c];
    });
  }

  // ── 同步 UI 渲染 ──────────────────────────────────────
  function getSyncUI() {
    var connected = !!_token && !!_gistId;
    if (connected) {
      return '<div class="sync-card connected">' +
        '<div class="sync-status">' +
          '<span class="sync-dot ' + _status + '"></span>' +
          '<span>' + esc(_statusMessage) + '</span>' +
        '</div>' +
        '<div class="sync-meta">' +
          '<span class="hint">Gist: ' + esc(_gistId.slice(0, 8)) + '...</span>' +
          '<span class="hint">上次同步: ' + esc(formatTime(_lastSyncAt)) + '</span>' +
        '</div>' +
        '<div class="sync-actions">' +
          '<button class="mini" data-action="sync-now">立即同步</button>' +
          '<label class="sync-toggle"><input type="checkbox" ' +
            (_autoSyncEnabled ? 'checked ' : '') +
            'data-action="sync-auto"> 自动同步</label>' +
          '<button class="mini danger" data-action="sync-disconnect">断开连接</button>' +
        '</div>' +
      '</div>';
    }
    return '<div class="sync-card disconnected">' +
      '<h3>GitHub 云同步</h3>' +
      '<p class="hint">通过私有 Gist 在设备间同步你的所有数据。数据仅存储在你的 GitHub 中，安全可控。</p>' +
      '<button class="mini" data-action="sync-connect">连接 GitHub</button>' +
    '</div>';
  }

  // ── 连接弹窗渲染 ──────────────────────────────────────
  function showConnectModal() {
    var overlay = document.getElementById('syncModal');
    if (overlay) { overlay.style.display = 'flex'; overlay.querySelector('#syncTokenInput').focus(); return; }
    var div = document.createElement('div');
    div.id = 'syncModal';
    div.className = 'sync-modal-overlay';
    div.innerHTML = '<div class="sync-modal">' +
      '<h3>连接 GitHub 云同步</h3>' +
      '<p class="hint" style="margin-bottom:12px">使用私有 Gist 存储数据，实现跨设备同步。</p>' +
      '<ol class="sync-steps">' +
        '<li>打开 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">创建 Fine-grained Token</a></li>' +
        '<li>Token name 填写：<code>Sage Utopia Sync</code></li>' +
        '<li>权限选择：<code>Account permissions → Gists → Read and write</code></li>' +
        '<li>Expiration 建议：<code>No expiration</code></li>' +
        '<li>复制 Token，粘贴到下方</li>' +
      '</ol>' +
      '<input class="field" id="syncTokenInput" type="password" placeholder="github_pat_...">' +
      '<div class="sync-modal-actions">' +
        '<button class="mini" id="syncConnectBtn">验证并连接</button>' +
        '<button class="mini ghost" id="syncCancelBtn">取消</button>' +
      '</div>' +
      '<p id="syncError" class="hint" style="color:#d4785a;display:none"></p>' +
    '</div>';
    document.body.appendChild(div);
    div.style.display = 'flex';

    // 事件绑定
    div.querySelector('#syncCancelBtn').addEventListener('click', function () { div.style.display = 'none'; });
    div.addEventListener('click', function (e) { if (e.target === div) div.style.display = 'none'; });
    div.querySelector('#syncConnectBtn').addEventListener('click', async function () {
      var input = div.querySelector('#syncTokenInput');
      var errEl = div.querySelector('#syncError');
      var btn = div.querySelector('#syncConnectBtn');
      errEl.style.display = 'none';
      btn.textContent = '验证中...';
      btn.disabled = true;
      try {
        var user = await connect(input.value);
        div.style.display = 'none';
        renderSyncUI();
        if (window.SageUI) window.SageUI.toast('已连接 GitHub (' + user.login + ')');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = '验证并连接';
        btn.disabled = false;
      }
    });
  }

  // ── 渲染同步 UI 到容器 ────────────────────────────────
  function renderSyncUI() {
    var container = document.getElementById('cloudSyncUI');
    if (!container) return;
    container.innerHTML = getSyncUI();
    bindSyncActions(container);
  }

  // ── 绑定同步 UI 事件 ──────────────────────────────────
  function bindSyncActions(container) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      switch (action) {
        case 'sync-now':
          syncNow().then(function () { renderSyncUI(); });
          break;
        case 'sync-auto':
          _autoSyncEnabled = btn.checked;
          if (_autoSyncEnabled) startAutoSync(); else stopAutoSync();
          break;
        case 'sync-disconnect':
          if (confirm('确定断开云同步？本地数据不会删除。')) {
            clearToken();
            renderSyncUI();
          }
          break;
        case 'sync-connect':
          showConnectModal();
          break;
      }
    });
  }

  // ── 手动全量同步 ──────────────────────────────────────
  async function syncNow() {
    try {
      await pull();
      if (_pendingModules.length > 0) {
        await push(_pendingModules.slice());
      }
    } catch (err) {
      console.error('[sage-cloud-sync] syncNow error:', err);
    }
  }

  // ── 导出公共 API ──────────────────────────────────────
  window.SageCloudSync = {
    init: init,
    connect: connect,
    disconnect: clearToken,
    getStatus: function () {
      return { status: _status, message: _statusMessage, lastSyncAt: _lastSyncAt, connected: !!_token && !!_gistId, autoSync: _autoSyncEnabled, gistId: _gistId };
    },
    pull: pull,
    push: push,
    syncNow: syncNow,
    autoSync: function (enable) { return enable !== false ? startAutoSync() : stopAutoSync(); },
    getSyncUI: getSyncUI,
    renderSyncUI: renderSyncUI,
    showConnectModal: showConnectModal
  };

  window.__sageCloudSyncInited = true;
})();
