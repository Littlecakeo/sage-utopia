const EDIT_PREFIX='sage.edit.';
const EDITABLE_SELECTOR='main h1, main h2, main h3, main h4, main p, main .chip, main .tag, main .hint, main .sub, main .desc, main .task-title, main .task-meta, main .task-note, main .date-pill, main .stat, main a.card h2, main a.card p, main .link-card, main strong';
function pathKey(){return location.pathname.split('/').pop()||'index.html'}
function editableKey(index){return EDIT_PREFIX+pathKey()+'.'+index}
function getEditables(){return Array.from(document.querySelectorAll(EDITABLE_SELECTOR)).filter(el=>!el.closest('.nav')&&!el.closest('.mobile')&&!el.closest('script')&&!el.closest('form')&&!el.closest('button')&&!el.closest('textarea')&&!el.closest('input')&&!el.closest('select'))}
function loadEdits(){getEditables().forEach((el,index)=>{el.dataset.editable='true';el.dataset.editKey=editableKey(index);el.contentEditable='true';el.spellcheck=false;const saved=localStorage.getItem(el.dataset.editKey);if(saved!==null)el.innerHTML=saved;el.classList.toggle('editable-empty',!el.textContent.trim())})}
function saveOne(el){if(!el.dataset.editKey)return;localStorage.setItem(el.dataset.editKey,el.innerHTML);el.classList.toggle('editable-empty',!el.textContent.trim())}
function toast(text){let el=document.querySelector('.edit-toast');if(!el){el=document.createElement('div');el.className='edit-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(window.__editToastTimer);window.__editToastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
document.addEventListener('input',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey)saveOne(el)});
document.addEventListener('blur',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey)saveOne(el)},true);
document.addEventListener('focus',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.editKey&&!sessionStorage.getItem('sage.edit.hint')){sessionStorage.setItem('sage.edit.hint','1');toast('直接修改即可，内容会自动保存')}},true);
loadEdits();