import { rankMentors } from "./mentor-matching-core.ts";

const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||"").trim().replace(/\/+$/g,"");
const SUPABASE_ANON_KEY=(import.meta.env.VITE_SUPABASE_ANON_KEY||"").trim();
const SESSION_KEY="nesevren-auth-session-v1";
const USER_PROFILE_KEY="nesevren-user-profile-v1";
const COACH_PROFILE_KEY="nesevren-coach-profile";
const configured=Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY);
const levels=["1","2","3","4","5","6","7","8","9","10","11","12","LGS","TYT","AYT","KPSS","ALES"];
const subjects=["Genel","Matematik","Fen Bilimleri","Fizik","Kimya","Biyoloji","Türkçe","Türk Dili ve Edebiyatı","İngilizce","Kürtçe","Arapça","Sosyal Bilgiler","Tarih","Coğrafya","Felsefe"];
let activeMatches=[];
let activeAuth=null;

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function levelLabel(value){return /^\d+$/.test(String(value))?`${value}. sınıf`:String(value||"")}
function authHeaders(token,extra={}){return{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,...extra}}
function localUserProfile(){return readJson(USER_PROFILE_KEY,{})||{}}
function coachProfile(){return readJson(COACH_PROFILE_KEY,{})||{}}
function session(){return readJson(SESSION_KEY,null)}
function escapeStatic(value){return String(value??"").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}

async function refreshSession(current){
  if(!configured||!current?.refresh_token)return current;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},body:JSON.stringify({refresh_token:current.refresh_token})});
  if(!response.ok)return current;
  const data=await response.json().catch(()=>null);
  if(!data?.access_token)return current;
  const next={access_token:data.access_token,refresh_token:data.refresh_token||current.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000};
  writeJson(SESSION_KEY,next);
  return next;
}

async function authContext(){
  if(!configured)return null;
  let current=session();
  if(!current?.access_token)return null;
  if(Number(current.expires_at||0)<Date.now()+30000)current=await refreshSession(current);
  let response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token)});
  if(response.status===401&&current.refresh_token){current=await refreshSession(current);response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token)})}
  if(!response.ok)return null;
  return{user:await response.json(),token:current.access_token};
}

async function rest(path,{method="GET",body,prefer}={}){
  if(!activeAuth?.token)throw new Error("Önce hesabınla giriş yapmalısın.");
  const headers=authHeaders(activeAuth.token,prefer?{"Prefer":prefer}:{});
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const data=response.status===204?null:await response.json().catch(()=>null);
  if(response.status===404||data?.code==="PGRST205")throw new Error("Canlı mentor tabloları henüz Supabase'de kurulmadı.");
  if(!response.ok)throw new Error(data?.message||data?.hint||"Canlı eşleştirme işlemi tamamlanamadı.");
  return data;
}

function createShell(){
  document.getElementById("mentorBackdrop")?.remove();
  const wrap=document.createElement("div");
  wrap.id="mentorBackdrop";
  wrap.className="mentorBackdrop";
  wrap.innerHTML=`<section class="mentorHub" role="dialog" aria-modal="true" aria-labelledby="mentorTitle">
    <header class="mentorTop"><div><small>CANLI DESTEK AĞI</small><h2 id="mentorTitle">Öğretmen · Koç · Mentor</h2><p>İhtiyacını belirle, uygun gerçek eğitmenlerle eşleş ve talebini takip et.</p></div><button class="mentorClose" type="button" aria-label="Kapat">×</button></header>
    <div id="mentorBody" class="mentorBody"><div class="mentorLoading">Canlı eşleştirme merkezi hazırlanıyor…</div></div>
  </section>`;
  document.body.appendChild(wrap);
  wrap.querySelector(".mentorClose")?.addEventListener("click",closeMentorHub);
  wrap.addEventListener("click",event=>{if(event.target===wrap)closeMentorHub()});
  return wrap;
}
function closeMentorHub(){document.getElementById("mentorBackdrop")?.remove();document.body.style.overflow=""}
function message(root,text,error=false){const old=root.querySelector(".mentorMessage");old?.remove();const el=document.createElement("div");el.className=`mentorMessage${error?" error":""}`;el.textContent=text;root.prepend(el);setTimeout(()=>el.isConnected&&el.remove(),3800)}

