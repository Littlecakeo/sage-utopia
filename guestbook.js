(function () {
  'use strict';

  const VISITOR_KEY = 'sage.friend.visitor.v1';
  const MESSAGE_TOKEN_KEY = 'sage.friend.message.tokens.v1';
  const USERNAME_RE = /^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$/;
  const COLORS = ['#fff8cf', '#e6f2df', '#e5f0f1', '#f7eadf', '#eee6f6', '#f9f1c8'];
  const STICKERS = ['✦', '♡', '✧', '♪', '※', '⋆'];
  let didInit = false;

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

  function randomToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

  function getMessageTokens() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MESSAGE_TOKEN_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function rememberMessageToken(messageId, token) {
    if (!messageId || !token) return;
    const tokens = getMessageTokens();
    tokens[messageId] = token;
    localStorage.setItem(MESSAGE_TOKEN_KEY, JSON.stringify(tokens));
  }

  function forgetMessageToken(messageId) {
    const tokens = getMessageTokens();
    delete tokens[messageId];
    localStorage.setItem(MESSAGE_TOKEN_KEY, JSON.stringify(tokens));
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

  function friendErrorMessage(error) {
    const text = String(error?.message || error || '');
    if (text.includes('invalid_credentials')) return '用户名或密码不正确。';
    if (text.includes('invalid_username')) return '用户名只能使用英文、数字和指定符号。';
    if (text.includes('missing_display_name')) return '先写下你的昵称。';
    return text || '进入失败，请稍后再试。';
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
    const tokens = getMessageTokens();
    const visitor = getVisitor();
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
      if (message.id && tokens[message.id] && visitor?.username === message.friend_username) {
        const removeButton = document.createElement('button');
        removeButton.className = 'guest-delete';
        removeButton.type = 'button';
        removeButton.dataset.messageId = message.id;
        removeButton.textContent = '删除';
        removeButton.setAttribute('aria-label', `删除 ${message.display_name || '朋友'} 的留言`);
        card.appendChild(removeButton);
      }
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
    if (!cloud().hasConfig || !cloud().enterFriendProfile) {
      throw new Error('朋友账号暂时连不上云端，请稍后再试。');
    }
    const hash = await passwordHash(username, password);
    const profile = await cloud().enterFriendProfile({
      username,
      display_name: name,
      password_hash: hash,
    });
    if (!profile) throw new Error('进入失败，请稍后再试。');
    return setVisitor(profile);
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
        setGateError(friendErrorMessage(error));
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
        const deleteToken = await sha256(`sage-delete:${visitor.username}:${randomToken()}`);
        const saved = await cloud().createGuestbookMessage({
          friend_username: visitor.username,
          display_name: visitor.name,
          message,
          sticker: STICKERS[Math.floor(Math.random() * STICKERS.length)],
          note_color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delete_token: deleteToken,
          is_visible: true,
        });
        rememberMessageToken(saved?.id, deleteToken);
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

  function installDelete() {
    const list = $('#guestbookList');
    if (!list) return;
    list.addEventListener('click', async (event) => {
      const button = event.target.closest?.('.guest-delete');
      if (!button) return;
      const messageId = button.dataset.messageId || '';
      const token = getMessageTokens()[messageId] || '';
      if (!messageId || !token) {
        setStatus('这条留言没有找到可用的删除凭证。', true);
        return;
      }
      if (!cloud().hasConfig || !cloud().hideGuestbookMessage) {
        setStatus('留言板暂时连不上云端，请稍后再试。', true);
        return;
      }
      try {
        button.disabled = true;
        setStatus('正在删除这张小纸条...');
        const ok = await cloud().hideGuestbookMessage(messageId, token);
        if (!ok) throw new Error('delete_denied');
        forgetMessageToken(messageId);
        setStatus('留言已删除。');
        await loadMessages();
      } catch (error) {
        console.warn('[guestbook] delete failed', error);
        setStatus('删除失败，可能不是这台设备发布的留言。', true);
        button.disabled = false;
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
    if (didInit) return;
    didInit = true;
    installGate();
    installComposer();
    installDelete();
    installLogout();
    const visitor = getVisitor();
    if (visitor) {
      showFriendArea(visitor);
      loadMessages();
    } else {
      showGate();
    }
  }

  function initWhenCloudReady() {
    if (window.SageCloudData) {
      init();
      return;
    }
    window.addEventListener('sage-cloud-ready', init, { once: true });
    window.setTimeout(() => {
      if (window.SageCloudData) init();
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenCloudReady);
  } else {
    initWhenCloudReady();
  }
})();
