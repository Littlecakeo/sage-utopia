import { expect, test } from '@playwright/test';

test('首页可以正常打开并显示主要内容', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Sage Utopia/i);
  await expect(page.getByRole('link', { name: /Sage Utopia/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '首页' }).first()).toBeVisible();
  await expect(page.locator('#quickAdd')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '快速新增' })).toHaveCount(0);
});

test('导航按钮可以点击并进入学习中心', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: '学习中心' }).first().click();
  await expect(page).toHaveURL(/(study\.html|#study)$/);
  await expect(page.getByRole('heading', { name: /学习中心/ }).first()).toBeVisible();
});

test('#study 学习中心区域和主要按钮渲染正常', async ({ page }) => {
  await page.goto('/index.html#study', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/study\.html$/);
  await expect(page.getByRole('heading', { name: /学习中心/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /加课|新增课程|＋/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /减课|删除课程|－/ }).first()).toBeVisible();

  const visibleCards = page.locator('.card:visible, .course-slot:visible');
  await expect(visibleCards.first()).toBeVisible();
  await expect(visibleCards).not.toHaveCount(0);
});

test('侧边栏分支不会把子页面跳回首页', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: '求职中心' }).first().click();
  await expect(page).toHaveURL(/career\.html$/);
  await expect(page.getByRole('heading', { name: '求职中心' }).first()).toBeVisible();

  await page.getByRole('link', { name: '求职列表' }).first().click();
  await expect(page).toHaveURL(/career\.html#careerListSection$/);
  await expect(page.getByRole('heading', { name: '求职中心' }).first()).toBeVisible();
});

test('首页任务以小标题折叠展示并隐藏备注句子', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('每天记录看到第几页。')).toHaveCount(0);
  await expect(page.locator('#itemNote')).toHaveCount(0);

  const firstTask = page.locator('details.task-collapsible').first();
  await expect(firstTask).toBeVisible();
  await expect(firstTask).not.toHaveAttribute('open', '');
  await expect(firstTask.locator('.task-expand-symbol')).toBeVisible();
  await expect(firstTask.locator('summary')).not.toContainText('展开');

  await firstTask.locator('summary').click();
  await expect(firstTask).toHaveAttribute('open', '');
  await expect(firstTask.locator('summary')).not.toContainText('收起');
  await expect(firstTask.getByRole('button', { name: '记录' })).toBeVisible();
});

test('一次性待办任务使用前置勾选框', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const taskList = page.locator('#taskList');
  const firstTodo = taskList.locator('.todo-row').first();
  await expect(firstTodo).toBeVisible();
  await expect(firstTodo.locator('input[type="checkbox"]')).toBeVisible();
  await expect(firstTodo.locator('details.task-collapsible')).toHaveCount(0);
});

test('进度追踪记录后可以点开 Timetable 查看历史', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  let firstProgress = page.locator('#progressList details.task-collapsible').first();
  await firstProgress.locator('summary').click();
  await firstProgress.locator('input[type="number"]').fill('49');
  await firstProgress.getByRole('button', { name: '记录' }).click();

  firstProgress = page.locator('#progressList details.task-collapsible').first();
  await firstProgress.locator('summary').click();
  await firstProgress.getByRole('button', { name: 'Timetable' }).click();

  await expect(firstProgress.locator('.progress-history')).toBeVisible();
  await expect(firstProgress.locator('.progress-history')).toContainText('49/320 页');
});

