import { describe, expect, it } from "vitest";
import { buildFamilyReport } from "./family-report-core";

const NOW=1_800_000_000_000;

describe("family report core",()=>{
  it("seviye, hata ve çalışma özetini hesaplar",()=>{
    const report=buildFamilyReport({
      assessment:{subject:"Matematik",score:14,total:20,level:"İyi",weakTopics:["Oran Orantı"],topicStats:{"Oran Orantı":{correct:2,wrong:3}}},
      errorBook:[{subject:"Matematik",topic:"Oran Orantı",mistakeCount:2,retryCorrect:0}],
      performance:[],
      coachData:{profile:{level:"8"},tasks:[{done:true},{done:false}],checkins:[{minutes:60,focus:4,createdAt:NOW-1000}],updatedAt:NOW},
    },NOW);
    expect(report.assessmentPercent).toBe(70);
    expect(report.studyMinutes7d).toBe(60);
    expect(report.averageFocus7d).toBe(4);
    expect(report.completedTaskCount).toBe(1);
    expect(report.openTaskCount).toBe(1);
    expect(report.weakAreas[0]).toContain("Matematik · Oran Orantı");
  });

  it("son iki denemeden net değişimini bulur",()=>{
    const report=buildFamilyReport({performance:[
      {id:"1",date:"2026-08-20",totalNet:55},
      {id:"2",date:"2026-08-28",totalNet:63.5},
    ]},NOW);
    expect(report.latestNet).toBe(63.5);
    expect(report.netChange).toBe(8.5);
    expect(report.trend).toBe("up");
  });

  it("seviye verisi yoksa veliye veri toplama önerisi verir",()=>{
    const report=buildFamilyReport({coachData:{profile:{level:"7"},tasks:[],checkins:[],updatedAt:NOW}},NOW);
    expect(report.assessmentPercent).toBeNull();
    expect(report.level).toBe("7");
    expect(report.parentMessage).toContain("seviye belirleme");
  });
});
