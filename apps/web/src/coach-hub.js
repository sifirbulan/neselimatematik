const configuredApiUrl=(import.meta.env.VITE_API_URL??"").trim().replace(/\/+$/,"");
const COACH_API_URL=!configuredApiUrl||configuredApiUrl==="https://nesevren-api.onrender.com"?"https://nesevren-api-v2.onrender.com":configuredApiUrl;

const PROFILE_KEY="nesevren-coach-profile";
const TASKS_KEY="nesevren-coach-tasks";
const CHECKINS_KEY="nesevren-coach-checkins";
const HISTORY_KEY="nesevren-history";
const ASSESSMENT_KEY="nesevren-assessment";
const ERROR_KEY="nesevren-error-book";
const MAX_LOCAL_VALUE=120000;

const levels=["1","2","3","4","5","6","7","8","9","10","11","12","LGS","TYT","AYT","KPSS","ALES"];
const goals=["Okul başarısı","Sınava hazırlık","Eksik konu kapatma","Zaman yönetimi","Motivasyon ve düzen","Bölüm / kariyer yönelimi"];

function readJson(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return fallback;
    if(raw.length>MAX_LOCAL_VALUE){console.warn(`${key} kaydı çok büyük; koç ekranında yüklenmedi.`);return fallback;}
    return JSON.parse(raw);
  }catch{return fallback;}
}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function arrayValue(key,limit){const value=readJson(key,[]);return Array.isArray(value)?value.slice(0,limit):[]}
function objectValue(key){const value=readJson(key,null);return value&&typeof value==="object"&&!Array.isArray(value)?value:null}
function profile(){return objectValue(PROFILE_KEY)??{level:"8",goal:"Okul başarısı",weeklyHours:6,weakSubjects:""}}
function tasks(){return arrayValue(TASKS_KEY,40)}
function checkins(){return arrayValue(CHECKINS_KEY,30)}
function history(){return arrayValue(HISTORY_KEY,20)}
function errors(){return arrayValue(ERROR_KEY,60)}
function assessment(){return objectValue(ASSESSMENT_KEY)}
function levelLabel(value){return /^\d+$/.test(String(value??""))?`${value}. sınıf`:String(value??"—")}
function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}

function snapshot(){
  const p=profile();
  const a=assessment();
  const e=errors();
  const h=history();
  const t=tasks();
  const c=checkins();
  const open=t.filter(item=>!item?.done).slice(0,5);
  const recentCheckins=c.slice(0,7);
  const minutes=recentCheckins.reduce((sum,item)=>sum+Math.max(0,Number(item?.minutes)||0),0);
  return {p,a,e,h,t,c,open,minutes};
}

function promptFor(kind){
  const s=snapshot();
  const weak=s.e.slice(0,5).map(item=>`${item?.subject||"Ders"} / ${item?.topic||"konu"}`).join(", ");
  const recent=s.h.slice(0,5).map(item=>`${item?.subject||"Genel"}: ${String(item?.question||"").slice(0,90)}`).join(" | ");
  const open=s.open.map(item=>String(item?.title||"").slice(0,90)).filter(Boolean).join(" | ");
  const assessmentText=s.a?`${s.a.subject||"Ders"}, ${levelLabel(s.a.grade)}, ${s.a.score??"?"}/${s.a.total??"?"}, ${s.a.level||"düzey bilinmiyor"}`:"Henüz seviye testi yok";
  const base=`Sen Neşevren'in kişisel eğitim koçusun. Öğrenciyi aşırı yüklemeden, kısa ve uygulanabilir öneri ver. Seviye: ${levelLabel(s.p.level)}. Hedef: ${s.p.goal||"Okul başarısı"}. Haftalık süre: ${Number(s.p.weeklyHours)||6} saat. Zorlandığı dersler: ${s.p.weakSubjects||"belirtilmedi"}. Seviye sonucu: ${assessmentText}. Kayıtlı hata sayısı: ${s.e.length}. Öncelikli hata alanları: ${weak||"henüz yok"}. Son çalışmalar: ${recent||"henüz yok"}. Açık görevler: ${open||"yok"}. Son kayıtlı çalışma süresi: ${s.minutes} dakika.`;
  const instructions={
    daily:"Bugün için en fazla 4 maddelik plan hazırla. Her maddeye yaklaşık dakika ekle ve ilk başlanacak işi açıkça belirt.",
    weekly:"7 günlük sade çalışma programı hazırla. Her gün için ana ders, görev ve yaklaşık süre ver.",
    weakness:"İlk 3 akademik açığı sırala. Her biri için neden önemli olduğunu ve nasıl çalışılması gerektiğini kısaca yaz.",
    exam:"Öğrencinin seviyesine göre konu, soru çözümü, deneme, süre yönetimi ve yanlış analizi içeren kısa sınav stratejisi hazırla."
  };
  return `${base}\n${instructions[kind]??instructions.daily}`;
}

