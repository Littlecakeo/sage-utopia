const EDIT_PREFIX='sage.edit.';
const EDITABLE_SELECTOR='main h1, main h2, main h3, main h4, main p, main .chip, main .tag, main .hint, main .sub, main .desc, main .task-title, main .task-meta, main .task-note, main .date-pill, main .stat, main a.card h2, main a.card p, main .link-card, main strong, main td';
const SECTION_INDEX={
  'index.html':[
    {label:'快速新增',selector:'main .grid.two'},
    {label:'状态概览',selector:'main .grid.stats'},
    {label:'UNSW 入口',text:'UNSW 快捷入口'},
    {label:'进度追踪',text:'进度追踪',scope:'.work-zone'},
    {label:'习惯养成',text:'习惯养成',scope:'.work-zone'},
    {label:'任务清单',text:'任务清单',scope:'.work-zone'}
  ],
  'study.html':[
    {label:'学习概览',selector:'main .grid.stats'},
    {label:'选课决策板',text:'选课决策板'},
    {label:'课程比较表',text:'课程比较表'},
    {label:'课程管理',text:'课程管理'},
    {label:'作业管理',text:'作业管理'}
  ],
  'career.html':[
    {label:'求职概览',selector:'main .grid.three'},
    {label:'求职列表',text:'求职列表'}
  ],
  'finance.html':[
    {label:'预算概览',selector:'main .grid.stats'},
    {label:'分类统计',text:'分类统计'}
  ],
  'growth.html':[
    {label:'成长概览',selector:'main .grid.three'},
    {label:'时间轴',text:'时间轴'}
  ],
  'sync.html':[
    {label:'使用说明',text:'怎么使用'},
    {label:'iCal 同步',text:'粘贴 iCal 内容'}
  ],
  'about.html':[
    {label:'个人介绍',selector:'main .hero'},
    {label:'个人关键词',text:'个人关键词'},
    {label:'教育经历',text:'教育经历'},
    {label:'能力方向',text:'能力方向'}
  ],
  'resume.html':[
    {label:'简历摘要',selector:'main .hero'},
    {label:'个人简介',text:'个人简介'},
    {label:'求职方向',text:'求职方向'},
    {label:'教育经历',text:'教育经历'},
    {label:'经历摘要',text:'经历摘要'},
    {label:'技能证书',text:'技能与证书'}
  ],
  'portfolio.html':[
    {label:'作品集说明',selector:'main .hero'},
    {label:'项目展示',selector:'main .grid.three'}
  ],
  'contact.html':[
    {label:'联系说明',selector:'main .hero'},
    {label:'联系方式',selector:'main .grid.two'}
  ]
};
let dirty=false;
function pathKey(){return location.pathname.split('/').pop()||'index.html'}
function editableKey(index){return EDIT_PREFIX+pathKey()+'.'+index}
function getEditables(){return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>!el.closest('.nav')&&!el.closest('.mobile')&&!el.closest('script')&&!el.closest('form')&&!el.closest('button')&&!el.closest('textarea')&&!el.closest('input')&&!el.closest('select')&&!el.closest('.edit-save-dock')&&!el.closest('.section-index')&&!el.closest('.mobile-branches'))}
function loadEdits(){getEditables().forEach((el,index)=>{el.dataset.editable='true';el.dataset.editKey=editableKey(index);el.dataset.original=el.innerHTML;el.contentEditable='true';el.spellcheck=false;const saved=localStorage.getItem(el.dataset.editKey);if(saved!==null){el.innerHTML=saved;el.dataset.original=saved}el.classList.toggle('editable-empty',!el.textContent.trim())})}
function markDirty(){dirty=true;document.body.classList.add('has-unsaved-edits')}
function saveEdits(){getEditables().forEach(el=>{localStorage.setItem(el.dataset.editKey,el.innerHTML);el.dataset.original=el.innerHTML;el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已保存更改')}
function discardEdits(){if(!dirty)return;getEditables().forEach(el=>{el.innerHTML=el.dataset.original||'';el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已放弃本次更改')}
function toast(text){let el=document.querySelector('.edit-toast');if(!el){el=document.createElement('div');el.className='edit-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(window.__editToastTimer);window.__editToastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
function addSaveDock(){const dock=document.createElement('div');dock.className='edit-save-dock';dock.innerHTML='<span>有未保存的修改</span><button type="button" id="saveEditsBtn">保存更改</button><button type="button" class="quiet" id="discardEditsBtn">放弃更改</button>';document.body.appendChild(dock);document.getElementById('saveEditsBtn').addEventListener('click',saveEdits);document.getElementById('discardEditsBtn').addEventListener('click',discardEdits)}
function cleanId(text,index){return 'section-'+String(text||index).trim().replace(/[^\w\u4e00-\u9fa5]+/g,'-').replace(/^-|-$/g,'').slice(0,32)+'-'+index}
function findHeading(text){const nodes=Array.from(document.querySelectorAll('main h2, main h3, main h4'));return nodes.find(el=>el.textContent.trim()===text)||nodes.find(el=>el.textContent.trim().includes(text))}
function resolveTarget(item,index){let target=item.selector?document.querySelector(item.selector):null;if(!target&&item.text){const h=findHeading(item.text);target=item.scope&&h?h.closest(item.scope):h;target=target||h}if(!target)return null;if(!target.id)target.id=cleanId(item.label,index);return target}
function addSectionIndex(){const entries=SECTION_INDEX[pathKey()]||SECTION_INDEX['index.html'];const links=entries.map((item,index)=>{const target=resolveTarget(item,index);return target?{label:item.label,id:target.id}:null}).filter(Boolean);if(!links.length)return;const active=document.querySelector('.side .nav a.active');if(active&&!document.querySelector('.section-index')){const wrap=document.createElement('div');wrap.className='section-index';wrap.innerHTML='<p>本页分支</p>'+links.map(link=>`<a href="#${link.id}">${link.label}</a>`).join('');active.insertAdjacentElement('afterend',wrap)}const mobile=document.querySelector('.mobile-scroll');if(mobile&&!document.querySelector('.mobile-branches')){const wrap=document.createElement('div');wrap.className='mobile-branches';wrap.innerHTML=links.map(link=>`<a href="#${link.id}">${link.label}</a>`).join('');mobile.insertAdjacentElement('afterend',wrap)}}
document.addEventListener('input',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey)markDirty()});
document.addEventListener('focus',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey&&!sessionStorage.getItem('sage.edit.hint')){sessionStorage.setItem('sage.edit.hint','1');toast('可以直接改文字，记得保存更改')}},true);
window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue=''});
addSectionIndex();loadEdits();addSaveDock();