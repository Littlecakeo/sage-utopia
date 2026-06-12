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
  ]) {
    expect(schema).toContain(`create table if not exists ${table}`);
  }
});

test('构建校验覆盖核心页面入口', () => {
  const validator = readFileSync(path.join(root, 'scripts', 'validate-static-site.mjs'), 'utf8');
  for (const page of ['study.html', 'career.html', 'finance.html', 'portfolio.html', 'about.html']) {
    expect(validator).toContain(page);
  }
});
