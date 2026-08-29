function enhanceFamilyEntry(){
  const menu=document.querySelector(".authMenu");
  if(!menu||menu.querySelector('[data-action="family"]'))return;
  const button=document.createElement("button");
  button.type="button";
  button.dataset.action="family";
  button.textContent="👨‍👩‍👧 Aile / Veli Merkezi";
  button.addEventListener("click",()=>{
    menu.remove();
    window.dispatchEvent(new CustomEvent("nesevren-open-family-hub"));
  });
  const logout=menu.querySelector('[data-action="logout"]');
  if(logout)menu.insertBefore(button,logout);else menu.appendChild(button);
}

const observer=new MutationObserver(enhanceFamilyEntry);
observer.observe(document.documentElement,{childList:true,subtree:true});
enhanceFamilyEntry();