function loginRequired(root){
  root.innerHTML=`<section class="mentorEmpty"><span>🔐</span><h3>Canlı eşleştirme için giriş gerekli</h3><p>Talebin ve görüşme durumun yalnızca kendi hesabında tutulur.</p><button id="mentorLogin" class="mentorPrimary" type="button">Giriş Yap</button></section>`;
  root.querySelector("#mentorLogin")?.addEventListener("click",()=>{closeMentorHub();document.querySelector(".authEntry")?.click()});
}

function studentFormHtml(){
  const coach=coachProfile();
  const user=localUserProfile();
  const suggestedLevel=String(coach.level||user.detail||"8").match(/LGS|TYT|AYT|KPSS|ALES|\b(?:[1-9]|1[0-2])\b/i)?.[0]?.toUpperCase()||"8";
  return `<section class="mentorHero"><div><span>🤝</span></div><div><h3>Doğru insan desteğini bul</h3><p>Branş öğretmeni, akademik koç veya uzun dönem mentor seç. Sistem uygunluk puanına göre en iyi adayları öne çıkarır.</p></div></section>
  <section class="mentorSection"><div class="mentorSectionHead"><h3>1. İhtiyacını belirt</h3><small>Önce eşleşme kriterlerini belirle</small></div><div class="mentorGrid">
    <label>Destek türü<select id="mentorSupportType"><option>Branş Öğretmeni</option><option>Akademik Koç</option><option>Mentor</option></select></label>
    <label>Ders<select id="mentorSubject">${subjects.map(s=>`<option${s==="Matematik"?" selected":""}>${escapeStatic(s)}</option>`).join("")}</select></label>
    <label>Sınıf / sınav<select id="mentorLevel">${levels.map(l=>`<option value="${l}"${l===suggestedLevel?" selected":""}>${escapeStatic(levelLabel(l))}</option>`).join("")}</select></label>
    <label>Görüşme biçimi<select id="mentorMode"><option>Online</option><option>Yüz yüze</option></select></label>
    <label id="mentorCityField" class="mentorFull" hidden>Şehir<input id="mentorCity" placeholder="Örn. Diyarbakır" /></label>
    <label class="mentorFull">Tercih edilen zaman<input id="mentorPreferredTime" placeholder="Örn. Hafta içi 19.00 sonrası" /></label>
    <label class="mentorFull">Destek notun<textarea id="mentorNeedNote" placeholder="Hedefini ve özellikle hangi konuda destek istediğini kısaca yaz."></textarea></label>
  </div><button id="mentorFind" class="mentorPrimary" type="button">Uygun Kişileri Bul</button></section>
  <section id="mentorMatchesSection" class="mentorSection" hidden><div class="mentorSectionHead"><h3>2. En uygun eşleşmeler</h3><small id="mentorMatchCount"></small></div><div id="mentorMatches" class="mentorMatches"></div></section>
  <section class="mentorSection"><div class="mentorSectionHead"><h3>Talep geçmişim</h3><small>Durumu buradan takip et</small></div><div id="mentorRequests" class="mentorRequests"><div class="mentorLoading">Talepler yükleniyor…</div></div></section>`;
}

function teacherHtml(){
  return `<section class="mentorHero"><div><span>👩‍🏫</span></div><div><h3>Eğitmen merkezim</h3><p>Uzmanlık profilini oluştur, yönetici onayından sonra uygun öğrenci talepleriyle eşleş.</p></div></section>
  <section class="mentorSection"><div class="mentorSectionHead"><h3>Eğitmen profilim</h3><small id="mentorApprovalState">Durum kontrol ediliyor…</small></div><div class="mentorGrid">
    <label>Görünen ad<input id="mentorDisplayName" placeholder="Ad Soyad / Öğretmen adı" /></label>
    <label>Deneyim (yıl)<input id="mentorExperience" type="number" min="0" max="60" value="0" /></label>
    <fieldset class="mentorFull"><legend>Hizmet türleri</legend><div class="mentorChecks"><label><input type="checkbox" name="supportType" value="Branş Öğretmeni"/> Branş Öğretmeni</label><label><input type="checkbox" name="supportType" value="Akademik Koç"/> Akademik Koç</label><label><input type="checkbox" name="supportType" value="Mentor"/> Mentor</label></div></fieldset>
    <label class="mentorFull">Branşlar / dersler<input id="mentorSubjects" placeholder="Matematik, Fizik, İngilizce" /></label>
    <label class="mentorFull">Çalıştığım seviyeler<input id="mentorLevels" placeholder="8, LGS, TYT, AYT" /></label>
    <fieldset class="mentorFull"><legend>Görüşme biçimi</legend><div class="mentorChecks"><label><input type="checkbox" name="mode" value="Online"/> Online</label><label><input type="checkbox" name="mode" value="Yüz yüze"/> Yüz yüze</label></div></fieldset>
    <label>Şehir<input id="mentorTeacherCity" placeholder="Yüz yüze için şehir" /></label>
    <label>Profil aktif<select id="mentorActive"><option value="true">Evet</option><option value="false">Hayır</option></select></label>
    <label class="mentorFull">Kısa tanıtım<textarea id="mentorBio" placeholder="Deneyimin, yaklaşımın, sınav/öğrenci grupların..."></textarea></label>
  </div><button id="mentorSaveProfile" class="mentorPrimary" type="button">Eğitmen Profilini Kaydet</button></section>
  <section class="mentorSection"><div class="mentorSectionHead"><h3>Bana gelen talepler</h3><small>Eşleşen öğrenciler</small></div><div id="mentorAssignedRequests" class="mentorRequests"><div class="mentorLoading">Talepler yükleniyor…</div></div></section>`;
}

