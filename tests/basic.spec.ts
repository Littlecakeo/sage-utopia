import { expect, test } from '@playwright/test';

test('首页可以正常打开并显示主要内容', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Sage Utopia/i);
  await expect(page.getByRole('link', { name: /Sage Utopia/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: '首页' }).first()).toBeVisible();
  await expect(page.getByText('今日女性句子')).toBeVisible();
  await expect(page.locator('#dailyQuoteText')).toBeVisible();
  await expect(page.locator('#todayCloudStatus')).toBeVisible();
  await expect(page.locator('#todayDeadlineList')).toBeVisible();
  await expect(page.locator('.quote-card')).not.toContainText('Women Writers');
  await expect(page.locator('.quote-calendar')).toHaveCount(0);
  await expect(page.locator('.quote-card')).not.toContainText('孔子');
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

test('移动端任务清单卡片不会把长标题挤成竖排', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  const todo = page.locator('#taskList .todo-row').first();
  const title = todo.locator('.task-title');
  await expect(todo).toBeVisible();
  await expect(title).toContainText('Moodle');

  const layout = await todo.evaluate((row) => {
    const titleEl = row.querySelector('.task-title') as HTMLElement;
    const controls = row.querySelector('.todo-controls') as HTMLElement;
    const column = row.closest('.zone-col') as HTMLElement;
    const rowBox = row.getBoundingClientRect();
    const titleBox = titleEl.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    return {
      rowRight: rowBox.right,
      columnRight: columnBox.right,
      titleWidth: titleBox.width,
      titleHeight: titleBox.height,
      controlsTop: controlsBox.top,
      titleBottom: titleBox.bottom,
    };
  });

  expect(layout.rowRight).toBeLessThanOrEqual(layout.columnRight + 1);
  expect(layout.titleWidth).toBeGreaterThan(180);
  expect(layout.titleHeight).toBeLessThan(70);
  expect(layout.controlsTop).toBeGreaterThanOrEqual(layout.titleBottom - 2);
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

test('云端空任务不会覆盖本地已有首页内容', async ({ page }) => {
  await page.route('**/sage-cloud-data.js**', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.SageCloudData = {
          hasConfig: true,
          list: async () => [],
          create: async (_module, item) => item,
          update: async (_module, _id, updates) => updates,
          remove: async () => true,
          upsertBy: async (_module, _column, _value, item) => item
        };
      `,
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'sage.progress.items.v2',
      JSON.stringify([
        {
          id: 'local-home-task',
          section: 'task',
          title: '本地保留的主页任务',
          type: '重要待办',
          start: '',
          due: '',
          total: 1,
          current: 0,
          unit: '项',
          done: false,
          note: '',
        },
      ]),
    );
  });

  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('本地保留的主页任务')).toBeVisible();
});

test('留言板云端模块同时暴露新旧全局名', async ({ page }) => {
  await page.goto('/friends.html#guestbook', { waitUntil: 'domcontentloaded' });

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const win = window as Window & { SageCloudData?: unknown; SageCloud?: unknown };
        return {
          hasData: Boolean(win.SageCloudData),
          hasLegacy: Boolean(win.SageCloud),
          sameApi: win.SageCloudData === win.SageCloud,
        };
      }),
    )
    .toEqual({ hasData: true, hasLegacy: true, sameApi: true });
});

test('朋友留言板脚本带版本号避免旧缓存继续误判云端', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('script[src="guestbook.js?v=2"]')).toHaveCount(1);
});

test('主页编辑文案使用旧 key 也能恢复', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/sage-edits-ready/);

  const target = page.locator('#taskBoard .sub').first();
  await expect(target).toBeVisible();
  const stableKey = await target.evaluate((el) => (el as HTMLElement).dataset.editKey || '');
  expect(stableKey).toContain('sage.edit.v2.index.html');

  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.setItem(`${key}旧文案`, '这是旧 key 保存下来的主页留言板说明');
  }, stableKey);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.locator('#taskBoard .sub').first()).toHaveText(
    '这是旧 key 保存下来的主页留言板说明',
  );
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
  await expect(page.getByRole('heading', { name: 'Sage', exact: true })).toBeVisible();
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

test('留言板可以自选便利贴颜色且不再出现夸张形状', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('sage.admin.unlocked.v1', '1');
    sessionStorage.removeItem('sage.friend.visitor.v1');
  });
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  const form = page.locator('#guestbookForm');
  await expect(page.getByRole('button', { name: '桔梗紫' })).toBeVisible();
  await expect(page.getByRole('button', { name: '爱心' })).toHaveCount(0);

  await page.getByRole('button', { name: '桔梗紫' }).click();

  await expect(page.getByRole('button', { name: '桔梗紫' })).toHaveAttribute('aria-pressed', 'true');
  await expect(form).toHaveAttribute('data-note-style', 'square');
  await expect(form).toHaveCSS('--compose-note-bg', '#eee6f6');
});

test('留言板小纸条顺序排列并可点击放大查看', async ({ page }) => {
  await page.route('**/sage-cloud-data.js**', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.SageCloudData = {
          hasConfig: true,
          list: async () => [
            {
              id: 'demo-note-1',
              friend_username: 'sage',
              display_name: 'Sage',
              message: '这是一张可以点开的校园小纸条，内容会在放大后完整显示。',
              sticker: '✦',
              note_color: '#eee6f6|heart',
              avatar_url: 'assets/sage-avatar.png',
              is_visible: true,
              created_at: '2026-06-29T03:00:00.000Z'
            },
            {
              id: 'demo-note-2',
              friend_username: 'wren',
              display_name: 'Wren',
              message: '第二张小纸条要靠近第一张，像真实留言板。',
              sticker: '♡',
              note_color: '#dff0ee|circle',
              is_visible: true,
              created_at: '2026-06-29T04:00:00.000Z'
            }
          ],
          hideGuestbookMessage: async () => true
        };
      `,
    });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('sage.admin.unlocked.v1', '1');
    sessionStorage.removeItem('sage.friend.visitor.v1');
  });
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  const note = page.locator('.guest-note').first();
  await expect(note).toBeVisible();
  await expect(note).toHaveClass(/note-style-rounded/);
  await expect(note).toHaveAttribute('role', 'button');
  await expect(page.locator('.note-grid')).toHaveCSS('display', 'grid');
  await expect(note).toHaveCSS('position', 'relative');
  const firstBox = await page.locator('.guest-note').nth(0).boundingBox();
  const secondBox = await page.locator('.guest-note').nth(1).boundingBox();
  expect(firstBox?.height || 0).toBeGreaterThan(180);
  expect(firstBox?.height || 999).toBeLessThan(240);
  expect(Math.abs((secondBox?.height || 0) - (firstBox?.height || 0))).toBeLessThan(2);

  await note.click();
  const viewer = page.locator('.guest-note-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.guest-note-viewer-card')).toContainText('这是一张可以点开的校园小纸条');
  await page.getByRole('button', { name: '关闭留言' }).click();
  await expect(viewer).toBeHidden();
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

