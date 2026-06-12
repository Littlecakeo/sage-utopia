/**
 * sage-data.js v2.0
 * ─────────────────────────────────────
 * Sage Utopia · 统一数据层
 * 所有模块通过本模块读写。Supabase 配置存在时优先云端，
 * 未配置时保留 localStorage 本地模式，方便本地预览和迁移。
 */
(function () {
  'use strict';

  /* ── 存储 Key 定义 ─────────────────────────────────── */
  const KEYS = {
    tasks:     'sage.progress.items.v2',
    career:    'sage.career.jobs.v1',
    expenses:  'sage.finance.expenses.v1',
    growth:    'sage.growth.entries.v1',
    portfolio: 'sage.portfolio.projects.v1',
    profile:   'sage.profile.v1',
    sync:      'sage.sync.ical.v1',
    study:     'sage.study.planV3',
  };

  /* ── Schema 定义（最小校验）────────────────────────── */
  const SCHEMAS = {
    tasks:     { type: 'array', desc: '任务列表' },
    career:    { type: 'array', desc: '求职列表' },
    growth:    { type: 'array', desc: '成长记录' },
    expenses:  { type: 'array', desc: '财务支出' },
    portfolio: { type: 'array', desc: '作品集' },
    profile:   { type: 'array', desc: '个人资料' },
    sync:      { type: 'array', desc: '同步事件' },
    study:     { type: 'array', desc: '学习计划' },
  };

  /* ── Schema 校验 ───────────────────────────────────── */
  function validateData(module, data) {
    const schema = SCHEMAS[module];
    if (!schema) {
      // 未注册的模块放行（向后兼容）
      return { ok: true };
    }
    // 序列化安全：写入前先做一次 JSON 往返，确保数据可安全存读
    try {
      JSON.parse(JSON.stringify(data));
    } catch (circErr) {
      console.error('[sage-data] circular/unsafe data in', module, ':', circErr.message);
      return { ok: false, reason: '数据包含不可序列化的引用' };
    }
    if (schema.type === 'array' && !Array.isArray(data)) {
      console.error('[sage-data] schema fail:', module, 'expected array, got', typeof data);
      return { ok: false, reason: '期望 Array，实际为 ' + typeof data };
    }
    return { ok: true };
  }

  /* ── 读取（返回数组，失败返回 []）──────────────────── */
  function load(module) {
    try {
      if (module === 'study') {
        const raw = localStorage.getItem('sage.study.planV3');
        const parsed = raw ? JSON.parse(raw) : [];
        const v = validateData('study', parsed);
        return v.ok ? parsed : [];
      }
      const raw = localStorage.getItem(KEYS[module]);
      const parsed = raw ? JSON.parse(raw) : [];
      const v = validateData(module, parsed);
      if (!v.ok) {
        console.warn('[sage-data] corrupted data for', module, '— resetting to []');
        return [];
      }
      return parsed;
    } catch (e) {
      console.warn('[sage-data] load error:', module, e);
      return [];
    }
  }

  async function loadAsync(module) {
    if (window.SageCloudData && window.SageCloudData.hasConfig) {
      try {
        const cloud = await window.SageCloudData.list(module);
        if (Array.isArray(cloud)) {
          saveLocalOnly(module, cloud);
          return cloud;
        }
      } catch (e) {
        console.warn('[sage-data] cloud load fallback:', module, e);
      }
    }
    return load(module);
  }

  /* ── 写入（自动触发跨模块通知）────────────────────── */
  function save(module, data) {
    try {
      const v = validateData(module, data);
      if (!v.ok) {
        console.warn('[sage-data] save blocked:', module, v.reason);
        return;
      }
      const key = module === 'study' ? 'sage.study.planV3' : KEYS[module];
      if (!key) {
        console.error('[sage-data] unknown module:', module, '— no storage key');
        return;
      }
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(
        new CustomEvent('sage-data-changed', { detail: { module } })
      );
    } catch (e) {
      console.error('[sage-data] save error:', module, e);
    }
  }

  function saveLocalOnly(module, data) {
    try {
      const v = validateData(module, data);
      if (!v.ok) return;
      const key = module === 'study' ? 'sage.study.planV3' : KEYS[module];
      if (key) localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[sage-data] local cache save error:', module, e);
    }
  }

  /* ── 生成唯一 ID ───────────────────────────────────── */
  function uid(prefix) {
    return (prefix || 'item') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  /* ── CRUD ──────────────────────────────────────────── */
  function getAll(module)          { return load(module); }
  function getById(module, id)    { return load(module).find(i => i.id === id) || null; }

  function add(module, item) {
    const list = load(module);
    list.unshift(item);
    save(module, list);
    return item;
  }

  function update(module, id, updates) {
    const list = load(module);
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    save(module, list);
    return list[idx];
  }

  function remove(module, id) {
    save(module, load(module).filter(i => i.id !== id));
  }

  function query(module, filterFn) {
    return load(module).filter(filterFn);
  }

  async function cloudAdd(module, item) {
    if (window.SageCloudData && window.SageCloudData.hasConfig) {
      try {
        const saved = await window.SageCloudData.create(module, item);
        if (saved) return saved;
      } catch (e) {
        console.warn('[sage-data] cloud add fallback:', module, e);
      }
    }
    return add(module, item);
  }

  async function cloudUpdate(module, id, updates) {
    if (window.SageCloudData && window.SageCloudData.hasConfig) {
      try {
        const saved = await window.SageCloudData.update(module, id, updates);
        if (saved) return saved;
      } catch (e) {
        console.warn('[sage-data] cloud update fallback:', module, e);
      }
    }
    return update(module, id, updates);
  }

  async function cloudRemove(module, id) {
    if (window.SageCloudData && window.SageCloudData.hasConfig) {
      try {
        await window.SageCloudData.remove(module, id);
        return;
      } catch (e) {
        console.warn('[sage-data] cloud remove fallback:', module, e);
      }
    }
    remove(module, id);
  }

  /* ── 导出 ──────────────────────────────────────────── */
  window.SageData = {
    load, loadAsync, save, saveLocalOnly, uid, getAll, getById, add, update, remove, query,
    cloudAdd, cloudUpdate, cloudRemove, KEYS, SCHEMAS, validate: validateData
  };
  console.log('[sage-data] v1.1 loaded — modules:', Object.keys(KEYS).join(', '), '(+schema validation)');
})();
