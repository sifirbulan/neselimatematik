import { describe, expect, it } from "vitest";
import { analyzeQuestion } from "./analyzer.js";
import type { StudentQuestion } from "./types.js";

function input(question:string):StudentQuestion{return{question,inputType:"text",intent:"generate_test"}}

describe("Seviye ve pratik ders algısı",()=>{
  it("Matematik adı geçen test istemini Matematik olarak algılar",()=>{
    expect(analyzeQuestion(input("Matematik dersi, 8. sınıf için seviye belirleme testi hazırla.")).topic).toBe("Matematik");
  });

  it("Arapça ve Sosyal Bilgiler test istemlerini doğru derse yönlendirir",()=>{
    expect(analyzeQuestion(input("Arapça dersi için 3 çoktan seçmeli soru üret.")).topic).toBe("Arapça");
    expect(analyzeQuestion(input("Sosyal Bilgiler dersi için seviye belirleme testi hazırla.")).topic).toBe("Sosyal Bilgiler");
  });
});
