import { describe, expect, it } from "vitest";
import { desiredProviderCount, isQuestionSetRequest, providerOrder } from "./orchestrator.js";
import type { QuestionAnalysis, StudentQuestion } from "./types.js";

const registered=["math-engine","deepseek","claude"];
const baseInput:StudentQuestion={question:"",inputType:"text",intent:"solve"};
const baseAnalysis:QuestionAnalysis={topic:"Genel",subtopic:"Genel",exam:"NONE",difficulty:"easy",needsVision:false,needsVerification:false,confidence:.8};

describe("Neşevren sağlayıcı yönlendirmesi",()=>{
  it("metin matematik sorusunda önce yerel motoru sonra DeepSeek'i kullanır",()=>{
    expect(providerOrder({...baseInput,question:"2x+5=17"},{...baseAnalysis,topic:"Matematik"},registered)).toEqual(["math-engine","deepseek","claude"]);
  });

  it("matematik ipucunda cevabı doğrudan veren yerel motoru atlar",()=>{
    expect(providerOrder({...baseInput,question:"2x+5=17",intent:"hint"},{...baseAnalysis,topic:"Matematik"},registered)).toEqual(["deepseek","claude"]);
  });

  it("öğrencinin kendi çözümünü doğrularken DeepSeek'i ana kullanır",()=>{
    expect(providerOrder({...baseInput,question:"Soru: 2x+5=17. Öğrenci cevabı: x=5",intent:"verify"},{...baseAnalysis,topic:"Matematik"},registered)).toEqual(["deepseek","claude"]);
  });

  it("görsel sorularda yalnızca Claude kullanır",()=>{
    expect(providerOrder({...baseInput,inputType:"image",imageDataUrl:"data:image/jpeg;base64,AA=="},{...baseAnalysis,topic:"Matematik",needsVision:true},registered)).toEqual(["claude"]);
  });

  it("diğer derslerde DeepSeek ana, Claude yedek olur",()=>{
    expect(providerOrder({...baseInput,question:"Fotosentezi açıkla"},{...baseAnalysis,topic:"Biyoloji"},registered)).toEqual(["deepseek","claude"]);
  });

  it("3 Soru Hazırla isteğini test üretimi olarak algılar ve matematik motorunu atlar",()=>{
    const input={...baseInput,question:"Orijinal soruya benzer TAM OLARAK 3 yeni çoktan seçmeli soru üret. answer alanına yalnızca geçerli JSON dizi yaz."};
    expect(isQuestionSetRequest(input)).toBe(true);
    expect(providerOrder(input,{...baseAnalysis,topic:"Matematik"},registered)).toEqual(["deepseek","claude"]);
    expect(desiredProviderCount(input,{...baseAnalysis,topic:"Matematik",difficulty:"hard"})).toBe(1);
  });

  it("seviye belirleme ve Hata Kitapçığı testlerinde DeepSeek'i öne alır",()=>{
    const testInput={...baseInput,intent:"generate_test" as const,question:"Matematik dersi için seviye belirleme testi hazırla."};
    expect(providerOrder(testInput,{...baseAnalysis,topic:"Matematik"},registered)).toEqual(["deepseek","claude"]);
    expect(providerOrder({...testInput,question:"Biyoloji dersi için 3 benzer soru üret."},{...baseAnalysis,topic:"Biyoloji"},registered)).toEqual(["deepseek","claude"]);
  });

  it("zor sorularda da ilk başarılı sağlayıcıda döner",()=>{
    expect(desiredProviderCount(baseInput,baseAnalysis)).toBe(1);
    expect(desiredProviderCount(baseInput,{...baseAnalysis,difficulty:"hard"})).toBe(1);
    expect(desiredProviderCount({...baseInput,intent:"generate_test"},{...baseAnalysis,difficulty:"hard"})).toBe(1);
  });
});
