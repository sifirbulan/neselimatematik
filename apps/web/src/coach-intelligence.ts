export interface CoachProfile {
  level?: string;
  goal?: string;
  weeklyHours?: number;
  weakSubjects?: string;
}

export interface CoachAssessment {
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
      if(wrong)topicWeights.set(topic,(topicWeights.get(topic)??0)+wrong*3);
    });
  }
  for(const topic of assessment?.weakTopics??[]){
    const key=cleanText(topic,"Genel tekrar");
    topicWeights.set(key,(topicWeights.get(key)??0)+2);
  }
  errors.forEach(item=>{
    const topic=cleanText(item.topic,"Genel tekrar");
    const mistakes=Math.max(1,Number(item.mistakeCount)||1);
    const recovery=Math.max(0,Number(item.retryCorrect)||0);
    topicWeights.set(topic,(topicWeights.get(topic)??0)+Math.max(1,mistakes*2-recovery));
  });
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
  const focusScore=averageFocus7d===null?50:clamp(averageFocus7d/5*100);
  const taskScore=tasks.length?clamp(completedTasks.length/tasks.length*100):50;
  const rhythmPercent=Math.round(studyRatio*.45+consistencyScore*.25+focusScore*.2+taskScore*.1);

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
    const task=openTasks.find(item=>item.due)?.title??openTasks[0]?.title??"Açık görev";
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

  const trimmedActions=actions.slice(0,4);
  const status=assessmentPercent===null
    ? "Seviye verin henüz eksik"
    : assessmentPercent>=85?"Akademik temelin güçlü görünüyor"
    : assessmentPercent>=65?"Temel iyi; belirli açıkları kapatmaya odaklan"
    : "Önce temel açıkları sistemli biçimde kapat";
  const summary=`${status}. Son 7 günde ${studyMinutes7d} dakika çalışma, ${activeDays7d} aktif gün ve ${errors.length} hata kaydı var. Bugünkü plan ${trimmedActions.length} önceliğe indirildi.`;

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