function needFromForm(root){return{supportType:root.querySelector("#mentorSupportType").value,subject:root.querySelector("#mentorSubject").value,level:root.querySelector("#mentorLevel").value,mode:root.querySelector("#mentorMode").value,city:root.querySelector("#mentorCity")?.value.trim()||"",preferredTime:root.querySelector("#mentorPreferredTime")?.value.trim()||"",note:root.querySelector("#mentorNeedNote")?.value.trim()||""}}
function mapMentor(row){return{userId:row.user_id,displayName:row.display_name||"Eğitmen",supportTypes:Array.isArray(row.support_types)?row.support_types:[],subjects:Array.isArray(row.subjects)?row.subjects:[],levels:Array.isArray(row.levels)?row.levels:[],modes:Array.isArray(row.modes)?row.modes:[],city:row.city||"",bio:row.bio||"",experienceYears:Number(row.experience_years)||0,active:row.active!==false}}

async function findMatches(root){
  const need=needFromForm(root);
  if(need.mode==="Yüz yüze"&&!need.city){message(root,"Yüz yüze eşleşme için şehir bilgisini yaz.",true);return}
  const button=root.querySelector("#mentorFind");button.disabled=true;button.textContent="Eşleşmeler aranıyor…";
  try{
    const approvals=await rest("nesevren_mentor_approvals?select=user_id&approved=eq.true");
    const approvedIds=new Set((Array.isArray(approvals)?approvals:[]).map(row=>row.user_id));
    const profiles=await rest("nesevren_mentor_profiles?select=user_id,display_name,support_types,subjects,levels,modes,city,bio,experience_years,active&active=eq.true");
    const mentors=(Array.isArray(profiles)?profiles:[]).filter(row=>approvedIds.has(row.user_id)).map(mapMentor);
    activeMatches=rankMentors(mentors,need,5);
    renderMatches(root,need);
  }catch(error){message(root,error instanceof Error?error.message:"Eşleşmeler alınamadı.",true)}
  finally{button.disabled=false;button.textContent="Uygun Kişileri Bul"}
}

function renderMatches(root,need){
  const section=root.querySelector("#mentorMatchesSection");const container=root.querySelector("#mentorMatches");section.hidden=false;container.textContent="";
  root.querySelector("#mentorMatchCount").textContent=activeMatches.length?`${activeMatches.length} uygun aday`:"Henüz uygun aday yok";
  if(!activeMatches.length){const empty=document.createElement("div");empty.className="mentorEmpty compact";empty.innerHTML="<span>🕓</span><h3>Doğrulanmış uygun eğitmen bulunamadı</h3><p>Talebini eşleştirme havuzuna bırakabilirsin; uygun eğitmen eklendiğinde yönetim tarafından eşleştirilebilir.</p>";const btn=document.createElement("button");btn.className="mentorSecondary";btn.textContent="Talebi Havuza Bırak";btn.addEventListener("click",()=>createRequest(root,need,null));empty.appendChild(btn);container.appendChild(empty);return}
  activeMatches.forEach((match,index)=>{const card=document.createElement("article");card.className="mentorCard";const top=document.createElement("div");top.className="mentorCardTop";const who=document.createElement("div");const name=document.createElement("strong");name.textContent=match.mentor.displayName;const meta=document.createElement("small");meta.textContent=`${match.mentor.experienceYears||0} yıl deneyim · ${match.mentor.modes.join(" / ")}`;who.append(name,meta);const score=document.createElement("b");score.textContent=`%${match.score} uyum`;top.append(who,score);const bio=document.createElement("p");bio.textContent=match.mentor.bio||"Neşevren doğrulanmış eğitmen profili.";const tags=document.createElement("div");tags.className="mentorTags";match.reasons.slice(0,4).forEach(reason=>{const tag=document.createElement("span");tag.textContent=reason;tags.appendChild(tag)});const btn=document.createElement("button");btn.type="button";btn.className=index===0?"mentorPrimary":"mentorSecondary";btn.textContent=index===0?"En Uygun Kişiye Talep Gönder":"Bu Kişiye Talep Gönder";btn.addEventListener("click",()=>createRequest(root,need,match.mentor));card.append(top,bio,tags,btn);container.appendChild(card)})
}

