import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (typeof window !== 'undefined' && window.__SAGE_ENV__) || {};
const SUPABASE_URL =
  runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof __SAGE_SUPABASE_URL__ !== 'undefined' ? __SAGE_SUPABASE_URL__ : '');
const SUPABASE_ANON_KEY =
  runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof __SAGE_SUPABASE_ANON_KEY__ !== 'undefined' ? __SAGE_SUPABASE_ANON_KEY__ : '');
const ADMIN_PASSCODE =
  runtimeEnv.NEXT_PUBLIC_ADMIN_PASSCODE ||
  (typeof __SAGE_ADMIN_PASSCODE__ !== 'undefined' ? __SAGE_ADMIN_PASSCODE__ : '');

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
    .sage-admin-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 40%,rgba(212,238,221,.58),transparent 34%),radial-gradient(circle at 68% 22%,rgba(255,249,232,.82),transparent 26%),linear-gradient(180deg,#fbfdf7 0%,#eff8ef 56%,#dcefe5 100%);color:#31483c;overflow:hidden;font-family:"Noto Serif SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif}
    .sage-admin-gate[hidden]{display:none}
    .sage-admin-gate:before,.sage-admin-gate:after{content:"";position:absolute;border:1px solid rgba(147,188,158,.16);border-radius:999px;pointer-events:none}
    .sage-admin-gate:before{width:420px;height:420px;left:50%;top:44%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,255,255,.42),transparent 62%);animation:sage-glow-drift 9s ease-in-out infinite}
    .sage-admin-gate:after{width:260px;height:260px;right:-80px;bottom:8%;opacity:.5;animation:sage-glow-drift 11s ease-in-out reverse infinite}
    .sage-admin-gate-card{position:relative;z-index:2;width:min(430px,calc(100vw - 44px));border:1px solid rgba(173,207,181,.48);border-radius:30px;background:linear-gradient(180deg,rgba(255,254,249,.94),rgba(255,253,247,.88));box-shadow:0 28px 72px rgba(72,99,80,.14);padding:46px 34px 36px;text-align:center;backdrop-filter:blur(18px)}
    .sage-admin-gate-card:before{content:"";position:absolute;inset:12px;border:1px solid rgba(187,217,194,.32);border-radius:23px;pointer-events:none}
    .sage-admin-gate-kicker{margin:10px 0 24px;color:#66886c;font-family:"Noto Serif SC","PingFang SC",serif;font-size:21px;font-weight:700;letter-spacing:.01em}
    .sage-admin-gate-form{position:relative;z-index:2;display:grid;gap:13px;align-items:center;margin:0 auto;max-width:354px}
    .sage-admin-gate-form input{min-width:0;height:56px;border:1.3px solid rgba(154,196,166,.64);border-radius:999px;background:rgba(255,254,249,.94);padding:0 22px;color:#31483c;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:17px;font-weight:650;letter-spacing:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 26px rgba(105,132,108,.08);outline:none;transition:border-color .24s ease,box-shadow .24s ease,background .24s ease}
    .sage-admin-gate-form input::placeholder{color:rgba(111,123,115,.48);font-weight:650}
    .sage-admin-gate-form input:focus{border-color:rgba(114,161,126,.86);background:#fffef9;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 0 0 5px rgba(196,224,202,.42),0 14px 32px rgba(105,132,108,.1)}
    .sage-admin-gate-form button{height:56px;border:0;border-radius:999px;background:linear-gradient(180deg,#86a987,#719373);color:#fff;padding:0 18px;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:18px;font-weight:760;letter-spacing:.02em;cursor:pointer;box-shadow:0 16px 32px rgba(87,119,91,.2);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
    .sage-admin-gate-form button:hover{transform:translateY(-1px);box-shadow:0 18px 36px rgba(87,119,91,.24);filter:saturate(1.04)}
    .sage-admin-gate-error{min-height:22px;margin:13px 0 0;color:#a7685e;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:14px;font-weight:650}
    .sage-plant{position:relative;width:208px;height:176px;margin:0 auto -4px;filter:drop-shadow(0 16px 28px rgba(108,139,107,.13));animation:sage-breeze 6.8s ease-in-out 2.6s infinite;transform-origin:50% 95%}
    .sage-plant.focused{animation:sage-breeze 6.8s ease-in-out 2.6s infinite,sage-plant-focus 1.8s ease-in-out infinite}
    .sage-plant .soil{position:absolute;left:54px;bottom:6px;width:98px;height:24px;border-radius:50%;background:radial-gradient(ellipse at 50% 44%,#e3d9bd 0 46%,#d2c49e 72%,rgba(203,191,157,.18) 100%);box-shadow:0 14px 30px rgba(86,95,76,.12);opacity:0;transform:scale(.72);animation:sage-soil-appear .8s ease-out forwards}
    .sage-plant .stem{position:absolute;left:101px;bottom:24px;width:4px;height:122px;border-radius:999px;background:linear-gradient(180deg,#6d9b78,#80b789);transform-origin:bottom;transform:scaleY(0);animation:sage-stem-rise 1.3s .5s cubic-bezier(.2,.78,.24,1) forwards}
    .sage-plant .branch{position:absolute;left:102px;bottom:var(--b);width:2.5px;height:var(--h);border-radius:999px;background:linear-gradient(180deg,#6d9b78,#82b98c);transform-origin:bottom;opacity:0;transform:scaleY(0) rotate(var(--r));animation:sage-stem-rise .9s var(--d) cubic-bezier(.2,.78,.24,1) forwards}
    .sage-plant .branch.b1{--b:63px;--h:44px;--r:-44deg;--d:1s}.sage-plant .branch.b2{--b:82px;--h:52px;--r:42deg;--d:1.18s}.sage-plant .branch.b3{--b:109px;--h:46px;--r:-24deg;--d:1.36s}
    .sage-plant .leaf{position:absolute;width:58px;height:31px;border-radius:70% 36% 70% 36%;background:linear-gradient(135deg,#c4e7cb 0%,#97c9a2 54%,#73a77b 100%);opacity:0;transform-origin:var(--ox) var(--oy);transform:scale(.18) rotate(var(--r));box-shadow:inset 9px 8px 18px rgba(255,255,255,.28),0 10px 20px rgba(91,127,95,.13);animation:sage-leaf-unfurl .9s var(--d) cubic-bezier(.2,.82,.2,1.08) forwards,sage-leaf-sway 5.8s calc(var(--d) + 1s) ease-in-out infinite}
    .sage-plant .leaf.l1{left:45px;bottom:76px;--r:211deg;--ox:100%;--oy:70%;--d:1.28s}.sage-plant .leaf.l2{left:102px;bottom:96px;--r:-8deg;--ox:0%;--oy:70%;--d:1.48s}.sage-plant .leaf.l3{left:63px;bottom:125px;width:48px;height:27px;--r:203deg;--ox:100%;--oy:72%;--d:1.72s}.sage-plant .leaf.l4{left:111px;bottom:64px;width:50px;height:28px;--r:18deg;--ox:0%;--oy:72%;--d:1.62s}
    .sage-plant .flower{position:absolute;width:38px;height:38px;opacity:0;transform:scale(.2) rotate(-8deg);animation:sage-flower-pop .72s var(--d) cubic-bezier(.2,.84,.22,1.2) forwards,sage-flower-float 6.4s calc(var(--d) + .8s) ease-in-out infinite}
    .sage-plant .flower:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#f5d06f 0 10%,#fff8d7 11% 16%,transparent 17%),radial-gradient(ellipse at 50% 14%,#ffe8ee 0 22%,#efadc0 50%,transparent 52%),radial-gradient(ellipse at 86% 48%,#ffe8ee 0 21%,#efadc0 49%,transparent 51%),radial-gradient(ellipse at 50% 86%,#ffe8ee 0 22%,#efadc0 50%,transparent 52%),radial-gradient(ellipse at 14% 48%,#ffe8ee 0 21%,#efadc0 49%,transparent 51%);filter:drop-shadow(0 5px 10px rgba(177,123,136,.12))}
    .sage-plant .flower.f1{left:117px;bottom:128px;--d:2.04s}.sage-plant .flower.f2{left:54px;bottom:110px;width:30px;height:30px;--d:2.24s}.sage-plant .flower.f3{left:137px;bottom:86px;width:26px;height:26px;--d:2.42s}
    .sage-plant .paper-panel{position:absolute;left:70px;bottom:27px;width:68px;height:130px;border-radius:34px 34px 18px 18px;background:linear-gradient(180deg,rgba(255,253,221,.62),rgba(242,249,232,.38));box-shadow:inset 0 0 0 1px rgba(179,210,181,.28);clip-path:polygon(16% 0,84% 0,100% 12%,100% 88%,84% 100%,16% 100%,0 88%,0 12%);opacity:0;transform:translateY(10px);animation:sage-paper-in 1.1s .24s ease-out forwards}
    .sage-sparkle{position:absolute;border-radius:999px;background:rgba(255,255,255,.88);opacity:.66;box-shadow:0 0 18px rgba(255,255,255,.86);animation:sage-glow-drift 7.2s ease-in-out infinite}
    .sage-sparkle.s1{width:7px;height:7px;left:18%;top:21%}.sage-sparkle.s2{width:10px;height:10px;right:19%;top:30%;animation-delay:1.1s}.sage-sparkle.s3{width:6px;height:6px;left:25%;bottom:24%;animation-delay:2s}
    body.sage-gate-open{overflow:hidden}
    body.sage-gate-open .sage-admin-dock{display:none}
    @keyframes sage-soil-appear{to{opacity:1;transform:scale(1)}}
    @keyframes sage-stem-rise{0%{opacity:.2;transform:scaleY(0) rotate(var(--r,0deg))}100%{opacity:1;transform:scaleY(1) rotate(var(--r,0deg))}}
    @keyframes sage-leaf-unfurl{0%{opacity:0;transform:scale(.18) rotate(calc(var(--r) - 16deg))}72%{opacity:1;transform:scale(1.04) rotate(calc(var(--r) + 2deg))}100%{opacity:1;transform:scale(1) rotate(var(--r))}}
    @keyframes sage-flower-pop{0%{opacity:0;transform:scale(.2) rotate(-8deg)}72%{opacity:1;transform:scale(1.08) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes sage-breeze{0%,100%{transform:translateY(0) rotate(0deg)}45%{transform:translateY(-2px) rotate(.8deg)}70%{transform:translateY(-1px) rotate(-.45deg)}}
    @keyframes sage-leaf-sway{0%,100%{translate:0 0;filter:saturate(1)}50%{translate:0 -2px;filter:saturate(1.05)}}
    @keyframes sage-flower-float{0%,100%{translate:0 0}50%{translate:0 -2px}}
    @keyframes sage-paper-in{to{opacity:1;transform:translateY(0)}}
    @keyframes sage-glow-drift{0%,100%{transform:translateY(0) scale(1);opacity:.56}50%{transform:translateY(-12px) scale(1.04);opacity:.84}}
    @keyframes sage-plant-focus{0%,100%{filter:drop-shadow(0 16px 28px rgba(108,139,107,.13))}50%{filter:drop-shadow(0 18px 34px rgba(105,158,116,.22))}}
    @media(max-width:620px){.sage-admin-gate{padding:18px}.sage-admin-gate-card{width:min(360px,calc(100vw - 36px));padding:42px 24px 32px;border-radius:27px}.sage-admin-gate-kicker{font-size:20px;margin-bottom:23px}.sage-admin-gate-form input,.sage-admin-gate-form button{height:55px;font-size:17px}.sage-plant{width:198px;height:166px;margin-bottom:-6px;transform:scale(.94)}.sage-plant .paper-panel{left:66px;height:122px}.sage-plant .stem{left:96px;height:114px}.sage-plant .branch{left:97px}.sage-plant .soil{left:51px}.sage-plant .leaf.l1{left:42px}.sage-plant .leaf.l2{left:98px}.sage-plant .flower.f1{left:111px}.sage-plant .flower.f3{left:130px}}
    @media(prefers-reduced-motion:reduce){.sage-admin-gate *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
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
        <div class="sage-plant" aria-hidden="true"><span class="paper-panel"></span><span class="soil"></span><span class="stem"></span><span class="branch b1"></span><span class="branch b2"></span><span class="branch b3"></span><span class="leaf l1"></span><span class="leaf l2"></span><span class="leaf l3"></span><span class="leaf l4"></span><span class="flower f1"></span><span class="flower f2"></span><span class="flower f3"></span></div>
        <p class="sage-admin-gate-kicker">Sage Utopia</p>
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
    const plant = gate.querySelector('.sage-plant');
    gateInput.addEventListener('focus', () => plant.classList.add('focused'));
    gateInput.addEventListener('blur', () => plant.classList.remove('focused'));
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
