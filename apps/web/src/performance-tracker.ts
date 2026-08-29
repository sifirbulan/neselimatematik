export type PerformanceExamType="LGS"|"TYT"|"AYT"|"KPSS"|"ALES"|"Genel";

export interface PerformanceSubjectInput{
  subject:string;
  topic?:string;
  correct:number;
  wrong:number;
  blank:number;
}

export interface PerformanceSubjectResult extends PerformanceSubjectInput{
  net:number;
  totalQuestions:number;
  accuracyPercent:number;
}

export interface PerformanceRecord{
  id:string;
  examType:PerformanceExamType;
  name:string;
  date:string;
  durationMinutes:number;
  subjects:PerformanceSubjectResult[];
  totalNet:number;
  totalCorrect:number;
  totalWrong:number;
  totalBlank:number;
  totalQuestions:number;
  createdAt:number;
  updatedAt:number;
}

export interface PerformanceTrendItem{
  id:string;
  label:string;
  date:string;
  totalNet:number;
  durationMinutes:number;
}

export interface PerformanceAreaTrend{
  key:string;
  subject:string;
  topic?:string;
  latestNet:number;
  previousNet:number|null;
  netChange:number|null;
  latestAccuracyPercent:number;
  attempts:number;
}

export interface PerformanceSummary{
  trialCount:number;
  latestTotalNet:number|null;
  previousTotalNet:number|null;
  netChange:number|null;
  averageNet:number|null;
  bestNet:number|null;
  averageDurationMinutes:number|null;
  trend:"up"|"down"|"stable"|"insufficient";
  series:PerformanceTrendItem[];
  subjectTrends:PerformanceAreaTrend[];
  topicTrends:PerformanceAreaTrend[];
  strongestArea:PerformanceAreaTrend|null;
  weakestArea:PerformanceAreaTrend|null;
}

function finiteNonNegative(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0}
function round2(value:number){return Math.round((value+Number.EPSILON)*100)/100}
function dateTime(record:Pick<PerformanceRecord,"date"|"createdAt">){const parsed=Date.parse(record.date);return Number.isFinite(parsed)?parsed:record.createdAt}

export function wrongPenalty(examType:PerformanceExamType){return examType==="LGS"?3:4}

export function calculateNet(correct:unknown,wrong:unknown,examType:PerformanceExamType){
  return round2(finiteNonNegative(correct)-finiteNonNegative(wrong)/wrongPenalty(examType));
}

export function createPerformanceRecord(input:{
  id?:string;
  examType:PerformanceExamType;
  name?:string;
  date:string;
  durationMinutes:unknown;
  subjects:PerformanceSubjectInput[];
  createdAt?:number;
}):PerformanceRecord{
  const now=input.createdAt??Date.now();
  const examType=input.examType;
  const subjects=(Array.isArray(input.subjects)?input.subjects:[])
    .map(item=>{
      const subject=String(item?.subject??"").trim();
      const topic=String(item?.topic??"").trim();
      const correct=finiteNonNegative(item?.correct);
      const wrong=finiteNonNegative(item?.wrong);
      const blank=finiteNonNegative(item?.blank);
      const totalQuestions=correct+wrong+blank;
      return{
        subject,
        ...(topic?{topic}:{}),
        correct,
        wrong,
        blank,
        totalQuestions,
        net:calculateNet(correct,wrong,examType),
        accuracyPercent:totalQuestions?Math.round(correct/totalQuestions*100):0,
      };
    })
    .filter(item=>item.subject&&item.totalQuestions>0);
  const totalCorrect=subjects.reduce((sum,item)=>sum+item.correct,0);
  const totalWrong=subjects.reduce((sum,item)=>sum+item.wrong,0);
  const totalBlank=subjects.reduce((sum,item)=>sum+item.blank,0);
  const totalQuestions=totalCorrect+totalWrong+totalBlank;
  const totalNet=round2(subjects.reduce((sum,item)=>sum+item.net,0));
  return{
    id:input.id?.trim()||`performance-${now}`,
    examType,
    name:String(input.name??"").trim()||`${examType} Denemesi`,
    date:input.date,
    durationMinutes:finiteNonNegative(input.durationMinutes),
    subjects,
    totalNet,
    totalCorrect,
    totalWrong,
    totalBlank,
    totalQuestions,
    createdAt:now,
    updatedAt:now,
  };
}

function buildAreaTrends(records:PerformanceRecord[],useTopic:boolean):PerformanceAreaTrend[]{
  const buckets=new Map<string,Array<{record:PerformanceRecord;item:PerformanceSubjectResult}>>();
  records.forEach(record=>record.subjects.forEach(item=>{
    if(useTopic&&!item.topic)return;
    const key=useTopic?`${item.subject} · ${item.topic}`:item.subject;
    const list=buckets.get(key)??[];
    list.push({record,item});
    buckets.set(key,list);
  }));
  return[...buckets.entries()].map(([key,values])=>{
    values.sort((a,b)=>dateTime(a.record)-dateTime(b.record)||a.record.createdAt-b.record.createdAt);
    const latest=values.at(-1)!;
    const previous=values.length>1?values.at(-2)!:null;
    return{
      key,
      subject:latest.item.subject,
      ...(latest.item.topic?{topic:latest.item.topic}:{}),
      latestNet:latest.item.net,
      previousNet:previous?.item.net??null,
      netChange:previous?round2(latest.item.net-previous.item.net):null,
      latestAccuracyPercent:latest.item.accuracyPercent,
      attempts:values.length,
    };
  }).sort((a,b)=>a.latestAccuracyPercent-b.latestAccuracyPercent||a.latestNet-b.latestNet);
}

export function buildPerformanceSummary(records:PerformanceRecord[]):PerformanceSummary{
  const sorted=(Array.isArray(records)?records:[]).filter(Boolean).slice().sort((a,b)=>dateTime(a)-dateTime(b)||a.createdAt-b.createdAt);
  const latest=sorted.at(-1)??null;
  const previous=sorted.length>1?sorted.at(-2)??null:null;
  const netChange=latest&&previous?round2(latest.totalNet-previous.totalNet):null;
  const averageNet=sorted.length?round2(sorted.reduce((sum,item)=>sum+item.totalNet,0)/sorted.length):null;
  const bestNet=sorted.length?Math.max(...sorted.map(item=>item.totalNet)):null;
  const durations=sorted.map(item=>item.durationMinutes).filter(value=>value>0);
  const averageDurationMinutes=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):null;
  const trend=netChange===null?"insufficient":netChange>0.25?"up":netChange<-.25?"down":"stable";
  const subjectTrends=buildAreaTrends(sorted,false);
  const topicTrends=buildAreaTrends(sorted,true);
  const areas=topicTrends.length?topicTrends:subjectTrends;
  const weakestArea=areas[0]??null;
  const strongestArea=areas.length?areas.slice().sort((a,b)=>b.latestAccuracyPercent-a.latestAccuracyPercent||b.latestNet-a.latestNet)[0]??null:null;
  return{
    trialCount:sorted.length,
    latestTotalNet:latest?.totalNet??null,
    previousTotalNet:previous?.totalNet??null,
    netChange,
    averageNet,
    bestNet,
    averageDurationMinutes,
    trend,
    series:sorted.slice(-8).map(item=>({id:item.id,label:item.name,date:item.date,totalNet:item.totalNet,durationMinutes:item.durationMinutes})),
    subjectTrends,
    topicTrends,
    strongestArea,
    weakestArea,
  };
}
