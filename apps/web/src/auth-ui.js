const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||'').trim().replace(/\/+$/,'');
const SUPABASE_ANON_KEY=(import.meta.env.VITE_SUPABASE_ANON_KEY||'').trim();
const SESSION_KEY='nesevren-auth-session-v1';
const PROFILE_KEY='nesevren-user-profile-v1';
const PROFILE_VERSION=2;
const configured=Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY);
let currentUser=null;
let menuEl=null;

const GOOGLE_ICON=`<svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.35 12.22c0-.74-.06-1.29-.2-1.86H12v3.42h5.37c-.11.85-.71 2.13-2.05 2.99l-.02.11 2.98 2.31.21.02c1.92-1.77 3.03-4.38 3.03-7.49 0-.72-.06-1.4-.17-2.05Z"/><path fill="#34A853" d="M12 21.4c2.75 0 5.05-.9 6.73-2.45l-3.3-2.55c-.88.6-2.07 1.03-3.43 1.03-2.62 0-4.84-1.77-5.64-4.15l-.11.01-3.24 2.51-.04.1A10.17 10.17 0 0 0 12 21.4Z"/><path fill="#FBBC05" d="M6.36 13.28A6.12 6.12 0 0 1 6.04 12c0-.45.08-.89.22-1.31l-.01-.11-3.28-2.55-.1.05A9.43 9.43 0 0 0 2 12c0 1.42.34 2.76.97 3.92l3.39-2.64Z"/><path fill="#EA4335" d="M12 6.57c1.9 0 3.18.82 3.91 1.5l2.85-2.78C17.01 3.66 14.72 2.6 12 2.6a10.17 10.17 0 0 0-9.03 5.48l3.39 2.61C7.16 8.31 9.38 6.57 12 6.57Z"/></svg>`;
const APPLE_ICON=`<svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.32.03-1.75-.79-3.27-.79-1.53 0-2 .76-3.25.82-1.3.05-2.29-1.32-3.13-2.54C4.31 17 3 12.5 4.71 9.53c.84-1.47 2.35-2.4 3.98-2.43 1.24-.02 2.42.84 3.18.84.75 0 2.16-1.04 3.64-.89.62.03 2.35.25 3.47 1.88-.09.06-2.07 1.22-2.05 3.74.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.4 2.79ZM13 3.5c.7-.8 1.86-1.4 2.91-1.5.14 1.16-.34 2.32-1 3.15-.65.84-1.72 1.5-2.78 1.42-.16-1.14.38-2.32.87-3.07Z"/></svg>`;

const STUDENT_GRADES=['Ana sınıfı','1','2','3','4','5','6','7','8','9','10','11','12','LGS','TYT','AYT','KPSS','ALES','Mezun / Diğer'];
const TEACHER_LEVELS=[['primary','İlkokul'],['middle','Ortaokul'],['high','Lise']];
const TEACHER_BRANCHES={
  primary:['Sınıf Öğretmeni','Matematik','Türkçe','Fen Bilimleri','İngilizce','Diğer'],
  middle:['Matematik','Türkçe','Fen Bilimleri','İngilizce','Sosyal Bilgiler','Din Kültürü','Kürtçe','Diğer'],
  high:['Matematik','Türk Dili ve Edebiyatı','Fizik','Kimya','Biyoloji','İngilizce','Tarih','Coğrafya','Felsefe','Kürtçe','Rehberlik','Diğer']
};

