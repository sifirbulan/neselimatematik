import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";
import { buildIntentGuidance } from "./prompt-guidance.js";
import { parseVisualization, visualizationGuidance } from "./visualization.js";

function cleanJson(raw:string){return raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}

function parseAnswer(raw:string):AIAnswer{
  let value:unknown;
  try{value=JSON.parse(cleanJson(raw))}catch{throw new Error("Claude yapılandırılmış bir cevap döndürmedi.")}
  if(!value||typeof value!=="object")throw new Error("Claude cevabı geçersiz.");
  const data=value as Record<string,unknown>;
  if(typeof data.answer!=="string"||typeof data.explanation!=="string"||!Array.isArray(data.steps)||!data.steps.every(i=>typeof i==="string")||typeof data.hint!=="string"||typeof data.detectedSubject!=="string"||typeof data.detectedTopic!=="string"||typeof data.visualization!=="string")throw new Error("Claude cevabında zorunlu alanlar eksik.");
  return{answer:data.answer,explanation:data.explanation,steps:data.steps,hint:data.hint||undefined,detectedSubject:data.detectedSubject,detectedTopic:data.detectedTopic,visualization:parseVisualization(data.visualization),verified:false,verificationStatus:"pending",confidence:.84};
}

function buildPrompt(input:StudentQuestion,analysis:QuestionAnalysis):string{
  const parts=[
    "Sen Neşevren adlı çok dersli öğrenme platformunun eğitim motorusun.",
    "Sorunun gerçek dersini yalnızca içeriğe bakarak kendin belirle; kullanıcının daha önce yaptığı ders seçimi yanlış olabilir.",
    "detectedSubject alanına gerçek dersi, detectedTopic alanına gerçek konuyu yaz.",
    "Desteklenen alanlar: Matematik, Fen Bilimleri, Fizik, Kimya, Biyoloji, Türkçe, Türk Dili ve Edebiyatı, İngilizce, Kürtçe, Arapça, Sosyal Bilgiler, Tarih, Coğrafya ve Felsefe.",
    "Türkçe, açık, pedagojik ve gereksiz uzamayan bir cevap ver. Sonucu erken ver; normal çözümde mümkünse 3-6 adımdan uzun anlatma.",
    "Bilmediğin veya görselden okuyamadığın ayrıntıyı uydurma.",
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
  if(input.inputType==="image")parts.push("Ekli kırpılmış görselde yalnızca seçili soruyu oku. Metni, sayıları, seçenekleri, sembolleri ve varsa geometri şekli veya tabloyu birlikte yorumla. Görsel yeterince okunmuyorsa bunu açıkça belirt; veri uydurma.");
  if(input.question)parts.push(`Öğrencinin sorusu ve ek notu: ${input.question}`);
  return parts.join("\n");
}

function parseDataUrl(dataUrl:string){const match=/^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);if(!match)throw new Error("Claude için görsel veri biçimi geçersiz.");return{mediaType:match[1],data:match[2]}}

function requestTimeout(input:StudentQuestion){if(input.intent==="generate_test")return 60000;if(input.inputType==="image")return 35000;return 20000}

function claudeHeaders(apiKey:string,workspaceId?:string):Record<string,string>{
  return{
    "content-type":"application/json",
    "x-api-key":apiKey,
    "anthropic-version":"2023-06-01",
    ...(workspaceId?{"anthropic-workspace-id":workspaceId}:{}),
  };
}

async function callClaude(apiKey:string,workspaceId:string|undefined,model:string,input:StudentQuestion,prompt:string){
  const content:Array<Record<string,unknown>>=[];
  if(input.inputType==="image"&&input.imageDataUrl){const image=parseDataUrl(input.imageDataUrl);content.push({type:"image",source:{type:"base64",media_type:image.mediaType,data:image.data}})}
  content.push({type:"text",text:prompt});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),requestTimeout(input));
  try{
    return await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:controller.signal,headers:claudeHeaders(apiKey,workspaceId),body:JSON.stringify({model,max_tokens:input.intent==="generate_test"?12000:2400,messages:[{role:"user",content}]})});
  }finally{clearTimeout(timer)}
}

type ClaudeResponse={content?:Array<{type?:string;text?:string}>;error?:{message?:string}};

export const claudeExecutor:ProviderExecutor={providerId:"claude",async execute(input,analysis){
  const apiKey=process.env.ANTHROPIC_API_KEY?.trim()||process.env.CLAUDE_API_KEY?.trim();
  if(!apiKey)throw new Error("ANTHROPIC_API_KEY tanımlı değil.");
  const workspaceId=process.env.ANTHROPIC_WORKSPACE_ID?.trim()||undefined;
  const model=process.env.CLAUDE_MODEL?.trim()||"claude-sonnet-4-20250514";
  const prompt=buildPrompt(input,analysis);
  let response:Response;
  try{response=await callClaude(apiKey,workspaceId,model,input,prompt)}catch(error){if(error instanceof Error&&error.name==="AbortError")throw new Error("Claude yanıt süresini aştı.");throw error}
  const payload=await response.json() as ClaudeResponse;
  if(!response.ok){
    const detail=payload.error?.message??response.statusText;
    if(response.status===400&&/anthropic-workspace-id is required/i.test(detail)&&!workspaceId){
      throw new Error("Claude anahtarı workspace kimliği istiyor. Render Environment'a ANTHROPIC_WORKSPACE_ID ekleyin.");
    }
    if(/credit balance is too low|purchase credits|insufficient.*credit/i.test(detail)){
      throw new Error("Claude API kredisi yetersiz. Metin sorularında DeepSeek kullanılabilir; fotoğraflı soru çözümü Claude kredisi yüklendiğinde aktif olacak.");
    }
    throw new Error(`Claude çağrısı başarısız: ${response.status} ${detail}`);
  }
  const output=(payload.content??[]).filter(p=>p.type==="text").map(p=>p.text??"").join("").trim();
  if(!output)throw new Error("Claude boş cevap döndürdü.");
  return parseAnswer(output);
}};

export { claudeHeaders };
