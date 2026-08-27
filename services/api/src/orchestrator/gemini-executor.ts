import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";
import { buildIntentGuidance } from "./prompt-guidance.js";

const responseSchema = {
  type: "OBJECT",
  properties: {
    answer: { type: "STRING" },
    explanation: { type: "STRING" },
    steps: { type: "ARRAY", items: { type: "STRING" } },
    hint: { type: "STRING" },
  },
  required: ["answer", "explanation", "steps", "hint"],
};

function buildPrompt(input: StudentQuestion, analysis: QuestionAnalysis): string {
  const parts = [
    "Sen Neşevren adlı yapay zekâ destekli eğitim platformunun matematik çözüm motorusun.",
    "Türkçe, açık, pedagojik ve matematiksel olarak doğru cevap ver.",
    "Cevabı yalnızca istenen JSON şemasına uygun döndür.",
    `İstek türü: ${input.intent}`,
    `Konu: ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
    ...buildIntentGuidance(input.intent),
  ];
  if (input.inputType === "image") {
    parts.push("Ekli kırpılmış görselde yalnızca seçili matematik sorusunu oku. Metni, sayıları, seçenekleri ve sembolleri dikkatlice yorumla. Görsel yeterince okunmuyorsa bunu açıkça söyle; uydurma yapma.");
  }
  if (input.question) parts.push(`Öğrencinin ek notu: ${input.question}`);
  return parts.join("\n");
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Gemini için görsel veri biçimi geçersiz.");
  return { mimeType: match[1], data: match[2] };
}

function parseAnswer(raw: string): AIAnswer {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Gemini yapılandırılmış bir matematik cevabı döndürmedi."); }
  if (!value || typeof value !== "object") throw new Error("Gemini cevabı geçersiz.");
  const data = value as Record<string, unknown>;
  if (typeof data.answer !== "string" || typeof data.explanation !== "string" || !Array.isArray(data.steps) || !data.steps.every((item) => typeof item === "string") || typeof data.hint !== "string") {
    throw new Error("Gemini cevabında zorunlu çözüm alanları eksik.");
  }
  return {
    answer: data.answer,
    explanation: data.explanation,
    steps: data.steps,
    hint: data.hint || undefined,
    verified: false,
    verificationStatus: "pending",
    confidence: 0.8,
  };
}

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string; status?: string; code?: number } };

export const geminiExecutor: ProviderExecutor = {
  providerId: "gemini",
  async execute(input, analysis) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil.");
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
    const prompt = buildPrompt(input, analysis);
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (input.inputType === "image" && input.imageDataUrl) {
      const image = parseDataUrl(input.imageDataUrl);
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", responseSchema } }),
    });
    const payload = await response.json() as GeminiResponse;
    if (!response.ok) throw new Error(`Gemini çağrısı başarısız: ${response.status} ${payload.error?.message ?? response.statusText}`);
    const output = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!output) throw new Error("Gemini boş cevap döndürdü.");
    return parseAnswer(output);
  },
};
