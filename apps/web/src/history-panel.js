const HISTORY_V2_KEY='nesevren-history-v2';
const LEGACY_HISTORY_KEY='nesevren-history';
const PROFILE_KEY='nesevren-user-profile-v1';
const HISTORY_LIMIT=250;

let pendingStudentQuestion=null;
let activeFilter='Tümü';

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function cleanText(value=''){return String(value||'').replace(/\s+/g,' ').trim()}
function currentUserId(){const p=readJson(PROFILE_KEY,null);return p&&typeof p==='object'&&typeof p.userId==='string'?p.userId:''}
function currentQuestion(){return cleanText(document.querySelector('.modernQuestionBox textarea')?.value||'')}
function currentSubject(){const selected=document.querySelector('.subjectInline select')?.value?.trim();return selected&&selected!=='Otomatik'?selected:'Otomatik'}
function hasPhotoQuestion(){return Boolean(document.querySelector('.photoPreview img'))}

function inferTopic(question,subject=''){
  const q=cleanText(question).toLocaleLowerCase('tr-TR');
  if(!q)return 'Genel';
  const rules=[
    [/türev|turev/,'Türev'],[/integral/,'İntegral'],[/limit/,'Limit'],[/fonksiyon/,'Fonksiyonlar'],[/polinom/,'Polinomlar'],[/logarit/,'Logaritma'],[/trigon/,'Trigonometri'],[/üslü|ussu|üs /,'Üslü Sayılar'],[/köklü|koklu/,'Köklü Sayılar'],[/denklem/,'Denklemler'],[/eşitsiz|esitsiz/,'Eşitsizlikler'],[/olasılık|olasilik/,'Olasılık'],[/oran|orantı|oranti/,'Oran ve Orantı'],[/yüzde|yuzde/,'Yüzdeler'],[/üçgen|ucgen/,'Üçgenler'],[/geometri|açı|aci|çember|cember/,'Geometri'],
    [/hız|hiz|ivme|hareket/,'Hareket'],[/kuvvet/,'Kuvvet'],[/enerji/,'Enerji'],[/elektrik/,'Elektrik'],[/optik|ışık|isik/,'Optik'],
    [/atom|periyodik|element/,'Atom ve Periyodik Sistem'],[/asit|baz/,'Asitler ve Bazlar'],[/mol|tepkime/,'Kimyasal Tepkimeler'],
    [/hücre|hucre/,'Hücre'],[/genetik|dna|rna/,'Genetik'],[/fotosentez/,'Fotosentez'],[/ekosistem/,'Ekosistem'],
    [/paragraf/,'Paragraf'],[/fiil|isim|zarf|cümle|cumle/,'Dil Bilgisi'],[/şiir|siir/,'Şiir'],[/roman|hikâye|hikaye/,'Edebî Türler'],
    [/osmanlı|osmanli/,'Osmanlı Tarihi'],[/cumhuriyet|inkılap|inkilap/,'T.C. İnkılap Tarihi'],[/iklim/,'İklim'],[/harita/,'Harita Bilgisi']
  ];
  for(const [pattern,label] of rules)if(pattern.test(q))return label;
  return subject&&subject!=='Genel'&&subject!=='Otomatik'?'Genel':'Genel';
}

function normalizeItem(item){
  if(!item||typeof item!=='object')return null;
  const question=cleanText(item.question||'');
  if(!question)return null;
  return{
    id:String(item.id||`${item.createdAt||Date.now()}-${Math.random().toString(36).slice(2,8)}`),
    question,
    subject:cleanText(item.subject||'Genel')||'Genel',
    topic:cleanText(item.topic||'Genel')||'Genel',
    source:item.source==='practice'?'practice':'student',
    inputType:item.inputType==='image'?'image':'text',
    createdAt:Number(item.createdAt)||Date.now(),
    userId:cleanText(item.userId||'')
  };
}

