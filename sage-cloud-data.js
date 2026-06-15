import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = typeof __SAGE_SUPABASE_URL__ !== 'undefined' ? __SAGE_SUPABASE_URL__ : '';
const SUPABASE_ANON_KEY =
  typeof __SAGE_SUPABASE_ANON_KEY__ !== 'undefined' ? __SAGE_SUPABASE_ANON_KEY__ : '';
const ADMIN_PASSCODE = typeof __SAGE_ADMIN_PASSCODE__ !== 'undefined' ? __SAGE_ADMIN_PASSCODE__ : '';

const MODULE_TABLES = {
  study: 'courses',
  assignments: 'assignments',
  career: 'job_applications',
  expenses: 'expenses',
  portfolio: 'portfolio_projects',
  profile: 'profile',
  tasks: 'task_items',
  growth: 'growth_entries',
  siteContent: 'site_content',
  settings: 'app_settings',
};

const hasConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const client = hasConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const ADMIN_SESSION_KEY = 'sage.admin.unlocked.v1';
const GATE_ID = 'sage-admin-gate';

function tableFor(module) {
  return MODULE_TABLES[module] || module;
}

function localModeMessage() {
  return hasConfig
    ? 'Supabase 已连接'
    : '未配置 Supabase，当前使用本地模式；部署到 Vercel 后请填写环境变量。';
}

function isAdminUnlocked() {
  if (!ADMIN_PASSCODE) return true;
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function requireAdminWrite() {
  if (isAdminUnlocked()) return;
  throw new Error('请先输入管理密码，再保存云端数据。');
}

function unlockAdmin(passcode) {
  if (!ADMIN_PASSCODE) return true;
  if (String(passcode || '') !== ADMIN_PASSCODE) return false;
  sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  window.dispatchEvent(new CustomEvent('sage-admin-changed', { detail: { unlocked: true } }));
  return true;
}

function lockAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('sage-admin-changed', { detail: { unlocked: false } }));
}

function installAdminDock() {
  if (document.querySelector('.sage-admin-dock')) return;
  installAdminGateStyles();
  const dock = document.createElement('div');
  dock.className = 'sage-admin-dock';
  dock.innerHTML = '<button type="button" class="sage-admin-toggle"></button><form class="sage-admin-form"><input type="password" placeholder="管理密码"><button type="submit">解锁</button></form>';
  document.body.appendChild(dock);
  const toggle = dock.querySelector('.sage-admin-toggle');
  const form = dock.querySelector('.sage-admin-form');
  const input = dock.querySelector('input');
  function updateWriteControls() {
    if (!ADMIN_PASSCODE) return;
    const locked = !isAdminUnlocked();
    document.querySelectorAll('main form input, main form select, main form textarea, main form button, main [data-action], .edit-save-dock button').forEach((el) => {
      el.disabled = locked;
    });
  }
  function render() {
    const unlocked = isAdminUnlocked();
    document.body.classList.toggle('sage-admin-locked', !unlocked);
    document.body.classList.toggle('sage-admin-unlocked', unlocked);
    toggle.textContent = unlocked ? '管理已解锁' : '管理模式';
    form.hidden = unlocked || !dock.classList.contains('open');
    renderAdminGate();
    updateWriteControls();
  }
  toggle.addEventListener('click', () => {
    if (isAdminUnlocked()) {
      lockAdmin();
      return;
    }
    dock.classList.toggle('open');
    render();
    if (!form.hidden) input.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (unlockAdmin(input.value)) {
      input.value = '';
      dock.classList.remove('open');
      toast('已进入管理模式，可以保存云端数据。');
    } else {
      toast('管理密码不正确。');
    }
    render();
  });
  window.addEventListener('sage-admin-changed', render);
  window.addEventListener('sage-data-changed', updateWriteControls);
  window.setTimeout(updateWriteControls, 300);
  window.setTimeout(updateWriteControls, 1000);
  render();
}

