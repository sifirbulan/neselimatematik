export interface FamilyAssessment {
  subject?:string;
  score?:number;
  total?:number;
  level?:string;
  weakTopics?:string[];
  topicStats?:Record<string,{correct:number;wrong:number}>;
}

export interface FamilyErrorItem {
  subject?:string;
  topic?:string;
  mistakeCount?:number;
  retryCorrect?:number;
  lastSeenAt?:number;
}

export interface FamilyPerformanceItem {
  id?:string;
  name?:string;
  date?:string;
  totalNet?:number;
  totalQuestions?:number;
  subjects?:Array<{subject?:string;topic?:string;accuracyPercent?:number;net?:number}>;
  createdAt?:number;
}

export interface FamilyCoachData {
  profile?:{level?:string;goal?:string;weeklyHours?:number}|null;
  tasks?:Array<{done?:boolean}>;
  checkins?:Array<{minutes?:number;focus?:number;createdAt?:number}>;
  updatedAt?:number;
}

export interface FamilyLearningSnapshot {
  assessment?:FamilyAssessment|null;
  errorBook?:FamilyErrorItem[];
  performance?:FamilyPerformanceItem[];
  coachData?:FamilyCoachData|null;
}

export interface FamilyReportSummary {
  assessmentPercent:number|null;
  level:string;
  errorCount:number;
  unresolvedErrorCount:number;
  latestNet:number|null;
  netChange:number|null;
  studyMinutes7d:number;
  averageFocus7d:number|null;
  completedTaskCount:number;
  openTaskCount:number;
  weakAreas:string[];
  trend:"up"|"down"|"stable"|"insufficient";
  parentMessage:string;
}

const DAY=24*60*60*1000;
function n(value:unknown){const x=Number(value);return Number.isFinite(x)?x:0}
function itemTime(item:FamilyPerformanceItem){const parsed=typeof item.date==="string"?Date.parse(item.date):0;return Math.max(Number.isFinite(parsed)?parsed:0,n(item.createdAt))}
function label(subject:unknown,topic:unknown){const s=String(subject??"").trim();const t=String(topic??"").trim();return [s,t].filter(Boolean).join(" · ")}

export function buildFamilyReport(snapshot:FamilyLearningSnapshot,now=Date.now()):FamilyReportSummary{
  const assessment=snapshot.assessment??null;
  const errors=Array.isArray(snapshot.errorBook)?snapshot.errorBook:[];
  const performance=(Array.isArray(snapshot.performance)?snapshot.performance:[]).slice().sort((a,b)=>itemTime(a)-itemTime(b));
  const coach=snapshot.coachData??null;
  const checkins=Array.isArray(coach?.checkins)?coach!.checkins!:[];
  const tasks=Array.isArray(coach?.tasks)?coach!.tasks!:[];
  const assessmentPercent=assessment&&n(assessment.total)>0?Math.round(n(assessment.score)/n(assessment.total)*100):null;
  const latest=performance.at(-1)??null;
  const previous=performance.length>1?performance.at(-2)??null:null;
  const latestNet=latest?Math.round(n(latest.totalNet)*100)/100:null;
  const netChange=latest&&previous?Math.round((n(latest.totalNet)-n(previous.totalNet))*100)/100:null;
  const recentCheckins=checkins.filter(item=>n(item.createdAt)>=now-7*DAY);
  const studyMinutes7d=recentCheckins.reduce((sum,item)=>sum+Math.max(0,n(item.minutes)),0);
  const focus=recentCheckins.map(item=>n(item.focus)).filter(value=>value>=1&&value<=5);
  const averageFocus7d=focus.length?Math.round(focus.reduce((a,b)=>a+b,0)/focus.length*10)/10:null;
  const completedTaskCount=tasks.filter(item=>item.done).length;
  const openTaskCount=tasks.filter(item=>!item.done).length;
  const unresolvedErrorCount=errors.filter(item=>n(item.retryCorrect)<Math.max(1,n(item.mistakeCount))).length;
  const weights=new Map<string,number>();
  if(assessment?.topicStats){Object.entries(assessment.topicStats).forEach(([topic,stat])=>{const wrong=Math.max(0,n(stat?.wrong));if(wrong){const key=label(assessment.subject,topic);weights.set(key,(weights.get(key)??0)+wrong*3)}})}
  (assessment?.weakTopics??[]).forEach(topic=>{const key=label(assessment?.subject,topic);if(key)weights.set(key,(weights.get(key)??0)+2)});
  errors.forEach(item=>{const key=label(item.subject,item.topic);if(!key)return;weights.set(key,(weights.get(key)??0)+Math.max(1,n(item.mistakeCount)*2-n(item.retryCorrect)))});
  const latestSubjects=latest?.subjects??[];
  latestSubjects.filter(item=>n(item.accuracyPercent)<60).forEach(item=>{const key=label(item.subject,item.topic);if(key)weights.set(key,(weights.get(key)??0)+2)});
  const weakAreas=[...weights.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key])=>key);
  const trend=netChange===null?"insufficient":netChange>.25?"up":netChange<-.25?"down":"stable";
  const level=String(assessment?.level??coach?.profile?.level??"Henüz belirlenmedi");
  let parentMessage="Öğrencinin düzenli çalışmasını destekleyin; sonucu değil süreci konuşun.";
  if(assessmentPercent===null)parentMessage="Önce seviye belirleme testini tamamlamasını destekleyin; plan için temel veri oluşsun.";
  else if(unresolvedErrorCount>0)parentMessage=`Bu hafta ${unresolvedErrorCount} açık hata kaydı var. Cevabı söylemek yerine Hata Kitapçığındaki tekrarları tamamlamasını teşvik edin.`;
  else if(studyMinutes7d===0)parentMessage="Bu hafta çalışma kaydı yok. Küçük ve sürdürülebilir bir günlük hedef belirlemesine yardımcı olun.";
  else if(trend==="up")parentMessage="Deneme performansı yükseliyor. Sonuç baskısı kurmadan düzenli çalışma ve yanlış analizi alışkanlığını pekiştirin.";
  return{assessmentPercent,level,errorCount:errors.length,unresolvedErrorCount,latestNet,netChange,studyMinutes7d,averageFocus7d,completedTaskCount,openTaskCount,weakAreas,trend,parentMessage};
}
