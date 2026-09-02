const configuredApiUrl=(import.meta.env.VITE_API_URL??'').trim().replace(/\/+$/,'');
const COACH_API_URL=!configuredApiUrl||configuredApiUrl==='https://nesevren-api.onrender.com'?'https://nesevren-api-v2.onrender.com':configuredApiUrl;
const AUTH_SESSION_KEY='nesevren-auth-session-v1';
const PROFILE_KEY='nesevren-user-profile-v1';
const LOGIN_INTENT_KEY='nesevren-coach-login-pending-v1';
const REQUEST_KEY='nesevren-live-coach-requests-v1';
const PROFILE_VERSION=2;
let waitingForProfile=false;

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function hasSession(){const session=readJson(AUTH_SESSION_KEY,null);if(!session?.access_token)return false;const expiresAt=Number(session.expires_at||0);return !expiresAt||expiresAt>Date.now()+5000}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function tokenSubject(token=''){
  try{
    const part=String(token).split('.')[1];if(!part)return'';
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    const bytes=Uint8Array.from(atob(padded),char=>char.charCodeAt(0));const payload=JSON.parse(new TextDecoder().decode(bytes));
    return typeof payload?.sub==='string'?payload.sub:'';
  }catch{return''}
}
function profileComplete(){const profile=readJson(PROFILE_KEY,null);if(!profile||profile.profileVersion!==PROFILE_VERSION)return false;if(profile.role==='student')return Boolean(profile.grade);if(profile.role==='teacher')return Boolean(profile.educationLevel&&profile.branch);return false}
function userId(){const profile=readJson(PROFILE_KEY,null);if(typeof profile?.userId==='string'&&profile.userId)return profile.userId;const session=readJson(AUTH_SESSION_KEY,null);return session?.user?.id||tokenSubject(session?.access_token)||'local'}
function freeKey(){return `nesevren-live-coach-free-used-v1:${userId()}`}
function freeUsed(){try{return localStorage.getItem(freeKey())==='1'}catch{return false}}
function closeCoach(){document.getElementById('coachEntryBackdrop')?.remove();document.body.style.overflow=''}
function setResult(root,html,kind=''){const box=root.querySelector('#coachEntryResult');box.className=`coachEntryResult ${kind}`;box.innerHTML=html}
function requireProblem(root){const input=root.querySelector('#coachProblem');const value=input.value.trim();if(!value){setResult(root,'<strong>Önce seni zorlayan durumu kısaca yaz.</strong>','error');input.focus();return null}return value}

function openLoginForCoach(){
  try{localStorage.setItem(LOGIN_INTENT_KEY,'1')}catch{}
  const entry=document.querySelector('.appTopbar .authEntry,.appTopbar .aiStatus');
  if(entry){entry.click();return}
  const fallback=[...document.querySelectorAll('button')].find(btn=>(btn.textContent||'').includes('Giriş Yap'));
  fallback?.click();
}

function answerHtml(answer){
  const parts=[];
  const main=answer?.answer||answer?.finalAnswer||'';
  const explanation=answer?.explanation||'';
  if(main)parts.push(`<p>${escapeHtml(main)}</p>`);
  if(explanation)parts.push(`<p>${escapeHtml(explanation)}</p>`);
  if(Array.isArray(answer?.steps)&&answer.steps.length)parts.push(`<ol>${answer.steps.slice(0,6).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>`);
  if(answer?.hint)parts.push(`<p><strong>İlk adım:</strong> ${escapeHtml(answer.hint)}</p>`);
  return parts.join('')||'<p>Koçluk yanıtı hazırlanamadı.</p>';
}

