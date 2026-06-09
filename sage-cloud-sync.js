(function () {
  'use strict';

  var SUPABASE_URL = 'https://gsfxrikjqukiurcprggk.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZnhyaWtqcXVraXVyY3ByZ2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTc4NTgsImV4cCI6MjA5NjU3Mzg1OH0.PYiLRLh9PtWJ6pOs_sL_QEF3kwkHJQ3tZurHJ7tY298';
  var TABLE = 'sync_data';
  var MODULES = ['tasks', 'study', 'career', 'growth', 'portfolio', 'sync'];
  var DEBOUNCE_MS = 3000;
  var PULL_INTERVAL_MS = 300000;

  var _client = null;
  var _syncKey = '';
  var _status = 'disconnected';
  var _pending = {};
  var _pushTimer = null;
  var _pullTimer = null;
  var _autoSync = false;
  var _lastSync = null;
  var _isPushing = false;
  var _isPulling = false;
  var _statusMsg = '';

  function store() { return 'sage.cloud.syncKey'; }
  function autoStore() { return 'sage.cloud.auto'; }
  function modStore(m) { return 'sage.cloud.mod.' + m + '.time'; }
  function now() { return new Date().toISOString(); }

  function esc(s) {
    return String(s).replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }

  function say(text) {
    if (window.SageUI && window.SageUI.toast) window.SageUI.toast(text);
  }

  function fmtTime(date) {
    if (!date) return '从未';
    var d = new Date(date);
    var diff = Date.now() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function hashData(data) {
    var str = JSON.stringify(data);
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
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

  function getLocalModTime(m) {
    return new Date(localStorage.getItem(modStore(m)) || 0).getTime();
  }
  function setLocalModTime(m, iso) {
    localStorage.setItem(modStore(m), iso);
  }

  function getClient() {
    if (_client) return _client;
    if (!window.supabase || !window.supabase.createClient) return null;
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  function setStatus(s, msg) {
    _status = s;
    _statusMsg = msg || s;
    document.querySelectorAll('.sync-dot').forEach(function (d) {
      d.className = 'sync-dot' + (s === 'connected' ? ' connected' : s === 'syncing' ? ' syncing' : s === 'error' ? ' error' : '');
    });
    document.querySelectorAll('.sync-status-text').forEach(function (el) { el.textContent = _statusMsg; });
    window.dispatchEvent(new CustomEvent('sage-cloud-sync-status', {
      detail: { status: _status, message: _statusMsg, lastSyncAt: _lastSync, connected: !!_syncKey, autoSync: _autoSync }
    }));
  }

  async function push(modules) {
    if (!_syncKey || _isPushing) return;
    var client = getClient();
    if (!client) return;
    _isPushing = true;
    setStatus('syncing', '正在推送...');

    try {
      var rows = [];
      for (var i = 0; i < modules.length; i++) {
        var m = modules[i];
        var data = window.SageData ? window.SageData.getAll(m) : [];
        rows.push({
          sync_key: _syncKey,
          module: m,
          data: data,
          hash: hashData(data),
          updated_at: localStorage.getItem(modStore(m)) || now()
        });
      }
      var res = await client.from(TABLE).upsert(rows, { onConflict: 'sync_key,module' });
      if (res.error) throw res.error;
      for (var j = 0; j < modules.length; j++) delete _pending[modules[j]];
      _lastSync = new Date();
      setStatus('connected', '已同步');
    } catch (e) {
      console.error('[sage-cloud-sync] push:', e);
      setStatus('error', '推送失败: ' + (e.message || e));
    } finally {
      _isPushing = false;
    }
  }

  async function pull() {
    if (!_syncKey || _isPulling) return;
    var client = getClient();
    if (!client) return;
    _isPulling = true;
    setStatus('syncing', '正在拉取...');

    try {
      var res = await client.from(TABLE).select('*').eq('sync_key', _syncKey);
      if (res.error) throw res.error;

      var remote = res.data || [];
      var pulled = 0;

      for (var i = 0; i < MODULES.length; i++) {
        var m = MODULES[i];
        var row = null;
        for (var j = 0; j < remote.length; j++) {
          if (remote[j].module === m) { row = remote[j]; break; }
        }
        if (!row) continue;

        var remoteTime = new Date(row.updated_at).getTime();
        var localTime = getLocalModTime(m);

        if (remoteTime > localTime) {
          var localData = window.SageData ? window.SageData.getAll(m) : [];
          var localHash = hashData(localData);
          if (row.hash !== localHash && Array.isArray(row.data)) {
            window.SageData.save(m, row.data);
            setLocalModTime(m, row.updated_at);
            pulled++;
          }
        }
      }

      _lastSync = new Date();
      setStatus('connected', pulled > 0 ? '已拉取 ' + pulled + ' 个模块更新' : '已是最新');
      return pulled;
    } catch (e) {
      console.error('[sage-cloud-sync] pull:', e);
      setStatus('error', '拉取失败: ' + (e.message || e));
    } finally {
      _isPulling = false;
    }
  }

  function hookSageData() {
    window.addEventListener('sage-data-changed', function (e) {
      if (!_syncKey) return;
      var mod = e.detail && e.detail.module;
      if (!mod || MODULES.indexOf(mod) === -1) return;
      setLocalModTime(mod, now());
      _pending[mod] = true;
      clearTimeout(_pushTimer);
      _pushTimer = setTimeout(function () {
        var mods = Object.keys(_pending);
        if (mods.length > 0) push(mods);
      }, DEBOUNCE_MS);
    });
  }

  function startAutoSync() {
    if (_autoSync) return;
    _autoSync = true;
    localStorage.setItem(autoStore(), 'true');
    pull().catch(function () {});
    _pullTimer = setInterval(function () {
      if (_syncKey && !_isPulling && !_isPushing) pull().catch(function () {});
    }, PULL_INTERVAL_MS);
    window.addEventListener('online', onOnline);
  }

  function stopAutoSync() {
    _autoSync = false;
    localStorage.setItem(autoStore(), 'false');
    if (_pullTimer) { clearInterval(_pullTimer); _pullTimer = null; }
    window.removeEventListener('online', onOnline);
  }

  function onOnline() {
    if (!_syncKey) return;
    setStatus('connected', '网络恢复，同步中...');
    pull().catch(function () {});
  }

  async function connect(syncKey) {
    syncKey = (syncKey || '').trim();
    if (!syncKey) throw new Error('请输入同步码');
    if (syncKey.length < 4) throw new Error('同步码至少 4 位');

    setStatus('syncing', '正在连接...');
    var client = getClient();
    if (!client) throw new Error('Supabase SDK 未加载');

    try {
      var res = await client.from(TABLE).select('sync_key').eq('sync_key', syncKey).limit(1);
      if (res.error) throw res.error;
      _syncKey = syncKey;
      localStorage.setItem(store(), syncKey);
      setStatus('connected', '已连接');
      startAutoSync();
      renderSyncUI();
      say('云同步已连接');
    } catch (e) {
      setStatus('error', '连接失败: ' + (e.message || e));
      throw e;
    }
  }

  function disconnect() {
    _syncKey = '';
    localStorage.removeItem(store());
    stopAutoSync();
    setStatus('disconnected', '未连接');
    renderSyncUI();
  }

  function init() {
    _syncKey = localStorage.getItem(store()) || '';
    _autoSync = localStorage.getItem(autoStore()) === 'true';
    if (_syncKey) {
      setStatus('connected', '已连接');
      if (_autoSync) startAutoSync();
    }
    hookSageData();
  }

  async function syncNow() {
    try {
      await pull();
      var mods = Object.keys(_pending);
      if (mods.length > 0) await push(mods);
      renderSyncUI();
      say('同步完成');
    } catch (e) {
      console.error('[sage-cloud-sync] syncNow:', e);
    }
  }

  function getSyncUI() {
    if (_syncKey) {
      return '<div class="sync-card connected">' +
        '<div class="sync-status">' +
          '<span class="sync-dot ' + _status + '"></span>' +
          '<span class="sync-status-text">' + esc(_statusMsg) + '</span>' +
        '</div>' +
        '<div class="sync-meta">' +
          '<span class="hint">同步码: ' + esc(_syncKey.slice(0, 2)) + '***</span>' +
          '<span class="hint">上次同步: ' + esc(fmtTime(_lastSync)) + '</span>' +
        '</div>' +
        '<div class="sync-actions">' +
          '<button class="mini" data-action="sync-now">立即同步</button>' +
          '<label class="sync-toggle"><input type="checkbox" ' +
            (_autoSync ? 'checked ' : '') +
            'data-action="sync-auto"> 自动同步</label>' +
          '<button class="mini danger" data-action="sync-disconnect">断开连接</button>' +
        '</div>' +
      '</div>';
    }
    return '<div class="sync-card disconnected">' +
      '<h3>Supabase 云同步</h3>' +
      '<p class="hint">在设备间同步所有数据。设置一个同步码，其他设备输入相同同步码即可共享。</p>' +
      '<button class="mini" data-action="sync-connect">连接云同步</button>' +
    '</div>';
  }

  function showConnectModal() {
    var overlay = document.getElementById('syncModal');
    if (overlay) { overlay.style.display = 'flex'; overlay.querySelector('#syncKeyInput').focus(); return; }
    var div = document.createElement('div');
    div.id = 'syncModal';
    div.className = 'sync-modal-overlay';
    div.innerHTML = '<div class="sync-modal">' +
      '<h3>连接云同步</h3>' +
      '<p class="hint" style="margin-bottom:12px">设置一个同步码（至少 4 位），其他设备输入相同同步码即可同步数据。</p>' +
      '<input class="field" id="syncKeyInput" type="text" placeholder="输入同步码，如 my-sage-2026" autocomplete="off">' +
      '<div class="sync-modal-actions">' +
        '<button class="mini" id="syncConnectBtn">连接</button>' +
        '<button class="mini ghost" id="syncCancelBtn">取消</button>' +
      '</div>' +
      '<p id="syncError" class="hint" style="color:#d4785a;display:none"></p>' +
    '</div>';
    document.body.appendChild(div);
    div.style.display = 'flex';

    div.querySelector('#syncCancelBtn').addEventListener('click', function () { div.style.display = 'none'; });
    div.addEventListener('click', function (e) { if (e.target === div) div.style.display = 'none'; });
    div.querySelector('#syncKeyInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') div.querySelector('#syncConnectBtn').click();
    });
    div.querySelector('#syncConnectBtn').addEventListener('click', async function () {
      var input = div.querySelector('#syncKeyInput');
      var errEl = div.querySelector('#syncError');
      var btn = div.querySelector('#syncConnectBtn');
      errEl.style.display = 'none';
      btn.textContent = '连接中...';
      btn.disabled = true;
      try {
        await connect(input.value);
        div.style.display = 'none';
      } catch (err) {
        errEl.textContent = err.message || '连接失败';
        errEl.style.display = 'block';
        btn.textContent = '连接';
        btn.disabled = false;
      }
    });
  }

  function renderSyncUI() {
    var container = document.getElementById('cloudSyncUI');
    if (!container) return;
    container.innerHTML = getSyncUI();
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      switch (btn.getAttribute('data-action')) {
        case 'sync-now': syncNow(); break;
        case 'sync-auto':
          if (btn.checked) startAutoSync(); else stopAutoSync();
          break;
        case 'sync-disconnect':
          if (confirm('确定断开云同步？本地数据不会删除。')) disconnect();
          break;
        case 'sync-connect': showConnectModal(); break;
      }
    });
  }

  window.SageCloudSync = {
    init: init,
    connect: connect,
    disconnect: disconnect,
    getStatus: function () { return { status: _status, message: _statusMsg, lastSyncAt: _lastSync, connected: !!_syncKey, autoSync: _autoSync, syncKey: _syncKey }; },
    pull: pull,
    push: push,
    syncNow: syncNow,
    autoSync: function (enable) { return enable !== false ? startAutoSync() : stopAutoSync(); },
    getSyncUI: getSyncUI,
    renderSyncUI: renderSyncUI,
    showConnectModal: showConnectModal
  };

  window.__sageCloudSyncInited = true;
  console.log('[sage-cloud-sync] Supabase edition loaded');
})();
