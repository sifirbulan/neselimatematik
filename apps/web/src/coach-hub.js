import { buildCoachInsight } from "./coach-intelligence.ts";

const configuredApiUrl=(import.meta.env.VITE_API_URL??"").trim().replace(/\/+$/,"");
const COACH_API_URL=!configuredApiUrl||configuredApiUrl==="https://nesevren-api.onrender.com"?"https://nesevren-api-v2.onrender.com":configuredApiUrl;
const PROFILE_KEY="nesevren-coach-profile";
const PLAN_KEY="nesevren-coach-plan";
const TASKS_KEY="nesevren-coach-tasks";
const CHECKINS_KEY="nesevren-coach-checkins";
const MENTOR_KEY="nesevren-coach-mentor-request";
const HISTORY_KEY="nesevren-history";

const levels=["1","2","3","4","5","6","7","8","9","10","11","12","LGS","TYT","AYT","KPSS","ALES"];
const subjects=["Matematik","Fen Bilimleri","Fizik","Kimya","Biyoloji","Türkçe","Türk Dili ve Edebiyatı","İngilizce","Kürtçe","Arapça","Sosyal Bilgiler","Tarih","Coğrafya","Felsefe"];

function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function levelLabel(value){return /^\d+$/.test(value)?`${value}. sınıf`:value}
function coachProfile(){return readJson(PROFILE_KEY,{name:"",level:"8",goal:"Okul başarısı",weeklyHours:6,weakSubjects:"Matematik",note:""})}
function coachTasks(){return readJson(TASKS_KEY,[])}
function coachCheckins(){return readJson(CHECKINS_KEY,[])}
function latestAssessment(){return readJson("nesevren-assessment",null)}
function errorBook(){return readJson("nesevren-error-book",[])}
function learningHistory(){const value=readJson(HISTORY_KEY,[]);return Array.isArray(value)?value:[]}
function isVisible(node){return node&&node.getClientRects().length>0}

function rewriteBottomNav(){
  const nav=document.querySelector(".bottomNav");
  const button=nav?.querySelector("button:nth-child(2)");
  if(!button)return;
  const small=button.querySelector("small");
  if(small&&small.textContent!=="Koç Hizmeti Al")small.textContent="Koç Hizmeti Al";
  const first=button.firstChild;
  if(first&&first.nodeType===Node.TEXT_NODE&&first.textContent?.trim()!=="◎")first.textContent="◎";
  button.setAttribute("aria-label","Koç Hizmeti Al");
}