function v2History(){const value=readJson(HISTORY_V2_KEY,[]);return Array.isArray(value)?value.map(normalizeItem).filter(Boolean):[]}
function legacyHistory(){
  const value=readJson(LEGACY_HISTORY_KEY,[]);if(!Array.isArray(value))return[];
  return value.map(item=>normalizeItem({
    question:item?.question,
    subject:item?.subject||'Genel',
    topic:'Genel',
    source:'student',
    createdAt:item?.createdAt,
    inputType:String(item?.question||'').includes('Fotoğraflı')?'image':'text'
  })).filter(Boolean);
}
function allHistory(){
  const modern=v2History();const legacy=legacyHistory();
  const combined=[...modern];
  for(const old of legacy){
    const duplicate=modern.some(item=>item.source==='student'&&item.question===old.question&&Math.abs(item.createdAt-old.createdAt)<60000);
    if(!duplicate)combined.push(old);
  }
  return combined.sort((a,b)=>b.createdAt-a.createdAt);
}
function addHistoryItem(raw){
  const item=normalizeItem({...raw,userId:raw?.userId||currentUserId()});if(!item)return;
  const items=v2History();
  const duplicate=items.find(x=>x.source===item.source&&x.question===item.question&&Math.abs(x.createdAt-item.createdAt)<30000);
  if(duplicate)return;
  writeJson(HISTORY_V2_KEY,[item,...items].sort((a,b)=>b.createdAt-a.createdAt).slice(0,HISTORY_LIMIT));
  document.dispatchEvent(new CustomEvent('nesevren:history-updated'));
}

function parseBody(init){if(!init||typeof init.body!=='string')return null;try{return JSON.parse(init.body)}catch{return null}}
function parseTextCandidate(value){
  const text=String(value||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');if(!text)return null;
  const objectStart=text.indexOf('{'),objectEnd=text.lastIndexOf('}');const arrayStart=text.indexOf('['),arrayEnd=text.lastIndexOf(']');
  const candidates=[];if(objectStart>=0&&objectEnd>objectStart)candidates.push(text.slice(objectStart,objectEnd+1));if(arrayStart>=0&&arrayEnd>arrayStart)candidates.push(text.slice(arrayStart,arrayEnd+1));candidates.push(text);
  for(const candidate of candidates){try{return JSON.parse(candidate)}catch{}}return null;
}
function generatedQuestionFromResponse(data){
  const candidates=[data?.finalAnswer?.answer,data?.answer?.answer,data?.answer,data?.finalAnswer,data?.questions,data];
  for(const value of candidates){
    if(Array.isArray(value)&&value.length)return cleanText(value[0]?.question||value[0]?.soru||'');
    if(value&&typeof value==='object'){
      if(Array.isArray(value.questions)&&value.questions.length)return cleanText(value.questions[0]?.question||value.questions[0]?.soru||'');
      if(value.question||value.soru)return cleanText(value.question||value.soru);
    }
    if(typeof value==='string'&&value.trim()){
      const parsed=parseTextCandidate(value);
      if(Array.isArray(parsed)&&parsed.length)return cleanText(parsed[0]?.question||parsed[0]?.soru||'');
      if(parsed&&typeof parsed==='object'&&Array.isArray(parsed.questions)&&parsed.questions.length)return cleanText(parsed.questions[0]?.question||parsed.questions[0]?.soru||'');
      if(parsed&&typeof parsed==='object')return cleanText(parsed.question||parsed.soru||'');
    }
  }
  return'';
}
function originalQuestionFromPracticePrompt(prompt=''){
  const match=String(prompt).match(/Orijinal soru:\s*([\s\S]*?)(?=\.\s*(?:Bir önceki soru:|Önceki sonuçlar:)|$)/i);
  return cleanText(match?.[1]||'');
}
function bestClassification(data,originalQuestion='',selectedSubject=''){
  let subject=cleanText(data?.analysis?.topic||'Genel')||'Genel';
  let topic=cleanText(data?.analysis?.subtopic||'Genel')||'Genel';
  const recent=allHistory().find(item=>item.source==='student'&&originalQuestion&&item.question===originalQuestion);
  if(recent){subject=recent.subject;topic=recent.topic}
  if((subject==='Genel'||subject==='Otomatik')&&selectedSubject&&selectedSubject!=='Otomatik')subject=selectedSubject;
  if(topic==='Genel'&&originalQuestion)topic=inferTopic(originalQuestion,subject);
  return{subject,topic};
}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:input instanceof Request?input.url:String(input||'');
  const body=parseBody(init);
  const isAnalyze=url.includes('/api/v1/questions/analyze');
  const studentRequest=Boolean(isAnalyze&&body?.intent==='solve'&&pendingStudentQuestion);
  const practiceRequest=Boolean(isAnalyze&&body?.intent==='generate_test'&&String(body?.question||'').toLocaleLowerCase('tr-TR').includes('3 soruluk mini prati'));
  const studentSnapshot=studentRequest?pendingStudentQuestion:null;
  if(studentRequest)pendingStudentQuestion=null;
  const response=await nativeFetch(input,init);
  if(response.ok&&(studentRequest||practiceRequest)){
    response.clone().json().then(data=>{
      if(studentRequest&&studentSnapshot){
        const classification=bestClassification(data,studentSnapshot.question,studentSnapshot.selectedSubject);
        addHistoryItem({
          question:studentSnapshot.question||'Fotoğraflı soru',
          subject:classification.subject,
          topic:classification.topic,
          source:'student',
          inputType:studentSnapshot.inputType,
          createdAt:studentSnapshot.createdAt
        });
      }
      if(practiceRequest){
        const generated=generatedQuestionFromResponse(data);if(!generated)return;
        const original=originalQuestionFromPracticePrompt(body?.question||'');
        const classification=bestClassification(data,original,currentSubject());
        addHistoryItem({question:generated,subject:classification.subject,topic:classification.topic,source:'practice',inputType:'text',createdAt:Date.now()});
      }
    }).catch(()=>{});
  }
  return response;
};

