(function () {
  'use strict';

  const VISITOR_KEY = 'sage.friend.visitor.v1';
  const USERNAME_RE = /^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$/;
  const COLORS = ['#fff8cf', '#e6f2df', '#e5f0f1', '#f7eadf', '#eee6f6', '#f9f1c8'];
  const STICKERS = ['✦', '♡', '✧', '♪', '※', '⋆'];

  const $ = (selector) => document.querySelector(selector);

  function cloud() {
    return window.SageCloudData || {};
  }

  function normalize(value, max) {
    return String(value || '').trim().slice(0, max);
  }

  async function sha256(text) {
    const input = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', input);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function passwordHash(username, password) {
    return sha256(`sage-friend:${username}:${password}`);
  }

  function getVisitor() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(VISITOR_KEY) || 'null');
      if (parsed && parsed.username && parsed.name) return parsed;
    } catch {}
    return null;
  }

  function setVisitor(profile) {
    const visitor = {
      username: profile.username,
      name: profile.display_name,
      enteredAt: new Date().toISOString(),
    };
    sessionStorage.setItem(VISITOR_KEY, JSON.stringify(visitor));
    return visitor;
  }

  function formatTime(value) {
    if (!value) return '刚刚';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '刚刚';
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function noteColor(index, explicit) {
    if (explicit && /^#[0-9a-fA-F]{3,8}$/.test(explicit)) return explicit;
    return COLORS[index % COLORS.length];
  }

  function noteTilt(index) {
    const tilts = ['-1.2deg', '.8deg', '-.45deg', '1.1deg', '-.75deg', '.35deg'];
    return tilts[index % tilts.length];
  }

  function showFriendArea(visitor) {
    const gate = $('#friendGate');
    const area = $('#friendArea');
    const name = $('#friendVisitorName');
    if (gate) gate.hidden = true;
    if (area) area.hidden = false;
    if (name) name.textContent = visitor.name;
  }

  function showGate() {
    const gate = $('#friendGate');
    const area = $('#friendArea');
    if (gate) gate.hidden = false;
    if (area) area.hidden = true;
  }

  function setGateError(text) {
    const error = $('#friendGateError');
    if (error) error.textContent = text || '';
  }

  function setStatus(text, isError) {
    const status = $('#guestbookStatus');
    if (!status) return;
    status.textContent = text || '';
    status.classList.toggle('friend-error', Boolean(isError));
    status.classList.toggle('friend-status', !isError);
  }

  function renderMessages(messages) {
    const list = $('#guestbookList');
    if (!list) return;
    list.textContent = '';
    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'guest-empty';
      empty.textContent = '还没有留言，写下第一张小纸条吧。';
      list.appendChild(empty);
      return;
    }
    messages.forEach((message, index) => {
      const card = document.createElement('article');
      card.className = 'guest-note';
      card.style.setProperty('--note-bg', noteColor(index, message.note_color));
      card.style.setProperty('--tilt', noteTilt(index));

      const pin = document.createElement('span');
      pin.className = 'pin';
      pin.setAttribute('aria-hidden', 'true');

      const title = document.createElement('h3');
      title.textContent = `${message.sticker || STICKERS[index % STICKERS.length]} ${message.display_name || '朋友'}`;

      const text = document.createElement('p');
      text.textContent = message.message || '';

      const time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatTime(message.created_at);

      card.append(pin, title, text, time);
      list.appendChild(card);
    });
  }

  async function loadMessages() {
    const list = $('#guestbookList');
    if (list) {
      list.textContent = '';
      const loading = document.createElement('div');
      loading.className = 'guest-empty';
      loading.textContent = '正在打开校园留言板...';
      list.appendChild(loading);
    }
    if (!cloud().hasConfig) {
      renderMessages([]);
      setStatus('留言板暂时连不上云端，请稍后再试。', true);
      return;
    }
    try {
      const rows = await cloud().list('guestbook');
      renderMessages(Array.isArray(rows) ? rows : []);
      setStatus('');
    } catch (error) {
      console.warn('[guestbook] load failed', error);
      renderMessages([]);
      setStatus('留言板暂时连不上云端，请稍后再试。', true);
    }
  }

  function validateCredentials(name, username, password) {
    if (!name) return '先写下你的昵称。';
    if (!USERNAME_RE.test(username)) return '用户名只能使用英文、数字和 . _ @ ! # $ % & * + = ? ^ -，长度 3-32。';
    if (!password || password.length < 4) return '密码至少 4 位。';
    return '';
  }

  async function enterWithCredentials(name, username, password) {
    if (!cloud().hasConfig || !cloud().getFriendProfile || !cloud().createFriendProfile) {
      throw new Error('朋友账号暂时连不上云端，请稍后再试。');
    }
    const hash = await passwordHash(username, password);
    const existing = await cloud().getFriendProfile(username);
    if (existing) {
      if (existing.password_hash !== hash) throw new Error('用户名或密码不正确。');
      return setVisitor(existing);
    }
    const created = await cloud().createFriendProfile({
      username,
      display_name: name,
      password_hash: hash,
    });
    return setVisitor(created);
  }

  function installGate() {
    const form = $('#friendGateForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = normalize($('#friendName')?.value, 40);
      const username = normalize($('#friendUsername')?.value, 32);
      const password = String($('#friendPassword')?.value || '');
      const button = form.querySelector('button[type="submit"]');
      const validation = validateCredentials(name, username, password);
      if (validation) {
        setGateError(validation);
        return;
      }
      try {
        if (button) button.disabled = true;
        setGateError('正在进入留言板...');
        const visitor = await enterWithCredentials(name, username, password);
        setGateError('');
        showFriendArea(visitor);
        await loadMessages();
      } catch (error) {
        setGateError(error.message || '进入失败，请稍后再试。');
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  function installComposer() {
    const form = $('#guestbookForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const visitor = getVisitor();
      const message = normalize($('#guestbookMessage')?.value, 500);
      const button = form.querySelector('button[type="submit"]');
      if (!visitor) {
        showGate();
        return;
      }
      if (!message) {
        setStatus('留言内容还空着，写一点再贴上去。', true);
        return;
      }
      if (!cloud().hasConfig || !cloud().createGuestbookMessage) {
        setStatus('留言板暂时连不上云端，请稍后再试。', true);
        return;
      }
      try {
        if (button) button.disabled = true;
        setStatus('正在把小纸条贴到留言板...');
        await cloud().createGuestbookMessage({
          friend_username: visitor.username,
          display_name: visitor.name,
          message,
          sticker: STICKERS[Math.floor(Math.random() * STICKERS.length)],
          note_color: COLORS[Math.floor(Math.random() * COLORS.length)],
          is_visible: true,
        });
        if ($('#guestbookMessage')) $('#guestbookMessage').value = '';
        setStatus('留言已贴上去。');
        await loadMessages();
      } catch (error) {
        console.warn('[guestbook] create failed', error);
        setStatus('保存失败，请检查云端连接或稍后再试。', true);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  function installLogout() {
    $('#friendSwitchName')?.addEventListener('click', () => {
      sessionStorage.removeItem(VISITOR_KEY);
      showGate();
      setStatus('');
      setGateError('');
    });
  }

  function init() {
    installGate();
    installComposer();
    installLogout();
    const visitor = getVisitor();
    if (visitor) {
      showFriendArea(visitor);
      loadMessages();
    } else {
      showGate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
