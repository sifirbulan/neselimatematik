import { describe, expect, it } from "vitest";
import { desiredProviderCount, providerOrder } from "./orchestrator.js";
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

  it("görsel sorularda yalnızca Claude kullanır",()=>{
    expect(providerOrder({...baseInput,inputType:"image",imageDataUrl:"data:image/jpeg;base64,AA=="},{...baseAnalysis,topic:"Matematik",needsVision:true},registered)).toEqual(["claude"]);
  });

  it("diğer derslerde Claude ana, DeepSeek yedek olur",()=>{
    expect(providerOrder({...baseInput,question:"Fotosentezi açıkla"},{...baseAnalysis,topic:"Biyoloji"},registered)).toEqual(["claude","deepseek"]);
  });

  it("normal soruda tek sağlayıcı, yalnızca zor metin sorusunda iki sağlayıcı ister",()=>{
    expect(desiredProviderCount(baseInput,baseAnalysis)).toBe(1);
    expect(desiredProviderCount(baseInput,{...baseAnalysis,difficulty:"hard"})).toBe(2);
    expect(desiredProviderCount({...baseInput,intent:"generate_test"},{...baseAnalysis,difficulty:"hard"})).toBe(1);
  });
});
