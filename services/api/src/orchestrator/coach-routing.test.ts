import { describe, expect, it } from "vitest";
import { analyzeQuestion } from "./analyzer.js";
import { isCoachRequest, providerOrder } from "./orchestrator.js";
import type { StudentQuestion } from "./types.js";

describe("koçluk yönlendirmesi",()=>{
  it("kişisel koçluk istemini matematik motoruna göndermeden DeepSeek'e yönlendirir",()=>{
    const input:StudentQuestion={
      question:"Sen Neşevren'in kişiye özel eğitim koçu ve mentor asistanısın. Matematik hata kitapçığına göre kişisel eğitim yol haritası oluştur.",
      inputType:"text",
      intent:"solve",
    };
    const analysis=analyzeQuestion(input);
    expect(isCoachRequest(input)).toBe(true);
    expect(providerOrder(input,analysis,["math-engine","deepseek","claude"])).toEqual(["deepseek","claude"]);
  });

  it("normal matematik sorusunu koçluk isteği sanmaz",()=>{
    const input:StudentQuestion={question:"2x+3=11 denklemini çöz",inputType:"text",intent:"solve"};
    expect(isCoachRequest(input)).toBe(false);
  });
});
