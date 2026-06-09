(function () {
  'use strict';

  // 导出所有模块数据为 JSON 文件
  window.exportAllData = function () {
    const modules = ['tasks', 'career', 'growth', 'portfolio', 'sync'];
    const data = {};
    modules.forEach(m => { data[m] = window.SageData?.getAll(m) || []; });

    // 同时导出 study 的 localStorage 数据（格式不同）
    data.study = { planV3: JSON.parse(localStorage.getItem('sage.study.planV3') || 'null') };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `sage-utopia-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    // 显示 toast
    const total = modules.reduce((s, m) => s + (data[m]?.length || 0), 0);
    showToast('已导出 ' + total + ' 条数据');
  };

  // 导入 JSON 文件并恢复到 localStorage
  window.importAllData = function (fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        // 预览
        const preview = document.getElementById('importPreview');
        if (preview) {
          const modules = Object.keys(data);
          let html = '<p class="hint" style="margin-bottom:8px">即将导入以下数据：</p>';
          modules.forEach(m => {
            const count = Array.isArray(data[m]) ? data[m].length : (data[m] ? 1 : 0);
            html += `<span class="chip" style="margin:2px">${m}: ${count} 条</span> `;
          });
          html += '<div style="margin-top:12px"><button class="mini" onclick="confirmImport()">确认导入（覆盖当前数据）</button></div>';
          preview.innerHTML = html;
          preview.style.display = 'block';

          // 存储待导入数据
          window.__pendingImport = data;
        }
      } catch (err) {
        alert('文件格式错误：' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // 确认导入
  window.confirmImport = function () {
    const data = window.__pendingImport;
    if (!data) return;

    // 导入各模块数据
    Object.entries(data).forEach(([mod, arr]) => {
      if (mod === 'study' && arr && arr.planV3) {
        localStorage.setItem('sage.study.planV3', JSON.stringify(arr.planV3));
      } else if (Array.isArray(arr)) {
        window.SageData?.save(mod, arr);
      }
    });

    delete window.__pendingImport;
    const preview = document.getElementById('importPreview');
    if (preview) preview.style.display = 'none';

    showToast('数据已导入，正在刷新...');
    setTimeout(() => location.reload(), 800);
  };

  function showToast(text) {
    let el = document.getElementById('sageMessage');
    if (!el) { el = document.createElement('div'); el.id = 'sageMessage'; el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#334139;color:#fff;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:800;z-index:10000;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease'; document.body.appendChild(el); }
    el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(window.__sageMsgTimer); window.__sageMsgTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(8px)'; }, 2000);
  }
})();
