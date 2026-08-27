import OpenAI from "openai";
import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";

function buildPrompt(input: StudentQuestion, analysis: QuestionAnalysis): string {
  const parts = [
    "Sen Neşevren adlı yapay zekâ destekli eğitim platformunun matematik çözüm motorusun.",
    "Türkçe, açık, pedagojik ve matematiksel olarak doğru cevap ver.",
    "Öğrencinin seviyesine uygun, gereksiz uzun olmayan bir çözüm üret.",
    "Cevabı yalnızca geçerli JSON olarak döndür. Alanlar: answer, explanation, steps, hint.",
    `İstek türü: ${input.intent}`,
    `Konu: ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
  ];
  if (input.inputType === "image") {
    parts.push("Ekli kırpılmış görselde yalnızca seçili matematik sorusunu oku. Metni, sayıları, seçenekleri ve sembolleri dikkatlice yorumla. Görsel yeterince okunmuyorsa bunu açıkça söyle; uydurma yapma.");
  }
  if (input.question) parts.push(`Öğrencinin ek notu: ${input.question}`);
  return parts.join("\n");
}

function parseAnswer(raw: string): AIAnswer {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Groq yapılandırılmış bir matematik cevabı döndürmedi."); }
  if (!value || typeof value !== "object") throw new Error("Groq cevabı geçersiz.");
  const data = value as Record<string, unknown>;
  if (typeof data.answer !== "string" || typeof data.explanation !== "string" || !Array.isArray(data.steps) || !data.steps.every((item) => typeof item === "string")) {
    throw new Error("Groq cevabında zorunlu çözüm alanları eksik.");
  }
  return {
    answer: data.answer,
    explanation: data.explanation,
    steps: data.steps,
    hint: typeof data.hint === "string" && data.hint ? data.hint : undefined,
    verified: false,
    verificationStatus: "pending",
    confidence: 0.8,
  };
}

export const groqExecutor: ProviderExecutor = {
  providerId: "groq",
  async execute(input, analysis) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error("GROQ_API_KEY tanımlı değil.");

    const isImage = input.inputType === "image" && Boolean(input.imageDataUrl);
    const model = isImage
      ? (process.env.GROQ_VISION_MODEL?.trim() || "qwen/qwen3.6-27b")
      : (process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b");

    const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
    const prompt = buildPrompt(input, analysis);

    const messages = isImage
      ? [{
          role: "user" as const,
          content: [
            { type: "text" as const, text: prompt },
            { type: "image_url" as const, image_url: { url: input.imageDataUrl! } },
          ],
        }]
      : [{ role: "user" as const, content: prompt }];

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      const output = response.choices[0]?.message?.content?.trim();
      if (!output) throw new Error("Groq boş cevap döndürdü.");
      return parseAnswer(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen Groq hatası";
      throw new Error(`${isImage ? "Groq görsel" : "Groq metin"} çağrısı başarısız: ${message}`);
    }
  },
};
