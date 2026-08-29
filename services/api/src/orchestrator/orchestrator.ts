import { analyzeQuestion } from "./analyzer.js";
import { compareAttempts } from "./consensus.js";
import { getExecutor, getRegisteredProviderIds, registerExecutor } from "./executor.js";
import { claudeExecutor } from "./claude-executor.js";
import { deepSeekExecutor } from "./deepseek-executor.js";
import { mathEngineExecutor } from "./math-engine-executor.js";
import { verifyAnswer } from "./verifier.js";
import type { AIAnswer, OrchestratorResult, ProviderAttempt, StudentQuestion } from "./types.js";

// Aktif mimari: yerel matematik motoru + DeepSeek + Claude.
// Metin işlemlerinde DeepSeek hızlı ana sağlayıcıdır; Claude yedektir.
// Fotoğraflı sorularda görsel yeteneği nedeniyle Claude kullanılır.
registerExecutor(mathEngineExecutor);
registerExecutor(deepSeekExecutor);
registerExecutor(claudeExecutor);

export function isQuestionSetRequest(input:StudentQuestion){
  if(input.intent==="generate_test")return true;
  const text=input.question.toLocaleLowerCase("tr-TR");
  return /(3\s+(?:yeni\s+)?(?:çoktan\s+seçmeli\s+)?soru|3\s+benzer\s+soru|çoktan\s+seçmeli\s+soru\s+üret|answer alanına yalnızca geçerli json dizi)/i.test(text);
}

function executionInput(input:StudentQuestion):StudentQuestion{
  // Eski istemlerden gelen 3 soru üretme taleplerini de test üretimi olarak ele al.
  return input.intent==="solve"&&isQuestionSetRequest(input)?{...input,intent:"generate_test"}:input;
}

async function runProvider(providerId:string,input:StudentQuestion,analysis:ReturnType<typeof analyzeQuestion>):Promise<ProviderAttempt>{
  const executor=getExecutor(providerId);
  if(!executor)return{providerId,error:"Executor bulunamadı."};
  try{return{providerId,answer:await executor.execute(input,analysis)}}catch(error){return{providerId,error:error instanceof Error?error.message:"Bilinmeyen sağlayıcı hatası."}}
}

function applyVerification(input:StudentQuestion,answer:AIAnswer):AIAnswer{
  if(input.intent==="generate_test"||input.intent==="verify")return{...answer,verified:false,verificationStatus:"not_applicable"};
  if(answer.verified&&answer.verificationStatus==="verified")return answer;
  const verification=verifyAnswer(input.question,answer);
  if(verification.status==="verified")return{...answer,verified:true,verificationStatus:"verified",confidence:Math.max(answer.confidence,.96)};
  if(verification.status==="failed")return{...answer,verified:false,verificationStatus:"failed",confidence:Math.min(answer.confidence,.35)};
  return{...answer,verified:false,verificationStatus:"pending"};
}

export function providerOrder(input:StudentQuestion,analysis:ReturnType<typeof analyzeQuestion>,registered:string[]){
  if(input.inputType==="image")return["claude"].filter(id=>registered.includes(id));
  const mathLike=analysis.topic==="Matematik";

  // Test, benzer soru, ipucu ve öğrenci çözümü doğrulama doğrudan AI görevidir.
  // Yerel matematik motorunu bu isteklerde denemeyerek gereksiz gecikmeyi önleriz.
  if(isQuestionSetRequest(input)||input.intent==="hint"||input.intent==="verify")return["deepseek","claude"].filter(id=>registered.includes(id));

  // Basit matematikte önce ücretsiz ve deterministik yerel motor; desteklemezse DeepSeek.
  if(mathLike&&input.intent==="solve")return["math-engine","deepseek","claude"].filter(id=>registered.includes(id));

  // Diğer bütün metin derslerinde hızlı ve düşük maliyetli DeepSeek ana, Claude yedek.
  return["deepseek","claude"].filter(id=>registered.includes(id));
}

export function desiredProviderCount(_input:StudentQuestion,_analysis:ReturnType<typeof analyzeQuestion>){
  // İlk başarılı cevapta dön. Bir sağlayıcı hata verirse sıradaki otomatik yedek olur.
  // Böylece her soru için iki API'yi gereksiz yere beklemeyiz.
  return 1;
}

export async function orchestrateQuestion(input:StudentQuestion):Promise<OrchestratorResult>{
  const initialAnalysis=analyzeQuestion(input);
  const registered=getRegisteredProviderIds();
  if(registered.length===0)throw new Error("Çalışan AI sağlayıcısı bulunamadı.");

  const providerInput=executionInput(input);
  const ordered=providerOrder(providerInput,initialAnalysis,registered);
  const desiredProviders=Math.min(desiredProviderCount(providerInput,initialAnalysis),ordered.length);
  const attempts:ProviderAttempt[]=[];
  const successful:ProviderAttempt[]=[];

  for(const providerId of ordered){
    const attempt=await runProvider(providerId,providerInput,initialAnalysis);
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
  const verifiedAnswer=applyVerification(providerInput,chosen);
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
    finalAnswerSource:finalAnswer===localMathAnswer?"deterministic-math-engine":finalAnswer.verified?"deterministic-verification":successful[0].providerId,
    message:providerInput.intent==="generate_test"?"Soru seti hazırlandı.":providerInput.intent==="verify"?"Öğrenci çözümü kontrol edildi.":finalAnswer.verified?"Çözüm üretildi ve matematiksel olarak doğrulandı.":"Çözüm üretildi.",
  };
}