function formatTime(timestamp){
  const date=new Date(timestamp);const now=new Date();
  const sameDay=date.toDateString()===now.toDateString();
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
  const day=sameDay?'Bugün':date.toDateString()===yesterday.toDateString()?'Dün':new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short'}).format(date);
  const time=new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit'}).format(date);
  return`${day} · ${time}`;
}
function closeHistory(){document.getElementById('historyPanelBackdrop')?.remove();document.body.style.overflow=''}
function setNativeValue(element,value){
  if(!element)return;const proto=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(element,value);else element.value=value;
  element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
}
function reopenQuestion(item,startPractice=false){
  closeHistory();
  const textarea=document.querySelector('.modernQuestionBox textarea');if(textarea){setNativeValue(textarea,item.question);textarea.focus();textarea.scrollIntoView({behavior:'smooth',block:'center'})}
  const select=document.querySelector('.subjectInline select');if(select&&item.subject&&[...select.options].some(o=>o.value===item.subject))setNativeValue(select,item.subject);
  if(startPractice)setTimeout(()=>{const button=[...document.querySelectorAll('button.smartAction')].find(b=>(b.textContent||'').includes('3 Soru Hazırla'));button?.click()},180);
}
function groupItems(items){
  const map=new Map();
  for(const item of items){const key=`${item.subject}|||${item.topic}`;if(!map.has(key))map.set(key,{subject:item.subject,topic:item.topic,items:[]});map.get(key).items.push(item)}
  return[...map.values()].sort((a,b)=>b.items[0].createdAt-a.items[0].createdAt);
}
function renderHistoryContent(root){
  const items=allHistory();const subjects=['Tümü',...new Set(items.map(x=>x.subject).filter(Boolean))];
  if(!subjects.includes(activeFilter))activeFilter='Tümü';
  const filtered=activeFilter==='Tümü'?items:items.filter(x=>x.subject===activeFilter);
  const filters=root.querySelector('#historyFilters');
  filters.innerHTML=subjects.map(subject=>`<button type="button" data-history-filter="${escapeHtml(subject)}" class="${subject===activeFilter?'active':''}">${escapeHtml(subject)}</button>`).join('');
  filters.querySelectorAll('[data-history-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.historyFilter||'Tümü';renderHistoryContent(root)});
  const content=root.querySelector('#historyContent');const count=root.querySelector('#historyCount');if(count)count.textContent=`${items.length} soru`;
  if(!filtered.length){content.innerHTML='<div class="historyEmpty"><span>◌</span><strong>Henüz geçmiş kaydı yok</strong><p>Sorduğun ve Neşevren’in sana hazırladığı sorular burada ders ve konu başlıklarıyla görünecek.</p></div>';return}
  content.innerHTML=groupItems(filtered).map(group=>`<section class="historyGroup"><div class="historyGroupHead"><div><span>${escapeHtml(group.subject)}</span><h2>${escapeHtml(group.topic)}</h2></div><b>${group.items.length} soru</b></div><div class="historyCards">${group.items.map(item=>`<article class="historyCard" data-history-id="${escapeHtml(item.id)}"><div class="historyCardMeta"><span class="historySource ${item.source}">${item.source==='practice'?'✦ Neşevren hazırladı':'◉ Sen sordun'}</span><time>${escapeHtml(formatTime(item.createdAt))}</time></div><p>${item.inputType==='image'?'<em>▣ Fotoğraflı soru</em> ':''}${escapeHtml(item.question)}</p><div class="historyCardActions"><button type="button" data-history-open="${escapeHtml(item.id)}">Tekrar Aç</button><button type="button" data-history-practice="${escapeHtml(item.id)}">Benzer Soru Hazırla</button></div></article>`).join('')}</div></section>`).join('');
  const byId=new Map(items.map(item=>[item.id,item]));
  content.querySelectorAll('[data-history-open]').forEach(button=>button.onclick=()=>{const item=byId.get(button.dataset.historyOpen);if(item)reopenQuestion(item,false)});
  content.querySelectorAll('[data-history-practice]').forEach(button=>button.onclick=()=>{const item=byId.get(button.dataset.historyPractice);if(item)reopenQuestion(item,true)});
}
function openHistory(){
  closeHistory();
  const wrap=document.createElement('div');wrap.id='historyPanelBackdrop';wrap.className='historyPanelBackdrop';
  wrap.innerHTML='<section class="historyPanel" role="dialog" aria-modal="true" aria-labelledby="historyPanelTitle"><header class="historyPanelTop"><button class="historyBack" type="button" aria-label="Geri">←</button><div><small>NEŞEVREN</small><h1 id="historyPanelTitle">Geçmişim</h1></div><span id="historyCount">0 soru</span></header><div id="historyFilters" class="historyFilters"></div><main id="historyContent" class="historyContent"></main></section>';
  document.body.appendChild(wrap);document.body.style.overflow='hidden';wrap.querySelector('.historyBack').onclick=closeHistory;renderHistoryContent(wrap);
}

document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const solve=target.closest('.modernQuestionBox .solveButton');
  if(solve){const question=currentQuestion();pendingStudentQuestion={question:question||'Fotoğraflı soru',inputType:hasPhotoQuestion()?'image':'text',selectedSubject:currentSubject(),createdAt:Date.now()}}
  const navButton=target.closest('.bottomNav button');
  if(navButton&&(navButton.textContent||'').includes('Geçmiş')){event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();openHistory()}
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('historyPanelBackdrop'))closeHistory()});
document.addEventListener('nesevren:history-updated',()=>{const root=document.getElementById('historyPanelBackdrop');if(root)renderHistoryContent(root)});