function installAdminGateStyles() {
  if (document.getElementById('sage-admin-gate-style')) return;
  const style = document.createElement('style');
  style.id = 'sage-admin-gate-style';
  style.textContent = `
    .sage-admin-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 32% 18%,rgba(220,247,226,.9),transparent 34%),linear-gradient(135deg,#fbfaf2 0%,#edf8ee 52%,#d9efe5 100%);color:#31483c;overflow:hidden}
    .sage-admin-gate[hidden]{display:none}
    .sage-admin-gate-card{position:relative;z-index:2;width:min(520px,100%);border:1px solid rgba(148,190,162,.42);border-radius:28px;background:rgba(255,253,248,.82);box-shadow:0 28px 80px rgba(62,86,69,.18);padding:34px 28px 28px;text-align:center;backdrop-filter:blur(18px)}
    .sage-admin-gate-kicker{margin:0 0 10px;color:#6b8b67;font-size:13px;font-weight:900}
    .sage-admin-gate h1{margin:0;font-size:clamp(34px,7vw,58px);line-height:1.05;letter-spacing:0;color:#31483c}
    .sage-admin-gate-copy{margin:16px auto 22px;max-width:360px;color:#6c7d75;font-weight:750;line-height:1.7}
    .sage-admin-gate-form{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:0 auto;max-width:390px}
    .sage-admin-gate-form input{min-width:0;border:1px solid rgba(137,185,154,.55);border-radius:999px;background:#fffdf8;padding:14px 16px;color:#31483c;font:inherit;font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
    .sage-admin-gate-form button{border:0;border-radius:999px;background:#6f9678;color:#fff;padding:14px 18px;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 14px 28px rgba(83,119,92,.2)}
    .sage-admin-gate-error{min-height:22px;margin:12px 0 0;color:#b06b5d;font-weight:850}
    .sage-plant{position:relative;width:180px;height:170px;margin:0 auto 8px}
    .sage-plant .soil{position:absolute;left:47px;bottom:8px;width:86px;height:22px;border-radius:50%;background:linear-gradient(90deg,#cbbf9d,#e3d9bd);box-shadow:0 12px 28px rgba(80,94,76,.16)}
    .sage-plant .stem{position:absolute;left:88px;bottom:24px;width:6px;height:116px;border-radius:999px;background:#76a77a;transform-origin:bottom;animation:sage-grow-stem 1.5s ease-out both}
    .sage-plant .leaf{position:absolute;width:54px;height:34px;border-radius:34px 34px 34px 4px;background:linear-gradient(135deg,#b9e7c7,#76ad80);opacity:0;transform:scale(.2) rotate(var(--r));animation:sage-grow-leaf .9s ease-out forwards;box-shadow:0 10px 22px rgba(93,135,99,.18)}
    .sage-plant .leaf.l1{left:90px;bottom:82px;--r:-24deg;animation-delay:.75s}
    .sage-plant .leaf.l2{left:36px;bottom:62px;--r:204deg;animation-delay:1s}
    .sage-plant .leaf.l3{left:92px;bottom:118px;--r:-5deg;animation-delay:1.25s}
    .sage-sparkle{position:absolute;border-radius:999px;background:#fff;opacity:.7;animation:sage-float 3.8s ease-in-out infinite}
    .sage-sparkle.s1{width:8px;height:8px;left:14%;top:18%}.sage-sparkle.s2{width:12px;height:12px;right:16%;top:24%;animation-delay:.7s}.sage-sparkle.s3{width:6px;height:6px;left:22%;bottom:22%;animation-delay:1.2s}
    body.sage-gate-open{overflow:hidden}
    body.sage-gate-open .sage-admin-dock{display:none}
    @keyframes sage-grow-stem{from{transform:scaleY(0);opacity:.35}to{transform:scaleY(1);opacity:1}}
    @keyframes sage-grow-leaf{to{opacity:1;transform:scale(1) rotate(var(--r))}}
    @keyframes sage-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
    @media(max-width:620px){.sage-admin-gate-card{padding:28px 18px 22px;border-radius:24px}.sage-admin-gate-form{grid-template-columns:1fr}.sage-admin-gate-form button{width:100%}.sage-plant{transform:scale(.88);margin-bottom:-4px}}
  `;
  document.head.appendChild(style);
}

