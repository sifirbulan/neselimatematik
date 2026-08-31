function bindBottomNav(){
  const nav=document.querySelector('.bottomNav');
  if(!nav)return false;
  const buttons=Array.from(nav.querySelectorAll('button'));
  const coachButton=buttons[1];
  if(!coachButton)return false;
  coachButton.setAttribute('data-nesevren-coach','true');
  coachButton.setAttribute('aria-label','Koç Hizmeti Al');
  nav.style.gridTemplateColumns='repeat(3,1fr)';
  return true;
}

let attempts=0;
function tryBindBottomNav(){
  if(bindBottomNav())return;
  attempts+=1;
  if(attempts<20)setTimeout(tryBindBottomNav,75);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryBindBottomNav,{once:true});
else tryBindBottomNav();
window.addEventListener('pageshow',()=>{attempts=0;tryBindBottomNav()});
