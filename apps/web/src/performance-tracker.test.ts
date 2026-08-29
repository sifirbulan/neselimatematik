import { describe, expect, it } from "vitest";
import { buildPerformanceSummary, calculateNet, createPerformanceRecord } from "./performance-tracker";

describe("performance tracker",()=>{
  it("LGS ve ÖSYM sınavlarında doğru yanlış net kuralını uygular",()=>{
    expect(calculateNet(15,6,"LGS")).toBe(13);
    expect(calculateNet(15,6,"TYT")).toBe(13.5);
    expect(calculateNet(15,6,"AYT")).toBe(13.5);
  });

  it("deneme toplamlarını ve doğruluk oranlarını hesaplar",()=>{
    const record=createPerformanceRecord({
      examType:"TYT",
      name:"TYT 1",
      date:"2026-08-20",
      durationMinutes:120,
      createdAt:100,
      subjects:[
        {subject:"Matematik",topic:"Problemler",correct:20,wrong:4,blank:6},
        {subject:"Türkçe",correct:28,wrong:8,blank:4},
      ],
    });
    expect(record.totalCorrect).toBe(48);
    expect(record.totalWrong).toBe(12);
    expect(record.totalBlank).toBe(10);
    expect(record.totalNet).toBe(45);
    expect(record.subjects[0]?.accuracyPercent).toBe(67);
  });

  it("son iki denemeyi karşılaştırıp net gelişimini gösterir",()=>{
    const first=createPerformanceRecord({examType:"TYT",name:"TYT 1",date:"2026-08-20",durationMinutes:130,createdAt:100,subjects:[{subject:"Matematik",correct:20,wrong:4,blank:16}]});
    const second=createPerformanceRecord({examType:"TYT",name:"TYT 2",date:"2026-08-27",durationMinutes:115,createdAt:200,subjects:[{subject:"Matematik",correct:24,wrong:4,blank:12}]});
    const summary=buildPerformanceSummary([second,first]);
    expect(summary.latestTotalNet).toBe(23);
    expect(summary.previousTotalNet).toBe(19);
    expect(summary.netChange).toBe(4);
    expect(summary.trend).toBe("up");
    expect(summary.averageDurationMinutes).toBe(123);
    expect(summary.series.map(item=>item.label)).toEqual(["TYT 1","TYT 2"]);
  });

  it("ders ve konu gelişimini ayrı ayrı izler",()=>{
    const first=createPerformanceRecord({examType:"LGS",name:"LGS 1",date:"2026-08-20",durationMinutes:80,createdAt:100,subjects:[{subject:"Matematik",topic:"Üslü İfadeler",correct:6,wrong:3,blank:1},{subject:"Fen Bilimleri",topic:"DNA",correct:8,wrong:0,blank:2}]});
    const second=createPerformanceRecord({examType:"LGS",name:"LGS 2",date:"2026-08-27",durationMinutes:75,createdAt:200,subjects:[{subject:"Matematik",topic:"Üslü İfadeler",correct:8,wrong:0,blank:2},{subject:"Fen Bilimleri",topic:"DNA",correct:7,wrong:3,blank:0}]});
    const summary=buildPerformanceSummary([first,second]);
    const math=summary.topicTrends.find(item=>item.key==="Matematik · Üslü İfadeler");
    expect(math?.netChange).toBe(3);
    expect(math?.attempts).toBe(2);
    expect(summary.weakestArea?.key).toBe("Fen Bilimleri · DNA");
    expect(summary.strongestArea?.key).toBe("Matematik · Üslü İfadeler");
  });
});
