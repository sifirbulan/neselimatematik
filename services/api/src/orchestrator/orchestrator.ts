import { analyzeQuestion } from "./analyzer.js";
import { compareAttempts } from "./consensus.js";
import { getExecutor, getRegisteredProviderIds, registerExecutor } from "./executor.js";
import { claudeExecutor } from "./claude-executor.js";
import { deepSeekExecutor } from "./deepseek-executor.js";
import { mathEngineExecutor } from "./math-engine-executor.js";
import { verifyAnswer } from "./verifier.js";
import type { AIAnswer, OrchestratorResult, ProviderAttempt, StudentQuestion } from "./types.js";

// Aktif mimari: yalnızca yerel matematik motoru + DeepSeek + Claude.
// Gemini, OpenAI, Groq, Mistral ve OpenRouter dosyaları geri dönüş için repoda tutulur
// fakat burada kaydedilmedikleri için çalışma sırasında çağrılmazlar.
registerExecutor(mathEngineExecutor);
registerExecutor(deepSeekExecutor);
registerExecutor(claudeExecutor);

async function runProvider(providerId:string,input:StudentQuestion,analysis:ReturnType<typeof analyzeQuestion>):Promise<ProviderAttempt>{
  const executor=getExecutor(providerId);
  if(!executor)return{providerId,error:"Executor bulunamadı."};
  try{return{providerId,answer:await executor.execute(input,analysis)}}catch(error){return{providerId,error:error instanceof Error?error.message:"Bilinmeyen sağlayıcı hatası."}}
}

function applyVerification(input:StudentQuestion,answer:AIAnswer):AIAnswer{
  if(answer.verified&&answer.verificationStatus==="verified")return answer;
  const verification=verifyAnswer(input.question,answer);
  if(verification.status==="verified")return{...answer,verified:true,verificationStatus:"verified",confidence:Math.max(answer.confidence,.96)};
  if(verification.status==="failed")return{...answer,verified:false,verificationStatus:"failed",confidence:Math.min(answer.confidence,.35)};
  return{...answer,verified:false,verificationStatus:"pending"};
}

export function providerOrder(input:StudentQuestion,analysis:ReturnType<typeof analyzeQuestion>,registered:string[]){
  if(input.inputType==="image")return["claude"].filter(id=>registered.includes(id));
  const mathLike=analysis.topic==="Matematik";
  if(mathLike&&input.intent==="solve")return["math-engine","deepseek","claude"].filter(id=>registered.includes(id));
  if(mathLike)return["deepseek","claude"].filter(id=>registered.includes(id));
  return["claude","deepseek"].filter(id=>registered.includes(id));
}

export function desiredProviderCount(input:StudentQuestion,analysis:ReturnType<typeof analyzeQuestion>){
  if(input.inputType==="image"||input.intent==="generate_test"||input.intent==="hint")return 1;
  return analysis.difficulty==="hard"?2:1;
}

export async function orchestrateQuestion(input:StudentQuestion):Promise<OrchestratorResult>{
  const initialAnalysis=analyzeQuestion(input);
  const registered=getRegisteredProviderIds();
  if(registered.length===0)throw new Error("Çalışan AI sağlayıcısı bulunamadı.");

  const ordered=providerOrder(input,initialAnalysis,registered);
  const desiredProviders=Math.min(desiredProviderCount(input,initialAnalysis),ordered.length);
  const attempts:ProviderAttempt[]=[];
  const successful:ProviderAttempt[]=[];

  for(const providerId of ordered){
    const attempt=await runProvider(providerId,input,initialAnalysis);
    attempts.push(attempt);
    if(attempt.answer)successful.push(attempt);
    if(successful.length>=desiredProviders)break;
  }

  if(successful.length===0){
    const detail=attempts.map(a=>`${a.providerId}: ${a.error??"hata"}`).join(" | ");
    throw new Error(`Çalışan AI sağlayıcılarından çözüm alınamadı. ${detail}`);
  }

  const consensus=compareAttempts(successful);
  const chosen=consensus.preferred?.answer??successful[0].answer!;
  const verifiedAnswer=applyVerification(input,chosen);
  const localMathAnswer=successful.find(i=>i.providerId==="math-engine")?.answer;
  const finalAnswer=localMathAnswer?.verified?localMathAnswer:verifiedAnswer;
  const subjectAnswer=successful.find(i=>i.answer?.detectedSubject)?.answer??finalAnswer;
  const detectedSubject=subjectAnswer.detectedSubject?.trim();
  const detectedTopic=subjectAnswer.detectedTopic?.trim();
  const analysis=detectedSubject?{...initialAnalysis,topic:detectedSubject,subtopic:detectedTopic||initialAnalysis.subtopic,needsVerification:detectedSubject==="Matematik",confidence:Math.max(initialAnalysis.confidence,.88)}:initialAnalysis;

  return{
    analysis,
    answer:finalAnswer,
    consensusStatus:consensus.status,
    providersUsed:successful.map(i=>i.providerId),
    agreementScore:consensus.agreementScore,
    finalAnswerSource:finalAnswer===localMathAnswer?"deterministic-math-engine":consensus.status==="agreement"?"consensus":finalAnswer.verified?"deterministic-verification":successful[0].providerId,
    message:finalAnswer.verified?"Çözüm üretildi ve matematiksel olarak doğrulandı.":consensus.status==="agreement"?"İki çözüm karşılaştırıldı ve aynı sonuca ulaşıldı.":"Çözüm üretildi.",
  };
}
