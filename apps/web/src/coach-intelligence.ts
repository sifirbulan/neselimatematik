export interface CoachProfile {
  level?: string;
  goal?: string;
  weeklyHours?: number;
  weakSubjects?: string;
}

export interface CoachAssessment {
  subject?: string;
  score?: number;
  total?: number;
  level?: string;
  weakTopics?: string[];
  topicStats?: Record<string,{correct:number;wrong:number}>;
}

export interface CoachErrorItem {
  subject?: string;
  topic?: string;
  mistakeCount?: number;
  retryCorrect?: number;
  retryWrong?: number;
  lastSeenAt?: number;
}

export interface CoachHistoryItem {
  subject?: string;
  question?: string;
  createdAt?: number;
}

export interface CoachTask {
  id?: string;
  title?: string;
  due?: string;
  done?: boolean;
  createdAt?: number;
}

export interface CoachCheckin {
  minutes?: number;
  focus?: number;
  createdAt?: number;
}

export interface CoachInsightInput {
  profile?: CoachProfile | null;
  assessment?: CoachAssessment | null;
  errors?: CoachErrorItem[];
  history?: CoachHistoryItem[];
  tasks?: CoachTask[];
  checkins?: CoachCheckin[];
  now?: number;
}

export interface CoachRoadmapAction {
  title:string;
  detail:string;
  minutes:number;
  kind:"assessment"|"error"|"task"|"practice"|"habit";
}

export interface CoachInsight {
  assessmentPercent:number|null;
  studyMinutes7d:number;
  averageFocus7d:number|null;
  activeDays7d:number;
  recentQuestionCount:number;
  openTaskCount:number;
  completedTaskCount:number;
  topWeakTopics:Array<{topic:string;weight:number}>;
  recentSubjects:Array<{subject:string;count:number}>;
  plannedWeeklyMinutes:number;
  rhythmPercent:number;
  actions:CoachRoadmapAction[];
  summary:string;
}

const DAY=24*60*60*1000;

function clamp(value:number,min=0,max=100){return Math.max(min,Math.min(max,value))}
function cleanText(value:unknown,fallback:string){const text=String(value??"").trim();return text||fallback}
function weaknessLabel(subject:unknown,topic:unknown){
  const cleanSubject=cleanText(subject,"");
  const cleanTopic=cleanText(topic,"Genel tekrar");
  return cleanSubject?`${cleanSubject} · ${cleanTopic}`:cleanTopic;
}
function weakSubjectList(value:unknown){
  return String(value??"").split(/[,;|/]+/).map(item=>item.trim()).filter(Boolean).slice(0,4);
}

