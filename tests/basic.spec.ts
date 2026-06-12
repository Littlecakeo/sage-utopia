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

  await expect(page).toHaveURL(/study\.html$/);
  await expect(page.getByRole('heading', { name: /学习中心/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /加课|新增课程|＋/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /减课|删除课程|－/ }).first()).toBeVisible();

  const visibleCards = page.locator('.card:visible, .course-slot:visible');
  await expect(visibleCards.first()).toBeVisible();
  await expect(visibleCards).not.toHaveCount(0);
});

test('侧边栏分支不会把子页面跳回首页', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByRole('link', { name: '求职中心' }).first().click();
  await expect(page).toHaveURL(/career\.html$/);
  await expect(page.getByRole('heading', { name: /把机会整理成清晰的下一步/ }).first()).toBeVisible();

  await page.getByRole('link', { name: '求职列表' }).first().click();
  await expect(page).toHaveURL(/career\.html#careerListSection$/);
  await expect(page.getByRole('heading', { name: /把机会整理成清晰的下一步/ }).first()).toBeVisible();
});

test('各页面本页分支会停在对应板块而不是回到顶部', async ({ page }) => {
  const cases = [
    { url: '/index.html', label: '操作区', hash: 'taskBoard' },
    { url: '/study.html', label: '作业', hash: 'assignments' },
    { url: '/career.html', label: '求职列表', hash: 'careerListSection' },
    { url: '/finance.html', label: '支出列表', hash: 'expenseListSection' },
    { url: '/resume.html', label: '数据', hash: 'data-management' },
  ];

  for (const item of cases) {
    await page.goto(item.url);
    await page.getByRole('link', { name: item.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${item.url.replace('/', '')}#${item.hash}$`));
    await page.waitForFunction(
      (id) => {
        const target = document.getElementById(id);
        if (!target) return false;
        const rect = target.getBoundingClientRect();
        return window.scrollY > 40 && rect.bottom > 0 && rect.top < window.innerHeight;
      },
      item.hash,
      { timeout: 3000 },
    );
    const position = await page.evaluate(
      (id) => {
        const target = document.getElementById(id);
        return {
          scrollY: window.scrollY,
          targetTop: target ? target.getBoundingClientRect().top : null,
        };
      },
      item.hash,
    );
    expect(position.scrollY).toBeGreaterThan(40);
    expect(position.targetTop ?? 9999).toBeLessThan(714);
  }
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