test('网站小标语在移动端和侧栏之间同步保存', async ({ page }) => {
  await page.setViewportSize({ width: 599, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const text = '慢慢长大';
  await page.locator('.mobile .brand .tag').evaluate((el, value) => {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  }, text);

  await expect(page.locator('.side .brand .tag')).toHaveText(text);
  await page.getByRole('button', { name: '保存更改' }).click();
  await page.reload();
  await expect(page.locator('.mobile .brand .tag')).toHaveText(text);
  await expect(page.locator('.side .brand .tag')).toHaveText(text);
});

test('首页新增目标表单保持正常宽度不拥挤', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const titleBox = await page.locator('#itemTitle').boundingBox();
  const sectionBox = await page.locator('#itemSection').boundingBox();
  const typeBox = await page.locator('#itemType').boundingBox();
  const currentBox = await page.locator('#itemCurrent').boundingBox();
  const totalBox = await page.locator('#itemTotal').boundingBox();
  const dateBox = await page.locator('#itemStart').boundingBox();
  const addBox = await page.locator('#itemForm button[type="submit"]').boundingBox();

  await expect(page.locator('#itemUnit')).toHaveCount(0);
  expect(titleBox?.width ?? 0).toBeGreaterThan(260);
  expect(sectionBox?.width ?? 0).toBeGreaterThan(130);
  expect(typeBox?.width ?? 0).toBeGreaterThan(130);
  expect(dateBox?.width ?? 0).toBeGreaterThanOrEqual(130);
  expect(Math.abs((sectionBox?.y ?? 0) - (typeBox?.y ?? 999))).toBeLessThan(4);
  expect((currentBox?.x ?? 999)).toBeLessThan(totalBox?.x ?? 0);
  expect(addBox?.width ?? 0).toBeGreaterThan(72);
  expect(addBox?.height ?? 999).toBeLessThan(70);
});

test('顶部导航在窄屏滚动时固定不跟随页面内容滑走', async ({ page }) => {
  await page.setViewportSize({ width: 651, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const before = await page.locator('.mobile').boundingBox();
  await page.evaluate(() => window.scrollTo(0, 650));
  await page.waitForTimeout(100);
  const after = await page.locator('.mobile').boundingBox();

  expect(before?.y ?? 999).toBeLessThan(1);
  expect(after?.y ?? 999).toBeLessThan(1);
});

test('移动端顶部导航把作品集合并进关于 Sage', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const mobileNav = page.locator('.mobile');
  await expect(mobileNav.getByRole('link', { name: '作品集' })).toHaveCount(0);
  await expect(mobileNav.locator('.mobile-scroll').getByRole('link', { name: '留言板' })).toBeVisible();
  await expect(mobileNav.locator('.mobile-scroll').getByRole('link', { name: '关于 Sage' })).toBeVisible();
  await expect(mobileNav).not.toContainText('更多');

  await mobileNav.locator('.mobile-scroll').getByRole('link', { name: '关于 Sage' }).click();
  await expect(page).toHaveURL(/resume\.html$/);
  await expect(page.locator('.mobile-branches').getByRole('link', { name: '作品集' })).toBeVisible();
});

test('首页可以进入独立留言板分支', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: '留言板' }).first().click();
  await expect(page).toHaveURL(/friends\.html$/);
  await expect(page.getByRole('heading', { name: "Sage's friend" })).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/friend-page/);
  await expect(page.locator('link[href="guestbook.css"]')).toHaveCount(1);
});

test('朋友入口可以上传头像预览并记住同设备资料', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#friendAvatarButton')).toBeVisible();
  await expect(page.locator('#friendAvatarInput')).toHaveAttribute('accept', 'image/*');
  await expect(page.locator('#friendRemember')).toBeChecked();
  await page.locator('#friendAvatarInput').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/azfTQAAAABJRU5ErkJggg==',
      'base64'
    ),
  });
  await expect(page.locator('#friendAvatarPreview img')).toBeVisible();
});

test('首页宽屏内容不会被侧边栏挤出屏幕', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);

  const layout = await page.evaluate(() => {
    const main = document.querySelector('main')?.getBoundingClientRect();
    const stats = document.querySelector('.compact-stats')?.getBoundingClientRect();
    const guestbook = document.querySelector('#homeGuestbook')?.getBoundingClientRect();
    return {
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      mainRight: main?.right ?? 9999,
      statsRight: stats?.right ?? 9999,
      guestbookRight: guestbook?.right ?? 9999,
    };
  });

  expect(layout.overflow).toBe(false);
  expect(layout.mainRight).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.statsRight).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.guestbookRight).toBeLessThanOrEqual(layout.clientWidth);
});

test('移动端首页分支导航可点击并进入留言板板块', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);

  const branch = page.locator('.mobile-branches').getByRole('link', { name: '留言板' });
  await expect(branch).toBeVisible();
  const hitTarget = await branch.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === el;
  });
  expect(hitTarget).toBe(true);

  await branch.click();
  await expect(page).toHaveURL(/index\.html#homeGuestbook$/);
  await expect(page.locator('#homeGuestbook')).toBeInViewport();
});

