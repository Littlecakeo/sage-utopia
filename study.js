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
   *  初始化
   * ═══════════════════════════════════════════════════ */
  function init() {
    if (window.__studyInited) return;
    window.__studyInited = true;

    // 初始化选课规划
    render();

    // 初始化 Sage 面板
    initSagePanel();

    // 初始化同步功能（委托给 sage-sync.js 独立模块）
    if (window.SageSync) { window.SageSync.init(); }
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
