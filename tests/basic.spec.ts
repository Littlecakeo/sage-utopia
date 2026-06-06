import { expect, test } from '@playwright/test';

test('首页可以正常打开并显示主要内容', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page).toHaveTitle(/Sage Utopia/i);
  await expect(page.getByText('Sage Utopia').first()).toBeVisible();
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
  await expect(page.getByRole('button', { name: '+课程' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '−课程' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '恢复推荐' }).first()).toBeVisible();

  const visibleCards = page.locator('.card:visible, .course-slot:visible');
  await expect(visibleCards.first()).toBeVisible();
  await expect(visibleCards).not.toHaveCount(0);
});
