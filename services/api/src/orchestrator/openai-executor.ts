import OpenAI from "openai";
import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";

const answerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    explanation: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    hint: { type: "string" },
  },
  required: ["answer", "explanation", "steps", "hint"],
} as const;

function parseAnswer(raw: string): AIAnswer {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("OpenAI yapılandırılmış bir matematik cevabı döndürmedi."); }
  if (!value || typeof value !== "object") throw new Error("OpenAI cevabı geçersiz.");
  const data = value as Record<string, unknown>;
  if (typeof data.answer !== "string" || typeof data.explanation !== "string" || !Array.isArray(data.steps) || !data.steps.every((item) => typeof item === "string") || typeof data.hint !== "string") {
    throw new Error("OpenAI cevabında zorunlu çözüm alanları eksik.");
  }
  return { answer: data.answer, explanation: data.explanation, steps: data.steps, hint: data.hint || undefined, verified: false, verificationStatus: "pending", confidence: 0.82 };
}

function buildPrompt(input: StudentQuestion, analysis: QuestionAnalysis): string {
  const parts = [
    "Sen Neşevren adlı yapay zekâ destekli eğitim platformunun matematik çözüm motorusun.",
    "Türkçe, açık, pedagojik ve matematiksel olarak doğru cevap ver.",
    "Öğrencinin seviyesine uygun, gereksiz uzun olmayan bir çözüm üret.",
    `İstek türü: ${input.intent}`,
    `Konu: ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
  ];
  if (input.inputType === "image") {
    parts.push("Ekli kırpılmış görseldeki matematik sorusunu dikkatlice oku. Soru metnini, sayıları, şıkları ve sembolleri doğru yorumla; yalnızca görseldeki seçili soruyu çöz.");
  }
  if (input.question) parts.push(`Öğrencinin ek notu: ${input.question}`);
  return parts.join("\n");
}

export const openAIExecutor: ProviderExecutor = {
  providerId: "openai",
  async execute(input, analysis) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY tanımlı değil.");
    const client = new OpenAI({ apiKey });
    const prompt = buildPrompt(input, analysis);

    const requestInput = input.inputType === "image" && input.imageDataUrl
      ? [{ role: "user" as const, content: [
          { type: "input_text" as const, text: prompt },
          { type: "input_image" as const, image_url: input.imageDataUrl, detail: "high" as const },
        ] }]
      : prompt;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
      input: requestInput,
      text: { format: { type: "json_schema", name: "nesevren_math_answer", strict: true, schema: answerSchema } },
    });

    const output = response.output_text?.trim();
    if (!output) throw new Error("OpenAI boş cevap döndürdü.");
    return parseAnswer(output);
  },
};
