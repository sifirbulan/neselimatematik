const configuredApiUrl=(import.meta.env.VITE_API_URL??'').trim().replace(/\/+$/,'');
const API_URL=!configuredApiUrl||configuredApiUrl==='https://nesevren-api.onrender.com'?'https://nesevren-api-v2.onrender.com':configuredApiUrl;
const PROFILE_KEY='nesevren-user-profile-v1';

let activeSession=null;

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function optionCountForGrade(grade){if(grade==='LGS')return 4;const n=Number(grade);if(Number.isFinite(n)){if(n<=4)return 3;if(n<=8)return 4}return 5}
function currentGrade(){
  const assessment=readJson('nesevren-assessment');const assessmentGrade=typeof assessment?.grade==='string'?assessment.grade.trim():'';
  if(assessmentGrade)return assessmentGrade;
  const profile=readJson(PROFILE_KEY,null);const profileGrade=profile?.role==='student'&&typeof profile?.grade==='string'?profile.grade.trim():'';
  return profileGrade||null;
}
function levelLabel(grade){return /^\d+$/.test(String(grade||''))?`${grade}. sınıf`:String(grade||'Standart seviye')}
function currentQuestion(){return document.querySelector('.modernQuestionBox textarea')?.value?.trim()||''}
function currentImage(){const src=document.querySelector('.photoPreview img')?.getAttribute('src')||'';return src.startsWith('data:image/')?src:''}
function currentSubject(){
  const selected=document.querySelector('#subject,.subjectInline select')?.value?.trim();
  if(selected&&selected!=='Otomatik')return selected;
  const label=document.querySelector('.composerTitle span')?.textContent?.trim()||'';
  return label&&label!=='Dersi AI algılar'&&label!=='Otomatik'?label:'Otomatik';
}
function resultAnchor(){return document.querySelector('.smartActions')}
function removeOld(){document.querySelector('.practiceFixSet')?.remove();document.querySelector('.practiceFixMessage')?.remove()}
function showMessage(text,kind='error'){activeSession=null;removeOld();const anchor=resultAnchor();if(!anchor)return;const box=document.createElement('div');box.className=`practiceFixMessage ${kind}`;box.textContent=text;anchor.insertAdjacentElement('afterend',box)}