async function continueWithAi(root){
  const problem=requireProblem(root);if(!problem)return;
  const button=root.querySelector('#coachAiChoice');button.disabled=true;
  setResult(root,'<span class="coachSpinner">✦</span> Sorununu anlamaya çalışıyorum…','loading');
  const prompt=`Sen Neşevren eğitim koçusun. Kullanıcının anlattığı sorun: "${problem}". Önce sorunun özünü bir cümlede anladığını göster. Sonra en fazla 3 uygulanabilir adım öner. Gereksiz uzun anlatma; yargılayıcı olma. Akademik, çalışma düzeni, motivasyon veya hedef sorununa göre yaklaş.`;
  try{
    const response=await fetch(`${COACH_API_URL}/api/v1/questions/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:prompt,inputType:'text',intent:'solve'})});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.error?.message||'Yapay zekâ koçuna şu anda ulaşılamıyor.');
    setResult(root,`<h3>Yapay zekâ koçun</h3>${answerHtml(data)}`,'success');
  }catch(error){setResult(root,escapeHtml(error?.message||'Koçluk yanıtı hazırlanamadı.'),'error')}
  finally{button.disabled=false}
}

function saveLiveRequest(problem){
  const items=readJson(REQUEST_KEY,[]);const list=Array.isArray(items)?items:[];
  list.unshift({id:`${Date.now()}`,userId:userId(),problem,createdAt:Date.now(),free:true,status:'prepared'});
  writeJson(REQUEST_KEY,list.slice(0,20));
  try{localStorage.setItem(freeKey(),'1')}catch{}
}

function showLiveCoach(root){
  const problem=requireProblem(root);if(!problem)return;
  if(freeUsed()){
    setResult(root,`<h3>Canlı koç</h3><p><strong>Ücretsiz danışma hakkını daha önce kullandın.</strong></p><p>Bundan sonraki canlı koç görüşmeleri ücretlidir. Ücretlendirme ve ödeme ekranını sonraki aşamada bağlayacağız.</p>`,'notice');
    return;
  }
  setResult(root,`<h3>İlk canlı danışmanlığın ücretsiz</h3><p>Bir defaya mahsus canlı koç danışma hakkın var. Bu ücretsiz hak kullanıldıktan sonra sonraki canlı koç görüşmeleri <strong>ücretli</strong> olacaktır.</p><button id="useFreeCoach" class="coachConfirm" type="button">Ücretsiz danışma hakkımı kullan</button>`,'notice');
  root.querySelector('#useFreeCoach')?.addEventListener('click',()=>{
    saveLiveRequest(problem);
    setResult(root,`<h3>Danışma hakkın kaydedildi</h3><p>Ücretsiz canlı danışma talebin hazırlandı. Canlı koç eşleştirme altyapısı bağlandığında bu talep gönderilebilecek.</p><p><strong>Not:</strong> Sonraki canlı koç görüşmelerinin ücretli olacağını unutma.</p>`,'success');
  },{once:true});
}

function openCoach(){
  if(!hasSession()){openLoginForCoach();return}
  closeCoach();
  const wrap=document.createElement('div');wrap.id='coachEntryBackdrop';wrap.className='coachEntryBackdrop';
  const freeText=freeUsed()?'Ücretsiz hakkını kullandın · sonraki görüşmeler ücretli':'İlk danışma ücretsiz · sonrası ücretli';
  wrap.innerHTML=`<section class="coachEntry" role="dialog" aria-modal="true" aria-labelledby="coachEntryTitle"><button class="coachEntryClose" type="button" aria-label="Kapat">×</button><header><small>NEŞEVREN KOÇLUK</small><h2 id="coachEntryTitle">Seni en çok zorlayan nedir?</h2><p>Sorununu bir iki cümleyle anlat. Sonra nasıl devam etmek istediğini seç.</p></header><label class="coachProblemLabel" for="coachProblem">Şu anda çözmek istediğin sorun</label><textarea id="coachProblem" maxlength="1200" placeholder="Örn. Matematikte konuyu anlıyorum ama soru çözerken nereden başlayacağımı bilemiyorum..."></textarea><div class="coachChoices"><button id="coachAiChoice" class="coachChoice primary" type="button"><span>✦</span><div><strong>Yapay zekâ ile devam edeceğim</strong><small>Sorunumu analiz et ve bana yol göster.</small></div></button><button id="coachLiveChoice" class="coachChoice" type="button"><span>👩‍🏫</span><div><strong>Canlı koç istiyorum</strong><small>${escapeHtml(freeText)}</small></div></button></div><div id="coachEntryResult" class="coachEntryResult" aria-live="polite"></div></section>`;
  document.body.appendChild(wrap);document.body.style.overflow='hidden';
  wrap.querySelector('.coachEntryClose').onclick=closeCoach;wrap.addEventListener('click',e=>{if(e.target===wrap)closeCoach()});
  wrap.querySelector('#coachAiChoice').onclick=()=>continueWithAi(wrap);wrap.querySelector('#coachLiveChoice').onclick=()=>showLiveCoach(wrap);
  setTimeout(()=>wrap.querySelector('#coachProblem')?.focus(),30);
}

function resumeCoachAfterLogin(){
  let pending=false;try{pending=localStorage.getItem(LOGIN_INTENT_KEY)==='1'}catch{}
  if(!pending||!hasSession())return;
  if(profileComplete()){
    try{localStorage.removeItem(LOGIN_INTENT_KEY)}catch{}
    waitingForProfile=false;setTimeout(openCoach,160);return;
  }
  if(waitingForProfile)return;
  waitingForProfile=true;
  document.addEventListener('nesevren:profile-updated',()=>{
    waitingForProfile=false;
    if(!profileComplete())return;
    try{localStorage.removeItem(LOGIN_INTENT_KEY)}catch{}
    setTimeout(openCoach,80);
  },{once:true});
}

document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;const button=target?.closest('[data-nesevren-coach]');if(!button)return;event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();openCoach()},true);
window.addEventListener('pageshow',resumeCoachAfterLogin);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCoach()});
