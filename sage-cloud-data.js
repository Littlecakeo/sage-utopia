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
    .sage-admin-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 46% 28%,rgba(231,239,225,.74),transparent 34%),radial-gradient(circle at 76% 78%,rgba(209,197,226,.28),transparent 25%),linear-gradient(180deg,#fbfbf4 0%,#f4f4e9 50%,#e8f2e7 100%);color:#2f4037;overflow:hidden;font-family:"Noto Serif SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif}
    .sage-admin-gate[hidden]{display:none}
    .sage-admin-gate:before,.sage-admin-gate:after{content:"";position:absolute;border-radius:999px;pointer-events:none}
    .sage-admin-gate:before{width:520px;height:520px;left:50%;top:47%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,255,255,.48),transparent 62%);border:1px solid rgba(120,147,114,.12);animation:sage-gate-breathe 10s ease-in-out infinite}
    .sage-admin-gate:after{width:300px;height:300px;right:-86px;bottom:7%;background:radial-gradient(circle,rgba(190,174,219,.22),transparent 70%);animation:sage-gate-breathe 12s ease-in-out reverse infinite}
    .sage-admin-gate-card{position:relative;z-index:2;width:min(430px,calc(100vw - 44px));min-height:650px;border:1px solid rgba(184,166,217,.24);border-radius:34px;background:linear-gradient(180deg,rgba(255,253,248,.92),rgba(255,253,248,.8));box-shadow:0 28px 78px rgba(55,72,62,.13);padding:32px 30px 30px;text-align:center;backdrop-filter:blur(18px);overflow:hidden}
    .sage-admin-gate-card:before{content:"";position:absolute;inset:12px;border:1px solid rgba(199,168,90,.23);border-radius:25px;pointer-events:none}
    .sage-admin-gate-card:after{content:"";position:absolute;left:50%;top:90px;width:260px;height:260px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle,rgba(217,208,236,.18),transparent 67%);pointer-events:none;animation:sage-gate-breathe 9s ease-in-out infinite}
    .sage-admin-gate-kicker{position:relative;z-index:3;margin:4px 0 18px;color:#536c55;font-family:"Noto Serif SC","Songti SC","PingFang SC",serif;font-size:21px;font-weight:650;letter-spacing:.02em}
    .sage-admin-gate-form{position:relative;z-index:4;display:grid;gap:12px;align-items:center;margin:0 auto;max-width:344px}
    .sage-admin-gate-form input{min-width:0;height:56px;border:1.2px solid rgba(130,160,125,.42);border-radius:999px;background:rgba(255,254,249,.88);padding:0 22px;color:#2f4037;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:16px;font-weight:560;letter-spacing:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.92),0 12px 28px rgba(85,105,88,.08);outline:none;transition:border-color .25s ease,box-shadow .25s ease,background .25s ease}
    .sage-admin-gate-form input::placeholder{color:rgba(92,102,95,.45);font-weight:560}
    .sage-admin-gate-form input:focus{border-color:rgba(149,126,193,.58);background:#fffef9;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 0 0 5px rgba(217,208,236,.25),0 14px 34px rgba(112,93,145,.1)}
    .sage-admin-gate-form button{height:56px;border:0;border-radius:999px;background:linear-gradient(180deg,#83a27e,#6f8f6d);color:#fff;padding:0 18px;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:17px;font-weight:720;letter-spacing:.04em;cursor:pointer;box-shadow:0 16px 32px rgba(87,119,91,.2);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
    .sage-admin-gate-form button:hover{transform:translateY(-1px);box-shadow:0 18px 38px rgba(87,119,91,.24);filter:saturate(1.04)}
    .sage-admin-gate-error{position:relative;z-index:4;min-height:22px;margin:12px 0 0;color:#a7685e;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:13px;font-weight:620}
    .sage-nouveau{position:relative;z-index:3;width:min(330px,100%);height:430px;margin:0 auto -18px;filter:drop-shadow(0 18px 26px rgba(58,77,63,.1));transform-origin:50% 88%;animation:sage-garden-breeze 8s ease-in-out 3s infinite}
    .sage-nouveau.focused{animation:sage-garden-breeze 8s ease-in-out 3s infinite,sage-focus-bloom 2.2s ease-in-out infinite}
    .sage-nouveau svg{width:100%;height:100%;display:block;overflow:visible}
    .sage-nouveau .arch{fill:none;stroke:#789372;stroke-width:1.25;opacity:.45}
    .sage-nouveau .gold{fill:none;stroke:#c7a85a;stroke-width:.82;stroke-linecap:round;stroke-linejoin:round;opacity:.76}
    .sage-nouveau .vine{fill:none;stroke:url(#sageVineGradient);stroke-width:3.1;stroke-linecap:round;stroke-linejoin:round}
    .sage-nouveau .vine-thin{fill:none;stroke:#789372;stroke-width:1.45;stroke-linecap:round;stroke-linejoin:round;opacity:.86}
    .sage-nouveau .leaf{fill:url(#sageLeafGradient);stroke:#789372;stroke-width:.82;opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-leaf-open .9s var(--d) cubic-bezier(.2,.82,.2,1.08) forwards,sage-leaf-drift 6s calc(var(--d) + .8s) ease-in-out infinite}
    .sage-nouveau .bell{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-bell-open .78s var(--d) cubic-bezier(.2,.82,.2,1.08) forwards,sage-flower-drift 6.6s calc(var(--d) + .9s) ease-in-out infinite}
    .sage-nouveau .bell path{fill:url(#sageBellGradient);stroke:#8a78b6;stroke-width:.72}
    .sage-nouveau .bell circle{fill:#d4b85f}
    .sage-nouveau .draw{stroke-dasharray:1;stroke-dashoffset:1;animation:sage-line-grow var(--dur,1.7s) var(--delay,0s) cubic-bezier(.26,.78,.24,1) forwards}
    .sage-nouveau .spark{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-star-pop .7s var(--d) ease-out forwards,sage-star-twinkle 4.6s calc(var(--d) + .6s) ease-in-out infinite}
    .sage-nouveau .spark path{fill:#fff8d7;stroke:#c7a85a;stroke-width:.4}
    .sage-nouveau .mote{fill:#fffdf6;opacity:0;filter:url(#sageGlow);animation:sage-mote-drift 7s var(--d) ease-in-out infinite}
    .sage-nouveau .panel{opacity:0;transform:translateY(10px);animation:sage-panel-rise 1.1s .4s ease-out forwards}
    .sage-nouveau .halo{opacity:0;animation:sage-halo-in 1.4s .25s ease-out forwards,sage-halo-pulse 7s 1.8s ease-in-out infinite}
    .sage-nouveau .soil{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-soil-appear .7s .15s ease-out forwards}
    .sage-sparkle{position:absolute;width:4px;height:4px;border-radius:999px;background:#fff8d7;opacity:0;box-shadow:0 0 14px rgba(199,168,90,.62);animation:sage-small-spark 5.8s ease-in-out infinite}
    .sage-sparkle.s1{left:19%;top:28%;animation-delay:1.8s}.sage-sparkle.s2{right:19%;top:36%;animation-delay:2.6s}.sage-sparkle.s3{left:28%;bottom:31%;animation-delay:3.4s}
    body.sage-gate-open{overflow:hidden}
    body.sage-gate-open .sage-admin-dock{display:none}
    @keyframes sage-line-grow{to{stroke-dashoffset:0}}
    @keyframes sage-panel-rise{to{opacity:1;transform:translateY(0)}}
    @keyframes sage-halo-in{to{opacity:1}}
    @keyframes sage-halo-pulse{0%,100%{transform:scale(1);opacity:.48}50%{transform:scale(1.03);opacity:.72}}
    @keyframes sage-soil-appear{0%{opacity:0;transform:scale(.7)}100%{opacity:1;transform:scale(1)}}
    @keyframes sage-leaf-open{0%{opacity:0;transform:scale(.18) rotate(-18deg)}72%{opacity:1;transform:scale(1.06) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
    @keyframes sage-bell-open{0%{opacity:0;transform:scale(.18) rotate(-10deg)}70%{opacity:1;transform:scale(1.08) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
    @keyframes sage-star-pop{0%{opacity:0;transform:scale(.2) rotate(0deg)}100%{opacity:.9;transform:scale(1) rotate(45deg)}}
    @keyframes sage-star-twinkle{0%,100%{opacity:.54;transform:scale(.86) rotate(45deg)}50%{opacity:1;transform:scale(1.12) rotate(45deg)}}
    @keyframes sage-mote-drift{0%{opacity:0;transform:translateY(10px)}24%{opacity:.7}100%{opacity:0;transform:translateY(-28px)}}
    @keyframes sage-garden-breeze{0%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(-2px) rotate(.32deg)}72%{transform:translateY(-1px) rotate(-.22deg)}}
    @keyframes sage-leaf-drift{0%,100%{translate:0 0}50%{translate:0 -1.6px}}
    @keyframes sage-flower-drift{0%,100%{translate:0 0}50%{translate:0 -2.2px}}
    @keyframes sage-focus-bloom{0%,100%{filter:drop-shadow(0 18px 26px rgba(58,77,63,.1))}50%{filter:drop-shadow(0 20px 34px rgba(149,126,193,.2))}}
    @keyframes sage-gate-breathe{0%,100%{opacity:.68;scale:1}50%{opacity:1;scale:1.025}}
    @keyframes sage-small-spark{0%,68%,100%{opacity:0;transform:translateY(0) scale(.6)}18%{opacity:.9;transform:translateY(-8px) scale(1)}}
    @media(max-width:620px){.sage-admin-gate{padding:18px}.sage-admin-gate-card{width:min(360px,calc(100vw - 36px));min-height:618px;padding:28px 22px 28px;border-radius:29px}.sage-admin-gate-kicker{font-size:20px;margin-bottom:16px}.sage-admin-gate-form input,.sage-admin-gate-form button{height:54px;font-size:16px}.sage-nouveau{width:min(310px,100%);height:398px;margin-bottom:-16px}}
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
        <div class="sage-nouveau" aria-hidden="true">
          <svg viewBox="0 0 260 330" role="img">
            <defs>
              <linearGradient id="sageVineGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#8aae83"></stop>
                <stop offset="100%" stop-color="#607d5f"></stop>
              </linearGradient>
              <linearGradient id="sageLeafGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#d6ead3"></stop>
                <stop offset="55%" stop-color="#b9cdb7"></stop>
                <stop offset="100%" stop-color="#789372"></stop>
              </linearGradient>
              <radialGradient id="sageBellGradient" cx="50%" cy="42%" r="70%">
                <stop offset="0%" stop-color="#fffdf8"></stop>
                <stop offset="48%" stop-color="#d9d0ec"></stop>
                <stop offset="100%" stop-color="#b8a6d9"></stop>
              </radialGradient>
              <filter id="sageGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.4"></feGaussianBlur>
              </filter>
            </defs>
            <ellipse class="halo" cx="130" cy="147" rx="88" ry="112" fill="rgba(217,208,236,.18)"></ellipse>
            <path class="panel" d="M47 288 C35 225 45 107 130 35 C215 107 225 225 213 288 C190 307 70 307 47 288Z" fill="rgba(255,253,248,.42)" stroke="rgba(199,168,90,.18)" stroke-width="1"></path>
            <path class="arch draw" style="--delay:.12s;--dur:1.7s" pathLength="1" d="M39 286 C25 206 42 92 130 24 C218 92 235 206 221 286"></path>
            <path class="gold draw" style="--delay:.36s;--dur:1.6s" pathLength="1" d="M57 279 C47 207 61 111 130 55 C199 111 213 207 203 279"></path>
            <path class="gold draw" style="--delay:.72s;--dur:1.5s" pathLength="1" d="M72 277 C67 216 80 136 130 84 C180 136 193 216 188 277"></path>
            <ellipse class="soil" cx="130" cy="282" rx="52" ry="11" fill="rgba(199,168,90,.28)"></ellipse>
            <path class="vine draw" style="--delay:.28s;--dur:2.1s" pathLength="1" d="M129 282 C126 244 135 214 128 185 C120 151 136 124 131 87"></path>
            <path class="vine-thin draw" style="--delay:.92s;--dur:1.8s" pathLength="1" d="M129 232 C92 210 73 174 72 132 C73 100 91 78 114 66"></path>
            <path class="vine-thin draw" style="--delay:1.04s;--dur:1.8s" pathLength="1" d="M131 211 C169 188 189 156 184 119 C181 96 166 78 145 66"></path>
            <path class="vine-thin draw" style="--delay:1.24s;--dur:1.4s" pathLength="1" d="M129 176 C100 164 92 139 108 119"></path>
            <path class="vine-thin draw" style="--delay:1.34s;--dur:1.4s" pathLength="1" d="M131 160 C158 146 166 121 151 101"></path>
            <path class="leaf" style="--d:1.62s" d="M82 165 C54 160 46 137 71 126 C93 119 108 138 102 158 C96 165 90 167 82 165Z"></path>
            <path class="leaf" style="--d:1.84s" d="M178 151 C205 145 215 121 190 111 C167 104 153 124 160 143 C166 151 171 153 178 151Z"></path>
            <path class="leaf" style="--d:2.04s" d="M101 111 C78 102 77 80 101 75 C119 73 130 91 121 105 C115 111 109 113 101 111Z"></path>
            <path class="leaf" style="--d:2.18s" d="M157 101 C181 93 181 72 158 67 C139 64 129 82 138 96 C144 102 150 104 157 101Z"></path>
            <g class="bell" style="--d:2.34s">
              <path d="M82 123 C74 111 80 98 94 97 C108 99 113 113 104 124 C98 131 88 131 82 123Z"></path>
              <path d="M91 97 L86 87 M96 98 L101 88" fill="none" stroke="#789372" stroke-width="1"></path>
              <circle cx="93" cy="115" r="2.2"></circle>
            </g>
            <g class="bell" style="--d:2.54s">
              <path d="M174 111 C166 99 172 87 187 86 C201 88 205 102 196 113 C189 120 180 119 174 111Z"></path>
              <path d="M184 86 L179 77 M189 87 L195 78" fill="none" stroke="#789372" stroke-width="1"></path>
              <circle cx="186" cy="103" r="2.2"></circle>
            </g>
            <g class="bell" style="--d:2.72s">
              <path d="M141 75 C134 65 139 53 152 52 C165 54 169 66 161 76 C155 83 147 82 141 75Z"></path>
              <path d="M150 52 L146 43 M154 53 L159 44" fill="none" stroke="#789372" stroke-width="1"></path>
              <circle cx="152" cy="68" r="2"></circle>
            </g>
            <g class="spark" style="--d:2.58s"><path d="M61 97 L64 104 L71 107 L64 110 L61 117 L58 110 L51 107 L58 104Z"></path></g>
            <g class="spark" style="--d:2.86s"><path d="M204 151 L207 157 L213 160 L207 163 L204 169 L201 163 L195 160 L201 157Z"></path></g>
            <g class="spark" style="--d:3.08s"><path d="M117 51 L119 56 L124 58 L119 60 L117 65 L115 60 L110 58 L115 56Z"></path></g>
            <circle class="mote" style="--d:2.2s" cx="90" cy="228" r="2.5"></circle>
            <circle class="mote" style="--d:2.9s" cx="184" cy="235" r="2.2"></circle>
            <circle class="mote" style="--d:3.4s" cx="122" cy="207" r="1.8"></circle>
            <circle class="mote" style="--d:3.8s" cx="158" cy="188" r="1.7"></circle>
          </svg>
        </div>
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
    const garden = gate.querySelector('.sage-nouveau');
    gateInput.addEventListener('focus', () => garden.classList.add('focused'));
    gateInput.addEventListener('blur', () => garden.classList.remove('focused'));
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
