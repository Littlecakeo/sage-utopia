const EDIT_PREFIX='sage.edit.';
const EDITABLE_SELECTOR='main .desc, main .sub, main .hint, main .task-title, main .task-meta, main .task-note, main .date-pill, main .chip, main .link-card .tag, main .profile-list p, main .term-card p, main .decision-card p, main td:not(:first-child)';
const SECTION_INDEX={
  'index.html':[{label:'快速新增',selector:'main .grid.two'},{label:'状态概览',selector:'main .grid.stats'},{label:'UNSW 入口',text:'UNSW 快捷入口'},{label:'进度追踪',text:'进度追踪',scope:'.work-zone'},{label:'习惯养成',text:'习惯养成',scope:'.work-zone'},{label:'任务清单',text:'任务清单',scope:'.work-zone'}],
  'study.html':[{label:'学习概览',selector:'main .grid.stats'},{label:'485 证据',text:'485 证据与判断'},{label:'UNSW 索引',text:'UNSW 官方链接索引'},{label:'推荐路径',text:'推荐路径：72 UOC 主线'},{label:'全部课程库',text:'全部可选课程库'},{label:'确认清单',text:'下一步确认清单'}],
  'career.html':[{label:'求职概览',selector:'main .grid.three'},{label:'求职列表',text:'求职列表'}],
  'finance.html':[{label:'预算概览',selector:'main .grid.stats'},{label:'分类统计',text:'分类统计'}],
  'growth.html':[{label:'成长概览',selector:'main .grid.three'},{label:'时间轴',text:'时间轴'}],
  'sync.html':[{label:'使用说明',text:'怎么使用'},{label:'iCal 同步',text:'粘贴 iCal 内容'}],
  'about.html':[{label:'个人介绍',selector:'main .hero'},{label:'个人关键词',text:'个人关键词'},{label:'教育经历',text:'教育经历'},{label:'能力方向',text:'能力方向'}],
  'resume.html':[{label:'简历摘要',selector:'main .hero'},{label:'个人简介',text:'个人简介'},{label:'求职方向',text:'求职方向'},{label:'教育经历',text:'教育经历'},{label:'经历摘要',text:'经历摘要'},{label:'技能证书',text:'技能与证书'}],
  'portfolio.html':[{label:'作品集说明',selector:'main .hero'},{label:'项目展示',selector:'main .grid.three'}],
  'contact.html':[{label:'联系说明',selector:'main .hero'},{label:'联系方式',selector:'main .grid.two'}]
};
let dirty=false;
function pathKey(){return location.pathname.split('/').pop()||'index.html'}
function editableKey(index){return EDIT_PREFIX+pathKey()+'.'+index}

function applyDailyHero(){
  if(pathKey()!=='index.html')return;
  const title=document.querySelector('main .hero h1');
  if(!title)return;
  const messages=['今天适合轻轻推进一点','今天把重要的事放在前面','今天也在认真靠近未来','今天给学习和生活留一点光','今天适合整理一个小目标','今天慢慢做也很好','今天让计划变得更清楚'];
  const d=new Date();
  const yy=String(d.getFullYear()).slice(2),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  const seed=Number(yy+mm+dd);
  title.textContent=`${yy}/${mm}/${dd} ${messages[seed%messages.length]}`;
}
function personalIntroHTML(){return '<span>ENFP 天秤座</span><span>公共关系与广告方向学生</span><span>关注新媒体内容 品牌传播 数字营销 用户洞察</span><span>把学习 作品 生活 未来机会整理成柔软清晰的成长花园</span>'}
function isPersonalIntro(el){return pathKey()==='about.html'&&el.matches('.profile-title + .desc')}
function getEditables(){return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>!el.closest('.nav')&&!el.closest('.mobile')&&!el.closest('script')&&!el.closest('form')&&!el.closest('button')&&!el.closest('textarea')&&!el.closest('input')&&!el.closest('select')&&!el.closest('.edit-save-dock')&&!el.closest('.section-index')&&!el.closest('.mobile-branches')&&!el.closest('thead'))}
function loadEdits(){getEditables().forEach((el,index)=>{el.dataset.editable='true';el.dataset.editKey=editableKey(index);el.dataset.original=el.innerHTML;el.contentEditable='true';el.spellcheck=false;let saved=localStorage.getItem(el.dataset.editKey);if(isPersonalIntro(el)){el.classList.add('profile-lines');if(!saved||/[。，、]/.test(saved)){saved=personalIntroHTML();localStorage.setItem(el.dataset.editKey,saved)}}if(saved!==null){el.innerHTML=saved;el.dataset.original=saved}el.classList.toggle('editable-empty',!el.textContent.trim())})}
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
document.addEventListener('focus',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey&&!sessionStorage.getItem('sage.edit.hint')){sessionStorage.setItem('sage.edit.hint','1');toast('可以直接改内容，记得保存更改')}},true);
window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue=''});
applyDailyHero();
addSectionIndex();loadEdits();addSaveDock();