async function callCoach(kind){
  const response=await fetch(`${COACH_API_URL}/api/v1/questions/analyze`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({question:promptFor(kind),inputType:"text",intent:"solve"})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error?.message??"Koçluk servisine şu anda ulaşılamıyor.");
  const answer=data?.finalAnswer??data?.answer;
  if(!answer)throw new Error("Koçluk önerisi alınamadı.");
  return answer;
}

function createHub(){
  let root=document.getElementById("coachBackdrop");
  if(root)return root;
  root=document.createElement("div");
  root.id="coachBackdrop";
  root.className="coachBackdrop";
  root.hidden=true;
  root.innerHTML=`<section class="coachHub" role="dialog" aria-modal="true" aria-labelledby="coachTitle">
    <header class="coachTop">
      <div><small>KİŞİSEL EĞİTİM KOÇU</small><h2 id="coachTitle">Neşevren Koçum</h2><p>Planını ve eksiklerini sade biçimde takip et.</p></div>
      <button class="coachClose" type="button" aria-label="Kapat">×</button>
    </header>
    <div class="coachBody">
      <div class="coachStats">
        <div class="coachStat"><strong id="coachLevelStat">—</strong><span>Seviye</span></div>
        <div class="coachStat"><strong id="coachErrorStat">0</strong><span>Hata</span></div>
        <div class="coachStat"><strong id="coachTaskStat">0</strong><span>Açık görev</span></div>
        <div class="coachStat"><strong id="coachStudyStat">0 dk</strong><span>Çalışma</span></div>
      </div>

      <section class="coachSection">
        <div class="coachSectionHead"><h3>👤 Profilim</h3><small>Koç önerilerinin temeli</small></div>
        <div class="coachGrid">
          <label class="coachField">Sınıf / sınav<select id="coachLevel">${levels.map(item=>`<option value="${item}">${esc(levelLabel(item))}</option>`).join("")}</select></label>
          <label class="coachField">Ana hedef<select id="coachGoal">${goals.map(item=>`<option>${esc(item)}</option>`).join("")}</select></label>
          <label class="coachField">Haftalık çalışma<select id="coachHours">${[2,4,6,8,10,12,15,20].map(h=>`<option value="${h}">${h} saat</option>`).join("")}</select></label>
          <label class="coachField">Zorlandığım dersler<input id="coachWeakSubjects" placeholder="Matematik, Fizik..." /></label>
        </div>
        <button id="coachSaveProfile" class="coachPrimary" type="button">Profili Kaydet</button>
      </section>

      <section class="coachSection">
        <div class="coachSectionHead"><h3>✨ Bana özel koçluk</h3><small>Yalnızca istediğinde analiz edilir</small></div>
        <div class="coachActions">
          <button class="coachAction" data-coach-kind="daily"><span>☀️</span><strong>Bugünkü Planım</strong></button>
          <button class="coachAction" data-coach-kind="weekly"><span>📅</span><strong>Haftalık Program</strong></button>
          <button class="coachAction" data-coach-kind="weakness"><span>🎯</span><strong>Eksiklerimi Analiz Et</strong></button>
          <button class="coachAction" data-coach-kind="exam"><span>⏱️</span><strong>Sınav Stratejim</strong></button>
        </div>
        <div id="coachAiArea"></div>
      </section>

      <section class="coachSection">
        <div class="coachSectionHead"><h3>📌 Görevlerim</h3><small>En fazla 8 görev gösterilir</small></div>
        <div class="coachTaskForm"><input id="coachTaskTitle" placeholder="Örn. 20 problem çöz"/><button id="coachAddTask" class="coachSecondary" type="button">Ekle</button></div>
        <div id="coachTasks" class="coachTasks"></div>
      </section>

      <section class="coachSection">
        <div class="coachSectionHead"><h3>📊 Günlük kontrol</h3><small>Kısa kayıt</small></div>
        <div class="coachCheckin">
          <label class="coachField">Çalışma (dk)<input id="coachMinutes" type="number" min="0" max="600" placeholder="60"/></label>
          <label class="coachField">Odak<select id="coachFocus"><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3" selected>3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select></label>
        </div>
        <button id="coachSaveCheckin" class="coachSecondary" type="button">Günlüğe Kaydet</button>
      </section>
      <div id="coachMessage"></div>
    </div>
  </section>`;
  document.body.appendChild(root);
  root.addEventListener("click",event=>{if(event.target===root)closeCoach()});
  root.querySelector(".coachClose")?.addEventListener("click",closeCoach);
  wireHub(root);
  return root;
}