function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function removeKey(key){try{localStorage.removeItem(key)}catch{}}
function closeBackdrop(){document.querySelector('.authBackdrop')?.remove()}
function closeMenu(){menuEl?.remove();menuEl=null}
function initials(name=''){const p=name.trim().split(/\s+/).filter(Boolean);return (p[0]?.[0]||'K')+(p[1]?.[0]||'')}
function session(){return readJson(SESSION_KEY)||null}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function authHeaders(token=SUPABASE_ANON_KEY){return{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${token}`}}
function unavailableMessage(){return'Giriş hizmeti henüz etkinleştirilmedi. Yapılandırma tamamlandığında Google ve Apple ile giriş kullanılabilir.'}

function providerAccount(){
  const metadata=currentUser?.user_metadata||{};
  const appMetadata=currentUser?.app_metadata||{};
  const account={
    userId:currentUser?.id||'',
    name:metadata.full_name||metadata.name||metadata.display_name||'',
    email:currentUser?.email||metadata.email||'',
    phone:currentUser?.phone||metadata.phone||metadata.phone_number||'',
    birthDate:metadata.birthdate||metadata.birth_date||metadata.birthday||metadata.date_of_birth||'',
    avatarUrl:metadata.avatar_url||metadata.picture||'',
    provider:appMetadata.provider||'',
    providers:Array.isArray(appMetadata.providers)?appMetadata.providers:[]
  };
  return Object.fromEntries(Object.entries(account).filter(([,value])=>Array.isArray(value)?value.length:Boolean(value)));
}
function localProfile(){const p=readJson(PROFILE_KEY);if(!p||typeof p!=='object')return null;if(currentUser?.id&&p.userId&&p.userId!==currentUser.id)return null;return p}
function remoteProfile(){const p=currentUser?.user_metadata?.nesevren_profile;return p&&typeof p==='object'?p:null}
function chooseProfile(){
  const local=localProfile();const remote=remoteProfile();
  if(!local)return remote;if(!remote)return local;
  return Number(remote.updatedAt||0)>Number(local.updatedAt||0)?remote:local;
}
function profile(){return chooseProfile()||null}
function profileComplete(p=profile()){
  if(!p||p.profileVersion!==PROFILE_VERSION)return false;
  if(p.role==='student')return Boolean(p.grade);
  if(p.role==='teacher')return Boolean(p.educationLevel&&p.branch);
  return false;
}
function displayName(){const p=profile();const account=providerAccount();return p?.name||account.name||account.email||account.phone||'Profil'}
function persistProviderSnapshot(){
  if(!currentUser)return;
  const base=profile()||{};const account=providerAccount();
  const next={...base,...account,userId:currentUser.id,account,providerSyncedAt:Date.now()};
  writeJson(PROFILE_KEY,next);
}
async function saveRemoteProfile(next){
  const s=session();if(!configured||!s?.access_token)return false;
  try{
    const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:authHeaders(s.access_token),body:JSON.stringify({data:{nesevren_profile:next}})});
    if(!response.ok)return false;
    const user=await response.json().catch(()=>null);if(user)currentUser=user;
    return true;
  }catch{return false}
}

async function fetchUser(accessToken){if(!configured||!accessToken)return null;const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(accessToken)});if(!r.ok)return null;return await r.json()}
async function restore(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));const access=hash.get('access_token');
  if(access){const s={access_token:access,refresh_token:hash.get('refresh_token')||'',expires_at:Date.now()+Number(hash.get('expires_in')||3600)*1000};writeJson(SESSION_KEY,s);history.replaceState(null,'',location.pathname+location.search)}
  const s=session();if(s?.access_token)currentUser=await fetchUser(s.access_token);
  if(currentUser)persistProviderSnapshot();
  enhanceHeader();renderEntry();
  if(currentUser&&!profileComplete())setTimeout(()=>openProfileSetup(true),140);
}
function enhanceHeader(){const status=document.querySelector('.appTopbar .aiStatus');if(!status)return;if(status.dataset.authReady==='1')return;status.dataset.authReady='1';status.className='authEntry';status.innerHTML='';status.type='button';status.addEventListener('click',e=>{e.preventDefault();closeMenu();if(currentUser)openAccountMenu(status);else openLogin()});renderEntry(status)}
function renderEntry(button=document.querySelector('.appTopbar .authEntry')){if(!button)return;if(currentUser){const name=displayName();button.innerHTML=`<span class="authAvatar">${initials(name).toUpperCase()}</span><span>${escapeHtml(name.length>18?name.slice(0,16)+'…':name)}</span>`}else button.innerHTML='<span class="authAvatar">👤</span><span>Giriş Yap</span>'}
function modalShell(title,description,content){closeBackdrop();const wrap=document.createElement('div');wrap.className='authBackdrop';wrap.innerHTML=`<section class="authModal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><button class="authClose" type="button" aria-label="Kapat">×</button><div class="authHead"><h2>${title}</h2><p>${description}</p></div>${content}</section>`;document.body.appendChild(wrap);wrap.querySelector('.authClose').onclick=closeBackdrop;wrap.addEventListener('click',e=>{if(e.target===wrap)closeBackdrop()});return wrap}
function providerButton(provider,label,icon){return`<button class="authProvider" type="button" data-provider="${provider}" aria-label="${label}"><span class="authProviderIcon">${icon}</span><span class="authProviderLabel">${label}</span></button>`}
function openLogin(){const wrap=modalShell('Neşevren’e giriş yap','Hesabınla giriş yaptığında öğrenme geçmişin ve kişisel profilin aynı kullanıcıyla eşleştirilir.',`<div class="authProviders">${providerButton('google','Google ile devam et',GOOGLE_ICON)}${providerButton('apple','Apple ile devam et',APPLE_ICON)}</div><div id="authMsg" aria-live="polite"></div>`);wrap.querySelectorAll('[data-provider]').forEach(btn=>btn.addEventListener('click',()=>startOAuth(btn.dataset.provider,wrap)))}
function startOAuth(provider,wrap){if(!configured){setMsg(wrap,unavailableMessage(),true);return}const redirect=location.origin+location.pathname;location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirect)}`)}
function setMsg(wrap,text,isError=false){const el=wrap.querySelector('#authMsg');if(!el)return;el.className=`authMessage${isError?' error':''}`;el.textContent=text}

function option(value,label,selectedValue){return`<option value="${escapeHtml(value)}" ${String(value)===String(selectedValue)?'selected':''}>${escapeHtml(label)}</option>`}
function studentFields(p={}){return `<div class="authField"><label for="profileGrade">Sınıf / seviye</label><select id="profileGrade" name="grade" required><option value="">Seç</option>${STUDENT_GRADES.map(g=>option(g,/^\d+$/.test(g)?`${g}. Sınıf`:g,p.grade||p.detail)).join('')}</select></div>`}
function teacherBranchOptions(level,selected){const branches=TEACHER_BRANCHES[level]||[];return `<option value="">Branş seç</option>${branches.map(branch=>option(branch,branch,selected)).join('')}`}
function teacherFields(p={}){
  const level=TEACHER_LEVELS.some(([id])=>id===p.educationLevel)?p.educationLevel:'primary';
  return `<div class="authField"><label for="profileEducationLevel">Görev seviyesi</label><select id="profileEducationLevel" name="educationLevel" required>${TEACHER_LEVELS.map(([id,label])=>option(id,label,level)).join('')}</select></div><div class="authField"><label for="profileBranch">Branş</label><select id="profileBranch" name="branch" required>${teacherBranchOptions(level,p.branch||p.detail)}</select></div>`;
}
function roleFields(role,p={}){return role==='teacher'?teacherFields(p):studentFields(p)}
function accountSummary(){
  const account=providerAccount();const rows=[];
  if(account.name)rows.push(['Ad',account.name]);
  if(account.email)rows.push(['E-posta',account.email]);
  if(account.phone)rows.push(['Telefon',account.phone]);
  if(account.birthDate)rows.push(['Doğum tarihi',account.birthDate]);
  if(!rows.length)return'';
  return `<section class="authAccountSummary"><div><strong>Hesap bilgilerin</strong><small>Google/Apple’dan gelen bilgiler otomatik kaydedilir.</small></div>${rows.map(([label,value])=>`<p><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></p>`).join('')}</section>`;
}
function bindTeacherLevel(wrap,p){const level=wrap.querySelector('#profileEducationLevel');const branch=wrap.querySelector('#profileBranch');if(!level||!branch)return;level.onchange=()=>{branch.innerHTML=teacherBranchOptions(level.value,'')}}
async function openProfileSetup(isFirstSetup=false){
  if(!currentUser){openLogin();return}
  persistProviderSnapshot();
  const p=profile()||{};let selected=p.role==='teacher'?'teacher':'student';
  const wrap=modalShell('Profilini tamamla',isFirstSetup?'Hesap bilgilerini tekrar istemiyoruz. Sadece Neşevren’de nasıl kullanacağını seç.':'Profilindeki eğitim bilgilerini düzenleyebilirsin.',`${accountSummary()}<form class="authProfileForm" id="profileForm"><div><div class="authField"><label>Rolün</label></div><div class="authRoleGrid"><button type="button" data-role="student" class="${selected==='student'?'active':''}">🎓 Öğrenci</button><button type="button" data-role="teacher" class="${selected==='teacher'?'active':''}">👩‍🏫 Öğretmen</button></div></div><div id="roleDetails">${roleFields(selected,p)}</div><div id="profileMsg" class="authProfileMessage" aria-live="polite"></div><button class="authPrimary" type="submit">Profili Kaydet</button></form>`);
  const refreshDetails=()=>{wrap.querySelector('#roleDetails').innerHTML=roleFields(selected,p);if(selected==='teacher')bindTeacherLevel(wrap,p)};
  if(selected==='teacher')bindTeacherLevel(wrap,p);
  wrap.querySelectorAll('[data-role]').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.role;wrap.querySelectorAll('[data-role]').forEach(x=>x.classList.toggle('active',x===btn));refreshDetails()});
  wrap.querySelector('#profileForm').onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);const account=providerAccount();const submit=form.querySelector('button[type="submit"]');const msg=form.querySelector('#profileMsg');
    const now=Date.now();
    const next={profileVersion:PROFILE_VERSION,userId:currentUser.id,...account,account,name:account.name||p.name||'Kullanıcı',email:account.email||p.email||'',phone:account.phone||p.phone||'',birthDate:account.birthDate||p.birthDate||'',avatarUrl:account.avatarUrl||p.avatarUrl||'',role:selected,createdAt:p.createdAt||now,updatedAt:now};
    if(selected==='student')next.grade=String(fd.get('grade')||'').trim();
    else{next.educationLevel=String(fd.get('educationLevel')||'').trim();next.branch=String(fd.get('branch')||'').trim()}
    if(!profileComplete(next)){msg.className='authProfileMessage error';msg.textContent=selected==='student'?'Lütfen sınıf / seviyeni seç.':'Lütfen görev seviyeni ve branşını seç.';return}
    submit.disabled=true;submit.textContent='Kaydediliyor…';msg.className='authProfileMessage';msg.textContent='';
    writeJson(PROFILE_KEY,next);const synced=await saveRemoteProfile(next);renderEntry();document.dispatchEvent(new CustomEvent('nesevren:profile-updated',{detail:next}));
    if(synced||!configured){closeBackdrop()}else{msg.className='authProfileMessage notice';msg.textContent='Profil bu cihazda kaydedildi. Bulut eşitlemesi şu anda tamamlanamadı.';submit.disabled=false;submit.textContent='Profili Kaydet'}
  };
}
function openAccountMenu(button){closeMenu();const rect=button.getBoundingClientRect();menuEl=document.createElement('div');menuEl.className='authMenu';menuEl.style.top=`${Math.min(innerHeight-210,rect.bottom+8)}px`;menuEl.style.right=`${Math.max(10,innerWidth-rect.right)}px`;menuEl.innerHTML=`<button data-action="profile">👤 Profilim</button><button data-action="errors">📕 Hata Kitapçığım</button><button data-action="level">🎯 Seviye sonuçlarım</button><button class="danger" data-action="logout">Çıkış yap</button>`;document.body.appendChild(menuEl);menuEl.querySelector('[data-action="profile"]').onclick=()=>{closeMenu();openProfileSetup(false)};menuEl.querySelector('[data-action="errors"]').onclick=()=>{closeMenu();[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Hata Kitapçığı'))?.click()};menuEl.querySelector('[data-action="level"]').onclick=()=>{closeMenu();[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Seviyemi Belirle'))?.click()};menuEl.querySelector('[data-action="logout"]').onclick=logout}
function logout(){closeMenu();currentUser=null;removeKey(SESSION_KEY);removeKey(PROFILE_KEY);renderEntry()}

document.addEventListener('click',e=>{if(menuEl&&!menuEl.contains(e.target)&&!e.target.closest?.('.authEntry'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBackdrop()});
const observer=new MutationObserver(enhanceHeader);observer.observe(document.documentElement,{childList:true,subtree:true});
restore();