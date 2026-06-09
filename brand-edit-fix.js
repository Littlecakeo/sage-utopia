(function(){
  function focusEditable(el){
    if(!el)return;
    el.focus();
    const range=document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function bindBrandTag(){
    document.querySelectorAll('.brand .tag').forEach(tag=>{
      if(tag.dataset.brandEditFixed)return;
      tag.dataset.brandEditFixed='true';
      tag.contentEditable='true';
      tag.spellcheck=false;
      tag.setAttribute('role','textbox');
      tag.setAttribute('aria-label','编辑网站小标语');
      tag.addEventListener('pointerdown',event=>{
        event.preventDefault();
        event.stopPropagation();
        focusEditable(tag);
      },true);
      tag.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        focusEditable(tag);
      },true);
      tag.addEventListener('keydown',event=>{
        if(event.key==='Enter'){
          event.preventDefault();
          tag.blur();
        }
      });
      tag.addEventListener('input',()=>{
        if(!tag.dataset.editable)tag.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const brand=tag.closest('a.brand');
      if(brand&&!brand.dataset.brandEditGuard){
        brand.dataset.brandEditGuard='true';
        brand.addEventListener('click',event=>{
          if(event.target&&event.target.closest&&event.target.closest('.tag')){
            event.preventDefault();
            event.stopPropagation();
          }
        },true);
      }
    });
  }
  bindBrandTag();
  document.addEventListener('DOMContentLoaded',bindBrandTag);
  window.addEventListener('hashchange',()=>setTimeout(bindBrandTag,80));
  const observer=new MutationObserver(()=>bindBrandTag());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
