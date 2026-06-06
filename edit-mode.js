const EDIT_PREFIX='sage.edit.v2.';
const EDITABLE_SELECTOR='.brand .tag, main .desc, main .sub, main .hint, main .task-title, main .task-meta, main .task-note, main .date-pill, main .chip, main .link-card .tag, main .profile-list p, main .term-card p, main .decision-card p, main td:not(:first-child)';
const PAGE_BY_HASH={home:'index.html',study:'study.html',career:'career.html',growth:'growth.html',resume:'resume.html'};
const SECTION_INDEX={
  'index.html':[{label:'快速新增',selector:'#quickAdd'},{label:'操作区',selector:'#taskBoard'}],
  'study.html':[{label:'换课',selector:'#planner'},{label:'官方链接',selector:'#links'},{label:'485',selector:'#visa'},{label:'同步',selector:'#sync-study'}],
  'career.html':[{label:'概览',selector:'main .grid.three'},{label:'求职列表',selector:'main .section'}],
  'growth.html':[{label:'概览',selector:'main .grid.three'},{label:'时间轴',selector:'main .section'}],
  'resume.html':[{label:'摘要',selector:'main .hero'},{label:'关于',selector:'#resume-about'},{label:'联系',selector:'#resume-contact'},{label:'作品',selector:'#resume-portfolio'},{label:'技能',selector:'#resume-skills'}]
};
let dirty=false;
function pathKey(){const h=(location.hash||'').replace('#','');return PAGE_BY_HASH[h]||location.pathname.split('/').pop()||'index.html'}
function editableKey(index,el){return el&&el.matches&&el.matches('.brand .tag')?EDIT_PREFIX+'brand.tag':EDIT_PREFIX+pathKey()+'.'+index}
function getEditables(){return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>{if(el.matches('.brand .tag'))return true;return !el.closest('.nav')&&!el.closest('.mobile')&&!el.closest('script')&&!el.closest('form')&&!el.closest('button')&&!el.closest('textarea')&&!el.closest('input')&&!el.closest('select')&&!el.closest('.edit-save-dock')&&!el.closest('.section-index')&&!el.closest('.mobile-branches')&&!el.closest('thead')&&!el.closest('.study-top-stats')})}
function loadEdits(){getEditables().forEach((el,index)=>{const key=editableKey(index,el);el.dataset.editable='true';el.dataset.editKey=key;el.dataset.original=el.innerHTML;el.contentEditable='true';el.spellcheck=false;const saved=localStorage.getItem(key);if(saved!==null){el.innerHTML=saved;el.dataset.original=saved}el.classList.toggle('editable-empty',!el.textContent.trim())})}
function markDirty(){dirty=true;document.body.classList.add('has-unsaved-edits')}
function saveEdits(){getEditables().forEach((el,index)=>{const key=editableKey(index,el);el.dataset.editKey=key;localStorage.setItem(key,el.innerHTML);el.dataset.original=el.innerHTML;el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已保存更改')}
function discardEdits(){if(!dirty)return;getEditables().forEach(el=>{el.innerHTML=el.dataset.original||'';el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已放弃本次更改')}
function toast(text){let el=document.querySelector('.edit-toast');if(!el){el=document.createElement('div');el.className='edit-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(window.__editToastTimer);window.__editToastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
function addSaveDock(){if(document.querySelector('.edit-save-dock'))return;const dock=document.createElement('div');dock.className='edit-save-dock';dock.innerHTML='<span>有未保存的修改</span><button type="button" id="saveEditsBtn">保存更改</button><button type="button" class="quiet" id="discardEditsBtn">放弃更改</button>';document.body.appendChild(dock);document.getElementById('saveEditsBtn').addEventListener('click',saveEdits);document.getElementById('discardEditsBtn').addEventListener('click',discardEdits)}
function cleanId(text,index){return 'section-'+String(text||index).trim().replace(/[^\w\u4e00-\u9fa5]+/g,'-').replace(/^-|-$/g,'').slice(0,32)+'-'+index}
function addSectionIndex(){document.querySelectorAll('.section-index').forEach(el=>el.remove());const entries=SECTION_INDEX[pathKey()]||SECTION_INDEX['index.html'];const links=entries.map((item,index)=>{const target=document.querySelector(item.selector);if(!target)return null;if(!target.id)target.id=cleanId(item.label,index);return{label:item.label,id:target.id}}).filter(Boolean);if(!links.length)return;const active=document.querySelector('.side .nav a.active');if(active){const wrap=document.createElement('div');wrap.className='section-index';wrap.innerHTML='<p>本页分支</p>'+links.map(link=>`<a href="#${link.id}">${link.label}</a>`).join('');active.insertAdjacentElement('afterend',wrap)}}
document.addEventListener('input',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editable)markDirty()});
document.addEventListener('focus',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editable&&!sessionStorage.getItem('sage.edit.hint')){sessionStorage.setItem('sage.edit.hint','1');toast('可以直接改内容，记得保存更改')}},true);
window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue=''});
function initSageEditMode(){addSectionIndex();loadEdits();addSaveDock()}
window.initSageEditMode=initSageEditMode;
initSageEditMode();
(function loadSageSiteShell(){if(document.querySelector('script[data-sage-site-shell]'))return;const s=document.createElement('script');s.src='site-shell.js?v=6';s.dataset.sageSiteShell='true';document.body.appendChild(s)})();
