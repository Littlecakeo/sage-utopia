import { expect, test } from '@playwright/test';

test('首页可以正常打开并显示主要内容', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page).toHaveTitle(/Sage Utopia/i);
  await expect(page.getByRole('link', { name: /Sage Utopia/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '首页' }).first()).toBeVisible();
});

test('导航按钮可以点击并进入学习中心', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByRole('link', { name: '学习中心' }).first().click();
  await expect(page).toHaveURL(/(study\.html|#study)$/);
  await expect(page.getByRole('heading', { name: /学习中心/ }).first()).toBeVisible();
});

test('#study 学习中心区域和主要按钮渲染正常', async ({ page }) => {
  await page.goto('/index.html#study');

  await expect(page).toHaveURL(/#study$/);
  await expect(page.getByRole('heading', { name: /学习中心/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /加课|新增课程|＋/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /减课|删除课程|－/ }).first()).toBeVisible();

  const visibleCards = page.locator('.card:visible, .course-slot:visible');
  await expect(visibleCards.first()).toBeVisible();
  await expect(visibleCards).not.toHaveCount(0);
});

test('财务中心页面可以打开并显示支出记录入口', async ({ page }) => {
  await page.goto('/finance.html');

  await expect(page).toHaveTitle(/财务中心/);
  await expect(page.getByRole('heading', { name: /财务中心/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /保存支出/ })).toBeVisible();
});

test('关于和作品集公开页面可以单独访问', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page).toHaveURL(/about\.html$/);
  await expect(page.getByRole('heading', { name: /Sage|桂维桢/ }).first()).toBeVisible();

  await page.goto('/portfolio.html');
  await expect(page).toHaveURL(/portfolio\.html$/);
  await expect(page.getByRole('heading', { name: /作品集/ }).first()).toBeVisible();
});

test('移动端首页没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(hasOverflow).toBe(false);
});
