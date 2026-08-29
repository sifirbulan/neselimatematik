import { describe, expect, it } from "vitest";
import { rankMentors, scoreMentorMatch, type MentorProfileMatch } from "./mentor-matching-core";

const base:MentorProfileMatch={userId:"m1",displayName:"Ayşe Öğretmen",supportTypes:["Branş Öğretmeni"],subjects:["Matematik"],levels:["8","LGS"],modes:["Online","Yüz yüze"],city:"Diyarbakır",experienceYears:12,active:true};

describe("mentor matching",()=>{
  it("branş, seviye ve çalışma biçimi tam uyan eğitmeni yüksek puanlar",()=>{
    const match=scoreMentorMatch(base,{supportType:"Branş Öğretmeni",subject:"Matematik",level:"LGS",mode:"Online"});
    expect(match?.score).toBe(100);
    expect(match?.reasons.join(" ")).toContain("Matematik");
  });

  it("branş öğretmeninde farklı dersi eşleştirmez",()=>{
    expect(scoreMentorMatch(base,{supportType:"Branş Öğretmeni",subject:"Fizik",level:"LGS",mode:"Online"})).toBeNull();
  });

  it("yüz yüze istekte şehir uyuşmazsa eşleştirmez",()=>{
    expect(scoreMentorMatch(base,{supportType:"Branş Öğretmeni",subject:"Matematik",level:"8",mode:"Yüz yüze",city:"Ankara"})).toBeNull();
  });

  it("uygun adayları puan ve deneyime göre sıralar",()=>{
    const mentors=[
      {...base,userId:"m2",displayName:"B Öğretmen",experienceYears:3},
      {...base,userId:"m3",displayName:"C Öğretmen",experienceYears:15},
    ];
    const ranked=rankMentors(mentors,{supportType:"Branş Öğretmeni",subject:"Matematik",level:"LGS",mode:"Online"});
    expect(ranked.map(item=>item.mentor.userId)).toEqual(["m3","m2"]);
  });
});
