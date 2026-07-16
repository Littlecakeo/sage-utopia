/**
 * study.js v2.0
 * ─────────────────────────────────────
 * Sage Utopia · 学习中心（选课规划 + iCal 同步）
 *
 * 变更说明：
 * 1. 从 study.html 提取 inline JS 为独立文件
 * 2. 重构＋/－按钮交互：点击在学期内部展开添加/删除面板
 * 3. 并入 iCal 同步功能（从 sync.js 移植）
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════
   *  第一部分：选课规划功能
   * ═══════════════════════════════════════════════════ */

  // ── 课程数据 ───────────────────────────────────────
  const courses = {
    MDIA5031: ['Research in Practice', 6, '必修基础', '研究与实践基础，前两个 term 内完成。'],
    MDIA5000: ['Understanding Contemporary Media', 6, '媒体基础', '媒体理论打底，可作为备选。'],
    MDIA5001: ['Writing for Media', 6, 'Writing', '写作类，你暂时不优先。'],
    MDIA5003: ['Social Media Campaigning', 6, '社媒', '适合内容运营、社媒 campaign 和小红书方向。', 'https://timetable.prod.unsw.edu.au/2026/MDIA5003.html'],
    MDIA5004: ['Media Relations', 6, '媒体关系', 'PR 实务核心，适合求职。'],
    MDIA5005: ['Celebrity, Media and Culture', 6, '文化内容', '偏媒体文化和内容分析。'],
    MDIA5006: ['News and Feature Writing', 6, 'Writing', '新闻写作类，暂时低优先级。'],
    MDIA5007: ['Media Ethics and Law', 6, '伦理法律', '媒体伦理和法律，适合补嘈规意识。'],
    MDIA5008: ['Media Research Project', 12, '研究路径', '研究项目，需要 approval，非求职优先。'],
    MDIA5021: ['Advertising and Creativity', 6, '广告创意', '适合产出 campaign idea 和作品集。'],
    MDIA5022: ['Organisational Communication', 6, '组织传播', '适合企业传播、品牌沟通和 PR。'],
    MDIA5023: ['Public Relations Theory and Practice', 6, 'PR', 'PR 主线实践课，比纯写作更适合你。'],
    MDIA5024: ['Communication Strategies', 6, '传播策略', '策略型实践课，优先级高。'],
    MDIA5027: ['Understanding Digital Cultures', 6, '数字文化', '理解平台和数字文化，适合社媒方向。'],
    MDIA5028: ['Critical Perspectives in Communication', 6, 'Advanced 必修', 'Advanced 必修，已提前放到 T2。'],
    MDIA5029: ['Advertising Theory and Practice', 6, '广告理论', '广告理论补强，作为备选。'],
    MDIA5030: ['Brand Cultures', 12, '品牌必修', '12 UOC 重课，适合做品牌作品集。'],
    MDIA5032: ['From Text to Talk: Finding Your Voice', 6, '表达', '表达和声音呈现，偏展示能力。'],
    MDIA5033: ['Advocacy, Representation, Practice', 6, '倡议', '适合社会议题、campaign 和公益传播。'],
    MDIA5034: ['Insights for Stakeholder Engagement', 6, '洞察', '利益相关者洞察，适合 PR 策略。'],
    MDIA5100: ['Industry Internship', 6, '实习', '最后学期保留，直接服务求职。'],
    MARK5813: ['New Product and Service Development', 6, '产品服务', '产品和服务创新，适合品牌方向。'],
    MARK5814: ['Digital Marketing', 6, '营销', '补数字营销能力，适合简历。'],
    MARK5820: ['Events Management and Marketing', 6, '活动', '偏活动和体验营销，可作为就业选修。'],
    MARK5828: ['Advertising Analytics', 6, '数据', '补广告数据能力，适合求职。'],
    ARTS5100: ['Postgraduate Thesis Writing', 6, 'Writing', '论文写作，研究路径才优先。'],
    DDES9010: ['Design Concepts and Communication', 6, '设计沟通', '设计沟通方向，可作为跨学科备选。']
  };

  const allCodes = Object.keys(courses);

  // ── 工具函数 ───────────────────────────────────────
  function url(code) {
    return `https://www.handbook.unsw.edu.au/postgraduate/courses/2026/${code}`;
  }

  function c(code) {
    const fromPlan = plan.find(item => item.code === code && item.name);
    if (fromPlan) {
      return {
        code,
        name: fromPlan.name,
        uoc: Number(fromPlan.uoc || 6),
        tag: fromPlan.category || '自定义',
        summary: fromPlan.notes || '自定义课程',
        time: fromPlan.timetable_url || ''
      };
    }
    const x = courses[code];
    if (!x) return { code, name: code, uoc: 6, tag: '自定义', summary: '自定义课程', time: '' };
    return {
      code,
      name: x[0],
      uoc: x[1],
      tag: x[2],
      summary: x[3],
      time: x[4]
    };
  }

  function toast(t) {
    if (window.SageUI && window.SageUI.toast) { window.SageUI.toast(t); }
  }

  // ── 计划数据 ───────────────────────────────────────
  const defaultPlan = [
    ['T3 2026', 's1', 'MDIA5003'],
    ['T3 2026', 's2', 'MDIA5031'],
    ['T1 2027', 's3', 'MDIA5023'],
    ['T1 2027', 's4', 'MDIA5021'],
    ['T1 2027', 's5', 'MDIA5022'],
    ['T2 2027', 's6', 'MDIA5028'],
    ['T2 2027', 's7', 'MDIA5004'],
    ['T2 2027', 's8', 'MDIA5024'],
    ['T3 2027', 's9', 'MDIA5030'],
    ['T1 2028', 's10', 'MDIA5100'],
    ['T1 2028', 's11', 'MARK5828']
  ].map(([term, slot, code]) => ({ term, slot, code }));

  let plan = (function loadPlan() {
    try {
      var data = window.SageData ? window.SageData.getAll('study') : null;
      return (data && data.length) ? data : defaultPlan;
    } catch {
      return defaultPlan;
    }
  })();
  let assignments = [];
  let readings = [];

  // ── 重构的状态变量 ─────────────────────────────────
  let openSlot = null;
  let openAddTerm = null;    // 替代原来的 addOpen/addTerm
  let openRemoveTerm = null;  // 新增：控制删除面板

  function ensurePlan() {
    if (!Array.isArray(plan) || plan.length === 0) {
      plan = defaultPlan.map(item => Object.assign({}, item));
    }
  }

  // ── 计划操作函数 ───────────────────────────────────
  function save() {
    if (window.SageData) {
      window.SageData.save('study', plan);
    } else {
      localStorage.setItem('sage.study.planV3', JSON.stringify(plan));
    }
  }

  async function loadCloudStudyData() {
    if (!window.SageData || !window.SageData.loadAsync) return;
    let cloudCourses;
    try {
      cloudCourses = await window.SageData.loadAsync('study');
    } catch {
      cloudCourses = window.SageData.getAll('study');
    }
    if (cloudCourses && cloudCourses.length) {
      plan = cloudCourses.map(item => ({
        id: item.id,
        term: item.term || '未分配学期',
        slot: item.slot || item.id || ('s' + Date.now()),
        code: item.code,
        name: item.name,
        category: item.category,
        uoc: item.uoc || 6,
        notes: item.notes,
        handbook_url: item.handbook_url,
        timetable_url: item.timetable_url,
      }));
    }
    try {
      assignments = await window.SageData.loadAsync('assignments');
    } catch {
      assignments = window.SageData.getAll('assignments');
    }
    try {
      readings = await window.SageData.loadAsync('readings');
    } catch {
      readings = window.SageData.getAll('readings');
      toast('文献书架暂时连不上云端，已保留本地显示。');
    }
  }

  function grouped() {
    return plan.reduce((a, i) => ((a[i.term] ||= []).push(i), a), {});
  }

  function has(code, except) {
    return plan.some(i => i.code === code && i.slot !== except);
  }

  function opt(code, slot, mode) {
    const x = c(code);
    const dup = has(code, mode === 'swap' ? slot : null);
    return `<button class="swap-option ${dup ? 'duplicate' : ''}" type="button" data-mode="${mode}" data-slot="${slot || ''}" data-code="${code}">
      <div class="swap-title">${code} ${x.name}${dup ? '｜已在计划中' : ''}</div>
      <div class="swap-summary">${x.summary}</div>
    </button>`;
  }

  function removeOption(item) {
    const x = c(item.code);
    return `<button class="swap-option" type="button" data-mode="remove" data-slot="${item.slot}" data-code="${item.code}">
      <div class="swap-title">${item.code} ${x.name}</div>
      <div class="swap-summary">${x.tag} · ${x.summary}</div>
    </button>`;
  }

  function hydrateCourseSelect() {
    const select = document.getElementById('assignmentCourse');
    if (select) {
      select.innerHTML = plan.map(item => {
        const info = c(item.code);
        return `<option value="${item.id || item.code}">${item.code} ${info.name}</option>`;
      }).join('') || '<option value="">未关联课程</option>';
    }
    hydrateLibraryControls();
  }

  function hydrateLibraryControls() {
    const readingCourse = document.getElementById('readingCourse');
    const courseFilter = document.getElementById('libraryCourseFilter');
    const courseOptions = plan.map(item => {
      const info = c(item.code);
      return `<option value="${item.id || item.code}">${item.code} ${info.name}</option>`;
    }).join('');
    if (readingCourse) {
      readingCourse.innerHTML = '<option value="">未关联课程</option>' + courseOptions;
    }
    if (courseFilter) {
      const current = courseFilter.value;
      courseFilter.innerHTML = '<option value="">全部课程</option>' + courseOptions;
      courseFilter.value = current;
    }
  }

  // ── 主渲染函数（重构版）───────────────────────────
  function render() {
    const board = document.getElementById('planBoard');
    if (!board) return;
    ensurePlan();

    board.innerHTML = Object.entries(grouped()).map(([term, items]) => {
      const uoc = items.reduce((s, i) => s + c(i.code).uoc, 0);
      const isAddOpen = openAddTerm === term;
      const isRemoveOpen = openRemoveTerm === term;

      return `<div class="term-group" data-term="${term}">
        <div class="term-head">
          <div class="term-title">
            <strong>${term}</strong>
            <span>${uoc} UOC</span>
          </div>
          <div class="term-tools">
            <button class="term-mini" type="button" data-term-add="${term}" aria-label="给 ${term} 加课">＋</button>
            <button class="term-mini danger" type="button" data-term-remove="${term}" aria-label="从 ${term} 减课">－</button>
          </div>
        </div>
        ${items.map(i => {
          const x = c(i.code);
          return `<button class="course-slot ${openSlot === i.slot ? 'active' : ''}" type="button" data-slot="${i.slot}">
            <div class="course-title">${i.code} ${x.name}</div>
            <div class="course-meta">${x.tag} · ${x.summary}</div>
            <div class="slot-actions">
              <a class="tiny-link" href="${url(i.code)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">详情</a>
              ${x.time ? `<a class="tiny-link" href="${x.time}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">时间表</a>` : ''}
            </div>
          </button>
          <div class="swap-list ${openSlot === i.slot ? 'show' : ''}">
            ${allCodes.filter(code => code !== i.code).map(code => opt(code, i.slot, 'swap')).join('')}
          </div>`;
        }).join('')}
        <!-- 添加面板 -->
        <div class="add-panel" style="${isAddOpen ? 'display:grid' : 'display:none'}">
          ${isAddOpen ? allCodes.map(code => opt(code, '', 'add')).join('') : ''}
        </div>
        <!-- 删除面板 -->
        <div class="add-panel" style="${isRemoveOpen ? 'display:grid' : 'display:none'}">
          ${isRemoveOpen ? items.map(i => removeOption(i)).join('') : ''}
        </div>
      </div>`;
    }).join('');

    // 更新统计
    const plannedUocEl = document.getElementById('plannedUoc');
    const courseCountEl = document.getElementById('courseCount');
    if (plannedUocEl) plannedUocEl.textContent = plan.reduce((s, i) => s + c(i.code).uoc, 0);
    if (courseCountEl) courseCountEl.textContent = plan.length;

    // ── 事件绑定：课程卡片点击（展开 swap 列表）────
    document.querySelectorAll('.course-slot').forEach(b => {
      b.onclick = () => {
        openSlot = openSlot === b.dataset.slot ? null : b.dataset.slot;
        openAddTerm = null;
        openRemoveTerm = null;
        render();
      };
    });

    // ── 事件绑定：＋按钮（添加课程）────────────────
    document.querySelectorAll('[data-term-add]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const term = b.dataset.termAdd;
        if (openAddTerm === term) {
          openAddTerm = null;
        } else {
          openAddTerm = term;
          openRemoveTerm = null;
        }
        openSlot = null;
        render();
      };
    });

    // ── 事件绑定：－按钮（删除课程）────────────────
    document.querySelectorAll('[data-term-remove]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const term = b.dataset.termRemove;
        if (openRemoveTerm === term) {
          openRemoveTerm = null;
        } else {
          openRemoveTerm = term;
          openAddTerm = null;
        }
        openSlot = null;
        render();
      };
    });

    // ── 事件绑定：swap 选项（替换课程）─────────────
    document.querySelectorAll('[data-mode="swap"]').forEach(b => {
      b.onclick = () => {
        const code = b.dataset.code;
        if (b.classList.contains('duplicate')) return toast('这门课已经在计划里啦');
        plan = plan.map(i => i.slot === b.dataset.slot ? { ...i, code } : i);
        openSlot = null;
        save();
        toast('已替换课程');
        render();
      };
    });

    // ── 事件绑定：add 选项（添加课程）──────────────
    document.querySelectorAll('[data-mode="add"]').forEach(b => {
      b.onclick = () => {
        const code = b.dataset.code;
        if (b.classList.contains('duplicate')) return toast('这门课已经在计划里啦');
        plan.push({ term: openAddTerm, slot: 's' + Date.now(), code });
        openAddTerm = null;
        save();
        toast('已添加课程');
        render();
      };
    });

    // ── 事件绑定：remove 选项（删除课程）───────────
    document.querySelectorAll('[data-mode="remove"]').forEach(b => {
      b.onclick = () => {
        const slot = b.dataset.slot;
        const item = plan.find(i => i.slot === slot);
        plan = plan.filter(i => i.slot !== slot);
        openRemoveTerm = null;
        save();
        toast('已删除 ' + (item ? item.code : ''));
        render();
      };
    });
  }

  async function addCustomCourse(e) {
    e.preventDefault();
    const code = document.getElementById('courseCode')?.value.trim().toUpperCase();
    const name = document.getElementById('courseName')?.value.trim();
    if (!code || !name) return;
    if (has(code)) return toast('这门课已经在计划里啦');
    const item = {
      id: window.SageData.uid('course'),
      code,
      name,
      term: document.getElementById('courseTerm')?.value.trim() || '未分配学期',
      slot: 's' + Date.now(),
      category: document.getElementById('courseCategory')?.value.trim() || '自定义',
      uoc: Number(document.getElementById('courseUoc')?.value || 6),
      status: '计划中',
      notes: '手动新增课程',
    };
    const saved = await window.SageData.cloudAdd('study', item);
    plan.push(saved || item);
    save();
    document.getElementById('courseForm')?.reset();
    toast('课程已保存');
    render();
    renderAssignments();
    renderLibrary();
  }

  function courseValueFor(item) {
    return item?.id || item?.code || '';
  }

  function courseFromValue(value) {
    return plan.find(item => courseValueFor(item) === value || item.code === value) || null;
  }

  function titleFromName(name) {
    return String(name || '未命名文献')
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '未命名文献';
  }

  function decodePdfHex(hex) {
    const clean = String(hex || '').replace(/[^0-9a-f]/gi, '');
    if (!clean) return '';
    if (clean.startsWith('FEFF') || clean.startsWith('feff')) {
      const chars = [];
      for (let i = 4; i + 3 < clean.length; i += 4) {
        chars.push(String.fromCharCode(parseInt(clean.slice(i, i + 4), 16)));
      }
      return chars.join('').trim();
    }
    const bytes = [];
    for (let i = 0; i + 1 < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16));
    return String.fromCharCode(...bytes).trim();
  }

  function decodePdfLiteral(text) {
    return String(text || '')
      .replace(/\\([nrtbf()\\])/g, (_match, ch) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' })[ch] || ch)
      .trim();
  }

  function pdfInfoValue(raw, key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const literal = raw.match(new RegExp(`/${escaped}\\s*\\(([^)]{0,500})\\)`));
    if (literal) return decodePdfLiteral(literal[1]);
    const hex = raw.match(new RegExp(`/${escaped}\\s*<([0-9A-Fa-f\\s]{2,1000})>`));
    if (hex) return decodePdfHex(hex[1]);
    return '';
  }

  async function extractFileMetadata(file) {
    if (!file) return {};
    const format = detectFileFormat(file);
    const fallback = { title: titleFromName(file.name), author: '', page_count: 0 };
    if (format === 'pdf') {
      const buffer = await file.arrayBuffer();
      const raw = new TextDecoder('latin1').decode(buffer);
      const pageMatches = raw.match(/\/Type\s*\/Page\b/g) || [];
      return {
        title: pdfInfoValue(raw, 'Title') || fallback.title,
        author: pdfInfoValue(raw, 'Author') || '',
        page_count: pageMatches.length || 0,
      };
    }
    if (format === 'txt') {
      const text = await file.text();
      const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean);
      return {
        title: firstLine?.slice(0, 120) || fallback.title,
        author: '',
        page_count: Math.max(1, Math.ceil(text.length / 1800)),
      };
    }
    return fallback;
  }

  function updateAutoMeta(meta = {}) {
    const title = meta.title || document.getElementById('readingTitle')?.value || '';
    const author = meta.author || document.getElementById('readingAuthor')?.value || '';
    const pages = Number(meta.page_count || document.getElementById('readingPageCount')?.value || 0);
    const titleEl = document.getElementById('readingTitle');
    const authorEl = document.getElementById('readingAuthor');
    const pagesEl = document.getElementById('readingPageCount');
    if (titleEl && meta.title) titleEl.value = meta.title;
    if (authorEl) authorEl.value = meta.author || author;
    if (pagesEl) pagesEl.value = pages ? String(pages) : '';
    const preview = document.getElementById('readingAutoMeta');
    if (!preview) return;
    preview.innerHTML = [
      `<span>标题：${escapeHTML(title || '待识别')}</span>`,
      `<span>作者：${escapeHTML(author || '未识别')}</span>`,
      `<span>页数：${pages ? `${pages} 页` : '未识别'}</span>`,
    ].join('');
  }

  function formatFileSize(size) {
    const n = Number(size || 0);
    if (!n) return '未记录大小';
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
    return `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  function detectFileFormat(file) {
    if (!file) return '';
    const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
    if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (file.type === 'text/plain' || ext === 'txt') return 'txt';
    if (file.type === 'application/epub+zip' || ext === 'epub') return 'epub';
    return '';
  }

  function relatedDueText(reading) {
    const code = reading.course_code || '';
    const related = assignments
      .filter(a => {
        const course = courseFromValue(a.course_id);
        return course && course.code === code && a.due_date;
      })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
    return related ? `相关截止 ${related.due_date}` : '未关联截止';
  }

  function readingCard(reading) {
    const format = String(reading.format || '').toUpperCase() || 'LINK';
    const course = reading.course_code || '未关联课程';
    const progress = Math.max(0, Math.min(100, Number(reading.progress || 0)));
    const source = reading.source_url ? '学校链接' : '云端文件';
    const pageText = Number(reading.page_count || 0) ? `${Number(reading.page_count)} 页` : '页数未识别';
    return `<article class="book-card" data-id="${escapeHTML(reading.id)}">
      <div class="book-spine">${escapeHTML(format)}</div>
      <div class="book-body">
        <div class="book-title">${escapeHTML(reading.title || '未命名文献')}</div>
        <div class="book-meta">${escapeHTML(course)} · ${escapeHTML(reading.author || source)} · ${escapeHTML(formatFileSize(reading.file_size))}</div>
        <div class="book-badges">
          <span class="book-badge">${escapeHTML(reading.status || '待读')}</span>
          <span class="book-badge">${escapeHTML(pageText)}</span>
          <span class="book-badge">${escapeHTML(relatedDueText(reading))}</span>
        </div>
        <div class="book-progress" aria-label="阅读进度 ${progress}%"><span style="width:${progress}%"></span></div>
        ${reading.notes ? `<div class="book-note">${escapeHTML(reading.notes)}</div>` : ''}
        <div class="book-actions">
          <button class="mini" type="button" data-action="reading-open" data-id="${escapeHTML(reading.id)}">打开文件</button>
          ${reading.source_url ? `<a class="mini ghost" href="${escapeHTML(reading.source_url)}" target="_blank" rel="noreferrer">学校链接</a>` : ''}
          <button class="mini ghost admin-only" type="button" data-action="reading-edit" data-id="${escapeHTML(reading.id)}">编辑</button>
          <button class="mini danger admin-only" type="button" data-action="reading-delete" data-id="${escapeHTML(reading.id)}">删除</button>
        </div>
      </div>
    </article>`;
  }

  function filteredReadings() {
    const q = document.getElementById('librarySearch')?.value.trim().toLowerCase() || '';
    const courseValue = document.getElementById('libraryCourseFilter')?.value || '';
    const status = document.getElementById('libraryStatusFilter')?.value || '';
    const selectedCourse = courseFromValue(courseValue);
    const selectedCode = selectedCourse?.code || courseValue;
    return readings.filter(reading => {
      const haystack = [
        reading.title,
        reading.author,
        reading.course_code,
        reading.term,
        reading.source_url,
        reading.notes,
      ].join(' ').toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (selectedCode && reading.course_code !== selectedCode) return false;
      if (status && reading.status !== status) return false;
      return true;
    });
  }

  function renderLibrary() {
    hydrateLibraryControls();
    const list = document.getElementById('libraryList');
    if (!list) return;
    const visible = filteredReadings();
    if (!visible.length) {
      list.innerHTML = '<div class="library-empty">书架还空着。进入管理模式后，可以上传 PDF、TXT、EPUB，或者先保存学校资源链接。</div>';
    } else {
      const groups = visible.reduce((acc, reading) => {
        const key = `${reading.course_code || '未关联课程'}｜${reading.term || '未分配学期'}`;
        (acc[key] ||= []).push(reading);
        return acc;
      }, {});
      list.innerHTML = Object.entries(groups).map(([key, items]) => {
        const [course, term] = key.split('｜');
        return `<section class="shelf-group">
          <div class="shelf-head"><strong>${escapeHTML(course)}</strong><span>${escapeHTML(term)} · ${items.length} 份材料</span></div>
          <div class="book-grid">${items.map(readingCard).join('')}</div>
        </section>`;
      }).join('');
    }
    const hint = document.getElementById('librarySyncHint');
    if (hint) {
      hint.textContent = window.SageCloudData?.hasConfig
        ? '文献书架已连接 Supabase。学校同步会关联课程、截止日期和官方链接，不自动抓取受限文件。'
        : '未配置 Supabase：当前只保留本地文献信息，文件不会跨设备同步。';
    }
  }

  function resetLibraryForm() {
    document.getElementById('libraryForm')?.reset();
    ['readingId', 'readingFilePath', 'readingFileName', 'readingFileSize', 'readingFormat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const status = document.getElementById('readingStatus');
    if (status) status.value = '待读';
    const progress = document.getElementById('readingProgress');
    if (progress) progress.value = '0';
    updateAutoMeta({ title: '', author: '', page_count: 0 });
  }

  function editReading(id) {
    const reading = readings.find(item => item.id === id);
    if (!reading) return;
    document.getElementById('readingId').value = reading.id || '';
    document.getElementById('readingFilePath').value = reading.file_path || '';
    document.getElementById('readingFileName').value = reading.file_name || '';
    document.getElementById('readingFileSize').value = reading.file_size || '';
    document.getElementById('readingFormat').value = reading.format || '';
    document.getElementById('readingTitle').value = reading.title || '';
    document.getElementById('readingAuthor').value = reading.author || '';
    document.getElementById('readingPageCount').value = reading.page_count || '';
    const course = plan.find(item => item.code === reading.course_code);
    document.getElementById('readingCourse').value = course ? courseValueFor(course) : '';
    document.getElementById('readingStatus').value = reading.status || '待读';
    document.getElementById('readingProgress').value = reading.progress || 0;
    document.getElementById('readingSourceUrl').value = reading.source_url || '';
    updateAutoMeta({ title: reading.title || '', author: reading.author || '', page_count: Number(reading.page_count || 0) });
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveReading(e) {
    e.preventDefault();
    const id = document.getElementById('readingId')?.value;
    const fileInput = document.getElementById('readingFile');
    const file = fileInput?.files?.[0] || null;
    const selectedCourse = courseFromValue(document.getElementById('readingCourse')?.value || '');
    let fileMeta = {
      file_path: document.getElementById('readingFilePath')?.value || '',
      file_name: document.getElementById('readingFileName')?.value || '',
      file_size: Number(document.getElementById('readingFileSize')?.value || 0),
      format: document.getElementById('readingFormat')?.value || '',
    };
    let uploadedPath = '';
    if (file) {
      const format = detectFileFormat(file);
      if (!format) return toast('仅支持 PDF、TXT、EPUB 文件。');
      if (file.size > 50 * 1024 * 1024) return toast('单个文件不能超过 50MB。');
      if (!window.SageCloudData?.hasConfig) return toast('当前未连接云端，请先保存学校链接或配置 Supabase。');
      const meta = await extractFileMetadata(file);
      updateAutoMeta(meta);
      fileMeta = await window.SageCloudData.uploadStudyMaterial(file);
      uploadedPath = fileMeta?.file_path || '';
    }
    if (!file && !document.getElementById('readingTitle')?.value.trim()) {
      const sourceUrl = document.getElementById('readingSourceUrl')?.value.trim() || '';
      if (sourceUrl) updateAutoMeta({ title: titleFromName(sourceUrl.split('/').pop() || sourceUrl), author: '', page_count: 0 });
    }
    const payload = {
      title: document.getElementById('readingTitle')?.value.trim() || (file ? titleFromName(file.name) : titleFromName(document.getElementById('readingSourceUrl')?.value.trim() || '学校资源')),
      author: document.getElementById('readingAuthor')?.value.trim() || '',
      page_count: Number(document.getElementById('readingPageCount')?.value || 0),
      course_code: selectedCourse?.code || '',
      term: selectedCourse?.term || '',
      source_url: document.getElementById('readingSourceUrl')?.value.trim() || '',
      source_type: '学校/手动',
      status: document.getElementById('readingStatus')?.value || '待读',
      progress: Number(document.getElementById('readingProgress')?.value || 0),
      tags: [],
      notes: '',
      is_public: false,
      ...fileMeta,
    };
    if (!payload.title) return;
    if (!payload.file_path && !payload.source_url) return toast('请上传文件，或填写学校资源链接。');
    if (!payload.format && payload.source_url) payload.format = 'link';
    try {
      if (id) {
        const previous = readings.find(item => item.id === id);
        const updated = await window.SageData.cloudUpdate('readings', id, payload);
        readings = readings.map(item => item.id === id ? Object.assign({}, item, updated || payload) : item);
        if (file && previous?.file_path && previous.file_path !== payload.file_path) {
          await window.SageCloudData?.removeStudyMaterial?.(previous.file_path).catch(() => toast('旧文件删除失败，可稍后重试。'));
        }
        toast('文献已更新');
      } else {
        const created = await window.SageData.cloudAdd('readings', Object.assign({ id: window.SageData.uid('reading') }, payload));
        readings.unshift(created || payload);
        toast('文献已保存');
      }
    } catch (error) {
      if (uploadedPath) {
        await window.SageCloudData?.removeStudyMaterial?.(uploadedPath).catch(() => {});
      }
      throw error;
    }
    window.SageData.saveLocalOnly('readings', readings);
    resetLibraryForm();
    renderLibrary();
  }

  async function openReading(id) {
    const reading = readings.find(item => item.id === id);
    if (!reading) return;
    let openUrl = reading.source_url || '';
    if (reading.file_path) {
      try {
        openUrl = await window.SageCloudData?.createStudyMaterialUrl?.(reading.file_path);
      } catch {
        toast('文件链接生成失败，请检查云端连接。');
        return;
      }
    }
    if (!openUrl) return toast('这条文献还没有文件或学校链接。');
    window.open(openUrl, '_blank', 'noopener,noreferrer');
  }

  async function deleteReading(id) {
    const reading = readings.find(item => item.id === id);
    if (!reading) return;
    if (!confirm('确定删除这份文献吗？文件也会从云端移除。')) return;
    let storageError = false;
    if (reading.file_path && window.SageCloudData?.hasConfig) {
      try {
        await window.SageCloudData.removeStudyMaterial(reading.file_path);
      } catch {
        storageError = true;
      }
    }
    await window.SageData.cloudRemove('readings', id);
    readings = readings.filter(item => item.id !== id);
    window.SageData.saveLocalOnly('readings', readings);
    renderLibrary();
    toast(storageError ? '记录已删除，但文件移除失败，请稍后检查云端。' : '文献已删除');
  }

  function bindLibraryActions() {
    document.getElementById('libraryForm')?.addEventListener('submit', saveReading);
    document.getElementById('libraryCancelEdit')?.addEventListener('click', resetLibraryForm);
    document.getElementById('readingFile')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return updateAutoMeta({ title: '', author: '', page_count: 0 });
      const format = detectFileFormat(file);
      if (!format) return toast('仅支持 PDF、TXT、EPUB 文件。');
      if (file.size > 50 * 1024 * 1024) return toast('单个文件不能超过 50MB。');
      try {
        updateAutoMeta(await extractFileMetadata(file));
      } catch {
        updateAutoMeta({ title: titleFromName(file.name), author: '', page_count: 0 });
      }
    });
    document.getElementById('readingSourceUrl')?.addEventListener('input', (event) => {
      if (document.getElementById('readingFile')?.files?.[0]) return;
      const value = event.target.value.trim();
      if (!value) return updateAutoMeta({ title: '', author: '', page_count: 0 });
      updateAutoMeta({ title: titleFromName(value.split('/').pop() || value), author: '', page_count: 0 });
    });
    ['librarySearch', 'libraryCourseFilter', 'libraryStatusFilter'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderLibrary);
      document.getElementById(id)?.addEventListener('change', renderLibrary);
    });
    document.getElementById('libraryList')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'reading-open') openReading(id);
      if (btn.getAttribute('data-action') === 'reading-edit') editReading(id);
      if (btn.getAttribute('data-action') === 'reading-delete') deleteReading(id);
    });
  }

  function assignmentCard(a) {
    const course = plan.find(item => (item.id || item.code) === a.course_id);
    const courseText = course ? `${course.code} ${c(course.code).name}` : '未关联课程';
    const dueText = a.due_date ? `截止 ${a.due_date}` : '未设置截止';
    return `<div class="task-row" data-id="${a.id}">
      <div class="task-card-top">
        <div>
          <div class="task-title">${escapeHTML(a.title || '')}</div>
          <div class="task-meta">${escapeHTML(courseText)} · ${escapeHTML(dueText)}</div>
        </div>
      </div>
      ${a.notes ? `<div class="task-note">${escapeHTML(a.notes)}</div>` : ''}
      <div class="task-actions">
        <button class="mini ghost" data-action="assignment-edit" data-id="${a.id}">编辑</button>
        <button class="mini danger" data-action="assignment-delete" data-id="${a.id}">删除</button>
      </div>
    </div>`;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>'"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
    });
  }

  function renderAssignments() {
    hydrateCourseSelect();
    const list = document.getElementById('assignmentList');
    if (list) {
      list.innerHTML = assignments.length ? assignments.map(assignmentCard).join('') : '<div class="empty">还没有作业。新增一条后，这里会显示课程和截止日期。</div>';
    }
    const hint = document.getElementById('studySyncHint');
    if (hint) hint.textContent = window.SageCloudData?.localModeMessage?.() || '本地模式';
  }

  function resetAssignmentForm() {
    document.getElementById('assignmentForm')?.reset();
    const id = document.getElementById('assignmentId');
    if (id) id.value = '';
    const status = document.getElementById('assignmentStatus');
    if (status) status.value = '未开始';
    const progress = document.getElementById('assignmentProgress');
    if (progress) progress.value = '0';
  }

  function editAssignment(id) {
    const a = assignments.find(item => item.id === id);
    if (!a) return;
    document.getElementById('assignmentId').value = a.id;
    document.getElementById('assignmentTitle').value = a.title || '';
    document.getElementById('assignmentCourse').value = a.course_id || '';
    document.getElementById('assignmentDue').value = a.due_date || '';
    document.getElementById('assignmentStatus').value = a.status || '未开始';
    document.getElementById('assignmentProgress').value = a.progress || 0;
    document.getElementById('assignmentNotes').value = a.notes || '';
  }

  async function saveAssignment(e) {
    e.preventDefault();
    const id = document.getElementById('assignmentId')?.value;
    const payload = {
      title: document.getElementById('assignmentTitle')?.value.trim(),
      course_id: document.getElementById('assignmentCourse')?.value || null,
      due_date: document.getElementById('assignmentDue')?.value || null,
      status: document.getElementById('assignmentStatus')?.value || '未开始',
      progress: Number(document.getElementById('assignmentProgress')?.value || 0),
      notes: document.getElementById('assignmentNotes')?.value.trim() || '',
    };
    if (!payload.title) return;
    if (id) {
      const updated = await window.SageData.cloudUpdate('assignments', id, payload);
      assignments = assignments.map(item => item.id === id ? Object.assign({}, item, updated || payload) : item);
      toast('作业已更新');
    } else {
      const created = await window.SageData.cloudAdd('assignments', Object.assign({ id: window.SageData.uid('assn') }, payload));
      assignments.unshift(created || payload);
      toast('作业已保存');
    }
    window.SageData.saveLocalOnly('assignments', assignments);
    resetAssignmentForm();
    renderAssignments();
  }

  async function deleteAssignment(id) {
    if (!confirm('确定删除这条作业吗？')) return;
    await window.SageData.cloudRemove('assignments', id);
    assignments = assignments.filter(item => item.id !== id);
    window.SageData.saveLocalOnly('assignments', assignments);
    renderAssignments();
  }

  function bindAssignmentActions() {
    document.getElementById('courseForm')?.addEventListener('submit', addCustomCourse);
    document.getElementById('assignmentForm')?.addEventListener('submit', saveAssignment);
    document.getElementById('assignmentCancelEdit')?.addEventListener('click', resetAssignmentForm);
    document.getElementById('assignmentList')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.getAttribute('data-action') === 'assignment-edit') editAssignment(id);
      if (btn.getAttribute('data-action') === 'assignment-delete') deleteAssignment(id);
    });
  }

  // ── Sage 面板功能 ─────────────────────────────────
  function initSagePanel() {
    const sageToggle = document.getElementById('sageToggle');
    const copyPrompt = document.getElementById('copyPrompt');

    if (sageToggle) {
      sageToggle.onclick = () => {
        const panel = document.getElementById('sagePanel');
        if (panel) panel.classList.toggle('show');
      };
    }

    if (copyPrompt) {
      copyPrompt.onclick = async () => {
        const q = document.getElementById('sageQuestion')?.value.trim() || '帮我分析现在的选课计划';
        const planText = plan.map(i => `${i.term}: ${i.code} ${c(i.code).name}`).join('\n');
        const prompt = `我是 UNSW Master of Public Relations and Advertising 学生，偏好实践类课程，不优先 writing。我的当前计划：\n${planText}\n\n我的问题：${q}`;
        try {
          await navigator.clipboard.writeText(prompt);
          toast('已复制，可以粘贴给 ChatGPT');
        } catch {
          const answerEl = document.getElementById('sageAnswer');
          if (answerEl) answerEl.textContent = prompt;
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════
   *  初始化
   * ═══════════════════════════════════════════════════ */
  async function init() {
    if (window.__sageStudyInitDone) return;
    window.__sageStudyInitDone = true;
    window.__studyInited = true;

    // 先显示本地默认课程，避免云端请求慢时页面短暂空白。
    render();
    renderAssignments();
    renderLibrary();
    bindAssignmentActions();
    bindLibraryActions();
    initSagePanel();

    await loadCloudStudyData();

    // 云端数据回来后再覆盖刷新。
    render();
    renderAssignments();
    renderLibrary();

    // 初始化同步功能（委托给 sage-sync.js 独立模块）
    if (window.SageSync) { window.SageSync.init(); }
    requestAnimationFrame(() => {
      render();
      renderAssignments();
      renderLibrary();
    });
  }

  // 暴露刷新接口供 SPA 切换时调用
  window.__sageStudyRefresh = function () { render(); renderAssignments(); renderLibrary(); };
  setTimeout(window.__sageStudyRefresh, 0);
  setTimeout(window.__sageStudyRefresh, 450);

  // 执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
