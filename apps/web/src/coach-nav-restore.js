function restoreCoachNav(){
  const nav=document.querySelector('.bottomNav');
  if(!nav)return;
  const buttons=Array.from(nav.querySelectorAll('button'));
  const target=buttons[1];
  if(!target)return;

  nav.querySelectorAll('[data-nesevren-coach]').forEach(button=>{
    if(button!==target)button.remove();
  });

  if(target.getAttribute('data-nesevren-coach')!=='true')target.setAttribute('data-nesevren-coach','true');
  if(target.getAttribute('aria-label')!=='Koç Hizmeti Al')target.setAttribute('aria-label','Koç Hizmeti Al');

  let label=target.querySelector('small');
  if(!label){
    label=document.createElement('small');
    target.appendChild(label);
  }
  if(label.textContent!=='Koç Hizmeti Al')label.textContent='Koç Hizmeti Al';

  const first=target.firstChild;
  if(first&&first.nodeType===Node.TEXT_NODE){
    if(first.textContent!=='◎')first.textContent='◎';
  }else{
    target.insertBefore(document.createTextNode('◎'),target.firstChild);
  }

  if(nav.children.length===4&&nav.style.gridTemplateColumns!=='repeat(4, 1fr)'){
    nav.style.gridTemplateColumns='repeat(4, 1fr)';
  }
}

let scheduled=false;
function scheduleRestore(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    restoreCoachNav();
  });
}

const observer=new MutationObserver(scheduleRestore);
observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
restoreCoachNav();
window.addEventListener('pageshow',restoreCoachNav);