function parseTextCandidate(value){
  const text=String(value||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  if(!text)return null;
  const objectStart=text.indexOf('{'),objectEnd=text.lastIndexOf('}');
  const arrayStart=text.indexOf('['),arrayEnd=text.lastIndexOf(']');
  const candidates=[];
  if(objectStart>=0&&objectEnd>objectStart)candidates.push(text.slice(objectStart,objectEnd+1));
  if(arrayStart>=0&&arrayEnd>arrayStart)candidates.push(text.slice(arrayStart,arrayEnd+1));
  candidates.push(text);
  for(const candidate of candidates){try{return JSON.parse(candidate)}catch{}}
  return null;
}

function extractQuestionCandidate(data){
  const candidates=[data?.finalAnswer?.answer,data?.answer?.answer,data?.answer,data?.finalAnswer,data?.questions,data];
  for(const value of candidates){
    if(Array.isArray(value)&&value.length)return value[0];
    if(value&&typeof value==='object'){
      if(Array.isArray(value.questions)&&value.questions.length)return value.questions[0];
      if(value.question||value.soru)return value;
    }
    if(typeof value==='string'&&value.trim()){
      const parsed=parseTextCandidate(value);
      if(Array.isArray(parsed)&&parsed.length)return parsed[0];
      if(parsed&&typeof parsed==='object'&&Array.isArray(parsed.questions)&&parsed.questions.length)return parsed.questions[0];
      if(parsed&&typeof parsed==='object'&&(parsed.question||parsed.soru))return parsed;
    }
  }
  return null;
}

function normalizeQuestion(raw,expectedOptions){
  const q=raw&&typeof raw==='object'?raw:{};
  const question=String(q.question??q.soru??'').trim();
  const options=Array.isArray(q.options)?q.options:Array.isArray(q.choices)?q.choices:Array.isArray(q.siklar)?q.siklar:[];
  const cleanOptions=options.map(x=>String(x).trim()).filter(Boolean);
  let correctIndex=Number(q.correctIndex);
  if(!Number.isInteger(correctIndex)){
    const answer=String(q.correctAnswer??q.answer??'').trim().toUpperCase();
    if(/^[A-E]$/.test(answer))correctIndex=answer.charCodeAt(0)-65;
    else if(/^\d+$/.test(answer)){const n=Number(answer);correctIndex=n>=1?n-1:n}
  }
  const hint=String(q.hint??q.ipucu??'Bir kez daha işlem sırasını ve sorunun istediğini kontrol et.').trim();
  if(!question)throw new Error('Soru oluşturulamadı.');
  if(cleanOptions.length!==expectedOptions)throw new Error(`Soru ${expectedOptions} şıklı hazırlanmadı.`);
  if(!Number.isInteger(correctIndex)||correctIndex<0||correctIndex>=cleanOptions.length)throw new Error('Sorunun doğru cevabı belirlenemedi.');
  return{question,options:cleanOptions,correctIndex,hint};
}

function createSessionShell(session){
  removeOld();const anchor=resultAnchor();if(!anchor)throw new Error('Mini pratik alanı bulunamadı.');
  const wrap=document.createElement('section');wrap.className='practiceFixSet';
  wrap.innerHTML=`<div class="practiceFixTitle"><div><strong>📝 3 Soruluk Mini Pratik</strong><span>${escapeHtml(levelLabel(session.grade))} · ${session.optionCount} şık · sorular sırayla hazırlanır</span></div><b class="practiceFixProgress">1/3</b></div><div class="practiceFixCards"></div>`;
  anchor.insertAdjacentElement('afterend',wrap);session.wrap=wrap;wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

function setProgress(session,step){
  const progress=session.wrap?.querySelector('.practiceFixProgress');
  if(progress)progress.textContent=`${Math.min(step,3)}/3`;
  const subtitle=session.wrap?.querySelector('.practiceFixTitle span');
  if(subtitle)subtitle.textContent=`${levelLabel(session.grade)} · ${session.optionCount} şık · ${session.correctCount} doğru`;
}
function renderLoading(session,step){
  const cards=session.wrap?.querySelector('.practiceFixCards');if(!cards)return;
  setProgress(session,step);
  cards.innerHTML=`<div class="practiceFixLoading"><span>✦</span><strong>${step}. soru hazırlanıyor…</strong><small>Yalnızca bu soru üretiliyor.</small></div>`;
}

function renderCompletion(session){
  const cards=session.wrap?.querySelector('.practiceFixCards');if(!cards)return;
  setProgress(session,3);
  cards.innerHTML=`<div class="practiceFixSummary"><strong>🎯 3 soruluk çalışma tamamlandı.</strong><span>${session.correctCount}/3 doğru yaptın.</span><small>Yeni bir çalışma için üstteki “3 Soru Hazırla” düğmesine tekrar basabilirsin.</small></div>`;
}

function renderQuestion(session,item,step){
  const cards=session.wrap?.querySelector('.practiceFixCards');if(!cards)return;
  setProgress(session,step);
  const card=document.createElement('article');card.className='practiceFixCard';
  card.innerHTML=`<div class="practiceFixNumber">${step}</div><h3>${escapeHtml(item.question)}</h3><div class="practiceFixOptions"></div><div class="practiceFixFeedback" hidden></div>`;
  const options=card.querySelector('.practiceFixOptions');
  item.options.forEach((option,oIndex)=>{
    const btn=document.createElement('button');btn.type='button';btn.innerHTML=`<span>${String.fromCharCode(65+oIndex)}</span>${escapeHtml(option)}`;
    btn.addEventListener('click',()=>{
      if(card.dataset.answered==='1')return;
      card.dataset.answered='1';
      const correct=oIndex===item.correctIndex;
      if(correct)session.correctCount+=1;
      session.results.push({step,question:item.question,correct});
      setProgress(session,step);
      [...options.querySelectorAll('button')].forEach((b,i)=>{b.disabled=true;if(i===item.correctIndex)b.classList.add('correct');else if(i===oIndex)b.classList.add('wrong');else b.classList.add('muted')});
      const feedback=card.querySelector('.practiceFixFeedback');feedback.hidden=false;
      if(correct){feedback.className='practiceFixFeedback success';feedback.innerHTML='<strong>🎉 Tebrikler, doğru cevap!</strong><span>Bir sonraki soru biraz daha ilerletebilir.</span>'}
      else{feedback.className='practiceFixFeedback retry';feedback.innerHTML=`<strong>Bir daha düşünelim.</strong><span>💡 ${escapeHtml(item.hint)}</span>`}
      const next=document.createElement('button');next.type='button';next.className='practiceFixNext';
      if(step<3){next.textContent=`${step+1}. Soruyu Hazırla →`;next.addEventListener('click',()=>loadStep(session,step+1,correct,item.question,next))}
      else{next.textContent='Çalışmayı Tamamla ✓';next.addEventListener('click',()=>renderCompletion(session))}
      feedback.insertAdjacentElement('afterend',next);
    });
    options.appendChild(btn);
  });
  cards.replaceChildren(card);
}

function buildPrompt(session,step,previousCorrect,previousQuestion){
  const labels=Array.from({length:session.optionCount},(_,i)=>String.fromCharCode(65+i)).join(', ');
  const prior=session.results.map(r=>`${r.step}. soru: ${r.question} — ${r.correct?'doğru':'yanlış'}`).join(' | ');
  let adaptation='Orijinal soruyla aynı beceriyi ölçen, benzer zorlukta bir başlangıç sorusu hazırla.';
  if(step>1&&previousCorrect===true)adaptation='Öğrenci önceki soruyu doğru yaptı. Aynı kazanımı koru; yeni sayılar veya yeni bağlam kullan ve zorluğu küçük bir adım artır.';
  if(step>1&&previousCorrect===false)adaptation='Öğrenci önceki soruyu yanlış yaptı. Aynı kazanımı daha sade ve pekiştirici biçimde sor; gereksiz zorluk ekleme.';
  return `${session.subject==='Otomatik'?'Dersi sorunun içeriğinden kendin belirle.':`Ders: ${session.subject}.`} Öğrencinin düzeyi: ${session.grade?levelLabel(session.grade):'seviye bilgisi yok; standart düzey kullan'}. Bu 3 soruluk mini pratiğin ${step}. sorusunu hazırlıyorsun. ${adaptation} TAM OLARAK 1 yeni çoktan seçmeli soru üret. Her soruda TAM OLARAK ${session.optionCount} şık (${labels}) olsun. Önceki üretilen soruları tekrar etme. Cevabı kullanıcıya önceden gösterme. Yanlış cevapta kullanılmak üzere doğru cevabı açık etmeyen kısa bir ipucu ver. Çıktın SADECE şu biçimde tek JSON nesnesi olsun ve başka hiçbir metin yazma: {"question":"...","options":["..."],"correctIndex":0,"hint":"..."}. Orijinal soru: ${session.question||'Eklenen fotoğraftaki soru'}.${previousQuestion?` Bir önceki soru: ${previousQuestion}.`:''}${prior?` Önceki sonuçlar: ${prior}.`:''}`;
}

async function loadStep(session,step,previousCorrect=null,previousQuestion='',triggerButton=null){
  if(activeSession!==session)return;
  if(triggerButton){triggerButton.disabled=true;triggerButton.textContent='Hazırlanıyor…'}
  renderLoading(session,step);
  try{
    const prompt=buildPrompt(session,step,previousCorrect,previousQuestion);
    const response=await fetch(`${API_URL}/api/v1/questions/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:prompt,inputType:session.imageDataUrl?'image':'text',intent:'generate_test',...(session.imageDataUrl?{imageDataUrl:session.imageDataUrl}:{})})});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.error?.message||`Soru servisi ${response.status} hatası döndürdü.`);
    const raw=extractQuestionCandidate(data);const item=normalizeQuestion(raw,session.optionCount);renderQuestion(session,item,step);
  }catch(error){
    const cards=session.wrap?.querySelector('.practiceFixCards');
    if(cards)cards.innerHTML=`<div class="practiceFixMessage error">${escapeHtml(error instanceof Error?error.message:'Soru hazırlanamadı. Lütfen tekrar dene.')}</div>`;
  }
}

async function startPractice(button){
  const question=currentQuestion(),imageDataUrl=currentImage();
  if(!question&&!imageDataUrl){showMessage('Önce bir soru yaz veya fotoğraf ekle; sonra 3 Soru Hazırla’ya bas.');return}
  const grade=currentGrade();const optionCount=grade?optionCountForGrade(grade):4;
  const session={question,imageDataUrl,grade,optionCount,subject:currentSubject(),correctCount:0,results:[],wrap:null};
  activeSession=session;
  const original=button.querySelector('strong')?.textContent||'3 Soru Hazırla';button.disabled=true;if(button.querySelector('strong'))button.querySelector('strong').textContent='1. Soru hazırlanıyor…';
  try{createSessionShell(session);await loadStep(session,1)}catch(error){showMessage(error instanceof Error?error.message:'İlk soru hazırlanamadı. Lütfen tekrar dene.')}
  finally{button.disabled=false;if(button.querySelector('strong'))button.querySelector('strong').textContent=original}
}

document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;const button=target?.closest('button.smartAction');if(!button)return;const text=(button.textContent||'').replace(/\s+/g,' ').trim();if(!text.includes('3 Soru Hazırla')&&!text.includes('Soru hazırlanıyor'))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();startPractice(button)},true);