function renderStats(root){
  const s=snapshot();
  root.querySelector("#coachLevelStat").textContent=s.a?.level??levelLabel(s.p.level);
  root.querySelector("#coachErrorStat").textContent=String(s.e.length);
  root.querySelector("#coachTaskStat").textContent=String(s.open.length);
  root.querySelector("#coachStudyStat").textContent=`${s.minutes} dk`;
}

function fillProfile(root){
  const p=profile();
  root.querySelector("#coachLevel").value=levels.includes(String(p.level))?String(p.level):"8";
  root.querySelector("#coachGoal").value=goals.includes(String(p.goal))?String(p.goal):goals[0];
  root.querySelector("#coachHours").value=String(Number(p.weeklyHours)||6);
  root.querySelector("#coachWeakSubjects").value=String(p.weakSubjects||"");
}

function renderTasks(root){
  const holder=root.querySelector("#coachTasks");
  if(!holder)return;
  holder.textContent="";
  const items=tasks().slice(0,8);
  if(!items.length){const empty=document.createElement("div");empty.className="coachLoading";empty.textContent="Henüz görev yok.";holder.appendChild(empty);return;}
  items.forEach(item=>{
    const row=document.createElement("div");row.className=`coachTask${item?.done?" done":""}`;
    const check=document.createElement("input");check.type="checkbox";check.checked=Boolean(item?.done);
    const text=document.createElement("strong");text.textContent=String(item?.title||"Görev").slice(0,120);
    const del=document.createElement("button");del.type="button";del.textContent="×";del.setAttribute("aria-label","Görevi sil");
    check.addEventListener("change",()=>{const all=tasks();writeJson(TASKS_KEY,all.map(t=>t?.id===item?.id?{...t,done:check.checked}:t));renderTasks(root);renderStats(root)});
    del.addEventListener("click",()=>{writeJson(TASKS_KEY,tasks().filter(t=>t?.id!==item?.id));renderTasks(root);renderStats(root)});
    row.append(check,text,del);holder.appendChild(row);
  });
}

function showMessage(root,text,error=false){
  const holder=root.querySelector("#coachMessage");if(!holder)return;
  holder.textContent="";const box=document.createElement("div");box.className=error?"coachError":"coachToast";box.textContent=text;holder.appendChild(box);
  window.setTimeout(()=>{if(box.isConnected)box.remove()},2400);
}

