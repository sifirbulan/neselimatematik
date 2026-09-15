const PHOTO_MEMORY_KEY='nesevren-error-photo-memory-v1';
const PHOTO_MEMORY_OWNER_KEY='nesevren-error-photo-memory-owner-v1';
const PROFILE_KEY='nesevren-user-profile-v1';
const PHOTO_MEMORY_LIMIT=12;
let pendingPhotoQuestion=null;

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function readText(key){try{return localStorage.getItem(key)||''}catch{return''}}
function writeText(key,value){try{localStorage.setItem(key,value)}catch{}}
function cleanText(value=''){return String(value||'').replace(/\s+/g,' ').trim()}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]))}
function currentProfile(){const value=readJson(PROFILE_KEY,null);return value&&typeof value==='object'?value:null}
function currentUserId(){const profile=currentProfile();return typeof profile?.userId==='string'?profile.userId:''}
function currentGrade(){const profile=currentProfile();return profile?.role==='student'&&typeof profile?.grade==='string'?profile.grade:''}
function currentSubject(){
  const selected=document.querySelector('#subject,.subjectInline select')?.value?.trim();
  if(selected&&selected!=='Otomatik')return selected;
  const label=document.querySelector('.composerTitle span')?.textContent?.trim()||'';
  return label&&label!=='Dersi AI algılar'&&label!=='Otomatik'?label:'Otomatik';
}
function photoImage(){const src=document.querySelector('.photoPreview img')?.getAttribute('src')||'';return src.startsWith('data:image/')?src:''}
function photoName(){return cleanText(document.querySelector('.photoPreviewFooter span')?.textContent||'')}
function questionText(){return cleanText(document.querySelector('.modernQuestionBox textarea')?.value||'')}
function parseBody(init){if(!init||typeof init.body!=='string')return null;try{return JSON.parse(init.body)}catch{return null}}
function shortText(value,limit){const text=cleanText(value);return text.length>limit?`${text.slice(0,limit-1)}…`:text}
function imageSignature(dataUrl=''){let hash=2166136261;const step=Math.max(1,Math.floor(dataUrl.length/160));for(let i=0;i<dataUrl.length;i+=step){hash^=dataUrl.charCodeAt(i);hash=Math.imul(hash,16777619)}return`${dataUrl.length}-${(hash>>>0).toString(36)}`}

async function compactImage(dataUrl){
  if(!dataUrl)return'';
  try{
    const image=new Image();image.src=dataUrl;await image.decode();
    const max=480;const scale=Math.min(1,max/Math.max(image.naturalWidth||1,image.naturalHeight||1));
    const width=Math.max(1,Math.round(image.naturalWidth*scale));const height=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');if(!context)return'';
    context.drawImage(image,0,0,width,height);
    return canvas.toDataURL('image/jpeg',.62);
  }catch{return''}
}

function memoryItems(){const value=readJson(PHOTO_MEMORY_KEY,[]);return Array.isArray(value)?value:[]}
function scopedMemoryItems(){
  const user=currentUserId();const all=memoryItems();const hasUnscoped=all.some(item=>!item?.userId);let owner=readText(PHOTO_MEMORY_OWNER_KEY);
  if(user&&!owner&&hasUnscoped){owner=user;writeText(PHOTO_MEMORY_OWNER_KEY,user)}
  if(user)return all.filter(item=>item?.userId===user||(!item?.userId&&owner===user));
  return owner?[]:all.filter(item=>!item?.userId);
}
function persistMemory(record){
  const all=memoryItems();
  const withoutDuplicate=all.filter(item=>!(item?.userId===record.userId&&item?.signature===record.signature));
  const next=[record,...withoutDuplicate].sort((a,b)=>Number(b?.createdAt||0)-Number(a?.createdAt||0)).slice(0,PHOTO_MEMORY_LIMIT);
  if(writeJson(PHOTO_MEMORY_KEY,next))return;
  const lightweight=next.map(item=>({...item,imagePreview:''}));
  writeJson(PHOTO_MEMORY_KEY,lightweight);
}

