const EDIT_PREFIX='sage.edit.';
const EDITABLE_SELECTOR='main h1, main h2, main h3, main h4, main p, main .chip, main .tag, main .hint, main .sub, main .desc, main .task-title, main .task-meta, main .task-note, main .date-pill, main .stat, main a.card h2, main a.card p, main .link-card, main strong';
let dirty=false;
function pathKey(){return location.pathname.split('/').pop()||'index.html'}
function editableKey(index){return EDIT_PREFIX+pathKey()+'.'+index}
function getEditables(){return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>!el.closest('.nav')&&!el.closest('.mobile')&&!el.closest('script')&&!el.closest('form')&&!el.closest('button')&&!el.closest('textarea')&&!el.closest('input')&&!el.closest('select')&&!el.closest('.edit-save-dock'))}
function loadEdits(){getEditables().forEach((el,index)=>{el.dataset.editable='true';el.dataset.editKey=editableKey(index);el.dataset.original=el.innerHTML;el.contentEditable='true';el.spellcheck=false;const saved=localStorage.getItem(el.dataset.editKey);if(saved!==null){el.innerHTML=saved;el.dataset.original=saved}el.classList.toggle('editable-empty',!el.textContent.trim())})}
function markDirty(){dirty=true;document.body.classList.add('has-unsaved-edits')}
function saveEdits(){getEditables().forEach(el=>{localStorage.setItem(el.dataset.editKey,el.innerHTML);el.dataset.original=el.innerHTML;el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已保存更改')}
function discardEdits(){if(!dirty)return;getEditables().forEach(el=>{el.innerHTML=el.dataset.original||'';el.classList.toggle('editable-empty',!el.textContent.trim())});dirty=false;document.body.classList.remove('has-unsaved-edits');toast('已放弃本次更改')}
function toast(text){let el=document.querySelector('.edit-toast');if(!el){el=document.createElement('div');el.className='edit-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(window.__editToastTimer);window.__editToastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
function addSaveDock(){const dock=document.createElement('div');dock.className='edit-save-dock';dock.innerHTML='<span>有未保存的修改</span><button type="button" id="saveEditsBtn">保存更改</button><button type="button" class="quiet" id="discardEditsBtn">放弃更改</button>';document.body.appendChild(dock);document.getElementById('saveEditsBtn').addEventListener('click',saveEdits);document.getElementById('discardEditsBtn').addEventListener('click',discardEdits)}
document.addEventListener('input',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey)markDirty()});
document.addEventListener('focus',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey&&!sessionStorage.getItem('sage.edit.hint')){sessionStorage.setItem('sage.edit.hint','1');toast('可以直接改文字，记得保存更改')}},true);
window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue=''});
loadEdits();addSaveDock();