test('移动端首页主导航和次级分支分两行且尺寸正常', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);

  const branch = page.locator('.mobile-branches').getByRole('link', { name: '操作区' });
  await expect(branch).toBeVisible();
  const layout = await page.evaluate(() => {
    const primaryRects = [...document.querySelectorAll('.mobile-scroll a')].map((el) => el.getBoundingClientRect());
    const branchRects = [...document.querySelectorAll('.mobile-branches a')].map((el) => el.getBoundingClientRect());
    return {
      primaryMinTop: Math.min(...primaryRects.map((rect) => rect.top)),
      primaryMaxTop: Math.max(...primaryRects.map((rect) => rect.top)),
      branchTop: branchRects[0]?.top ?? 0,
      primaryTop: primaryRects[0]?.top ?? 0,
      primaryHeight: primaryRects[0]?.height ?? 0,
      branchHeight: branchRects[0]?.height ?? 0,
    };
  });
  expect(layout.primaryMaxTop - layout.primaryMinTop).toBeLessThan(4);
  expect(layout.branchTop).toBeGreaterThan(layout.primaryTop + 20);
  expect(layout.primaryHeight).toBeLessThan(48);
  expect(layout.branchHeight).toBeLessThan(44);

  await branch.click();
  await expect(page).toHaveURL(/index\.html#taskBoard$/);
  await expect(page.locator('#taskBoard')).toBeInViewport();
});

test('学习中心小按钮不会被撑成过大的圆形', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 714 });
  await page.goto('/study.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.tiny-link').first().waitFor();
  await page.locator('.term-mini').first().waitFor();
  const measurements = await page.evaluate(() => {
    const detail = document.querySelector('.tiny-link')?.getBoundingClientRect();
    const termButton = document.querySelector('.term-mini')?.getBoundingClientRect();
    return {
      detailHeight: detail?.height ?? 999,
      termHeight: termButton?.height ?? 999,
      termWidth: termButton?.width ?? 999,
    };
  });
  expect(measurements.detailHeight).toBeLessThanOrEqual(34);
  expect(measurements.termHeight).toBeLessThanOrEqual(36);
  expect(measurements.termWidth).toBeLessThanOrEqual(38);
});

