import { buildFamilyReport } from "./family-report-core.ts";

const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||"").trim().replace(/\/+$/g,"");
const SUPABASE_ANON_KEY=(import.meta.env.VITE_SUPABASE_ANON_KEY||"").trim();
const SESSION_KEY="nesevren-auth-session-v1";
const USER_PROFILE_KEY="nesevren-user-profile-v1";
const configured=Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY);
let root=null;
let auth=null;
let selectedTab="student";

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function profile(){return readJson(USER_PROFILE_KEY,{})||{}}
function session(){return readJson(SESSION_KEY,null)}
function headers(token,extra={}){return{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,...extra}}
function escapeHtml(value=""){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
function formatDate(value){if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("tr-TR",{day:"2-digit",month:"short",year:"numeric"})}
function formatNet(value){return value===null||value===undefined?"—":String(Math.round(Number(value)*100)/100)}
function close(){if(root)root.hidden=true;document.body.style.overflow=""}
function message(text,error=false){const el=root?.querySelector("#familyMessage");if(!el)return;el.className=error?"familyMessage error":"familyMessage";el.textContent=text}

async function refreshSession(current){
  if(!current?.refresh_token)return current;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},body:JSON.stringify({refresh_token:current.refresh_token})});
  if(!response.ok)return current;
  const data=await response.json().catch(()=>null);
  if(!data?.access_token)return current;
  const next={access_token:data.access_token,refresh_token:data.refresh_token||current.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000};
  writeJson(SESSION_KEY,next);
  return next;
}

async function authenticate(){
  if(!configured)return null;
  let current=session();
  if(!current?.access_token)return null;
  if(Number(current.expires_at||0)<Date.now()+30000)current=await refreshSession(current);
  let response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:headers(current.access_token)});
  if(response.status===401&&current.refresh_token){current=await refreshSession(current);response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:headers(current.access_token)})}
  if(!response.ok)return null;
  return{user:await response.json(),token:current.access_token};
}

async function rest(path,options={}){
  if(!auth)throw new Error("Önce hesabına giriş yapmalısın.");
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:headers(auth.token,options.headers||{})});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.hint||data?.details||"Aile merkezi işlemi tamamlanamadı.");
  return data;
}

function localOwnSnapshot(){
  const performance=readJson("nesevren-performance-records",[]);
  const errors=readJson("nesevren-error-book",[]);
  const tasks=readJson("nesevren-coach-tasks",[]);
  const checkins=readJson("nesevren-coach-checkins",[]);
  const coachProfile=readJson("nesevren-coach-profile",null);
  return{
    assessment:readJson("nesevren-assessment",null),
    errorBook:Array.isArray(errors)?errors:[],
    performance:Array.isArray(performance)?performance:[],
    coachData:{profile:coachProfile,tasks:Array.isArray(tasks)?tasks:[],checkins:Array.isArray(checkins)?checkins:[],updatedAt:Number(localStorage.getItem("nesevren-coach-sync-version")||0)},
  };
}

