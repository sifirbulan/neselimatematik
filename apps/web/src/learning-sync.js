import { mergeLearningSnapshots } from "./learning-sync-core.ts";

const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||"").trim().replace(/\/+$/g,"");
const SUPABASE_ANON_KEY=(import.meta.env.VITE_SUPABASE_ANON_KEY||"").trim();
const SESSION_KEY="nesevren-auth-session-v1";
const OWNER_KEY="nesevren-learning-owner-v1";
const STATUS_KEY="nesevren-learning-sync-status-v1";
const ASSESSMENT_KEY="nesevren-assessment";
const ERROR_BOOK_KEY="nesevren-error-book";
const PERFORMANCE_KEY="nesevren-performance-records";
const TABLE="nesevren_learning_data";
const LEARNING_KEYS=new Set([ASSESSMENT_KEY,ERROR_BOOK_KEY,PERFORMANCE_KEY]);
const configured=Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY);
let internalStorageWrite=false;
let syncTimer=0;
let syncing=false;
let pending=false;

function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function nativeSet(key,value){internalStorageWrite=true;try{localStorage.setItem(key,value)}finally{internalStorageWrite=false}}
function nativeRemove(key){internalStorageWrite=true;try{localStorage.removeItem(key)}finally{internalStorageWrite=false}}
function writeJson(key,value){nativeSet(key,JSON.stringify(value))}
function setStatus(status,message=""){writeJson(STATUS_KEY,{status,message,updatedAt:Date.now()});window.dispatchEvent(new CustomEvent("nesevren-learning-sync-status",{detail:{status,message}}))}
function session(){return readJson(SESSION_KEY,null)}
function authHeaders(token,extra={}){return{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,...extra}}
function localSnapshot(){const assessment=readJson(ASSESSMENT_KEY,null);const rawErrors=readJson(ERROR_BOOK_KEY,[]);const rawPerformance=readJson(PERFORMANCE_KEY,[]);return{assessment,errorBook:Array.isArray(rawErrors)?rawErrors:[],performance:Array.isArray(rawPerformance)?rawPerformance:[]}}
function writeSnapshot(snapshot){const before=JSON.stringify(localSnapshot());writeJson(ASSESSMENT_KEY,snapshot.assessment);writeJson(ERROR_BOOK_KEY,snapshot.errorBook);writeJson(PERFORMANCE_KEY,snapshot.performance);const after=JSON.stringify(snapshot);window.dispatchEvent(new CustomEvent("nesevren-learning-data-synced",{detail:snapshot}));return before!==after}
function clearLocalLearning(){nativeRemove(ASSESSMENT_KEY);nativeRemove(ERROR_BOOK_KEY);nativeRemove(PERFORMANCE_KEY);nativeRemove(OWNER_KEY);nativeRemove(STATUS_KEY)}

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

async function authenticatedUser(){
  if(!configured)return null;
  let current=session();
  if(!current?.access_token)return null;
  if(Number(current.expires_at||0)<Date.now()+30000)current=await refreshSession(current);
  let response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token)});
  if(response.status===401&&current.refresh_token){current=await refreshSession(current);response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(current.access_token)})}
  if(!response.ok)return null;
  return{user:await response.json(),token:current.access_token};
}

function tableMissing(response,data){return response.status===404||data?.code==="PGRST205"||/nesevren_learning_data/i.test(String(data?.message||""))&&/not find|does not exist|schema cache/i.test(String(data?.message||""))}
function performanceColumnMissing(response,data){return response.status===400&&/performance/i.test(String(data?.message||""))&&/column|schema cache|does not exist/i.test(String(data?.message||""))}

async function fetchRemote(token,userId){
  const url=`${SUPABASE_URL}/rest/v1/${TABLE}?select=user_id,assessment,error_book,performance,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
  const response=await fetch(url,{headers:authHeaders(token)});
  const data=await response.json().catch(()=>null);
  if(tableMissing(response,data))return{setupRequired:true,snapshot:{assessment:null,errorBook:[],performance:[]}};
  if(performanceColumnMissing(response,data))return{setupRequired:true,snapshot:{assessment:null,errorBook:[],performance:[]}};
  if(!response.ok)throw new Error(data?.message||"Bulut öğrenme verisi okunamadı.");
  const row=Array.isArray(data)?data[0]:null;
  return{setupRequired:false,snapshot:{assessment:row?.assessment??null,errorBook:Array.isArray(row?.error_book)?row.error_book:[],performance:Array.isArray(row?.performance)?row.performance:[]}};
}

async function pushRemote(token,userId,snapshot){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=user_id`,{method:"POST",headers:authHeaders(token,{"Prefer":"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify([{user_id:userId,assessment:snapshot.assessment,error_book:snapshot.errorBook,performance:snapshot.performance,updated_at:new Date().toISOString()}])});
  const data=await response.json().catch(()=>null);
  if(tableMissing(response,data)||performanceColumnMissing(response,data))return false;
  if(!response.ok)throw new Error(data?.message||"Bulut öğrenme verisi kaydedilemedi.");
  return true;
}

async function syncNow({reloadIfChanged=false}={}){
  if(syncing){pending=true;return}
  if(!configured||!session()?.access_token)return;
  syncing=true;
  try{
    const auth=await authenticatedUser();
    if(!auth?.user?.id)return;
    const userId=auth.user.id;
    const owner=localStorage.getItem(OWNER_KEY);
    if(owner&&owner!==userId){nativeRemove(ASSESSMENT_KEY);nativeRemove(ERROR_BOOK_KEY);nativeRemove(PERFORMANCE_KEY)}
    nativeSet(OWNER_KEY,userId);
    const local=localSnapshot();
    const remote=await fetchRemote(auth.token,userId);
    if(remote.setupRequired){setStatus("setup_required","Bulut eşitleme tablosu veya performans alanı henüz kurulmadı; veriler bu cihazda korunuyor.");return}
    const merged=mergeLearningSnapshots(local,remote.snapshot);
    const changed=writeSnapshot(merged);
    const pushed=await pushRemote(auth.token,userId,merged);
    if(!pushed){setStatus("setup_required","Bulut performans alanı henüz kurulmadı; veriler bu cihazda korunuyor.");return}
    setStatus("synced","Seviye sonucu, Hata Kitapçığı ve deneme performansı hesabınla eşitlendi.");
    if(changed&&reloadIfChanged)window.setTimeout(()=>location.reload(),40);
  }catch(error){setStatus("error",error instanceof Error?error.message:"Öğrenme verileri eşitlenemedi.")}
  finally{
    syncing=false;
    if(pending){pending=false;scheduleSync()}
  }
}

function scheduleSync(){window.clearTimeout(syncTimer);syncTimer=window.setTimeout(()=>syncNow(),650)}

const originalSetItem=Storage.prototype.setItem;
const originalRemoveItem=Storage.prototype.removeItem;
Storage.prototype.setItem=function(key,value){originalSetItem.call(this,key,value);if(this===localStorage&&!internalStorageWrite&&LEARNING_KEYS.has(String(key)))scheduleSync()};
Storage.prototype.removeItem=function(key){originalRemoveItem.call(this,key);if(this!==localStorage||internalStorageWrite)return;if(String(key)===SESSION_KEY){clearLocalLearning();window.setTimeout(()=>location.reload(),20);return}if(LEARNING_KEYS.has(String(key)))scheduleSync()};

window.NesevrenLearningSync={sync:()=>syncNow({reloadIfChanged:true}),status:()=>readJson(STATUS_KEY,null)};
window.addEventListener("online",()=>syncNow());
window.setTimeout(()=>syncNow({reloadIfChanged:true}),100);