test('关于页移动端顶部导航不会遮住标题', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const nav = document.querySelector('.mobile');
    const hero = document.querySelector('main > .hero');
    if (!nav || !hero) return false;
    return hero.getBoundingClientRect().top > nav.getBoundingClientRect().bottom + 8;
  });

  const positions = await page.evaluate(() => {
    const nav = document.querySelector('.mobile')?.getBoundingClientRect();
    const hero = document.querySelector('main > .hero')?.getBoundingClientRect();
    return {
      navBottom: nav?.bottom ?? 0,
      heroTop: hero?.top ?? 0,
    };
  });

  expect(positions.heroTop).toBeGreaterThan(positions.navBottom + 8);
});

test('移动端所有主要页面顶部导航不遮挡内容', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  const pages = ['/index.html', '/study.html', '/career.html', '/finance.html', '/growth.html', '/resume.html', '/friends.html'];

  for (const url of pages) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(120);
    const positions = await page.evaluate(() => {
      const nav = document.querySelector('.mobile,.friend-top')?.getBoundingClientRect();
      const first = document.querySelector('main > section, main > .hero, main > .card')?.getBoundingClientRect();
      return {
        navBottom: nav?.bottom ?? 0,
        firstTop: first?.top ?? 0,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      };
    });

    expect(positions.firstTop, url).toBeGreaterThan(positions.navBottom + 8);
    expect(positions.overflow, url).toBe(false);
  }
});

test('桌面侧边栏滚动时保持固定', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const before = await page.locator('.side').boundingBox();
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(100);
  const after = await page.locator('.side').boundingBox();

  expect(before?.x ?? 999).toBeLessThan(1);
  expect(after?.x ?? 999).toBeLessThan(1);
  expect(before?.y ?? 999).toBeLessThan(1);
  expect(after?.y ?? 999).toBeLessThan(1);
});

test('各分支页面顶部只保留简洁标题', async ({ page }) => {
  const pages = [
    { url: '/study.html', title: '学习中心' },
    { url: '/career.html', title: '求职中心' },
    { url: '/finance.html', title: '财务中心' },
    { url: '/growth.html', title: '成长记录' },
    { url: '/resume.html', title: '关于 Sage' },
  ];

  for (const item of pages) {
    await page.goto(item.url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main > .hero').first()).toHaveClass(/page-title/);
    await expect(page.getByRole('heading', { name: item.title }).first()).toBeVisible();
    await expect(page.locator('main > .hero .desc').first()).toHaveCount(0);
  }
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
    await page.goto(item.url, { waitUntil: 'domcontentloaded' });
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

test('点击本页分支时左侧导航保持不动', async ({ page }) => {
  await page.goto('/study.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const side = document.querySelector('.side');
    if (side) side.scrollTop = 42;
  });

  const before = await page.evaluate(() => document.querySelector('.side')?.scrollTop ?? 0);
  await page.getByRole('link', { name: '同步', exact: true }).click();
  await page.waitForFunction(() => {
    const target = document.getElementById('sync');
    return !!target && window.scrollY > 40 && target.getBoundingClientRect().top < window.innerHeight;
  });

  const after = await page.evaluate(() => document.querySelector('.side')?.scrollTop ?? 0);
  expect(after).toBe(before);
});

test('财务中心页面可以打开并显示支出记录入口', async ({ page }) => {
  await page.goto('/finance.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/财务中心/);
  await expect(page.getByRole('heading', { name: /财务中心/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /保存支出/ })).toBeVisible();
});

test('求职表单按钮保持正常尺寸', async ({ page }) => {
  await page.goto('/career.html', { waitUntil: 'domcontentloaded' });

  const save = page.getByRole('button', { name: '保存' });
  await expect(save).toBeVisible();
  const box = await save.boundingBox();
  expect(box?.width ?? 999).toBeLessThan(180);
  expect(box?.height ?? 999).toBeLessThan(70);
});

test('关于页可以访问且旧作品集链接跳到关于页作品集板块', async ({ page }) => {
  await page.goto('/about.html', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/about\.html$/);
  await expect(page.getByRole('heading', { name: /Sage|桂维桢/ }).first()).toBeVisible();

  await page.goto('/portfolio.html', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/resume\.html#resume-portfolio$/);
  await expect(page.locator('#resume-portfolio').getByRole('heading', { name: '作品集' })).toBeVisible();
});

test('关于页资料板块可以直接编辑并保存', async ({ page }) => {
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });

  const title = page.locator('#resume-about h2').first();
  await title.evaluate((el, value) => {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  }, '我的介绍');

  await page.getByRole('button', { name: '保存更改' }).click();
  await page.reload();
  await expect(page.locator('#resume-about h2').first()).toHaveText('我的介绍');
});

test('保存更改按钮会出现在当前编辑内容旁边', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 714 });
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });

  const title = page.locator('#resume-about h2').first();
  await title.evaluate((el, value) => {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  }, '关于我自己');

  const saveButton = page.getByRole('button', { name: '保存更改' });
  await expect(saveButton).toBeVisible();
  const titleBox = await title.boundingBox();
  const saveBox = await saveButton.boundingBox();

  expect(saveBox?.y ?? 9999).toBeLessThan((titleBox?.y ?? 0) + 80);
  expect(saveBox?.y ?? 0).toBeGreaterThan((titleBox?.y ?? 0) - 80);
  expect(saveBox?.y ?? 0).toBeLessThan(500);
});

