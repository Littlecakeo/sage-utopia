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
  expect(schema).toContain('revoke select, insert, update, delete on friend_profiles from anon, authenticated');
  expect(schema).toContain('grant select (id, user_id, friend_username, display_name, message, sticker, note_color, is_visible, created_at, updated_at)');
});

test('构建校验覆盖核心页面入口', () => {
  const validator = readFileSync(path.join(root, 'scripts', 'validate-static-site.mjs'), 'utf8');
  for (const page of ['study.html', 'career.html', 'finance.html', 'portfolio.html', 'about.html', 'friends.html']) {
    expect(validator).toContain(page);
  }
});

test('朋友入口不在前端读取密码 hash 并支持删除留言', () => {
  const cloud = readFileSync(path.join(root, 'sage-cloud-data.js'), 'utf8');
  const guestbook = readFileSync(path.join(root, 'guestbook.js'), 'utf8');

  expect(cloud).toContain(".rpc('sage_friend_enter'");
  expect(cloud).toContain(".rpc('sage_hide_guestbook_message'");
  expect(guestbook).toContain('enterFriendProfile');
  expect(guestbook).toContain('hideGuestbookMessage');
  expect(guestbook).toContain('guest-delete');
  expect(guestbook).not.toContain('getFriendProfile(username)');
});
