import { describe, expect, it } from "vitest";
import { buildCoachInsight } from "./coach-intelligence";

const NOW=Date.UTC(2026,7,29,12,0,0);

describe("buildCoachInsight",()=>{
  it("seviye, hata, geçmiş ve çalışma kayıtlarını tek yol haritasında birleştirir",()=>{
    const insight=buildCoachInsight({
      now:NOW,
      profile:{weeklyHours:6,level:"8",goal:"Okul başarısı"},
      assessment:{score:14,total:20,level:"İyi",weakTopics:["Üslü İfadeler"],topicStats:{"Üslü İfadeler":{correct:1,wrong:3},"Kareköklü İfadeler":{correct:2,wrong:1}}},
      errors:[{subject:"Matematik",topic:"Üslü İfadeler",mistakeCount:2,retryCorrect:0,retryWrong:1}],
      history:[{subject:"Matematik",question:"x+2=5",createdAt:NOW-60_000}],
      tasks:[{id:"1",title:"20 problem çöz",done:false}],
      checkins:[{minutes:60,focus:4,createdAt:NOW-60_000},{minutes:45,focus:3,createdAt:NOW-86_400_000}],
    });

    expect(insight.assessmentPercent).toBe(70);
    expect(insight.studyMinutes7d).toBe(105);
    expect(insight.recentQuestionCount).toBe(1);
    expect(insight.openTaskCount).toBe(1);
    expect(insight.topWeakTopics[0]?.topic).toBe("Üslü İfadeler");
    expect(insight.actions.some(action=>action.kind==="error")).toBe(true);
    expect(insight.actions.some(action=>action.kind==="task")).toBe(true);
  });

  it("seviye testi yoksa ilk öncelik olarak seviye belirlemeyi önerir",()=>{
    const insight=buildCoachInsight({now:NOW,profile:{weeklyHours:4},assessment:null,errors:[],history:[],tasks:[],checkins:[]});
    expect(insight.assessmentPercent).toBeNull();
    expect(insight.actions[0]?.kind).toBe("assessment");
    expect(insight.summary).toContain("Seviye verin henüz eksik");
  });

  it("çalışma ritmini haftalık hedef ve aktif günlerden hesaplar",()=>{
    const insight=buildCoachInsight({
      now:NOW,
      profile:{weeklyHours:2},
      checkins:[
        {minutes:60,focus:5,createdAt:NOW-60_000},
        {minutes:60,focus:5,createdAt:NOW-86_400_000},
        {minutes:30,focus:4,createdAt:NOW-2*86_400_000},
      ],
      tasks:[{id:"1",title:"A",done:true}],
    });
    expect(insight.studyMinutes7d).toBe(150);
    expect(insight.activeDays7d).toBe(3);
    expect(insight.rhythmPercent).toBeGreaterThan(70);
  });
});
