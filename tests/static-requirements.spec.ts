import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('Supabase 环境和 schema 文件已准备好', () => {
  expect(existsSync(path.join(root, '.env.example'))).toBe(true);
  expect(existsSync(path.join(root, 'lib', 'supabase.ts'))).toBe(true);
  expect(existsSync(path.join(root, 'lib', 'sage-api.ts'))).toBe(true);
  expect(existsSync(path.join(root, 'supabase', 'schema.sql'))).toBe(true);

  const env = readFileSync(path.join(root, '.env.example'), 'utf8');
  expect(env).toContain('NEXT_PUBLIC_SUPABASE_URL=');
  expect(env).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=');

  const schema = readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
  for (const table of [
    'courses',
    'assignments',
    'job_applications',
    'expenses',
    'portfolio_projects',
    'profile',
    'guestbook_messages',
    'friend_profiles',
  ]) {
    expect(schema).toContain(`create table if not exists ${table}`);
  }
  expect(schema).toContain('create or replace function sage_friend_enter');
  expect(schema).toContain('create function sage_hide_guestbook_message');
  expect(schema).toContain('p_username text default null');
  expect(schema).toContain('fp.password_hash = cleaned_hash');
  expect(schema).toContain('revoke select, insert, update, delete on friend_profiles from anon, authenticated');
  expect(schema).toContain('avatar_emoji text');
  expect(schema).toContain('avatar_color text');
  expect(schema).toContain('avatar_url text');
  expect(schema).toContain("values ('friend-avatars', 'friend-avatars', true");
  expect(schema).toContain('p_avatar_emoji text default');
  expect(schema).toContain('p_avatar_url text default');
  expect(schema).toContain('create function sage_friend_update_avatar');
  expect(schema).toContain('grant select (id, user_id, friend_username, display_name, avatar_emoji, avatar_color, avatar_url, message, sticker, note_color, is_visible, created_at, updated_at)');
});

test('构建校验覆盖核心页面入口', () => {
  const validator = readFileSync(path.join(root, 'scripts', 'validate-static-site.mjs'), 'utf8');
  for (const page of ['study.html', 'career.html', 'finance.html', 'portfolio.html', 'about.html', 'friends.html']) {
    expect(validator).toContain(page);
  }
});

test('所有页面都会从本地文件自动跳到线上版本', () => {
  const redirectScript = readFileSync(path.join(root, 'online-only.js'), 'utf8');
  expect(redirectScript).toContain("location.protocol !== 'file:'");
  expect(redirectScript).toContain('https://sage-utopia.vercel.app/');

  for (const page of ['index.html', 'study.html', 'career.html', 'finance.html', 'growth.html', 'resume.html', 'friends.html']) {
    const html = readFileSync(path.join(root, page), 'utf8');
    expect(html).toContain('online-only.js');
  }
});

test('朋友入口不在前端读取密码 hash 并支持删除留言', () => {
  const cloud = readFileSync(path.join(root, 'sage-cloud-data.js'), 'utf8');
  const guestbook = readFileSync(path.join(root, 'guestbook.js'), 'utf8');

  expect(cloud).toContain(".rpc('sage_friend_enter'");
  expect(cloud).toContain(".rpc('sage_friend_update_avatar'");
  expect(cloud).toContain(".from('friend-avatars')");
  expect(cloud).toContain(".rpc('sage_hide_guestbook_message'");
  expect(guestbook).toContain('enterFriendProfile');
  expect(guestbook).toContain('uploadFriendAvatar');
  expect(guestbook).toContain('hideGuestbookMessage');
  expect(guestbook).toContain('REMEMBER_KEY');
  expect(guestbook).toContain('friendAvatarButton');
  expect(guestbook).toContain("SAGE_SITE_AVATAR_URL = 'assets/sage-avatar.png'");
  expect(guestbook).toContain('getSageAvatar');
  expect(guestbook).toContain('getSiteBrandAvatarUrl');
  expect(guestbook).toContain('encodeNoteChoice');
  expect(guestbook).toContain('decodeNoteChoice');
  expect(guestbook).toContain('installNoteCustomizer');
  expect(guestbook).toContain('openNoteViewer');
  expect(guestbook).toContain('createNoteViewer');
  expect(guestbook).toContain('guest-delete');
  expect(guestbook).toContain('friend-entered');
  expect(guestbook).not.toContain('getFriendProfile(username)');

  expect(existsSync(path.join(root, 'assets', 'sage-avatar.png'))).toBe(true);
  const copyAssets = readFileSync(path.join(root, 'scripts', 'copy-static-assets.mjs'), 'utf8');
  expect(copyAssets).toContain("cp('assets', 'dist/assets'");

  const friends = readFileSync(path.join(root, 'friends.html'), 'utf8');
  expect(friends).toContain('autocomplete="off"');
  expect(friends).toContain('note-customizer');
  expect(friends).toContain('data-note-color="#eee6f6"');
  expect(friends).toContain('data-note-style="ticket"');
  expect(friends).toContain('data-note-style="memo"');
  expect(cloud).toContain('autocomplete="off"');
});
