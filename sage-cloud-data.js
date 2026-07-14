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
  guestbook: 'guestbook_messages',
  friendProfiles: 'friend_profiles',
};

const GUESTBOOK_PUBLIC_COLUMNS =
  'id,user_id,friend_username,display_name,avatar_emoji,avatar_color,avatar_url,message,sticker,note_color,is_visible,created_at,updated_at';

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
    const unlocked =
      sessionStorage.getItem(ADMIN_SESSION_KEY) === '1' ||
      localStorage.getItem(ADMIN_SESSION_KEY) === '1';
    if (unlocked) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    return unlocked;
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
  localStorage.setItem(ADMIN_SESSION_KEY, '1');
  window.dispatchEvent(new CustomEvent('sage-admin-changed', { detail: { unlocked: true } }));
  return true;
}

function lockAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('sage-admin-changed', { detail: { unlocked: false } }));
}

function installAdminDock() {
  if (document.body?.dataset.publicPage === 'friends') return;
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
      if (el.closest('[data-guest-write="true"]')) return;
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
    .sage-admin-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 50% 30%,rgba(255,253,246,.84),transparent 38%),radial-gradient(circle at 74% 73%,rgba(211,202,235,.22),transparent 28%),linear-gradient(180deg,#fbfaf4 0%,#f4f0e6 52%,#e9f1e5 100%);color:#2f4037;overflow:hidden;font-family:"Noto Serif SC","Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif}
    .sage-admin-gate[hidden]{display:none}
    .sage-admin-gate:before,.sage-admin-gate:after{content:"";position:absolute;border-radius:999px;pointer-events:none}
    .sage-admin-gate:before{width:min(530px,92vw);height:min(920px,94vh);left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(80,102,76,.16);border-radius:44px;background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.48),transparent 36%),linear-gradient(180deg,rgba(255,253,247,.34),rgba(242,247,235,.2));box-shadow:inset 0 0 0 1px rgba(207,176,95,.14);animation:sage-gate-breathe 10s ease-in-out infinite}
    .sage-admin-gate:after{width:360px;height:360px;right:-96px;bottom:8%;background:radial-gradient(circle,rgba(194,181,226,.2),transparent 70%);animation:sage-gate-breathe 12s ease-in-out reverse infinite}
    .sage-admin-gate-card{position:relative;z-index:2;width:min(430px,calc(100vw - 36px));min-height:min(780px,calc(100dvh - 36px));border:1px solid rgba(89,112,82,.26);border-radius:36px;background:linear-gradient(180deg,rgba(255,253,247,.9),rgba(255,252,245,.76));box-shadow:0 26px 76px rgba(55,72,62,.13),inset 0 0 0 1px rgba(255,255,255,.62);padding:26px 27px 28px;text-align:center;backdrop-filter:blur(16px);overflow:hidden}
    .sage-admin-gate-card:before{content:"";position:absolute;inset:10px;border:1px solid rgba(191,158,80,.34);border-radius:28px;pointer-events:none}
    .sage-admin-gate-card:after{content:"";position:absolute;left:50%;top:82px;width:284px;height:348px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle at 50% 35%,rgba(217,208,236,.22),transparent 60%);border:1px solid rgba(199,168,90,.12);pointer-events:none;animation:sage-gate-breathe 9s ease-in-out infinite}
    .sage-admin-gate-kicker{position:relative;z-index:3;margin:8px 0 18px;color:#657c5f;font-family:"Noto Serif SC","Songti SC","PingFang SC",serif;font-size:30px;font-weight:500;letter-spacing:.035em;text-shadow:0 1px 0 rgba(255,255,255,.8)}
    .sage-admin-gate-form{position:relative;z-index:4;display:grid;gap:14px;align-items:center;margin:0 auto;max-width:344px}
    .sage-admin-gate-form input{min-width:0;height:58px;border:1px solid rgba(145,135,151,.38);border-radius:999px;background:rgba(255,254,250,.9);padding:0 24px;color:#2f4037;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:16px;font-weight:560;letter-spacing:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 0 0 5px rgba(213,202,235,.16),0 13px 28px rgba(85,105,88,.08);outline:none;transition:border-color .25s ease,box-shadow .25s ease,background .25s ease}
    .sage-admin-gate-form input::placeholder{color:rgba(92,102,95,.45);font-weight:560}
    .sage-admin-gate-form input:focus{border-color:rgba(149,126,193,.58);background:#fffef9;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 0 0 6px rgba(217,208,236,.25),0 14px 34px rgba(112,93,145,.1)}
    .sage-admin-gate-form button{height:58px;border:1px solid rgba(207,176,95,.54);border-radius:999px;background:linear-gradient(180deg,#87a27f,#678867);color:#fff;padding:0 18px;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:18px;font-weight:720;letter-spacing:.06em;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28),0 16px 32px rgba(87,119,91,.22);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
    .sage-admin-gate-form button:hover{transform:translateY(-1px);box-shadow:0 18px 38px rgba(87,119,91,.24);filter:saturate(1.04)}
    .sage-role-switch{position:relative;z-index:4;display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:344px;margin:0 auto 14px;padding:5px;border:1px solid rgba(145,135,151,.22);border-radius:999px;background:rgba(255,254,250,.62)}
    .sage-role-switch span,.sage-role-switch a{display:grid;place-items:center;min-height:38px;border-radius:999px;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:13px;font-weight:820;color:#667b60;text-decoration:none}
    .sage-role-switch span{background:rgba(232,239,229,.92);color:#35493e;box-shadow:0 8px 18px rgba(85,105,88,.08)}
    .sage-role-switch a:hover{background:rgba(217,208,236,.22);color:#4d654c}
    .sage-admin-gate-error{position:relative;z-index:4;min-height:22px;margin:12px 0 0;color:#a7685e;font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;font-size:13px;font-weight:620}
    .sage-nouveau{position:relative;z-index:3;width:min(360px,100%);height:510px;margin:0 auto -10px;filter:drop-shadow(0 18px 26px rgba(58,77,63,.1));transform-origin:50% 88%;animation:sage-garden-breeze 8s ease-in-out 3s infinite}
    .sage-nouveau.focused{animation:sage-garden-breeze 8s ease-in-out 3s infinite,sage-focus-bloom 2.2s ease-in-out infinite}
    .sage-nouveau svg{width:100%;height:100%;display:block;overflow:visible}
    .sage-nouveau .arch{fill:none;stroke:#5f7c5c;stroke-width:1.05;opacity:.62}
    .sage-nouveau .gold{fill:none;stroke:#c3a15a;stroke-width:.55;stroke-linecap:round;stroke-linejoin:round;opacity:.78}
    .sage-nouveau .vine{fill:none;stroke:url(#sageVineGradient);stroke-width:2.65;stroke-linecap:round;stroke-linejoin:round}
    .sage-nouveau .vine-thin{fill:none;stroke:#6f8b68;stroke-width:1.12;stroke-linecap:round;stroke-linejoin:round;opacity:.8}
    .sage-nouveau .leaf{fill:url(#sageLeafGradient);stroke:#789372;stroke-width:.72;opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-leaf-open .9s var(--d) cubic-bezier(.2,.82,.2,1.08) forwards,sage-leaf-drift 6s calc(var(--d) + .8s) ease-in-out infinite}
    .sage-nouveau .leaf-vein{fill:none;stroke:#6f8b68;stroke-width:.42;stroke-linecap:round;opacity:.62}
    .sage-nouveau .bell{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-bell-open .78s var(--d) cubic-bezier(.2,.82,.2,1.08) forwards,sage-flower-drift 6.6s calc(var(--d) + .9s) ease-in-out infinite}
    .sage-nouveau .bell .petal{fill:url(#sageBellGradient);stroke:#8a78b6;stroke-width:.58}
    .sage-nouveau .bell .detail{fill:none;stroke:#789372;stroke-width:.8;stroke-linecap:round;stroke-linejoin:round;opacity:.76}
    .sage-nouveau .bell .stamen{fill:none;stroke:#c3a15a;stroke-width:.45;stroke-linecap:round;opacity:.76}
    .sage-nouveau .bell circle{fill:#d4b85f}
    .sage-nouveau .draw{stroke-dasharray:1;stroke-dashoffset:1;animation:sage-line-grow var(--dur,1.7s) var(--delay,0s) cubic-bezier(.26,.78,.24,1) forwards}
    .sage-nouveau .spark{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-star-pop .7s var(--d) ease-out forwards,sage-star-twinkle 4.6s calc(var(--d) + .6s) ease-in-out infinite}
    .sage-nouveau .spark path{fill:#fff8d7;stroke:#c7a85a;stroke-width:.4}
    .sage-nouveau .mote{fill:#fffdf6;opacity:0;filter:url(#sageGlow);animation:sage-mote-drift 7s var(--d) ease-in-out infinite}
    .sage-nouveau .panel{opacity:0;transform:translateY(10px);animation:sage-panel-rise 1.1s .4s ease-out forwards}
    .sage-nouveau .halo{opacity:0;animation:sage-halo-in 1.4s .25s ease-out forwards,sage-halo-pulse 7s 1.8s ease-in-out infinite}
    .sage-nouveau .soil{opacity:0;transform-box:fill-box;transform-origin:center;animation:sage-soil-appear .7s .15s ease-out forwards}
    .sage-sparkle{position:absolute;width:4px;height:4px;border-radius:999px;background:#fff8d7;opacity:0;box-shadow:0 0 14px rgba(199,168,90,.62);animation:sage-small-spark 5.8s ease-in-out infinite}
    .sage-sparkle.s1{left:18%;top:25%;animation-delay:1.8s}.sage-sparkle.s2{right:18%;top:34%;animation-delay:2.6s}.sage-sparkle.s3{left:27%;bottom:27%;animation-delay:3.4s}
    html.sage-gate-open,body.sage-gate-open{overflow:hidden}
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
    @media(max-width:620px){.sage-admin-gate{padding:14px}.sage-admin-gate-card{width:min(370px,calc(100vw - 28px));min-height:min(730px,calc(100dvh - 28px));padding:22px 22px 24px;border-radius:30px}.sage-admin-gate-kicker{font-size:28px;margin-bottom:16px}.sage-admin-gate-form input,.sage-admin-gate-form button{height:56px;font-size:16px}.sage-nouveau{width:min(322px,100%);height:474px;margin-bottom:-8px}}
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
    document.documentElement.classList.remove('sage-gate-open');
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
          <svg viewBox="0 0 260 390" role="img">
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
            <ellipse class="halo" cx="130" cy="168" rx="88" ry="128" fill="rgba(217,208,236,.17)"></ellipse>
            <path class="panel" d="M45 336 C32 250 42 111 130 35 C218 111 228 250 215 336 C189 359 71 359 45 336Z" fill="rgba(255,253,248,.38)" stroke="rgba(199,168,90,.16)" stroke-width="1"></path>
            <path class="arch draw" style="--delay:.12s;--dur:1.8s" pathLength="1" d="M35 335 C20 236 38 94 130 22 C222 94 240 236 225 335"></path>
            <path class="arch draw" style="--delay:.2s;--dur:1.8s" pathLength="1" d="M24 345 C17 230 30 74 108 24"></path>
            <path class="arch draw" style="--delay:.2s;--dur:1.8s" pathLength="1" d="M236 345 C243 230 230 74 152 24"></path>
            <path class="gold draw" style="--delay:.38s;--dur:1.65s" pathLength="1" d="M57 328 C47 241 62 121 130 55 C198 121 213 241 203 328"></path>
            <path class="gold draw" style="--delay:.76s;--dur:1.5s" pathLength="1" d="M72 324 C67 252 82 151 130 90 C178 151 193 252 188 324"></path>
            <path class="gold draw" style="--delay:1s;--dur:1.2s" pathLength="1" d="M103 30 C114 36 123 36 130 26 C137 36 146 36 157 30"></path>
            <ellipse class="soil" cx="130" cy="329" rx="54" ry="11" fill="rgba(199,168,90,.24)"></ellipse>
            <path class="vine draw" style="--delay:.28s;--dur:2.2s" pathLength="1" d="M129 329 C127 285 137 247 130 210 C122 171 136 133 131 82"></path>
            <path class="vine-thin draw" style="--delay:.88s;--dur:1.8s" pathLength="1" d="M128 274 C93 249 74 206 77 158 C79 119 96 88 119 68"></path>
            <path class="vine-thin draw" style="--delay:1s;--dur:1.8s" pathLength="1" d="M131 244 C168 219 190 178 184 133 C181 105 166 82 143 65"></path>
            <path class="vine-thin draw" style="--delay:1.18s;--dur:1.45s" pathLength="1" d="M129 210 C101 196 92 164 110 139"></path>
            <path class="vine-thin draw" style="--delay:1.28s;--dur:1.45s" pathLength="1" d="M131 184 C158 170 167 136 151 111"></path>
            <path class="vine-thin draw" style="--delay:1.44s;--dur:1.35s" pathLength="1" d="M90 300 C64 286 49 257 55 225"></path>
            <path class="vine-thin draw" style="--delay:1.54s;--dur:1.35s" pathLength="1" d="M172 302 C199 288 211 258 204 226"></path>
            <path class="leaf" style="--d:1.58s" d="M83 190 C64 182 58 160 76 148 C93 162 100 182 83 190Z"></path>
            <path class="leaf-vein" d="M77 151 C83 164 85 177 83 190"></path>
            <path class="leaf" style="--d:1.78s" d="M178 176 C197 166 201 143 184 132 C168 148 161 168 178 176Z"></path>
            <path class="leaf-vein" d="M184 134 C178 149 176 163 178 176"></path>
            <path class="leaf" style="--d:1.98s" d="M103 124 C85 114 87 93 105 86 C119 99 119 116 103 124Z"></path>
            <path class="leaf-vein" d="M106 88 C105 101 105 113 103 124"></path>
            <path class="leaf" style="--d:2.14s" d="M157 113 C175 103 173 82 156 76 C142 89 142 106 157 113Z"></path>
            <path class="leaf-vein" d="M156 78 C156 91 156 103 157 113"></path>
            <path class="leaf" style="--d:2.3s" d="M88 270 C68 263 62 241 79 230 C97 243 105 263 88 270Z"></path>
            <path class="leaf-vein" d="M80 233 C87 246 90 258 88 270"></path>
            <path class="leaf" style="--d:2.46s" d="M174 270 C194 261 199 240 181 230 C164 244 158 263 174 270Z"></path>
            <path class="leaf-vein" d="M182 232 C175 246 173 258 174 270"></path>
            <g class="bell" style="--d:2.38s">
              <path class="detail" d="M91 120 C86 112 86 107 88 102"></path>
              <path class="petal" d="M92 137 C80 134 75 122 85 116 C93 115 98 125 92 137Z"></path>
              <path class="petal" d="M93 137 C91 124 99 114 110 117 C115 126 106 137 93 137Z"></path>
              <path class="petal" d="M92 137 C84 144 74 143 70 133 C74 124 87 126 92 137Z"></path>
              <path class="petal" d="M94 138 C99 147 111 147 116 137 C113 128 99 128 94 138Z"></path>
              <path class="petal" d="M93 136 C87 126 91 116 101 111 C109 117 106 132 93 136Z"></path>
              <path class="stamen" d="M94 136 L88 128 M94 136 L98 126 M94 136 L103 132"></path>
              <circle cx="94" cy="136" r="1.8"></circle>
            </g>
            <g class="bell" style="--d:2.58s">
              <path class="detail" d="M184 103 C179 96 179 91 181 87"></path>
              <path class="petal" d="M186 120 C174 116 169 105 179 99 C187 98 192 108 186 120Z"></path>
              <path class="petal" d="M187 120 C186 107 194 98 204 101 C209 110 200 121 187 120Z"></path>
              <path class="petal" d="M186 120 C178 127 168 126 164 116 C168 107 181 109 186 120Z"></path>
              <path class="petal" d="M188 121 C193 130 204 130 210 120 C207 111 193 111 188 121Z"></path>
              <path class="petal" d="M187 119 C181 110 185 99 195 94 C203 100 200 115 187 119Z"></path>
              <path class="stamen" d="M187 119 L181 112 M187 119 L192 109 M187 119 L197 115"></path>
              <circle cx="187" cy="119" r="1.8"></circle>
            </g>
            <g class="bell" style="--d:2.76s">
              <path class="detail" d="M149 60 C145 53 145 49 147 45"></path>
              <path class="petal" d="M151 76 C140 73 135 62 144 56 C152 55 157 65 151 76Z"></path>
              <path class="petal" d="M152 76 C151 64 158 55 168 58 C172 67 164 77 152 76Z"></path>
              <path class="petal" d="M151 76 C143 83 134 82 130 72 C134 64 146 66 151 76Z"></path>
              <path class="petal" d="M153 77 C158 85 168 85 173 76 C170 68 158 68 153 77Z"></path>
              <path class="petal" d="M152 75 C146 66 150 57 159 52 C166 58 163 71 152 75Z"></path>
              <path class="stamen" d="M152 75 L146 68 M152 75 L156 66 M152 75 L161 72"></path>
              <circle cx="152" cy="75" r="1.7"></circle>
            </g>
            <g class="bell" style="--d:2.92s">
              <path class="detail" d="M162 191 C157 184 157 179 159 175"></path>
              <path class="petal" d="M164 208 C152 205 147 193 157 187 C165 186 170 196 164 208Z"></path>
              <path class="petal" d="M165 208 C164 195 172 186 182 189 C187 198 178 209 165 208Z"></path>
              <path class="petal" d="M164 208 C156 215 146 214 142 204 C146 195 159 197 164 208Z"></path>
              <path class="petal" d="M166 209 C171 218 182 218 188 208 C185 199 171 199 166 209Z"></path>
              <path class="petal" d="M165 207 C159 198 163 187 173 182 C181 188 178 203 165 207Z"></path>
              <path class="stamen" d="M165 207 L159 200 M165 207 L169 197 M165 207 L175 203"></path>
              <circle cx="165" cy="207" r="1.7"></circle>
            </g>
            <g class="spark" style="--d:2.58s"><path d="M61 112 L64 119 L71 122 L64 125 L61 132 L58 125 L51 122 L58 119Z"></path></g>
            <g class="spark" style="--d:2.86s"><path d="M205 176 L208 182 L214 185 L208 188 L205 194 L202 188 L196 185 L202 182Z"></path></g>
            <g class="spark" style="--d:3.08s"><path d="M118 58 L120 63 L125 65 L120 67 L118 72 L116 67 L111 65 L116 63Z"></path></g>
            <g class="spark" style="--d:3.28s"><path d="M75 295 L77 300 L82 302 L77 304 L75 309 L73 304 L68 302 L73 300Z"></path></g>
            <circle class="mote" style="--d:2.2s" cx="91" cy="268" r="2.2"></circle>
            <circle class="mote" style="--d:2.9s" cx="184" cy="278" r="2"></circle>
            <circle class="mote" style="--d:3.4s" cx="122" cy="240" r="1.7"></circle>
            <circle class="mote" style="--d:3.8s" cx="158" cy="220" r="1.6"></circle>
          </svg>
        </div>
        <p class="sage-admin-gate-kicker">Sage Utopia</p>
        <div class="sage-role-switch" aria-label="入口选择">
          <span>Sage</span>
          <a href="friends.html">Sage's friend</a>
        </div>
        <form class="sage-admin-gate-form">
          <input type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入管理密码" aria-label="管理密码">
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
        document.documentElement.classList.remove('sage-gate-open');
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
  document.documentElement.classList.add('sage-gate-open');
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
  if (module === 'guestbook') {
    item.friend_username = String(item.friend_username || '').trim().slice(0, 64);
    item.display_name = String(item.display_name || '').trim().slice(0, 40);
    item.avatar_emoji = String(item.avatar_emoji || '🌱').trim().slice(0, 8);
    item.avatar_color = String(item.avatar_color || '#e6f2df').trim().slice(0, 24);
    item.avatar_url = String(item.avatar_url || '').trim().slice(0, 500);
    item.message = String(item.message || '').trim().slice(0, 500);
    item.sticker = String(item.sticker || '').trim().slice(0, 16);
    item.note_color = String(item.note_color || '').trim().slice(0, 24);
    item.delete_token = String(item.delete_token || '').trim().slice(0, 160);
    item.is_visible = item.is_visible !== false;
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
  const columns = module === 'guestbook' ? GUESTBOOK_PUBLIC_COLUMNS : '*';
  const { data, error } = await client.from(tableFor(module)).select(columns).order(orderField, { ascending: false });
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

async function createGuestbookMessage(payload) {
  if (!client) return null;
  const { data, error } = await client
    .from(tableFor('guestbook'))
    .insert(toCloud('guestbook', payload))
    .select(GUESTBOOK_PUBLIC_COLUMNS)
    .single();
  if (error) throw error;
  return fromCloud('guestbook', data);
}

async function getFriendProfile(username) {
  if (!client) return null;
  const { data, error } = await client
    .from(tableFor('friendProfiles'))
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function enterFriendProfile(payload) {
  if (!client) return null;
  const { data, error } = await client
    .rpc('sage_friend_enter', {
      p_display_name: String(payload?.display_name || '').trim().slice(0, 40),
      p_username: String(payload?.username || '').trim().slice(0, 32),
      p_password_hash: String(payload?.password_hash || '').trim(),
      p_avatar_emoji: String(payload?.avatar_emoji || '🌱').trim().slice(0, 8),
      p_avatar_color: String(payload?.avatar_color || '#e6f2df').trim().slice(0, 24),
      p_avatar_url: String(payload?.avatar_url || '').trim().slice(0, 500),
    });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

async function uploadFriendAvatar(file, username) {
  if (!client || !file) return '';
  const safeUsername = String(username || 'friend').replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 32) || 'friend';
  const extension = String(file.name || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${safeUsername}/avatar-${Date.now()}.${extension}`;
  const { error } = await client.storage
    .from('friend-avatars')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;
  const { data } = client.storage.from('friend-avatars').getPublicUrl(path);
  return data?.publicUrl || '';
}

async function updateFriendAvatar(username, passwordHash, avatarUrl) {
  if (!client) return null;
  const { data, error } = await client
    .rpc('sage_friend_update_avatar', {
      p_username: String(username || '').trim().slice(0, 32),
      p_password_hash: String(passwordHash || '').trim(),
      p_avatar_url: String(avatarUrl || '').trim().slice(0, 500),
    });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

async function createFriendProfile(payload) {
  if (!client) return null;
  const { data, error } = await client
    .from(tableFor('friendProfiles'))
    .insert(cleanPayload(payload))
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function hideGuestbookMessage(id, deleteToken, username, passwordHash) {
  if (!client) return false;
  const { data, error } = await client
    .rpc('sage_hide_guestbook_message', {
      p_message_id: id,
      p_delete_token: String(deleteToken || '').trim(),
      p_username: String(username || '').trim().slice(0, 32),
      p_password_hash: String(passwordHash || '').trim(),
    });
  if (error) throw error;
  return Boolean(data);
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

const cloudApi = {
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
  createGuestbookMessage,
  enterFriendProfile,
  uploadFriendAvatar,
  updateFriendAvatar,
  getFriendProfile,
  createFriendProfile,
  hideGuestbookMessage,
  update,
  remove,
  upsertBy,
};

window.SageCloudData = cloudApi;
window.SageCloud = cloudApi;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAdminDock);
} else {
  installAdminDock();
}
window.dispatchEvent(new CustomEvent('sage-cloud-ready'));