test('移动端首页没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(hasOverflow).toBe(false);
});

test('朋友留言板使用独立入口且不会出现管理操作', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/朋友留言板/);
  await expect(page.getByRole('heading', { name: "Sage's friend" })).toBeVisible();
  await expect(page.getByPlaceholder('昵称 例如 小林🌱 / Lin!')).toBeVisible();
  await expect(page.getByPlaceholder('用户名 仅英文/数字/符号')).toBeVisible();
  await expect(page.getByPlaceholder('密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存更改' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '管理已解锁' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '管理模式' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '首页简介' })).toHaveCount(0);
  await expect(page.locator('#friend-home')).toHaveCount(0);
  await expect(page.locator('#friend-about')).toHaveCount(0);
});

test('朋友用户名禁止中文并保留昵称 emoji 输入', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await page.getByPlaceholder('昵称 例如 小林🌱 / Lin!').fill('小林🌱 / Lin!');
  await page.getByPlaceholder('用户名 仅英文/数字/符号').fill('小林');
  await page.getByPlaceholder('密码').fill('testpass');
  await page.getByRole('button', { name: '进入留言板' }).click();

  await expect(page.locator('#friendGateError')).toContainText('用户名只能使用英文');
  await expect(page).not.toHaveURL(/friendPassword=/);
});

test('本地文件打开留言板会自动跳到线上并清理密码参数', async ({ page }) => {
  await page.route('https://sage-utopia.vercel.app/friends.html', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>online friends</title><main>online</main>',
    });
  });
  const fileUrl = `file://${process.cwd().replaceAll(' ', '%20')}/friends.html?friendName=%E6%B5%8B%E8%AF%95&friendUsername=ceshi&friendPassword=secret`;
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

  await expect(page).not.toHaveURL(/friendPassword=/);
  await expect(page).toHaveURL('https://sage-utopia.vercel.app/friends.html');
  await expect(page.locator('main')).toContainText('online');
});

test('管理入口提供 Sage 和朋友双入口选择', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __SAGE_ENV__?: Record<string, string> }).__SAGE_ENV__ = {
      NEXT_PUBLIC_ADMIN_PASSCODE: 'admin-test',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    };
  });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('.sage-role-switch')).toBeVisible();
  await expect(page.locator('.sage-role-switch')).toContainText('Sage');
  await expect(page.locator('.sage-role-switch').getByRole('link', { name: "Sage's friend" })).toHaveAttribute(
    'href',
    'friends.html',
  );
});

test('管理已解锁时留言板直接使用 Sage 身份', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('sage.admin.unlocked.v1', '1');
    sessionStorage.removeItem('sage.friend.visitor.v1');
  });
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#friendGate')).toBeHidden();
  await expect(page.locator('.friend-hero')).toBeHidden();
  await expect(page.locator('#friendVisitorName')).toHaveText('Sage');
  await expect(page.locator('#friendVisitorAvatar img')).toBeVisible();
  await expect(page.locator('#friendModeHint')).toBeEmpty();
  await expect(page.getByRole('button', { name: '切换访客身份' })).toBeVisible();
});