function requestSnapshot(){const assessment=readJson("nesevren-assessment",null);const errors=readJson("nesevren-error-book",[]);const performance=readJson("nesevren-performance-records",[]);return{assessment:assessment?{subject:assessment.subject,grade:assessment.grade,score:assessment.score,total:assessment.total,level:assessment.level,weakTopics:assessment.weakTopics}:null,errorCount:Array.isArray(errors)?errors.length:0,performanceCount:Array.isArray(performance)?performance.length:0,coach:{level:coachProfile().level,goal:coachProfile().goal,weakSubjects:coachProfile().weakSubjects}}}

async function createRequest(root,need,mentor){
  const userProfile=localUserProfile();
  const payload={requester_id:activeAuth.user.id,mentor_id:mentor?.userId||null,requester_name:userProfile.name||coachProfile().name||"Öğrenci",support_type:need.supportType,subject:need.subject,level:need.level,mode:need.mode,city:need.city||null,preferred_time:need.preferredTime||null,note:need.note||null,status:mentor?"matched":"waiting_pool",snapshot:requestSnapshot(),updated_at:new Date().toISOString()};
  try{await rest("nesevren_mentor_requests",{method:"POST",body:payload,prefer:"return=minimal"});message(root,mentor?`${mentor.displayName} için talebin gönderildi.`:"Talebin eşleştirme havuzuna kaydedildi.");await loadStudentRequests(root)}catch(error){message(root,error instanceof Error?error.message:"Talep oluşturulamadı.",true)}
}

const statusLabels={waiting_pool:"Eşleşme bekliyor",matched:"Eğitmene gönderildi",accepted:"Kabul edildi",completed:"Tamamlandı",declined:"Eğitmen uygun değil",cancelled:"İptal edildi"};
async function loadStudentRequests(root){
  const container=root.querySelector("#mentorRequests");if(!container)return;
  try{const rows=await rest(`nesevren_mentor_requests?select=id,mentor_id,support_type,subject,level,mode,city,preferred_time,note,status,mentor_message,created_at&requester_id=eq.${encodeURIComponent(activeAuth.user.id)}&order=created_at.desc&limit=12`);container.textContent="";if(!Array.isArray(rows)||!rows.length){container.innerHTML='<div class="mentorEmpty compact"><span>📭</span><p>Henüz canlı destek talebin yok.</p></div>';return}rows.forEach(row=>{const item=document.createElement("article");item.className="mentorRequest";const head=document.createElement("div");const title=document.createElement("strong");title.textContent=`${row.support_type} · ${row.subject}`;const status=document.createElement("span");status.textContent=statusLabels[row.status]||row.status;status.dataset.status=row.status;head.append(title,status);const meta=document.createElement("small");meta.textContent=`${levelLabel(row.level)} · ${row.mode}${row.preferred_time?` · ${row.preferred_time}`:""}`;item.append(head,meta);if(row.mentor_message){const note=document.createElement("p");note.textContent=`Eğitmen notu: ${row.mentor_message}`;item.appendChild(note)}if(!["completed","cancelled"].includes(row.status)){const cancel=document.createElement("button");cancel.className="mentorTextButton";cancel.textContent="Talebi iptal et";cancel.addEventListener("click",()=>updateStudentRequest(root,row.id,"cancelled"));item.appendChild(cancel)}container.appendChild(item)})}catch(error){container.innerHTML='<div class="mentorError"></div>';container.firstElementChild.textContent=error instanceof Error?error.message:"Talepler yüklenemedi."}
}
async function updateStudentRequest(root,id,status){try{await rest(`nesevren_mentor_requests?id=eq.${encodeURIComponent(id)}&requester_id=eq.${encodeURIComponent(activeAuth.user.id)}`,{method:"PATCH",body:{status,updated_at:new Date().toISOString()},prefer:"return=minimal"});await loadStudentRequests(root)}catch(error){message(root,error instanceof Error?error.message:"Talep güncellenemedi.",true)}}