function escapeStatic(value){return String(value??"").replace(/[&<>\"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}

function contextSnapshot(){
  const profile=coachProfile();
  const assessment=latestAssessment();
  const errors=errorBook();
  const tasks=coachTasks();
  const checkins=coachCheckins();
  const history=learningHistory();
  const insight=buildCoachInsight({profile,assessment,errors,tasks,checkins,history});
  const weakTopics=insight.topWeakTopics.map(item=>item.topic);
  const recentErrors=errors.slice(0,6).map(item=>`${item.subject}/${item.topic}: ${item.question}`);
  const openTasks=tasks.filter(item=>!item.done).slice(0,8).map(item=>`${item.title}${item.due?` (${item.due})`:""}`);
  const recentCheckin=checkins[0]??null;
  const recentHistory=history.slice(0,8).map(item=>`${item.subject||"Genel"}: ${item.question||"soru"}`);
  return {profile,assessment,errors,tasks,checkins,history,insight,weakTopics,recentErrors,openTasks,recentCheckin,recentHistory};
}

function coachPrompt(kind){
  const c=contextSnapshot();
  const profile=c.profile;
  const assessmentText=c.assessment?`${c.assessment.subject}, ${levelLabel(c.assessment.grade)}, ${c.assessment.score}/${c.assessment.total}, düzey ${c.assessment.level}`:"Henüz seviye testi yok";
  const insight=c.insight;
  const base=`Sen Neşevren'in kişiye özel eğitim koçu ve mentor asistanısın. Genel ve ezber öneriler verme; aşağıdaki gerçek öğrenci verilerini birlikte değerlendir. Öğrenci profili: ad ${profile.name||"belirtilmedi"}; seviye ${levelLabel(profile.level)}; ana hedef ${profile.goal}; haftalık ayırabileceği süre ${profile.weeklyHours} saat; zorlandığı dersler ${profile.weakSubjects||"belirtilmedi"}; ek not ${profile.note||"yok"}. Son seviye sonucu: ${assessmentText}. Öncelikli zayıf konular: ${c.weakTopics.join(", ")||"henüz veri yok"}. Hata Kitapçığında ${c.errors.length} kayıt var. Son hata örnekleri: ${c.recentErrors.join(" | ")||"yok"}. Son soru/çalışma geçmişi: ${c.recentHistory.join(" | ")||"henüz yok"}. Açık görevler: ${c.openTasks.join(" | ")||"yok"}. Son 7 gün çalışma: ${insight.studyMinutes7d}/${insight.plannedWeeklyMinutes} dakika; aktif gün ${insight.activeDays7d}; ortalama odak ${insight.averageFocus7d??"veri yok"}/5; çalışma ritmi %${insight.rhythmPercent}. ${c.recentCheckin?`Son günlük kontrol: ${c.recentCheckin.minutes} dakika çalışma, odak ${c.recentCheckin.focus}/5, not: ${c.recentCheckin.note||"yok"}.`:""} Öğrenciyi aşırı yükleme. Öncelik sırası oluştur, uygulanabilir süreler ver ve her öneriyi mevcut verilerden bir gerekçeye bağla.`;
  const instructions={
    plan:"Tam bir kişisel eğitim yol haritası oluştur. 1) Mevcut durumun kısa özeti, 2) ilk 3 akademik öncelik, 3) bugünkü net plan, 4) bu haftanın ana hedefleri, 5) ilerlemeyi ölçmek için 3 somut gösterge ver. Seviye testi yoksa bunu ilk veri toplama adımı olarak belirt.",
    daily:"Bugün için en fazla 4 maddelik net bir çalışma planı oluştur. Öncelik sırasını, yaklaşık süreleri ve ilk başlanacak işi belirt. Hata Kitapçığı ve son çalışılan dersleri mutlaka dikkate al.",
    weekly:"7 günlük kişisel çalışma programı oluştur. Günleri dengeli dağıt, eksik konuları, hata tekrarını, soru pratiğini ve dinlenmeyi dahil et. Her gün için süre ve ana görev ver.",
    weakness:"Seviye sonucu, konu bazlı yanlışlar, Hata Kitapçığı ve son soru geçmişine göre öğrencinin öncelikli açıklarını analiz et. İlk 3 önceliği, nedenlerini ve her biri için kısa çalışma yöntemi ver.",
    exam:"Öğrencinin hedef ve seviyesine uygun sınav stratejisi hazırla. Konu, soru çözümü, deneme, süre yönetimi ve yanlış analizi başlıklarını kişiselleştir.",
    habit:"Son 7 günlük süre ve odak kayıtlarına göre çalışma alışkanlığı, motivasyon, dikkat ve zaman yönetimi için sürdürülebilir bir sistem öner. Günlük küçük hedef ve takip yöntemi belirle.",
    guidance:"Ders seçimi, bölüm/meslek hedefi ve akademik yönelim açısından öğrencinin mevcut profiline ve güçlü/zayıf ders sinyallerine göre sorulması gereken doğru soruları ve bir sonraki karar adımını ver. Kesin meslek hükmü verme.",
  };
  return `${base}\n${instructions[kind]??instructions.plan}`;
}

async function callCoach(kind){
  const prompt=coachPrompt(kind);
  const response=await fetch(`${COACH_API_URL}/api/v1/questions/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:prompt,inputType:"text",intent:"solve"})});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error?.message??"Koçluk servisine şu anda ulaşılamıyor.");
  const answer=data?.finalAnswer??data?.answer;
  if(!answer)throw new Error("Koçluk önerisi alınamadı.");
  return answer;
}

function createHub(){
  if(document.getElementById("coachBackdrop"))return document.getElementById("coachBackdrop");
  const backdrop=document.createElement("div");
  backdrop.id="coachBackdrop";
  backdrop.className="coachBackdrop";
  backdrop.hidden=true;
  backdrop.innerHTML=`<section class="coachHub" role="dialog" aria-modal="true" aria-labelledby="coachTitle">
    <header class="coachTop"><div><small>KİŞİSEL EĞİTİM MERKEZİ</small><h2 id="coachTitle">Neşevren Koçum</h2><p>Seviye, hata, soru geçmişi, çalışma süresi ve hedeflerini tek kişisel eğitim planında birleştirir.</p></div><button class="coachClose" type="button" aria-label="Kapat">×</button></header>
    <div class="coachBody">
      <section class="coachHeroCard"><div class="coachHeroIcon">🧭</div><div><h3>Senin verilerinle çalışan eğitim merkezi</h3><p>Sadece tavsiye vermek yerine ne çalışacağını, neden çalışacağını, ne kadar süre ayıracağını ve ilerlemeyi nasıl ölçeceğini belirler.</p></div></section>
      <div class="coachStats"><div class="coachStat"><strong id="coachLevelStat">—</strong><span>Seviye</span></div><div class="coachStat"><strong id="coachErrorStat">0</strong><span>Hata</span></div><div class="coachStat"><strong id="coachHistoryStat">0</strong><span>Son sorular</span></div><div class="coachStat"><strong id="coachStudyStat">0 dk</strong><span>7 günlük çalışma</span></div></div>

      <section class="coachSection coachRoadmapSection"><div class="coachSectionHead"><div><h3>🧠 Akıllı Yol Haritam</h3><small>Seviye + Hata Kitapçığı + soru geçmişi + çalışma kayıtları</small></div><span id="coachRhythmBadge" class="coachRhythmBadge">Ritim %0</span></div><p id="coachRoadmapSummary" class="coachRoadmapSummary"></p><div id="coachDataSignals" class="coachDataSignals"></div><div id="coachRoadmap" class="coachRoadmap"></div><div class="coachRoadmapButtons"><button id="coachApplyRoadmap" class="coachSecondary" type="button">Bugünkü önerileri görevlere ekle</button><button class="coachPrimary" data-coach-kind="plan" type="button">AI ile yol haritamı geliştir</button></div></section>

      <section class="coachSection"><div class="coachSectionHead"><h3>👤 Kişisel profilim</h3><small>Koçluk önerilerinin temeli</small></div><div class="coachGrid">
        <div class="coachField"><label>Ad (isteğe bağlı)</label><input id="coachName" placeholder="Adın" /></div>
        <div class="coachField"><label>Sınıf / sınav</label><select id="coachLevel">${levels.map(level=>`<option value="${level}">${escapeStatic(levelLabel(level))}</option>`).join("")}</select></div>
        <div class="coachField"><label>Ana hedef</label><select id="coachGoal"><option>Okul başarısı</option><option>Sınava hazırlık</option><option>Eksik konu kapatma</option><option>Zaman yönetimi</option><option>Motivasyon ve düzen</option><option>Dil gelişimi</option><option>Bölüm / kariyer yönelimi</option></select></div>
        <div class="coachField"><label>Haftalık çalışma süresi</label><select id="coachHours">${[2,4,6,8,10,12,15,20].map(h=>`<option value="${h}">${h} saat</option>`).join("")}</select></div>
        <div class="coachField full"><label>Zorlandığım dersler</label><input id="coachWeakSubjects" list="coachSubjects" placeholder="Örn. Matematik, Fizik" /><datalist id="coachSubjects">${subjects.map(s=>`<option value="${s}"></option>`).join("")}</datalist></div>
        <div class="coachField full"><label>Koçuma notum</label><textarea id="coachNote" placeholder="Hedefin, çalışma düzenin veya özellikle destek istediğin konu..."></textarea></div>
      </div><div style="margin-top:10px"><button id="coachSaveProfile" class="coachPrimary" type="button">Profili Kaydet</button></div></section>

      <section class="coachSection"><div class="coachSectionHead"><h3>✨ Bana özel koçluk</h3><small>DeepSeek ana · Claude yedek</small></div><div class="coachActions">
        <button class="coachAction" data-coach-kind="daily"><span>☀️</span><strong>Bugünkü Planım</strong><small>Bugün neye, hangi sırayla çalışacağımı belirle.</small></button>
        <button class="coachAction" data-coach-kind="weekly"><span>📅</span><strong>Haftalık Program</strong><small>Dersleri ve tekrarları haftaya dengeli dağıt.</small></button>
        <button class="coachAction" data-coach-kind="weakness"><span>🎯</span><strong>Eksiklerimi Analiz Et</strong><small>Seviye, yanlış ve soru geçmişinden öncelik çıkar.</small></button>
        <button class="coachAction" data-coach-kind="exam"><span>⏱️</span><strong>Sınav Stratejim</strong><small>Konu, deneme, süre ve yanlış yönetimini planla.</small></button>
        <button class="coachAction" data-coach-kind="habit"><span>🌱</span><strong>Çalışma Düzenim</strong><small>Süre ve odak kayıtlarımdan alışkanlık sistemi kur.</small></button>
        <button class="coachAction" data-coach-kind="guidance"><span>🧭</span><strong>Akademik Yönüm</strong><small>Ders, bölüm ve kariyer kararlarında yol göster.</small></button>
      </div><div id="coachAiArea"></div></section>

      <section class="coachSection"><div class="coachSectionHead"><h3>📌 Ödev ve görev takibim</h3><small>Küçük adımları görünür yap</small></div><div class="coachTaskForm"><input id="coachTaskTitle" placeholder="Görev ekle: 20 problem çöz..."/><input id="coachTaskDue" type="date"/><button id="coachAddTask" class="coachSecondary" type="button">Ekle</button></div><div id="coachTasks" class="coachTasks"></div></section>
      <section class="coachSection"><div class="coachSectionHead"><h3>📊 Günlük kontrol</h3><small>İlerlemeni koçluk verisine dönüştür</small></div><div class="coachCheckin"><div class="coachField"><label>Bugün kaç dakika çalıştım?</label><input id="coachMinutes" type="number" min="0" max="1000" placeholder="60"/></div><div class="coachField"><label>Odak düzeyim</label><select id="coachFocus"><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3" selected>3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select></div><div class="coachField coachNote"><label>Bugünün kısa notu</label><input id="coachCheckinNote" placeholder="Neyi başardın, nerede zorlandın?"/></div></div><div style="margin-top:10px"><button id="coachSaveCheckin" class="coachSecondary" type="button">Günlüğe Kaydet</button></div></section>
      <section class="coachSection"><div class="coachSectionHead"><h3>👩‍🏫 Canlı koç / mentor</h3><small>İnsan desteği</small></div><div class="coachMentorBox"><span>🤝</span><div><strong>Kişisel mentor talebi</strong><small>Akademik plan, takip, öğrenci-aile görüşmesi veya branş desteği için talep oluştur. Eşleştirme ve ödeme altyapısı sonraki aşamada bağlanacak.</small></div><button id="coachMentorRequest" class="coachPrimary" type="button">Talep Oluştur</button></div></section>
      <div id="coachMessage"></div>
    </div>
  </section>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click",event=>{if(event.target===backdrop)closeCoach()});
  backdrop.querySelector(".coachClose")?.addEventListener("click",closeCoach);
  backdrop.addEventListener("keydown",event=>{if(event.key==="Escape")closeCoach()});
  wireHub(backdrop);
  return backdrop;
}

function renderStats(root){
  const profile=coachProfile();const assessment=latestAssessment();const insight=buildCoachInsight({profile,assessment,errors:errorBook(),history:learningHistory(),tasks:coachTasks(),checkins:coachCheckins()});
  root.querySelector("#coachLevelStat").textContent=assessment?.level??levelLabel(profile.level);
  root.querySelector("#coachErrorStat").textContent=String(errorBook().length);
  root.querySelector("#coachHistoryStat").textContent=String(insight.recentQuestionCount);
  root.querySelector("#coachStudyStat").textContent=`${insight.studyMinutes7d} dk`;
}

function renderIntelligence(root){
  const insight=buildCoachInsight({profile:coachProfile(),assessment:latestAssessment(),errors:errorBook(),history:learningHistory(),tasks:coachTasks(),checkins:coachCheckins()});
  const summary=root.querySelector("#coachRoadmapSummary");if(summary)summary.textContent=insight.summary;
  const badge=root.querySelector("#coachRhythmBadge");if(badge)badge.textContent=`Ritim %${insight.rhythmPercent}`;
  const signals=root.querySelector("#coachDataSignals");if(signals){signals.textContent="";const items=[
    insight.assessmentPercent===null?"🎯 Seviye testi bekleniyor":`🎯 Seviye %${insight.assessmentPercent}`,
    `📕 ${errorBook().length} hata kaydı`,
    `💬 ${insight.recentQuestionCount} son soru`,
    `⏱️ ${insight.studyMinutes7d}/${insight.plannedWeeklyMinutes} dk`,
    insight.averageFocus7d===null?"🧠 Odak verisi yok":`🧠 Odak ${insight.averageFocus7d}/5`,
  ];items.forEach(text=>{const span=document.createElement("span");span.textContent=text;signals.appendChild(span)})}
  const roadmap=root.querySelector("#coachRoadmap");if(roadmap){roadmap.textContent="";insight.actions.forEach((action,index)=>{const row=document.createElement("article");row.className="coachRoadmapItem";const no=document.createElement("b");no.textContent=String(index+1);const body=document.createElement("div");const strong=document.createElement("strong");strong.textContent=action.title;const small=document.createElement("small");small.textContent=action.detail;body.append(strong,small);const time=document.createElement("span");time.textContent=`${action.minutes} dk`;row.append(no,body,time);roadmap.appendChild(row)})}
}

function fillProfile(root){const p=coachProfile();root.querySelector("#coachName").value=p.name??"";root.querySelector("#coachLevel").value=p.level??"8";root.querySelector("#coachGoal").value=p.goal??"Okul başarısı";root.querySelector("#coachHours").value=String(p.weeklyHours??6);root.querySelector("#coachWeakSubjects").value=p.weakSubjects??"";root.querySelector("#coachNote").value=p.note??""}

function renderTasks(root){
  const container=root.querySelector("#coachTasks");const tasks=coachTasks();container.textContent="";
  if(!tasks.length){const empty=document.createElement("div");empty.className="coachLoading";empty.textContent="Henüz görev yok. Akıllı Yol Haritam'daki önerileri tek dokunuşla göreve çevirebilirsin.";container.appendChild(empty);return}
  tasks.slice(0,12).forEach(task=>{const row=document.createElement("div");row.className=`coachTask${task.done?" done":""}`;const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.checked=Boolean(task.done);checkbox.addEventListener("change",()=>{writeJson(TASKS_KEY,tasks.map(item=>item.id===task.id?{...item,done:checkbox.checked}:item));renderTasks(root);renderStats(root);renderIntelligence(root)});const text=document.createElement("div");const strong=document.createElement("strong");strong.textContent=task.title;const small=document.createElement("small");small.textContent=task.due?`Hedef tarih: ${task.due}`:"Tarih belirtilmedi";text.append(strong,small);const del=document.createElement("button");del.type="button";del.textContent="×";del.setAttribute("aria-label","Görevi sil");del.addEventListener("click",()=>{writeJson(TASKS_KEY,tasks.filter(item=>item.id!==task.id));renderTasks(root);renderStats(root);renderIntelligence(root)});row.append(checkbox,text,del);container.appendChild(row)})
}

function showToast(root,text,error=false){const holder=root.querySelector("#coachMessage");holder.textContent="";const item=document.createElement("div");item.className=error?"coachError":"coachToast";item.textContent=text;holder.appendChild(item);setTimeout(()=>{if(item.isConnected)item.remove()},2800)}

function renderAiAnswer(root,answer,kind){const area=root.querySelector("#coachAiArea");area.textContent="";const box=document.createElement("div");box.className="coachAiResult";const title=document.createElement("h4");title.textContent=kind==="weekly"?"📅 Kişisel haftalık programın":kind==="plan"?"🧠 Kişisel eğitim yol haritan":"✨ Koçunun önerisi";box.appendChild(title);if(answer.answer){const p=document.createElement("p");p.textContent=answer.answer;box.appendChild(p)}if(answer.explanation){const p=document.createElement("p");p.textContent=answer.explanation;box.appendChild(p)}if(Array.isArray(answer.steps)&&answer.steps.length){const ol=document.createElement("ol");answer.steps.forEach(step=>{const li=document.createElement("li");li.textContent=step;ol.appendChild(li)});box.appendChild(ol)}if(answer.hint){const p=document.createElement("p");p.textContent=`💡 ${answer.hint}`;box.appendChild(p)}area.appendChild(box);if(kind==="daily"||kind==="weekly"||kind==="plan")writeJson(PLAN_KEY,{kind,answer,createdAt:Date.now()})}

function applyRoadmapToTasks(root){
  const insight=buildCoachInsight({profile:coachProfile(),assessment:latestAssessment(),errors:errorBook(),history:learningHistory(),tasks:coachTasks(),checkins:coachCheckins()});
  const tasks=coachTasks();let added=0;
  insight.actions.forEach(action=>{if(tasks.some(task=>!task.done&&String(task.title).trim().toLocaleLowerCase("tr-TR")===action.title.trim().toLocaleLowerCase("tr-TR")))return;tasks.unshift({id:`roadmap-${Date.now()}-${added}`,title:action.title,due:"",done:false,createdAt:Date.now(),source:"coach-roadmap",minutes:action.minutes});added+=1});
  writeJson(TASKS_KEY,tasks);renderTasks(root);renderStats(root);renderIntelligence(root);showToast(root,added?`${added} kişisel öneri görevlerine eklendi.`:"Bu öneriler zaten görevlerinde bulunuyor.")
}

function wireHub(root){
  root.querySelector("#coachSaveProfile")?.addEventListener("click",()=>{const profile={name:root.querySelector("#coachName").value.trim(),level:root.querySelector("#coachLevel").value,goal:root.querySelector("#coachGoal").value,weeklyHours:Number(root.querySelector("#coachHours").value)||6,weakSubjects:root.querySelector("#coachWeakSubjects").value.trim(),note:root.querySelector("#coachNote").value.trim()};writeJson(PROFILE_KEY,profile);renderStats(root);renderIntelligence(root);showToast(root,"Kişisel profilin kaydedildi ve yol haritan güncellendi.")});
  root.querySelector("#coachApplyRoadmap")?.addEventListener("click",()=>applyRoadmapToTasks(root));
  root.querySelectorAll("[data-coach-kind]").forEach(button=>button.addEventListener("click",async()=>{const kind=button.dataset.coachKind;const area=root.querySelector("#coachAiArea");area.innerHTML='<div class="coachLoading"><b>✦</b><span>Seviye, yanlışlar, soru geçmişi ve çalışma verilerini birleştiriyorum…</span></div>';root.querySelectorAll("[data-coach-kind]").forEach(b=>b.disabled=true);try{const answer=await callCoach(kind);renderAiAnswer(root,answer,kind)}catch(error){area.textContent="";const box=document.createElement("div");box.className="coachError";box.textContent=error instanceof Error?error.message:"Koçluk önerisi hazırlanamadı.";area.appendChild(box)}finally{root.querySelectorAll("[data-coach-kind]").forEach(b=>b.disabled=false)}}));
  root.querySelector("#coachAddTask")?.addEventListener("click",()=>{const title=root.querySelector("#coachTaskTitle").value.trim();if(!title){showToast(root,"Önce bir görev yaz.",true);return}const due=root.querySelector("#coachTaskDue").value;const tasks=coachTasks();tasks.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,title,due,done:false,createdAt:Date.now()});writeJson(TASKS_KEY,tasks);root.querySelector("#coachTaskTitle").value="";root.querySelector("#coachTaskDue").value="";renderTasks(root);renderStats(root);renderIntelligence(root);showToast(root,"Görev eklendi.")});
  root.querySelector("#coachSaveCheckin")?.addEventListener("click",()=>{const minutes=Math.max(0,Number(root.querySelector("#coachMinutes").value)||0);const focus=Number(root.querySelector("#coachFocus").value)||3;const note=root.querySelector("#coachCheckinNote").value.trim();const items=coachCheckins();items.unshift({id:Date.now(),minutes,focus,note,createdAt:Date.now()});writeJson(CHECKINS_KEY,items.slice(0,60));root.querySelector("#coachMinutes").value="";root.querySelector("#coachCheckinNote").value="";renderStats(root);renderIntelligence(root);showToast(root,"Günlük kontrolün kaydedildi; çalışma ritmin ve yol haritan güncellendi.")});
  root.querySelector("#coachMentorRequest")?.addEventListener("click",()=>{writeJson(MENTOR_KEY,{requestedAt:Date.now(),profile:coachProfile(),snapshot:contextSnapshot()});showToast(root,"Mentor talebin ve eğitim özetin kaydedildi. Canlı eşleştirme altyapısı açıldığında kullanılacak.")});
}

function refreshOpenCoach(){const root=document.getElementById("coachBackdrop");if(root&&isVisible(root)){renderStats(root);renderTasks(root);renderIntelligence(root)}}
function openCoach(){const root=createHub();fillProfile(root);renderTasks(root);renderStats(root);renderIntelligence(root);const saved=readJson(PLAN_KEY,null);const area=root.querySelector("#coachAiArea");area.textContent="";if(saved?.answer)renderAiAnswer(root,saved.answer,saved.kind);root.hidden=false;document.body.style.overflow="hidden";setTimeout(()=>root.querySelector(".coachClose")?.focus(),20)}
function closeCoach(){const root=document.getElementById("coachBackdrop");if(root)root.hidden=true;document.body.style.overflow=""}

document.addEventListener("click",event=>{const target=event.target instanceof Element?event.target:null;const button=target?.closest(".bottomNav button:nth-child(2)");if(!button)return;event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();openCoach()},true);

const observer=new MutationObserver(()=>rewriteBottomNav());observer.observe(document.documentElement,{childList:true,subtree:true});rewriteBottomNav();
window.addEventListener("storage",refreshOpenCoach);
window.addEventListener("nesevren-learning-data-synced",refreshOpenCoach);