function renderAnswer(root,answer){
  const area=root.querySelector("#coachAiArea");if(!area)return;area.textContent="";
  const box=document.createElement("div");box.className="coachAiResult";
  const title=document.createElement("h4");title.textContent="Koçunun önerisi";box.appendChild(title);
  const parts=[];
  if(answer?.answer)parts.push(answer.answer);
  if(answer?.explanation)parts.push(answer.explanation);
  if(Array.isArray(answer?.steps))parts.push(answer.steps.map((step,index)=>`${index+1}. ${step}`).join("\n"));
  const p=document.createElement("p");p.textContent=parts.filter(Boolean).join("\n\n")||"Öneri hazırlandı.";box.appendChild(p);area.appendChild(box);
}

function wireHub(root){
  root.querySelector("#coachSaveProfile")?.addEventListener("click",()=>{
    const next={level:root.querySelector("#coachLevel").value,goal:root.querySelector("#coachGoal").value,weeklyHours:Number(root.querySelector("#coachHours").value)||6,weakSubjects:root.querySelector("#coachWeakSubjects").value.trim()};
    if(!writeJson(PROFILE_KEY,next)){showMessage(root,"Profil kaydedilemedi.",true);return;}
    renderStats(root);showMessage(root,"Profil kaydedildi.");
  });
  root.querySelectorAll("[data-coach-kind]").forEach(button=>button.addEventListener("click",async()=>{
    const kind=button.dataset.coachKind;const area=root.querySelector("#coachAiArea");
    area.innerHTML='<div class="coachLoading">✦ Koçluk önerisi hazırlanıyor…</div>';
    root.querySelectorAll("[data-coach-kind]").forEach(item=>item.disabled=true);
    try{renderAnswer(root,await callCoach(kind));}catch(error){area.textContent="";const box=document.createElement("div");box.className="coachError";box.textContent=error instanceof Error?error.message:"Koçluk önerisi hazırlanamadı.";area.appendChild(box)}finally{root.querySelectorAll("[data-coach-kind]").forEach(item=>item.disabled=false)}
  }));
  root.querySelector("#coachAddTask")?.addEventListener("click",()=>{
    const input=root.querySelector("#coachTaskTitle");const title=input.value.trim();if(!title){showMessage(root,"Önce bir görev yaz.",true);return;}
    const all=tasks();all.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,title:title.slice(0,120),done:false,createdAt:Date.now()});writeJson(TASKS_KEY,all.slice(0,40));input.value="";renderTasks(root);renderStats(root);showMessage(root,"Görev eklendi.");
  });
  root.querySelector("#coachSaveCheckin")?.addEventListener("click",()=>{
    const minutes=Math.max(0,Math.min(600,Number(root.querySelector("#coachMinutes").value)||0));const focus=Number(root.querySelector("#coachFocus").value)||3;const all=checkins();all.unshift({id:Date.now(),minutes,focus,createdAt:Date.now()});writeJson(CHECKINS_KEY,all.slice(0,30));root.querySelector("#coachMinutes").value="";renderStats(root);showMessage(root,"Günlük kayıt eklendi.");
  });
}

function openCoach(){
  const root=createHub();
  root.hidden=false;
  document.body.style.overflow="hidden";
  requestAnimationFrame(()=>{
    try{fillProfile(root);renderStats(root);renderTasks(root);}catch(error){console.error("Koç ekranı hazırlanamadı",error);showMessage(root,"Koç ekranı açıldı ancak eski kayıtların bir kısmı okunamadı.",true)}
  });
}
function closeCoach(){const root=document.getElementById("coachBackdrop");if(root)root.hidden=true;document.body.style.overflow=""}

document.addEventListener("click",event=>{
  const target=event.target instanceof Element?event.target.closest("[data-nesevren-coach]"):null;
  if(!target)return;
  event.preventDefault();
  openCoach();
});
