(function () {
  'use strict';

  const VISITOR_KEY = 'sage.friend.visitor.v1';
  const ADMIN_SESSION_KEY = 'sage.admin.unlocked.v1';
  const MESSAGE_TOKEN_KEY = 'sage.friend.message.tokens.v1';
  const REMEMBER_KEY = 'sage.friend.remembered.v1';
  const USERNAME_RE = /^[A-Za-z0-9._@!#$%&*+=?^-]{3,32}$/;
  const NOTE_COLORS = [
    '#fff8cf',
    '#e6f2df',
    '#dff0ee',
    '#f7eadf',
    '#eee6f6',
    '#f9e6ea',
    '#e9efd9',
    '#e9e4d4',
  ];
  const NOTE_STYLES = ['classic', 'rounded', 'tape', 'folded', 'ticket', 'memo'];
  const STICKERS = ['✦', '♡', '✧', '♪', '※', '⋆'];
  const SAGE_SITE_AVATAR_URL = 'assets/sage-avatar.png';
  const AVATARS = [
    { emoji: '🌱', color: '#e6f2df' },
    { emoji: '🍵', color: '#dff0e2' },
    { emoji: '🌼', color: '#fff4c8' },
    { emoji: '🫧', color: '#e5f0f1' },
    { emoji: '🪻', color: '#eee6f6' },
    { emoji: '🍊', color: '#f7eadf' },
    { emoji: '⭐', color: '#f9f1c8' },
  ];
  const LIVE_FRIENDS_URL = 'https://sage-utopia.vercel.app/friends.html';
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
  let didInit = false;
  let selectedAvatarIndex = 0;
  let selectedAvatarFile = null;
  let selectedAvatarUrl = '';
  let selectedNoteColor = NOTE_COLORS[0];
  let selectedNoteStyle = NOTE_STYLES[0];
  let sageAvatarCache = null;

  const $ = (selector) => document.querySelector(selector);

  function cleanSensitiveUrl() {
    if (!location.search || !/[?&]friend(?:Name|Username|Password)=/.test(location.search)) return;
    history.replaceState(history.state || {}, '', `${location.pathname}${location.hash || ''}`);
  }

  function cloud() {
    return window.SageCloudData || {};
  }

  function isFileMode() {
    return location.protocol === 'file:';
  }

  function normalize(value, max) {
    return String(value || '').trim().slice(0, max);
  }

  function normalizeAvatar(input) {
    const emoji = normalize(input?.emoji || input?.avatar_emoji || input?.avatarEmoji || '🌱', 8) || '🌱';
    const color = normalize(input?.color || input?.avatar_color || input?.avatarColor || '#e6f2df', 24);
    const rawUrl = String(input?.url || input?.avatar_url || input?.avatarUrl || '').trim();
    return {
      emoji,
      color: /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#e6f2df',
      url:
        /^https?:\/\//.test(rawUrl) ||
        rawUrl.startsWith('blob:') ||
        rawUrl.startsWith('data:image/') ||
        /^assets\/[\w./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(rawUrl)
          ? rawUrl
          : '',
    };
  }

  function getSelectedAvatar() {
    return normalizeAvatar(AVATARS[selectedAvatarIndex] || AVATARS[0]);
  }

  function avatarIndexFor(avatar) {
    const normalized = normalizeAvatar(avatar);
    const index = AVATARS.findIndex((item) => item.emoji === normalized.emoji && item.color === normalized.color);
    return index >= 0 ? index : 0;
  }

  function applyAvatarToElement(element, avatar) {
    if (!element) return;
    const normalized = normalizeAvatar(avatar);
    element.style.setProperty('--avatar-bg', normalized.color);
    element.textContent = '';
    if (normalized.url) {
      const image = document.createElement('img');
      image.src = normalized.url;
      image.alt = '';
      image.loading = 'lazy';
      element.appendChild(image);
      return;
    }
    element.textContent = normalized.emoji;
  }

  function updateAvatarPicker() {
    const avatar = { ...getSelectedAvatar(), url: selectedAvatarUrl };
    applyAvatarToElement($('#friendAvatarPreview'), avatar);
    $('#friendAvatarButton')?.style.setProperty('--avatar-bg', avatar.color);
  }

  function installAvatarPicker() {
    const button = $('#friendAvatarButton');
    const input = $('#friendAvatarInput');
    if (!button) return;
    updateAvatarPicker();
    button.addEventListener('click', () => {
      input?.click();
    });
    input?.addEventListener('change', () => {
      const file = input.files?.[0] || null;
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setGateError('头像需要选择图片文件。');
        input.value = '';
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        setGateError('头像图片不能超过 2MB。');
        input.value = '';
        return;
      }
      selectedAvatarFile = file;
      if (selectedAvatarUrl.startsWith('blob:')) URL.revokeObjectURL(selectedAvatarUrl);
      selectedAvatarUrl = URL.createObjectURL(file);
      updateAvatarPicker();
    });
  }

  function getRememberedFriend() {
    try {
      const parsed = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function hydrateRememberedFriend() {
    const remembered = getRememberedFriend();
    if (!remembered) return;
    const name = $('#friendName');
    const username = $('#friendUsername');
    if (name && remembered.name) name.value = remembered.name;
    if (username && remembered.username) username.value = remembered.username;
    selectedAvatarIndex = avatarIndexFor({
      emoji: remembered.avatarEmoji,
      color: remembered.avatarColor,
    });
    selectedAvatarUrl = remembered.avatarUrl || '';
    updateAvatarPicker();
  }

  function rememberFriend(visitor) {
    const checkbox = $('#friendRemember');
    if (!checkbox?.checked) {
      localStorage.removeItem(REMEMBER_KEY);
      return;
    }
    const avatar = normalizeAvatar(visitor);
    localStorage.setItem(
      REMEMBER_KEY,
      JSON.stringify({
        name: visitor.name,
        username: visitor.username,
        avatarEmoji: avatar.emoji,
        avatarColor: avatar.color,
        avatarUrl: avatar.url,
      })
    );
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

  function isAdminUnlocked() {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  function extractCssUrl(value) {
    const text = String(value || '').trim();
    const match = text.match(/^url\((["']?)(.*)\1\)$/);
    return match ? match[2] : '';
  }

  function getSiteBrandAvatarUrl() {
    const leaf = document.querySelector('.friend-brand .leaf, .mobile .leaf, .side .leaf, .brand .leaf');
    if (!leaf) return SAGE_SITE_AVATAR_URL;
    return extractCssUrl(getComputedStyle(leaf).backgroundImage) || SAGE_SITE_AVATAR_URL;
  }

  async function getSageAvatar() {
    if (sageAvatarCache) return sageAvatarCache;
    sageAvatarCache = {
      emoji: '🌱',
      color: '#e6f2df',
      url: getSiteBrandAvatarUrl() || SAGE_SITE_AVATAR_URL,
    };
    return sageAvatarCache;
  }

  async function getSageVisitor() {
    if (!isAdminUnlocked()) return null;
    const avatar = await getSageAvatar();
    return {
      username: 'sage',
      name: 'Sage',
      passwordHash: '',
      avatarEmoji: avatar.emoji,
      avatarColor: avatar.color,
      avatarUrl: avatar.url,
      isSage: true,
      enteredAt: new Date().toISOString(),
    };
  }

  function setVisitor(profile) {
    const avatar = normalizeAvatar(profile);
    const visitor = {
      username: profile.username,
      name: profile.display_name || profile.name,
      passwordHash: profile.password_hash || profile.passwordHash || '',
      avatarEmoji: avatar.emoji,
      avatarColor: avatar.color,
      avatarUrl: avatar.url,
      isSage: Boolean(profile.isSage),
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

  function normalizeNoteColor(color, fallback) {
    const value = String(color || '').trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
    return fallback || NOTE_COLORS[0];
  }

  function normalizeNoteStyle(style) {
    return NOTE_STYLES.includes(style) ? style : NOTE_STYLES[0];
  }

  function encodeNoteChoice(color, style) {
    return `${normalizeNoteColor(color)}|${normalizeNoteStyle(style)}`;
  }

  function decodeNoteChoice(value, index) {
    const fallback = NOTE_COLORS[index % NOTE_COLORS.length];
    const [color, style] = String(value || '').split('|');
    return {
      color: normalizeNoteColor(color, fallback),
      style: normalizeNoteStyle(style),
    };
  }

  function noteTilt(index) {
    const tilts = ['-2.8deg', '1.6deg', '-.9deg', '2.2deg', '-1.7deg', '.8deg', '1.1deg', '-2.1deg'];
    return tilts[index % tilts.length];
  }

  function canDeleteMessage(message, visitor, tokens) {
    return Boolean(
      message.id &&
        ((visitor?.isSage && message.friend_username === 'sage') ||
          (visitor?.username === message.friend_username && (visitor.passwordHash || tokens[message.id])))
    );
  }

  function createDeleteButton(message) {
    const removeButton = document.createElement('button');
    removeButton.className = 'guest-delete';
    removeButton.type = 'button';
    removeButton.dataset.messageId = message.id;
    removeButton.textContent = '删除';
    removeButton.setAttribute('aria-label', `删除 ${message.display_name || '朋友'} 的留言`);
    return removeButton;
  }

  function closeNoteViewer() {
    const viewer = $('.guest-note-viewer');
    if (!viewer) return;
    viewer.hidden = true;
    viewer.classList.remove('is-open');
    viewer.querySelector('.guest-note-viewer-card')?.replaceChildren();
  }

  function openNoteViewer(message, index) {
    const note = decodeNoteChoice(message.note_color, index);
    const viewer = $('.guest-note-viewer') || createNoteViewer();
    const card = viewer.querySelector('.guest-note-viewer-card');
    if (!card) return;
    const tokens = getMessageTokens();
    const visitor = getVisitor();

    card.className = `guest-note-viewer-card note-style-${note.style}`;
    card.style.setProperty('--note-bg', note.color);
    card.replaceChildren();

    const close = document.createElement('button');
    close.className = 'guest-note-viewer-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭留言');

    const title = document.createElement('h3');
    const avatar = document.createElement('span');
    avatar.className = 'guest-avatar';
    const sageAvatar = message.friend_username === 'sage' ? sageAvatarCache || normalizeAvatar({}) : null;
    applyAvatarToElement(avatar, {
      emoji: message.avatar_emoji,
      color: message.avatar_color,
      url: sageAvatar?.url || message.avatar_url || '',
    });
    const author = document.createElement('span');
    author.textContent = `${message.sticker || STICKERS[index % STICKERS.length]} ${message.display_name || '朋友'}`;
    title.append(avatar, author);

    const text = document.createElement('p');
    text.textContent = message.message || '';

    const time = document.createElement('time');
    time.dateTime = message.created_at || '';
    time.textContent = formatTime(message.created_at);

    card.append(close, title, text, time);
    if (canDeleteMessage(message, visitor, tokens)) {
      card.appendChild(createDeleteButton(message));
    }

    viewer.hidden = false;
    requestAnimationFrame(() => viewer.classList.add('is-open'));
    close.focus();
  }

  function createNoteViewer() {
    const viewer = document.createElement('div');
    viewer.className = 'guest-note-viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', '留言详情');
    const card = document.createElement('article');
    card.className = 'guest-note-viewer-card';
    viewer.appendChild(card);
    document.body.appendChild(viewer);
    viewer.addEventListener('click', (event) => {
      if (event.target === viewer || event.target.closest?.('.guest-note-viewer-close')) closeNoteViewer();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !viewer.hidden) closeNoteViewer();
    });
    return viewer;
  }

  function updateNoteCustomizer() {
    const form = $('#guestbookForm');
    if (form) {
      form.style.setProperty('--compose-note-bg', selectedNoteColor);
      form.dataset.noteStyle = selectedNoteStyle;
    }
    document.querySelectorAll('.note-color-choice').forEach((button) => {
      const active = button.dataset.noteColor === selectedNoteColor;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.note-style-choice').forEach((button) => {
      const active = button.dataset.noteStyle === selectedNoteStyle;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function installNoteCustomizer() {
    document.querySelectorAll('.note-color-choice').forEach((button) => {
      button.addEventListener('click', () => {
        selectedNoteColor = normalizeNoteColor(button.dataset.noteColor, selectedNoteColor);
        updateNoteCustomizer();
      });
    });
    document.querySelectorAll('.note-style-choice').forEach((button) => {
      button.addEventListener('click', () => {
        selectedNoteStyle = normalizeNoteStyle(button.dataset.noteStyle);
        updateNoteCustomizer();
      });
    });
    updateNoteCustomizer();
  }

  function showFriendArea(visitor) {
    const gate = $('#friendGate');
    const area = $('#friendArea');
    const name = $('#friendVisitorName');
    const avatar = $('#friendVisitorAvatar');
    const switchButton = $('#friendSwitchName');
    const modeHint = $('#friendModeHint');
    if (gate) gate.hidden = true;
    if (area) area.hidden = false;
    document.body.classList.add('friend-entered');
    if (name) name.textContent = visitor.name;
    applyAvatarToElement(avatar, visitor);
    document.body.classList.toggle('friend-sage-mode', Boolean(visitor.isSage));
    if (switchButton) switchButton.textContent = visitor.isSage ? '切换访客身份' : '退出当前账号';
    if (modeHint) modeHint.textContent = '';
  }

  function showGate() {
    const gate = $('#friendGate');
    const area = $('#friendArea');
    if (gate) gate.hidden = false;
    if (area) area.hidden = true;
    document.body.classList.remove('friend-entered');
    document.body.classList.remove('friend-sage-mode');
  }

  function setGateError(text) {
    const error = $('#friendGateError');
    if (error) error.textContent = text || '';
  }

  function showFileModeWarning() {
    document.documentElement.classList.add('sage-file-mode');
    const banner = document.querySelector('.file-mode-banner');
    if (banner) {
      const link = banner.querySelector('a');
      if (link) link.setAttribute('href', LIVE_FRIENDS_URL);
    }
    setGateError('本地文件不能登录云端留言板，请打开上方线上留言板链接。');
    const button = $('#friendGateForm button[type="submit"]');
    if (button) button.disabled = true;
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
    const boardLayout = getNoteBoardLayout(messages.length);
    list.style.setProperty('--note-board-width', `${boardLayout.width}px`);
    list.style.setProperty('--note-board-height', `${boardLayout.height}px`);
    messages.forEach((message, index) => {
      const note = decodeNoteChoice(message.note_color, index);
      const placement = boardLayout.items[index];
      const card = document.createElement('article');
      card.className = `guest-note note-style-${note.style}`;
      card.style.setProperty('--note-bg', note.color);
      card.style.setProperty('--tilt', noteTilt(index));
      card.style.setProperty('--stack', String(index + 1));
      card.style.setProperty('--note-left', `${placement.left}px`);
      card.style.setProperty('--note-top', `${placement.top}px`);
      card.style.setProperty('--note-size', `${boardLayout.size}px`);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `查看 ${message.display_name || '朋友'} 的留言`);

      const pin = document.createElement('span');
      pin.className = 'pin';
      pin.setAttribute('aria-hidden', 'true');

      const title = document.createElement('h3');
      const avatar = document.createElement('span');
      avatar.className = 'guest-avatar';
      const sageAvatar = message.friend_username === 'sage' ? sageAvatarCache || normalizeAvatar({}) : null;
      applyAvatarToElement(avatar, {
        emoji: message.avatar_emoji,
        color: message.avatar_color,
        url: sageAvatar?.url || message.avatar_url || '',
      });
      const author = document.createElement('span');
      author.className = 'guest-author';
      author.textContent = `${message.sticker || STICKERS[index % STICKERS.length]} ${message.display_name || '朋友'}`;
      title.append(avatar, author);

      const text = document.createElement('p');
      text.textContent = message.message || '';

      const time = document.createElement('time');
      time.dateTime = message.created_at || '';
      time.textContent = formatTime(message.created_at);

      card.append(pin, title, text, time);
      if (canDeleteMessage(message, visitor, tokens)) {
        card.appendChild(createDeleteButton(message));
      }
      card.addEventListener('click', (event) => {
        if (event.target.closest?.('.guest-delete')) return;
        openNoteViewer(message, index);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openNoteViewer(message, index);
      });
      list.appendChild(card);
    });
  }

  function getNoteBoardLayout(count) {
    const viewport = window.innerWidth || 1024;
    const isMobile = viewport <= 560;
    const isTablet = viewport <= 900;
    const config = isMobile
      ? {
          width: 340,
          size: 208,
          advance: 540,
          pattern: [
            [0, 0],
            [116, 108],
            [18, 226],
            [130, 336],
            [0, 446],
            [118, 556],
          ],
        }
      : isTablet
        ? {
            width: 532,
            size: 258,
            advance: 690,
            pattern: [
              [8, 0],
              [198, 106],
              [70, 230],
              [250, 342],
              [18, 456],
              [184, 568],
            ],
          }
        : {
            width: 760,
            size: 252,
            advance: 540,
            pattern: [
              [28, 0],
              [250, 92],
              [468, 22],
              [116, 244],
              [336, 330],
              [20, 414],
            ],
          };
    const total = Math.max(count, 1);
    const items = Array.from({ length: total }, (_, index) => {
      const patternIndex = index % config.pattern.length;
      const row = Math.floor(index / config.pattern.length);
      const [left, top] = config.pattern[patternIndex];
      return {
        left,
        top: top + row * config.advance,
      };
    });
    const height = Math.max(
      360,
      ...items.map((item) => item.top + config.size + 28),
    );
    return { ...config, height, items };
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

  async function uploadSelectedAvatar(username) {
    if (!selectedAvatarFile) return selectedAvatarUrl;
    if (!cloud().uploadFriendAvatar) throw new Error('头像上传暂时连不上云端，请稍后再试。');
    return cloud().uploadFriendAvatar(selectedAvatarFile, username);
  }

  async function enterWithCredentials(name, username, password, avatar) {
    if (!cloud().hasConfig || !cloud().enterFriendProfile) {
      throw new Error('朋友账号暂时连不上云端，请稍后再试。');
    }
    const safeAvatar = normalizeAvatar(avatar);
    const hash = await passwordHash(username, password);
    const profile = await cloud().enterFriendProfile({
      username,
      display_name: name,
      password_hash: hash,
      avatar_emoji: safeAvatar.emoji,
      avatar_color: safeAvatar.color,
      avatar_url: safeAvatar.url.startsWith('blob:') ? '' : safeAvatar.url,
    });
    if (!profile) throw new Error('进入失败，请稍后再试。');
    let visitor = setVisitor({ ...profile, password_hash: hash });
    if (selectedAvatarFile) {
      const avatarUrl = await uploadSelectedAvatar(username);
      if (avatarUrl && cloud().updateFriendAvatar) {
        const updated = await cloud().updateFriendAvatar(username, hash, avatarUrl);
        visitor = setVisitor({ ...(updated || profile), password_hash: hash, avatar_url: avatarUrl });
      } else {
        visitor = setVisitor({ ...profile, password_hash: hash, avatar_url: avatarUrl });
      }
      selectedAvatarFile = null;
      selectedAvatarUrl = avatarUrl;
    }
    return visitor;
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
        setGateError(selectedAvatarFile ? '正在上传头像并进入留言板...' : '正在进入留言板...');
        const visitor = await enterWithCredentials(name, username, password, { ...getSelectedAvatar(), url: selectedAvatarUrl });
        rememberFriend(visitor);
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
        const avatar = normalizeAvatar(visitor);
        const saved = await cloud().createGuestbookMessage({
          friend_username: visitor.username,
          display_name: visitor.name,
          avatar_emoji: avatar.emoji,
          avatar_color: avatar.color,
          avatar_url: visitor.isSage && avatar.url.startsWith('data:image/') ? '' : avatar.url,
          message,
          sticker: STICKERS[Math.floor(Math.random() * STICKERS.length)],
          note_color: encodeNoteChoice(selectedNoteColor, selectedNoteStyle),
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
    document.addEventListener('click', async (event) => {
      const button = event.target.closest?.('.guest-delete');
      if (!button) return;
      const messageId = button.dataset.messageId || '';
      const token = getMessageTokens()[messageId] || '';
      const visitor = getVisitor();
      if (!messageId || !visitor?.username || (!visitor.passwordHash && !token)) {
        setStatus('请先用发布这条留言的用户名和密码重新进入。', true);
        return;
      }
      if (!cloud().hasConfig || !cloud().hideGuestbookMessage) {
        setStatus('留言板暂时连不上云端，请稍后再试。', true);
        return;
      }
      try {
        button.disabled = true;
        setStatus('正在删除这张小纸条...');
        const ok = await cloud().hideGuestbookMessage(messageId, token, visitor.username, visitor.passwordHash);
        if (!ok) throw new Error('delete_denied');
        forgetMessageToken(messageId);
        setStatus('留言已删除。');
        closeNoteViewer();
        await loadMessages();
      } catch (error) {
        console.warn('[guestbook] delete failed', error);
        setStatus('删除失败。请确认你用发布这条留言的用户名和密码登录；旧版本留言可能需要先运行最新数据库脚本。', true);
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
      const password = $('#friendPassword');
      if (password) password.value = '';
    });
  }

  async function init() {
    if (didInit) return;
    didInit = true;
    cleanSensitiveUrl();
    hydrateRememberedFriend();
    installAvatarPicker();
    installNoteCustomizer();
    installGate();
    installComposer();
    installDelete();
    installLogout();
    if (isFileMode()) {
      showGate();
      showFileModeWarning();
      return;
    }
    const visitor = getVisitor();
    const sageVisitor = await getSageVisitor();
    if (sageVisitor) {
      sessionStorage.setItem(VISITOR_KEY, JSON.stringify(sageVisitor));
      showFriendArea(sageVisitor);
      loadMessages();
    } else if (visitor) {
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
      init();
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenCloudReady);
  } else {
    initWhenCloudReady();
  }
})();