function csv(value){return String(value||"").split(/[,;|]+/).map(item=>item.trim()).filter(Boolean).slice(0,20)}
async function loadTeacherProfile(root){
  try{
    const rows=await rest(`nesevren_mentor_profiles?select=*&user_id=eq.${encodeURIComponent(activeAuth.user.id)}&limit=1`);const row=Array.isArray(rows)?rows[0]:null;const p=localUserProfile();
    root.querySelector("#mentorDisplayName").value=row?.display_name||p.name||"";root.querySelector("#mentorExperience").value=String(row?.experience_years??0);root.querySelector("#mentorSubjects").value=(row?.subjects||[]).join(", ");root.querySelector("#mentorLevels").value=(row?.levels||[]).join(", ");root.querySelector("#mentorTeacherCity").value=row?.city||"";root.querySelector("#mentorBio").value=row?.bio||"";root.querySelector("#mentorActive").value=String(row?.active!==false);
    root.querySelectorAll('input[name="supportType"]').forEach(input=>input.checked=Array.isArray(row?.support_types)&&row.support_types.includes(input.value));root.querySelectorAll('input[name="mode"]').forEach(input=>input.checked=Array.isArray(row?.modes)&&row.modes.includes(input.value));
    const approvals=await rest(`nesevren_mentor_approvals?select=approved,approved_at&user_id=eq.${encodeURIComponent(activeAuth.user.id)}&limit=1`);const approval=Array.isArray(approvals)?approvals[0]:null;const state=root.querySelector("#mentorApprovalState");state.textContent=approval?.approved?"✓ Doğrulandı ve eşleşmeye açık":"Onay bekliyor";state.classList.toggle("approved",Boolean(approval?.approved));
  }catch(error){message(root,error instanceof Error?error.message:"Eğitmen profili yüklenemedi.",true)}
}
async function saveTeacherProfile(root){
  const supportTypes=[...root.querySelectorAll('input[name="supportType"]:checked')].map(input=>input.value);const modes=[...root.querySelectorAll('input[name="mode"]:checked')].map(input=>input.value);
  if(!supportTypes.length||!modes.length){message(root,"En az bir hizmet türü ve görüşme biçimi seç.",true);return}
  const displayName=root.querySelector("#mentorDisplayName").value.trim();if(!displayName){message(root,"Görünen adını yaz.",true);return}
  const payload={user_id:activeAuth.user.id,display_name:displayName,support_types:supportTypes,subjects:csv(root.querySelector("#mentorSubjects").value),levels:csv(root.querySelector("#mentorLevels").value),modes,city:root.querySelector("#mentorTeacherCity").value.trim()||null,bio:root.querySelector("#mentorBio").value.trim()||null,experience_years:Math.max(0,Number(root.querySelector("#mentorExperience").value)||0),active:root.querySelector("#mentorActive").value==="true",updated_at:new Date().toISOString()};
  try{await rest("nesevren_mentor_profiles?on_conflict=user_id",{method:"POST",body:payload,prefer:"resolution=merge-duplicates,return=minimal"});message(root,"Eğitmen profilin kaydedildi. Doğrulama sonrası eşleşmeler başlayacak.");await loadTeacherProfile(root)}catch(error){message(root,error instanceof Error?error.message:"Eğitmen profili kaydedilemedi.",true)}
}

