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
    const x = courses[code];
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
    } catch (e) {
      return defaultPlan;
    }
  })();

  // ── 重构的状态变量 ─────────────────────────────────
  let openSlot = null;
  let openAddTerm = null;    // 替代原来的 addOpen/addTerm
  let openRemoveTerm = null;  // 新增：控制删除面板

  // ── 计划操作函数 ───────────────────────────────────
  function save() {
    if (window.SageData) {
      window.SageData.save('study', plan);
    } else {
      localStorage.setItem('sage.study.planV3', JSON.stringify(plan));
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

  function activeTerm() {
    return openAddTerm || plan.find(i => i.slot === openSlot)?.term || plan.at(-1)?.term || 'T1 2028';
  }

  // ── 主渲染函数（重构版）───────────────────────────
  function render() {
    const board = document.getElementById('planBoard');
    if (!board) return;

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
        } catch (e) {
          const answerEl = document.getElementById('sageAnswer');
          if (answerEl) answerEl.textContent = prompt;
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════
   *  第二部分：iCal 同步功能（从 sync.js 移植）
   * ═══════════════════════════════════════════════════ */

  const SYNC_MODULE = 'sync';

  // ── 数据访问 ───────────────────────────────────────
  function syncLoad() {
    return window.SageData?.getAll(SYNC_MODULE) || [];
  }

  function syncSave(list) {
    window.SageData?.save(SYNC_MODULE, list);
  }

  function syncUid() {
    return window.SageData?.uid('sync') || ('sync-' + Date.now());
  }

  // ── iCal 字段解析 ──────────────────────────────────
  function field(block, name) {
    const line = block.split(/\r?\n/).find(x => x.startsWith(name + ':') || x.startsWith(name + ';'));
    if (!line) return '';
    return line.slice(line.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
  }

  function parseDate(v) {
    const c = (v || '').replace(/\D/g, '');
    return c.length >= 8 ? c.slice(0, 4) + '-' + c.slice(4, 6) + '-' + c.slice(6, 8) : '';
  }

  // ── 解析 iCal ───────────────────────────────────────
  window.parseIcsStudy = function () {
    const raw = document.getElementById('icsInput')?.value.replace(/\r?\n[ \t]/g, '') || '';
    const resultEl = document.getElementById('syncResult');
    if (!resultEl) return;

    if (!raw.includes('BEGIN:VCALENDAR')) {
      resultEl.innerHTML = '<p class="task">这看起来不是 iCal 内容。请寻找 Moodle 的导出日历或 .ics 内容。</p>';
      return;
    }

    const blocks = raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    if (!blocks.length) {
      resultEl.innerHTML = '<p class="task">没有找到事件。</p>';
      return;
    }

    // 解析并去重（基于 SUMMARY + DTSTART 组合）
    const existing = syncLoad();
    const existingKeys = new Set(existing.map(e => e.summary + '|' + e.date));
    const newEvents = [];

    blocks.slice(0, 30).forEach(b => {
      const summary = field(b, 'SUMMARY');
      const date = parseDate(field(b, 'DTSTART'));
      const key = summary + '|' + date;
      if (summary && !existingKeys.has(key)) {
        const event = {
          id: syncUid(),
          summary,
          date,
          source: 'Moodle',
          uid_ical: field(b, 'UID'),
          imported: false,
          createdAt: new Date().toISOString(),
        };
        newEvents.push(event);
        existingKeys.add(key);
      }
    });

    // 合并保存
    if (newEvents.length) {
      const merged = [...newEvents, ...existing];
      syncSave(merged);
    }

    // 渲染结果
    const all = syncLoad();
    renderSyncEvents(all);

    if (newEvents.length) {
      toast('已解析 ' + newEvents.length + ' 条新事件。');
    } else {
      toast('没有新事件，可能已经全部同步过了。');
    }
  };

  // ── 渲染同步事件列表 ──────────────────────────────
  function renderSyncEvents(events) {
    const resultEl = document.getElementById('syncResult');
    if (!resultEl) return;

    const importBtn = document.getElementById('syncImportBtn');

    const sorted = [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    resultEl.innerHTML = sorted.length
      ? sorted.map(e => `
          <div class="task" data-id="${e.id}">
            <strong>${esc(e.summary)}</strong>
            <p class="hint">${esc(e.date)} · ${esc(e.source)}${e.imported ? ' · 已导入任务' : ''}</p>
            ${!e.imported ? `<button class="mini" onclick="importSyncOne('${e.id}')" style="margin-top:4px">导入到任务</button>` : ''}
            <button class="mini danger" onclick="syncDelete('${e.id}')" style="margin-top:4px;margin-left:4px">删除</button>
          </div>`).join('')
      : '<p class="task">还没有同步过的事件。粘贴 iCal 内容开始。</p>';

    // 更新"全部导入"按钮
    if (importBtn) {
      const unimported = events.filter(e => !e.imported).length;
      importBtn.style.display = unimported > 0 ? 'inline-block' : 'none';
      importBtn.textContent = '全部导入任务 (' + unimported + ')';
    }
  }

  // ── 导入单条事件到任务系统 ────────────────────────
  window.importSyncOne = function (id) {
    const events = syncLoad();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return;

    const event = events[idx];

    // 导入到 tasks 模块（通过 SageData）
    var taskItems = window.SageData ? window.SageData.getAll('tasks') : JSON.parse(localStorage.getItem('sage.progress.items.v2') || '[]');
    taskItems.unshift({
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      section: 'task',
      title: event.summary,
      type: '学习任务',
      start: new Date().toISOString().slice(0, 10),
      due: event.date,
      total: 1,
      current: 0,
      unit: '项',
      done: false,
      note: '从同步中心导入（' + event.source + '）',
    });
    if (window.SageData) {
      window.SageData.save('tasks', taskItems);
    } else {
      localStorage.setItem('sage.progress.items.v2', JSON.stringify(taskItems));
    }

    // 标记已导入
    events[idx].imported = true;
    syncSave(events);

    renderSyncEvents(events);
    toast('已导入到任务列表。');
  };

  // ── 全部导入 ───────────────────────────────────────
  window.importSyncAll = function () {
    const events = syncLoad();
    const unimported = events.filter(e => !e.imported);
    if (!unimported.length) return;

    var taskItems = window.SageData ? window.SageData.getAll('tasks') : JSON.parse(localStorage.getItem('sage.progress.items.v2') || '[]');
    unimported.forEach(function (event) {
      taskItems.unshift({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        section: 'task',
        title: event.summary,
        type: '学习任务',
        start: new Date().toISOString().slice(0, 10),
        due: event.date,
        total: 1,
        current: 0,
        unit: '项',
        done: false,
        note: '从同步中心导入（' + event.source + '）',
      });
      event.imported = true;
    });
    if (window.SageData) {
      window.SageData.save('tasks', taskItems);
    } else {
      localStorage.setItem('sage.progress.items.v2', JSON.stringify(taskItems));
    }
    syncSave(events);

    renderSyncEvents(events);
    toast('已导入 ' + unimported.length + ' 条任务。');
  };

  // ── 删除事件 ───────────────────────────────────────
  window.syncDelete = function (id) {
    if (!confirm('确定删除这条同步记录吗？')) return;
    syncSave(syncLoad().filter(e => e.id !== id));
    const all = syncLoad();
    renderSyncEvents(all);
  };

  // ── HTML 转义 ───────────────────────────────────────
  function esc(s) {
    return String(s).replace(/[&<>'"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[c]);
  }

  // ── 初始化同步功能 ──────────────────────────────────
  function initSync() {
    const all = syncLoad();
    if (all.length) {
      renderSyncEvents(all);
    }
  }

  /* ═══════════════════════════════════════════════════
   *  初始化
   * ═══════════════════════════════════════════════════ */
  function init() {
    if (window.__studyInited) return;
    window.__studyInited = true;

    // 初始化选课规划
    render();

    // 初始化 Sage 面板
    initSagePanel();

    // 初始化同步功能
    initSync();
  }

  // 暴露刷新接口供 SPA 切换时调用
  window.__sageStudyRefresh = render;

  // 执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
