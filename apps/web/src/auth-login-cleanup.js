function removePhoneLoginOption(root=document){
  root.querySelectorAll('.authModal .authDivider, .authModal .authPhone').forEach(node=>node.remove());

  root.querySelectorAll('.authModal .authMessage').forEach(message=>{
    const text=(message.textContent||'').trim();
    if(text.includes('telefonla giriş')){
      message.textContent='Giriş hizmeti henüz etkinleştirilmedi. Yapılandırma tamamlandığında Google ve Apple ile giriş kullanılabilir.';
    }
  });
}

const authObserver=new MutationObserver(()=>removePhoneLoginOption());
authObserver.observe(document.documentElement,{childList:true,subtree:true});
removePhoneLoginOption();