function reportMarkup(name,snapshot){
  const report=buildFamilyReport(snapshot);
  const trendText=report.trend==="up"?"Yükseliyor ↑":report.trend==="down"?"Düşüş var ↓":report.trend==="stable"?"Dengeli →":"Veri bekleniyor";
  const delta=report.netChange===null?"—":`${report.netChange>0?"+":""}${report.netChange}`;
  const weak=report.weakAreas.length?report.weakAreas.map(item=>`<span>${escapeHtml(item)}</span>`).join(""):"<em>Belirgin bir zayıf alan henüz oluşmadı.</em>";
  return `<section class="familyReportCard">
    <div class="familyReportHead"><div><small>ÖĞRENCİ GELİŞİM ÖZETİ</small><h3>${escapeHtml(name||"Öğrenci")}</h3></div><span class="familyTrend ${report.trend}">${trendText}</span></div>
    <div class="familyStats">
      <div><strong>${report.assessmentPercent===null?"—":`%${report.assessmentPercent}`}</strong><span>Seviye başarısı</span></div>
      <div><strong>${formatNet(report.latestNet)}</strong><span>Son deneme neti</span></div>
      <div><strong>${delta}</strong><span>Net değişimi</span></div>
      <div><strong>${report.studyMinutes7d} dk</strong><span>7 günlük çalışma</span></div>
      <div><strong>${report.averageFocus7d===null?"—":`${report.averageFocus7d}/5`}</strong><span>Ortalama odak</span></div>
      <div><strong>${report.unresolvedErrorCount}</strong><span>Açık hata</span></div>
    </div>
    <div class="familyProgressRows">
      <div><span>Seviye</span><b>${escapeHtml(report.level)}</b></div>
      <div><span>Görevler</span><b>${report.completedTaskCount} tamam · ${report.openTaskCount} açık</b></div>
      <div><span>Hata Kitapçığı</span><b>${report.errorCount} kayıt</b></div>
    </div>
    <div class="familyWeak"><strong>Öncelikli alanlar</strong><div>${weak}</div></div>
    <div class="familyParentTip"><b>💬 Veliye öneri</b><p>${escapeHtml(report.parentMessage)}</p></div>
  </section>`;
}

function randomCode(){
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);
  return [...bytes].map(v=>alphabet[v%alphabet.length]).join("");
}

async function fetchLinks(mode){
  const field=mode==="parent"?"parent_id":"student_id";
  return await rest(`nesevren_family_links?select=id,student_id,parent_id,student_name,status,created_at,updated_at&${field}=eq.${encodeURIComponent(auth.user.id)}&order=created_at.desc`);
}

async function fetchOwnInvite(){
  const rows=await rest(`nesevren_family_invites?select=id,code,active,expires_at,created_at&student_id=eq.${encodeURIComponent(auth.user.id)}&active=eq.true&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1`);
  return Array.isArray(rows)?rows[0]??null:null;
}

async function generateInvite(){
  await rest(`nesevren_family_invites?student_id=eq.${encodeURIComponent(auth.user.id)}&active=eq.true`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:false})}).catch(()=>null);
  const studentName=profile()?.name||auth.user.user_metadata?.full_name||auth.user.email||"Öğrenci";
  for(let attempt=0;attempt<3;attempt++){
    const code=randomCode();
    try{
      await rest("nesevren_family_invites",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([{student_id:auth.user.id,student_name:studentName,code,active:true,expires_at:new Date(Date.now()+24*60*60*1000).toISOString()}])});
      return code;
    }catch(error){if(attempt===2)throw error}
  }
  throw new Error("Bağlantı kodu oluşturulamadı.");
}

async function claimCode(code){
  const normalized=String(code||"").trim().toUpperCase();
  if(normalized.length<6)throw new Error("Öğrencinin verdiği bağlantı kodunu yazın.");
  await rest("rpc/nesevren_claim_family_code",{method:"POST",body:JSON.stringify({p_code:normalized})});
}

