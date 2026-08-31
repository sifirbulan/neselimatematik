function bindCoachNav(){
  const nav=document.querySelector('.bottomNav');
  if(!nav)return false;
  const buttons=Array.from(nav.querySelectorAll('button'));
  const target=buttons[1];
  if(!target)return false;

  buttons.forEach((button,index)=>{
    if(index!==1&&button.hasAttribute('data-nesevren-coach'))button.removeAttribute('data-nesevren-coach');
  });

  target.setAttribute('data-nesevren-coach','true');
  target.setAttribute('aria-label','Koç Hizmeti Al');
  const label=target.querySelector('small');
  if(label)label.textContent='Koç Hizmeti Al';
  const first=target.firstChild;
  if(first?.nodeType===Node.TEXT_NODE)first.textContent='◎';
  nav.style.gridTemplateColumns='repeat(4, 1fr)';
  return true;
}

let attempts=0;
function tryBind(){
  if(bindCoachNav())return;
  attempts+=1;
  if(attempts<30)setTimeout(tryBind,100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryBind,{once:true});
else tryBind();
window.addEventListener('pageshow',()=>{attempts=0;tryBind()});
