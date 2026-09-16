const SESSION_KEY='nesevren-auth-session-v1';
const PROFILE_KEY='nesevren-user-profile-v1';
const COACH_PROFILE_KEY='nesevren-coach-profile';
const INTENT_KEY='nesevren-live-teacher-intent-v1';
const PROFILE_VERSION=2;

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function removeKey(key){try{localStorage.removeItem(key)}catch{}}
function cleanText(value=''){return String(value||'').replace(/\s+/g,' ').trim()}
function hasPhoto(){return Boolean(document.querySelector('.photoPreview img'))}
function currentQuestion(){return cleanText(document.querySelector('.modernQuestionBox textarea')?.value||'')}
function currentSubject(){
  const selected=document.querySelector('#subject,.subjectInline select')?.value?.trim();
  if(selected&&selected!=='Otomatik')return selected;
  const label=cleanText(document.querySelector('.composerTitle span')?.textContent||'');
  return label&&label!=='Dersi AI algılar'&&label!=='Otomatik'?label:'Genel';
}
function currentLevel(){
  const profile=readJson(PROFILE_KEY,null);
  if(profile?.role==='student'&&typeof profile?.grade==='string'&&profile.grade.trim())return profile.grade.trim();
  const coach=readJson(COACH_PROFILE_KEY,null);
  return typeof coach?.level==='string'?coach.level.trim():'';
}
function sessionReady(){
  const session=readJson(SESSION_KEY,null);if(!session?.access_token)return false;
  const expiresAt=Number(session.expires_at||0);return !expiresAt||expiresAt>Date.now()+5000;
}
function profileComplete(){
  const profile=readJson(PROFILE_KEY,null);if(!profile||profile.profileVersion!==PROFILE_VERSION)return false;
  if(profile.role==='student')return Boolean(profile.grade);
  if(profile.role==='teacher')return Boolean(profile.educationLevel&&profile.branch);
  return false;
}
function captureContext(){
  const question=currentQuestion();const photo=hasPhoto();
  const note=question|| (photo?'Fotoğrafla yüklediğim soru için canlı öğretmen desteği istiyorum.':'Canlı öğretmen desteği istiyorum.');
  return{supportType:'Branş Öğretmeni',subject:currentSubject(),level:currentLevel(),note,photo,createdAt:Date.now()};
}
function setSelectValue(select,value){
  if(!select||!value)return false;
  const option=[...select.options].find(item=>item.value===value||item.textContent?.trim()===value);
  if(!option)return false;
  select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function applyContext(context){
  const root=document.getElementById('mentorBackdrop');if(!root)return false;
  const support=root.querySelector('#mentorSupportType');
  const subject=root.querySelector('#mentorSubject');
  const level=root.querySelector('#mentorLevel');
  const note=root.querySelector('#mentorNeedNote');
  if(!support&&!root.querySelector('#mentorSaveProfile'))return false;
  if(root.querySelector('#mentorSaveProfile')){removeKey(INTENT_KEY);return true}
  setSelectValue(support,context.supportType||'Branş Öğretmeni');
  if(!setSelectValue(subject,context.subject||''))setSelectValue(subject,'Genel');
  setSelectValue(level,context.level||'');
  if(note&&!note.value.trim())note.value=context.note||'';
  removeKey(INTENT_KEY);
  return true;
}
function openLiveTeacher(context){
  const hub=window.NesevrenMentorHub;
  if(!hub||typeof hub.open!=='function')return false;
  hub.open();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(applyContext(context)||attempts>=40)clearInterval(timer);
  },100);
  return true;
}
function resumePending(){
  const context=readJson(INTENT_KEY,null);if(!context||!sessionReady())return;
  if(profileComplete()){setTimeout(()=>openLiveTeacher(context),220);return}
  const onProfile=()=>{document.removeEventListener('nesevren:profile-updated',onProfile);const next=readJson(INTENT_KEY,null);if(next)setTimeout(()=>openLiveTeacher(next),120)};
  document.addEventListener('nesevren:profile-updated',onProfile,{once:true});
}

document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const button=target.closest('.teacherStrip');if(!button)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  const context=captureContext();writeJson(INTENT_KEY,context);
  if(!openLiveTeacher(context)){
    const fallback=document.querySelector('#coachMentorRequest');
    if(fallback instanceof HTMLElement)fallback.click();
  }
},true);

window.addEventListener('pageshow',()=>setTimeout(resumePending,250));
document.addEventListener('nesevren:profile-updated',()=>setTimeout(resumePending,80));
setTimeout(resumePending,350);