async function revokeLink(id){
  await rest(`nesevren_family_links?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"revoked",updated_at:new Date().toISOString()})});
}

async function fetchStudentSnapshot(studentId){
  const rows=await rest(`nesevren_learning_data?select=user_id,assessment,error_book,performance,coach_data,updated_at&user_id=eq.${encodeURIComponent(studentId)}&limit=1`);
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row)return{assessment:null,errorBook:[],performance:[],coachData:null};
  return{assessment:row.assessment??null,errorBook:Array.isArray(row.error_book)?row.error_book:[],performance:Array.isArray(row.performance)?row.performance:[],coachData:row.coach_data&&typeof row.coach_data==="object"?row.coach_data:null};
}

function shell(){
  if(root)return root;
  root=document.createElement("div");
  root.className="familyBackdrop";
  root.hidden=true;
  root.innerHTML=`<section class="familyHub" role="dialog" aria-modal="true" aria-labelledby="familyTitle">
    <header class="familyTop"><div><small>9. BÖLÜM · AİLE TAKİP MERKEZİ</small><h2 id="familyTitle">Aile & Veli Merkezi</h2><p>Öğrenci onayıyla seviye, hata, deneme ve çalışma gelişimini güvenli biçimde birlikte takip edin.</p></div><button class="familyClose" type="button" aria-label="Kapat">×</button></header>
    <div class="familyBody">
      <div class="familyTabs"><button data-family-tab="student" type="button">🎓 Öğrenciyim</button><button data-family-tab="parent" type="button">👨‍👩‍👧 Veliyim</button></div>
      <div id="familyPanel"></div>
      <div id="familyMessage"></div>
    </div>
  </section>`;
  document.body.appendChild(root);
  root.querySelector(".familyClose")?.addEventListener("click",close);
  root.addEventListener("click",event=>{if(event.target===root)close()});
  root.addEventListener("keydown",event=>{if(event.key==="Escape")close()});
  root.querySelectorAll("[data-family-tab]").forEach(button=>button.addEventListener("click",()=>{selectedTab=button.dataset.familyTab;render()}));
  return root;
}

async function renderStudent(){
  const panel=root.querySelector("#familyPanel");
  panel.innerHTML='<div class="familyLoading">Aile bağlantıları hazırlanıyor…</div>';
  try{
    const [invite,links]=await Promise.all([fetchOwnInvite(),fetchLinks("student")]);
    const activeLinks=(Array.isArray(links)?links:[]).filter(item=>item.status==="active");
    const code=invite?.code||"";
    panel.innerHTML=`<section class="familySection familyShare"><div><small>VELİ ERİŞİMİ</small><h3>Öğrenme gelişimimi velimle paylaş</h3><p>Bu kod yalnızca 24 saat geçerlidir. Veli kodu kullandığında yalnızca eğitim gelişim özetini okuyabilir; senin adına veri değiştiremez.</p></div><div class="familyCodeBox"><strong id="familyCode">${escapeHtml(code||"Kod oluştur")}</strong><button id="familyGenerateCode" class="familyPrimary" type="button">${code?"Yeni kod oluştur":"Kod oluştur"}</button></div></section>
      <section class="familySection"><div class="familySectionHead"><h3>Bağlı veliler</h3><small>${activeLinks.length} aktif bağlantı</small></div><div id="familyLinks">${activeLinks.length?activeLinks.map(item=>`<div class="familyLinkRow"><span>👨‍👩‍👧</span><div><strong>Bağlı veli hesabı</strong><small>${formatDate(item.created_at)} tarihinden beri erişebilir.</small></div><button data-revoke="${escapeHtml(item.id)}" type="button">Erişimi kaldır</button></div>`).join(""):"<div class=\"familyEmpty\">Henüz bağlı veli yok.</div>"}</div></section>
      ${reportMarkup(profile()?.name||"Öğrenci",localOwnSnapshot())}`;
    root.querySelector("#familyGenerateCode")?.addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;try{const next=await generateInvite();root.querySelector("#familyCode").textContent=next;button.textContent="Yeni kod oluştur";message("Yeni veli bağlantı kodu oluşturuldu. 24 saat içinde kullanılabilir.")}catch(error){message(error instanceof Error?error.message:"Kod oluşturulamadı.",true)}finally{button.disabled=false}});
    root.querySelectorAll("[data-revoke]").forEach(button=>button.addEventListener("click",async()=>{button.disabled=true;try{await revokeLink(button.dataset.revoke);message("Veli erişimi kaldırıldı.");await renderStudent()}catch(error){message(error instanceof Error?error.message:"Erişim kaldırılamadı.",true);button.disabled=false}}));
  }catch(error){panel.innerHTML=`<div class="familyError">${escapeHtml(error instanceof Error?error.message:"Aile bağlantıları yüklenemedi.")}</div>`}
}

async function showChildReport(link){
  const panel=root.querySelector("#familyPanel");
  const reportArea=panel.querySelector("#familyChildReport");
  if(!reportArea)return;
  reportArea.innerHTML='<div class="familyLoading">Öğrencinin güncel gelişim özeti hazırlanıyor…</div>';
  try{const snapshot=await fetchStudentSnapshot(link.student_id);reportArea.innerHTML=reportMarkup(link.student_name||"Öğrenci",snapshot)}catch(error){reportArea.innerHTML=`<div class="familyError">${escapeHtml(error instanceof Error?error.message:"Öğrenci raporu okunamadı.")}</div>`}
}

async function renderParent(){
  const panel=root.querySelector("#familyPanel");
  panel.innerHTML='<div class="familyLoading">Veli bağlantıları hazırlanıyor…</div>';
  try{
    const links=(await fetchLinks("parent")).filter(item=>item.status==="active");
    panel.innerHTML=`<section class="familySection familyClaim"><div><small>ÖĞRENCİ BAĞLANTISI</small><h3>Öğrencimin kodunu bağla</h3><p>Öğrencinin Aile Merkezi'nden oluşturduğu 8 karakterli kodu girin. Bağlantı öğrenci tarafından her zaman kaldırılabilir.</p></div><div class="familyClaimForm"><input id="familyClaimCode" maxlength="8" autocomplete="off" placeholder="Örn. N7K4P2RX"/><button id="familyClaimButton" class="familyPrimary" type="button">Bağla</button></div></section>
      <section class="familySection"><div class="familySectionHead"><h3>Öğrencilerim</h3><small>${links.length} aktif bağlantı</small></div><div class="familyChildren">${links.length?links.map((item,index)=>`<button class="familyChild" data-child="${index}" type="button"><span>🎓</span><div><strong>${escapeHtml(item.student_name||"Öğrenci")}</strong><small>Gelişim raporunu aç</small></div><b>›</b></button>`).join(""):"<div class=\"familyEmpty\">Henüz bir öğrenci hesabı bağlanmadı.</div>"}</div></section><div id="familyChildReport"></div>`;
    root.querySelector("#familyClaimButton")?.addEventListener("click",async event=>{const button=event.currentTarget;const input=root.querySelector("#familyClaimCode");button.disabled=true;try{await claimCode(input.value);input.value="";message("Öğrenci hesabı başarıyla bağlandı.");await renderParent()}catch(error){message(error instanceof Error?error.message:"Kod bağlanamadı.",true)}finally{button.disabled=false}});
    root.querySelectorAll("[data-child]").forEach(button=>button.addEventListener("click",()=>showChildReport(links[Number(button.dataset.child)])));
    if(links[0])await showChildReport(links[0]);
  }catch(error){panel.innerHTML=`<div class="familyError">${escapeHtml(error instanceof Error?error.message:"Veli merkezi yüklenemedi.")}</div>`}
}

async function render(){
  if(!root)return;
  root.querySelectorAll("[data-family-tab]").forEach(button=>button.classList.toggle("active",button.dataset.familyTab===selectedTab));
  const panel=root.querySelector("#familyPanel");
  if(!configured){panel.innerHTML='<div class="familyError">Aile Merkezi için Supabase bağlantı bilgileri yapılandırılmalı.</div>';return}
  auth=await authenticate();
  if(!auth){panel.innerHTML='<div class="familyEmpty"><strong>Önce giriş yapın</strong><p>Aile bağlantıları kişisel eğitim verisi içerdiği için hesap girişi zorunludur.</p></div>';return}
  if(selectedTab==="parent")await renderParent();else await renderStudent();
}

async function open(){
  shell();
  selectedTab=profile()?.role==="parent"?"parent":"student";
  root.hidden=false;document.body.style.overflow="hidden";message("");
  await render();
  setTimeout(()=>root.querySelector(".familyClose")?.focus(),20);
}

window.NesevrenFamilyHub={open,close};
window.addEventListener("nesevren-open-family-hub",open);