async function loadTeacherRequests(root){
  const container=root.querySelector("#mentorAssignedRequests");if(!container)return;
  try{const rows=await rest(`nesevren_mentor_requests?select=id,requester_name,support_type,subject,level,mode,city,preferred_time,note,status,mentor_message,created_at&mentor_id=eq.${encodeURIComponent(activeAuth.user.id)}&order=created_at.desc&limit=20`);container.textContent="";if(!Array.isArray(rows)||!rows.length){container.innerHTML='<div class="mentorEmpty compact"><span>📭</span><p>Henüz sana atanmış bir talep yok.</p></div>';return}rows.forEach(row=>{const item=document.createElement("article");item.className="mentorRequest teacher";const head=document.createElement("div");const title=document.createElement("strong");title.textContent=`${row.requester_name||"Öğrenci"} · ${row.subject}`;const status=document.createElement("span");status.textContent=statusLabels[row.status]||row.status;status.dataset.status=row.status;head.append(title,status);const meta=document.createElement("small");meta.textContent=`${row.support_type} · ${levelLabel(row.level)} · ${row.mode}${row.city?` · ${row.city}`:""}`;item.append(head,meta);if(row.note){const p=document.createElement("p");p.textContent=row.note;item.appendChild(p)}if(["matched","accepted"].includes(row.status)){const textarea=document.createElement("textarea");textarea.placeholder="Öğrenciye kısa not / uygun görüşme zamanı";textarea.value=row.mentor_message||"";const actions=document.createElement("div");actions.className="mentorRequestActions";if(row.status==="matched"){const accept=document.createElement("button");accept.className="mentorPrimary";accept.textContent="Talebi Kabul Et";accept.addEventListener("click",()=>updateTeacherRequest(root,row.id,"accepted",textarea.value));const decline=document.createElement("button");decline.className="mentorSecondary";decline.textContent="Uygun Değilim";decline.addEventListener("click",()=>updateTeacherRequest(root,row.id,"declined",textarea.value));actions.append(accept,decline)}else{const complete=document.createElement("button");complete.className="mentorPrimary";complete.textContent="Görüşmeyi Tamamla";complete.addEventListener("click",()=>updateTeacherRequest(root,row.id,"completed",textarea.value));actions.appendChild(complete)}item.append(textarea,actions)}container.appendChild(item)})}catch(error){container.innerHTML='<div class="mentorError"></div>';container.firstElementChild.textContent=error instanceof Error?error.message:"Eşleşme talepleri yüklenemedi."}
}
async function updateTeacherRequest(root,id,status,mentorMessage){try{await rest(`nesevren_mentor_requests?id=eq.${encodeURIComponent(id)}&mentor_id=eq.${encodeURIComponent(activeAuth.user.id)}`,{method:"PATCH",body:{status,mentor_message:String(mentorMessage||"").trim()||null,updated_at:new Date().toISOString()},prefer:"return=minimal"});message(root,status==="accepted"?"Talep kabul edildi; öğrenci hesabında durum güncellendi.":status==="completed"?"Görüşme tamamlandı olarak işaretlendi.":"Talep uygun değil olarak işaretlendi.");await loadTeacherRequests(root)}catch(error){message(root,error instanceof Error?error.message:"Talep güncellenemedi.",true)}}

async function openMentorHub(){
  const shell=createShell();document.body.style.overflow="hidden";const root=shell.querySelector("#mentorBody");
  if(!configured){root.innerHTML='<div class="mentorError">Canlı eşleştirme için Supabase bağlantısı yapılandırılmalı.</div>';return}
  activeAuth=await authContext();if(!activeAuth){loginRequired(root);return}
  const role=localUserProfile().role||"student";
  if(role==="teacher"){
    root.innerHTML=teacherHtml();root.querySelector("#mentorSaveProfile")?.addEventListener("click",()=>saveTeacherProfile(root));await Promise.all([loadTeacherProfile(root),loadTeacherRequests(root)]);
  }else{
    root.innerHTML=studentFormHtml();const mode=root.querySelector("#mentorMode");const cityField=root.querySelector("#mentorCityField");mode.addEventListener("change",()=>cityField.hidden=mode.value!=="Yüz yüze");root.querySelector("#mentorFind")?.addEventListener("click",()=>findMatches(root));await loadStudentRequests(root);
  }
}

function rewriteCoachMentorBox(){
  const button=document.querySelector("#coachMentorRequest");if(!button)return;button.textContent="Eşleşme Bul";const small=button.parentElement?.querySelector("small");if(small)small.textContent="Doğrulanmış branş öğretmeni, akademik koç veya mentorla eşleş; talebini ve görüşme durumunu hesabından takip et.";
}

document.addEventListener("click",event=>{const target=event.target instanceof Element?event.target:null;const button=target?.closest("#coachMentorRequest");if(!button)return;event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();openMentorHub()},true);
const mentorObserver=new MutationObserver(rewriteCoachMentorBox);mentorObserver.observe(document.documentElement,{childList:true,subtree:true});rewriteCoachMentorBox();
window.NesevrenMentorHub={open:openMentorHub};