async function rememberPhoto(snapshot,data){
  const detectedTopic=cleanText(data?.analysis?.topic||'');
  const detectedSubtopic=cleanText(data?.analysis?.subtopic||'');
  const selectedSubject=snapshot.subject;
  const subject=selectedSubject&&selectedSubject!=='Otomatik'?selectedSubject:(detectedTopic||'Genel');
  const topic=detectedSubtopic||detectedTopic||'Genel';
  const answer=data?.finalAnswer||data?.answer||null;
  const preview=await compactImage(snapshot.imageDataUrl);
  const record={
    id:`photo-${snapshot.createdAt}-${snapshot.signature}`,
    userId:snapshot.userId,
    source:'photo',
    inputType:'image',
    signature:snapshot.signature,
    question:snapshot.question||snapshot.fileName||'Fotoğraflı soru',
    fileName:snapshot.fileName,
    subject,
    topic,
    selectedSubject,
    detectedTopic,
    detectedSubtopic,
    difficulty:cleanText(data?.analysis?.difficulty||''),
    grade:snapshot.grade,
    answerSummary:shortText(answer?.answer||answer?.explanation||'',420),
    hint:shortText(answer?.hint||'',220),
    imagePreview:preview,
    createdAt:snapshot.createdAt,
    lastSeenAt:Date.now()
  };
  persistMemory(record);
  document.dispatchEvent(new CustomEvent('nesevren:photo-memory-updated',{detail:record}));
}

function capturePhotoQuestion(){
  const imageDataUrl=photoImage();
  if(!imageDataUrl){pendingPhotoQuestion=null;return}
  const createdAt=Date.now();
  pendingPhotoQuestion={
    imageDataUrl,
    signature:imageSignature(imageDataUrl),
    question:questionText(),
    fileName:photoName(),
    subject:currentSubject(),
    grade:currentGrade(),
    userId:currentUserId(),
    createdAt
  };
}

const previousFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:input instanceof Request?input.url:String(input||'');
  const body=parseBody(init);
  const isPhotoSolve=Boolean(pendingPhotoQuestion&&url.includes('/api/v1/questions/analyze')&&body?.intent==='solve'&&body?.inputType==='image');
  const snapshot=isPhotoSolve?pendingPhotoQuestion:null;
  if(isPhotoSolve)pendingPhotoQuestion=null;
  const response=await previousFetch(input,init);
  if(response.ok&&snapshot){
    response.clone().json().then(data=>rememberPhoto(snapshot,data)).catch(()=>{});
  }
  return response;
};

function injectErrorBookPhotoSummary(){
  const modal=[...document.querySelectorAll('.assessmentModal')].find(node=>(node.querySelector('h2')?.textContent||'').includes('Hata Kitapçığı'));
  if(!modal)return;
  modal.querySelector('[data-photo-memory-summary]')?.remove();
  const items=scopedMemoryItems();if(!items.length)return;
  const latest=items.slice(0,3);
  const section=document.createElement('section');section.className='teacherNotice';section.dataset.photoMemorySummary='1';
  section.innerHTML=`<strong>📷 Fotoğraf hafızası · ${items.length} soru</strong><p>Fotoğrafla gönderdiğin sorular ders/konu ve çözüm özetiyle Hata Kitapçığı için kaynak veri olarak saklanıyor.</p>${latest.map(item=>`<p><b>${escapeHtml(item.subject||'Genel')} · ${escapeHtml(item.topic||'Genel')}</b><br>${escapeHtml(shortText(item.question||'Fotoğraflı soru',90))}</p>`).join('')}`;
  const head=modal.querySelector('.assessmentHead');head?.insertAdjacentElement('afterend',section);
}

document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  if(target.closest('.modernQuestionBox .solveButton'))capturePhotoQuestion();
  const button=target.closest('button');
  if(button&&(button.textContent||'').includes('Hata Kitapçığı')){
    setTimeout(injectErrorBookPhotoSummary,0);
    setTimeout(injectErrorBookPhotoSummary,80);
  }
},true);
document.addEventListener('nesevren:photo-memory-updated',()=>setTimeout(injectErrorBookPhotoSummary,0));