test('学习中心文献书架可以跳转并保持移动端排版', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/study.html', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: '文献书架', exact: true }).first().click();
  await expect(page).toHaveURL(/study\.html#library$/);
  await expect(page.locator('#library')).toBeInViewport();
  await expect(page.locator('#readingTags')).toHaveCount(0);
  await expect(page.locator('#readingNotes')).toHaveCount(0);
  await page.locator('#readingCourse').selectOption('MDIA5003');
  await page.locator('#readingSourceUrl').fill('https://www.unsw.edu.au/course-outline.pdf');
  await expect(page.locator('#readingAutoMeta')).toContainText('course outline');
  await page.getByRole('button', { name: '保存文献' }).click();
  await expect(page.locator('.book-title', { hasText: 'course outline' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开文件' })).toBeVisible();
  await expect(page.getByText('页数未识别')).toBeVisible();

  const layout = await page.locator('.book-card').first().evaluate((card) => {
    const title = card.querySelector('.book-title') as HTMLElement;
    const actions = card.querySelector('.book-actions') as HTMLElement;
    const cardBox = card.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      cardWidth: cardBox.width,
      titleWidth: titleBox.width,
      titleHeight: titleBox.height,
      actionsTop: actionsBox.top,
      titleBottom: titleBox.bottom,
    };
  });

  expect(layout.overflow).toBe(false);
  expect(layout.cardWidth).toBeGreaterThan(280);
  expect(layout.titleWidth).toBeGreaterThan(180);
  expect(layout.titleHeight).toBeLessThan(70);
  expect(layout.actionsTop).toBeGreaterThan(layout.titleBottom);
  await expect(page.locator('#readingFile')).toHaveAttribute('accept', /pdf.*txt.*epub/);
});

test('关于页等待云端资料和编辑文案完成后再显示内容', async ({ page }) => {
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/resume-ready/);
  await expect(page.locator('body')).not.toHaveClass(/resume-hydrating/);
});

test('站内进入关于页时不会先露出旧的静态资料', async ({ page }) => {
  await page.route('**/resume.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: '关于 Sage' }).first().click();
  await expect(page).toHaveURL(/resume\.html$/);
  await expect(page.locator('#profileHeadline')).toBeAttached();

  const hydration = await page.evaluate(() => {
    const main = document.querySelector('.resume-editable');
    return {
      bodyClass: document.body.className,
      mainOpacity: main ? getComputedStyle(main).opacity : '',
    };
  });
  expect(hydration.bodyClass).toContain('resume-hydrating');
  expect(hydration.mainOpacity).toBe('0');
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
  const pages = ['/index.html', '/study.html', '/career.html', '/resume.html', '/friends.html'];

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
  for (const width of [390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(hasOverflow, `width ${width}`).toBe(false);
    await expect(page.locator('#todayPanel')).toBeVisible();
  }
});

test('关于页公开模式隐藏后台编辑和数据管理', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __SAGE_ENV__?: Record<string, string> }).__SAGE_ENV__ = {
      NEXT_PUBLIC_ADMIN_PASSCODE: 'admin-test',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    };
    localStorage.removeItem('sage.admin.unlocked.v1');
    sessionStorage.removeItem('sage.admin.unlocked.v1');
  });
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: '关于 Sage' }).first()).toBeVisible();
  await expect(page.locator('#profileForm')).toBeHidden();
  await expect(page.locator('#data-management')).toBeHidden();
  await expect(page.getByRole('button', { name: /管理模式|管理已解锁/ })).toHaveCount(0);
});

test('管理解锁后关于页显示编辑和数据管理', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __SAGE_ENV__?: Record<string, string> }).__SAGE_ENV__ = {
      NEXT_PUBLIC_ADMIN_PASSCODE: 'admin-test',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    };
    sessionStorage.setItem('sage.admin.unlocked.v1', '1');
  });
  await page.goto('/resume.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#profileForm')).toBeVisible();
  await expect(page.locator('#data-management')).toBeVisible();
});

test('朋友留言板使用独立入口且不会出现管理操作', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/朋友留言板/);
  await expect(page.getByRole('heading', { name: 'Sage', exact: true })).toBeVisible();
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

test('朋友留言板字体与首页体系一致', async ({ page }) => {
  await page.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  const styles = await page.evaluate(() => {
    const title = document.querySelector('.friend-title-card h1');
    const field = document.querySelector('#friendName');
    const rules = document.querySelector('.friend-rules');
    const button = document.querySelector('.friend-button');
    return {
      title: title ? getComputedStyle(title).fontFamily : '',
      field: field ? getComputedStyle(field).fontFamily : '',
      rules: rules ? getComputedStyle(rules).fontFamily : '',
      button: button ? getComputedStyle(button).fontFamily : '',
    };
  });

  expect(styles.title).toMatch(/Noto Serif SC|Songti SC|SimSun|serif/i);
  expect(styles.field).toMatch(/Noto Sans SC|PingFang SC|Microsoft YaHei|sans-serif/i);
  expect(styles.rules).toMatch(/Noto Sans SC|PingFang SC|Microsoft YaHei|sans-serif/i);
  expect(styles.button).toMatch(/Noto Sans SC|PingFang SC|Microsoft YaHei|sans-serif/i);
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

test('Sage 管理登录状态跨标签进入留言板仍然生效', async ({ browser }) => {
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  await adminPage.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate(() => {
    localStorage.setItem('sage.admin.unlocked.v1', '1');
    sessionStorage.removeItem('sage.admin.unlocked.v1');
    sessionStorage.removeItem('sage.friend.visitor.v1');
  });

  const friendPage = await context.newPage();
  await friendPage.goto('/friends.html', { waitUntil: 'domcontentloaded' });

  await expect(friendPage.locator('#friendGate')).toBeHidden();
  await expect(friendPage.locator('#friendArea')).toBeVisible();
  await expect(friendPage.locator('#friendVisitorName')).toHaveText('Sage');
  await expect(friendPage.locator('body')).toHaveClass(/friend-sage-mode/);

  await context.close();
});