export function buildCoachInsight(input:CoachInsightInput):CoachInsight {
  const now=input.now??Date.now();
  const profile=input.profile??{};
  const assessment=input.assessment??null;
  const errors=Array.isArray(input.errors)?input.errors:[];
  const history=Array.isArray(input.history)?input.history:[];
  const tasks=Array.isArray(input.tasks)?input.tasks:[];
  const checkins=Array.isArray(input.checkins)?input.checkins:[];

  const assessmentPercent=assessment&&Number(assessment.total)>0
    ? Math.round(clamp((Number(assessment.score)||0)/Number(assessment.total)*100))
    : null;

  const recentCheckins=checkins.filter(item=>Number(item.createdAt)>=now-7*DAY);
  const studyMinutes7d=recentCheckins.reduce((sum,item)=>sum+Math.max(0,Number(item.minutes)||0),0);
  const focusValues=recentCheckins.map(item=>Number(item.focus)).filter(value=>Number.isFinite(value)&&value>=1&&value<=5);
  const averageFocus7d=focusValues.length?Math.round((focusValues.reduce((a,b)=>a+b,0)/focusValues.length)*10)/10:null;
  const activeDays7d=new Set(recentCheckins.map(item=>new Date(Number(item.createdAt)||now).toISOString().slice(0,10))).size;

  const recentHistory=history.filter(item=>Number(item.createdAt)>=now-14*DAY || !item.createdAt).slice(0,30);
  const recentQuestionCount=recentHistory.length;
  const openTasks=tasks.filter(item=>!item.done);
  const completedTasks=tasks.filter(item=>item.done);

  const topicWeights=new Map<string,number>();
  if(assessment?.topicStats){
    Object.entries(assessment.topicStats).forEach(([topic,stat])=>{
      const wrong=Math.max(0,Number(stat?.wrong)||0);
      if(!wrong)return;
      const key=weaknessLabel(assessment.subject,topic);
      topicWeights.set(key,(topicWeights.get(key)??0)+wrong*3);
    });
  }
  for(const topic of assessment?.weakTopics??[]){
    const key=weaknessLabel(assessment?.subject,topic);
    topicWeights.set(key,(topicWeights.get(key)??0)+2);
  }
  errors.forEach(item=>{
    const key=weaknessLabel(item.subject,item.topic);
    const mistakes=Math.max(1,Number(item.mistakeCount)||1);
    const recovery=Math.max(0,Number(item.retryCorrect)||0);
    topicWeights.set(key,(topicWeights.get(key)??0)+Math.max(1,mistakes*2-recovery));
  });
  if(topicWeights.size===0){
    weakSubjectList(profile.weakSubjects).forEach(subject=>topicWeights.set(`${subject} · Genel tekrar`,1));
  }
  const topWeakTopics=[...topicWeights.entries()]
    .map(([topic,weight])=>({topic,weight}))
    .sort((a,b)=>b.weight-a.weight)
    .slice(0,4);

  const subjectCounts=new Map<string,number>();
  recentHistory.forEach(item=>{
    const subject=cleanText(item.subject,"Genel");
    subjectCounts.set(subject,(subjectCounts.get(subject)??0)+1);
  });
  const recentSubjects=[...subjectCounts.entries()].map(([subject,count])=>({subject,count})).sort((a,b)=>b.count-a.count).slice(0,4);

  const plannedWeeklyMinutes=Math.max(60,Math.round((Number(profile.weeklyHours)||6)*60));
  const studyRatio=clamp(studyMinutes7d/plannedWeeklyMinutes*100);
  const consistencyScore=clamp(activeDays7d/5*100);
  const focusScore=averageFocus7d===null?0:clamp(averageFocus7d/5*100);
  const taskScore=tasks.length?clamp(completedTasks.length/tasks.length*100):0;
  const rhythmPercent=recentCheckins.length===0?0:Math.round(studyRatio*.5+consistencyScore*.3+focusScore*.15+taskScore*.05);

  const dailyBudget=Math.max(20,Math.min(150,Math.round(plannedWeeklyMinutes/6)));
  const actions:CoachRoadmapAction[]=[];

  if(!assessment){
    actions.push({kind:"assessment",title:"Seviyeni netleştir",detail:"Kişisel planın daha isabetli olması için önce Seviye Belirleme testini tamamla.",minutes:Math.min(40,dailyBudget)});
  }

  if(topWeakTopics.length){
    const top=topWeakTopics[0].topic;
    actions.push({kind:"error",title:`${top} hata tekrarı`,detail:"Hata Kitapçığındaki yanlışları yeniden çöz; yanlışta ipucunu kullan ve ardından 3 benzer soru çöz.",minutes:Math.min(35,dailyBudget)});
  }

  if(openTasks.length){
    const dated=openTasks.filter(item=>item.due).sort((a,b)=>String(a.due).localeCompare(String(b.due)));
    const task=dated[0]?.title??openTasks[0]?.title??"Açık görev";
    actions.push({kind:"task",title:cleanText(task,"Açık görevi tamamla"),detail:"Mevcut görevlerinden birini bugün bitirerek planı kapat.",minutes:Math.min(40,dailyBudget)});
  }

  if(recentSubjects.length){
    const subject=recentSubjects[0].subject;
    actions.push({kind:"practice",title:`${subject} kısa pekiştirme`,detail:"Son çalıştığın sorulardan birini tekrar çöz ve ardından seviyene uygun 3 yeni soruyla pekiştir.",minutes:Math.min(30,dailyBudget)});
  }

  if(studyMinutes7d<plannedWeeklyMinutes*.55 || activeDays7d<3){
    actions.push({kind:"habit",title:"Çalışma ritmini güçlendir",detail:`Bu hafta ${studyMinutes7d} dakika kaydın var. Bugün kısa ama kesintisiz bir odak oturumu yap ve Günlük Kontrol'e kaydet.`,minutes:Math.min(25,dailyBudget)});
  }

  if(!actions.length){
    actions.push({kind:"practice",title:"Seviyeni koru",detail:"Güçlü olduğun konudan 3 yeni soru çöz, yanlış çıkarsa Hata Kitapçığına dön.",minutes:Math.min(30,dailyBudget)});
  }

  const maxActions=Math.max(1,Math.min(4,Math.floor(dailyBudget/15)));
  const selectedActions=actions.slice(0,maxActions);
  let remaining=dailyBudget;
  const trimmedActions=selectedActions.map((action,index)=>{
    const remainingActions=selectedActions.length-index-1;
    const reserve=remainingActions*10;
    const minutes=Math.max(10,Math.min(action.minutes,Math.max(10,remaining-reserve)));
    remaining=Math.max(0,remaining-minutes);
    return{...action,minutes};
  });

  const status=assessmentPercent===null
    ? "Seviye verin henüz eksik"
    : assessmentPercent>=85?"Akademik temelin güçlü görünüyor"
    : assessmentPercent>=65?"Temel iyi; belirli açıkları kapatmaya odaklan"
    : "Önce temel açıkları sistemli biçimde kapat";
  const goal=cleanText(profile.goal,"genel gelişim");
  const summary=`${status}. Hedefin: ${goal}. Son 7 günde ${studyMinutes7d} dakika çalışma, ${activeDays7d} aktif gün ve ${errors.length} hata kaydı var. Bugünkü plan ${trimmedActions.length} önceliğe ve toplam en fazla ${dailyBudget} dakikaya indirildi.`;

  return {
    assessmentPercent,
    studyMinutes7d,
    averageFocus7d,
    activeDays7d,
    recentQuestionCount,
    openTaskCount:openTasks.length,
    completedTaskCount:completedTasks.length,
    topWeakTopics,
    recentSubjects,
    plannedWeeklyMinutes,
    rhythmPercent,
    actions:trimmedActions,
    summary,
  };
}
