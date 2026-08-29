import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";
import { buildIntentGuidance } from "./prompt-guidance.js";
import { parseVisualization, visualizationGuidance } from "./visualization.js";

function cleanJson(raw:string){return raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}

function parseAnswer(raw:string):AIAnswer{
  let value:unknown;
  try{value=JSON.parse(cleanJson(raw))}catch{throw new Error("DeepSeek yapılandırılmış bir cevap döndürmedi.")}
  if(!value||typeof value!=="object")throw new Error("DeepSeek cevabı geçersiz.");
  const data=value as Record<string,unknown>;
  if(typeof data.answer!=="string"||typeof data.explanation!=="string"||!Array.isArray(data.steps)||!data.steps.every(i=>typeof i==="string")||typeof data.hint!=="string"||typeof data.detectedSubject!=="string"||typeof data.detectedTopic!=="string"||typeof data.visualization!=="string")throw new Error("DeepSeek cevabında zorunlu alanlar eksik.");
  return{answer:data.answer,explanation:data.explanation,steps:data.steps,hint:data.hint||undefined,detectedSubject:data.detectedSubject,detectedTopic:data.detectedTopic,visualization:parseVisualization(data.visualization),verified:false,verificationStatus:"pending",confidence:.86};
}

function buildPrompt(input:StudentQuestion,analysis:QuestionAnalysis):string{
  const parts=[
    "Sen Neşevren adlı çok dersli öğrenme platformunun hızlı matematik ve akıl yürütme motorusun.",
    "Sorunun gerçek dersini içerikten kendin belirle. detectedSubject alanına gerçek dersi, detectedTopic alanına gerçek konuyu yaz.",
    "Özellikle matematik, LGS, TYT, AYT, KPSS ve ALES sorularında işlem hatası yapmadan açık ve kısa çözüm üret.",
    "Türkçe, pedagojik ve gereksiz uzamayan bir cevap ver. Sonucu erken ver; normal çözümde mümkünse 3-6 adımı geçme.",
    "Bilmediğin ayrıntıyı uydurma.",
    ...(input.intent==="generate_test"?[]:[visualizationGuidance]),
    "YALNIZCA geçerli bir JSON nesnesi döndür; Markdown veya kod bloğu kullanma.",
    "JSON biçimi tam olarak şu alanları içersin: answer(string), explanation(string), steps(string[]), hint(string), detectedSubject(string), detectedTopic(string), visualization(string).",
    "Görselleştirme gerekmiyorsa visualization alanını boş string yap.",
    `İstek türü: ${input.intent}`,
    `Ön analiz (yanlış olabilir): ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
    ...buildIntentGuidance(input.intent),
  ];
  if(input.question)parts.push(`Öğrencinin sorusu ve ek notu: ${input.question}`);
  return parts.join("\n");
}

function requestTimeout(input:StudentQuestion){return input.intent==="generate_test"?60000:18000}

type DeepSeekResponse={choices?:Array<{message?:{content?:string|null}}>;error?:{message?:string}};

export const deepSeekExecutor:ProviderExecutor={providerId:"deepseek",async execute(input,analysis){
  if(input.inputType==="image")throw new Error("DeepSeek görsel sorular için kullanılmıyor.");
  const apiKey=process.env.DEEPSEEK_API_KEY?.trim();
  if(!apiKey)throw new Error("DEEPSEEK_API_KEY tanımlı değil.");
  const model=process.env.DEEPSEEK_MODEL?.trim()||"deepseek-v4-flash";
  const prompt=buildPrompt(input,analysis);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),requestTimeout(input));
  let response:Response;
  try{
    response=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},body:JSON.stringify({model,messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},thinking:{type:"disabled"},max_tokens:input.intent==="generate_test"?12000:2400,temperature:.2,stream:false})});
  }catch(error){if(error instanceof Error&&error.name==="AbortError")throw new Error("DeepSeek yanıt süresini aştı.");throw error}finally{clearTimeout(timer)}
  const payload=await response.json() as DeepSeekResponse;
  if(!response.ok)throw new Error(`DeepSeek çağrısı başarısız: ${response.status} ${payload.error?.message??response.statusText}`);
  const output=payload.choices?.[0]?.message?.content?.trim();
  if(!output)throw new Error("DeepSeek boş cevap döndürdü.");
  return parseAnswer(output);
}};