function renderAdminGate() {
  if (!ADMIN_PASSCODE) return;
  let gate = document.getElementById(GATE_ID);
  if (isAdminUnlocked()) {
    if (gate) gate.hidden = true;
    document.body.classList.remove('sage-gate-open');
    return;
  }
  if (!gate) {
    gate = document.createElement('section');
    gate.id = GATE_ID;
    gate.className = 'sage-admin-gate';
    gate.setAttribute('aria-label', 'Sage Utopia 管理密码');
    gate.innerHTML = `
      <span class="sage-sparkle s1"></span><span class="sage-sparkle s2"></span><span class="sage-sparkle s3"></span>
      <div class="sage-admin-gate-card">
        <div class="sage-plant" aria-hidden="true"><span class="soil"></span><span class="stem"></span><span class="leaf l1"></span><span class="leaf l2"></span><span class="leaf l3"></span></div>
        <p class="sage-admin-gate-kicker">Sage Utopia</p>
        <h1>先让小植物发芽</h1>
        <p class="sage-admin-gate-copy">输入管理密码后进入你的小屋，所有新增、编辑和删除都会连接云端保存。</p>
        <form class="sage-admin-gate-form">
          <input type="password" autocomplete="current-password" placeholder="输入管理密码" aria-label="管理密码">
          <button type="submit">进入</button>
        </form>
        <p class="sage-admin-gate-error" role="status" aria-live="polite"></p>
      </div>
    `;
    document.body.appendChild(gate);
    const gateForm = gate.querySelector('form');
    const gateInput = gate.querySelector('input');
    const gateError = gate.querySelector('.sage-admin-gate-error');
    gateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (unlockAdmin(gateInput.value)) {
        gateInput.value = '';
        gate.hidden = true;
        document.body.classList.remove('sage-gate-open');
        toast('欢迎回来，云端小屋已打开。');
      } else {
        gateError.textContent = '密码不正确，再检查一下。';
        gateInput.select();
      }
    });
    window.setTimeout(() => gateInput.focus(), 120);
  }
  gate.hidden = false;
  document.body.classList.add('sage-gate-open');
}

function toast(text) {
  if (window.SageUI && window.SageUI.toast) {
    window.SageUI.toast(text);
    return;
  }
  const el = document.createElement('div');
  el.className = 'edit-toast show';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([_key, value]) => value !== undefined)
  );
}

function toCloud(module, payload) {
  const item = { ...(payload || {}) };
  if (module === 'tasks') {
    item.start_date = item.start || item.start_date || null;
    item.due_date = item.due || item.due_date || null;
    delete item.start;
    delete item.due;
    item.total = Number(item.total || 1);
    item.current = Number(item.current || 0);
    item.done = Boolean(item.done);
    item.history = Array.isArray(item.history) ? item.history : [];
  }
  if (module === 'growth') {
    item.entry_date = item.date || item.entry_date || new Date().toISOString().slice(0, 10);
    delete item.date;
    item.tags = Array.isArray(item.tags) ? item.tags : [];
  }
  if (module === 'siteContent') {
    item.plain_text = item.plain_text || item.plainText || '';
    delete item.plainText;
  }
  return cleanPayload(item);
}

function fromCloud(module, payload) {
  const item = { ...(payload || {}) };
  if (module === 'tasks') {
    item.start = item.start_date || '';
    item.due = item.due_date || '';
    delete item.start_date;
    delete item.due_date;
    item.total = Number(item.total || 1);
    item.current = Number(item.current || 0);
    item.history = Array.isArray(item.history) ? item.history : [];
  }
  if (module === 'growth') {
    item.date = item.entry_date || item.created_at?.slice(0, 10) || '';
    delete item.entry_date;
    item.tags = Array.isArray(item.tags) ? item.tags : [];
  }
  return item;
}

async function list(module, orderField = 'created_at') {
  if (!client) return null;
  const { data, error } = await client.from(tableFor(module)).select('*').order(orderField, { ascending: false });
  if (error) throw error;
  return (data || []).map((item) => fromCloud(module, item));
}

async function create(module, payload) {
  if (!client) return null;
  requireAdminWrite();
  const { data, error } = await client.from(tableFor(module)).insert(toCloud(module, payload)).select('*').single();
  if (error) throw error;
  return fromCloud(module, data);
}

async function update(module, id, payload) {
  if (!client) return null;
  requireAdminWrite();
  const { data, error } = await client
    .from(tableFor(module))
    .update({ ...toCloud(module, payload), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromCloud(module, data);
}

async function remove(module, id) {
  if (!client) return null;
  requireAdminWrite();
  const { error } = await client.from(tableFor(module)).delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function upsertBy(module, column, value, payload) {
  if (!client) return null;
  requireAdminWrite();
  const body = toCloud(module, { ...payload, [column]: value, updated_at: new Date().toISOString() });
  const { data, error } = await client
    .from(tableFor(module))
    .upsert(body, { onConflict: column })
    .select('*')
    .single();
  if (error) throw error;
  return fromCloud(module, data);
}

window.SageCloudData = {
  hasConfig,
  client,
  adminPasscodeConfigured: Boolean(ADMIN_PASSCODE),
  isAdminUnlocked,
  unlockAdmin,
  lockAdmin,
  requireAdminWrite,
  localModeMessage,
  list,
  create,
  update,
  remove,
  upsertBy,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAdminDock);
} else {
  installAdminDock();
}
window.dispatchEvent(new CustomEvent('sage-cloud-ready'));
