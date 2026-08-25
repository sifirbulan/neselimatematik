import OpenAI from "openai";
import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";

function parseAnswer(raw: string): AIAnswer {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("OpenAI yapılandırılmış bir matematik cevabı döndürmedi."); }
  if (!value || typeof value !== "object") throw new Error("OpenAI cevabı geçersiz.");
  const data = value as Record<string, unknown>;
  if (typeof data.answer !== "string" || typeof data.explanation !== "string" || !Array.isArray(data.steps)) {
    throw new Error("OpenAI cevabında zorunlu çözüm alanları eksik.");
  }
  return {
    answer: data.answer,
    explanation: data.explanation,
    steps: data.steps.filter((item): item is string => typeof item === "string"),
    hint: typeof data.hint === "string" ? data.hint : undefined,
    verified: false,
    verificationStatus: "pending",
    confidence: 0.72,
  };
}

function buildPrompt(input: StudentQuestion, analysis: QuestionAnalysis): string {
  return [
    "Sen Neşevren adlı yapay zekâ destekli eğitim platformunun matematik çözüm motorusun.",
    "Türkçe, açık, pedagojik ve matematiksel olarak doğru cevap ver.",
    `İstek türü: ${input.intent}`,
    `Konu: ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
    `Soru: ${input.question}`,
    "Yalnızca geçerli JSON döndür. Markdown kullanma.",
    '{"answer":"nihai kısa cevap","explanation":"öğrenciye uygun açıklama","steps":["1. adım","2. adım"],"hint":"kısa ipucu"}'
  ].join("\n");
}

export const openAIExecutor: ProviderExecutor = {
  providerId: "openai",
  async execute(input, analysis) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY tanımlı değil.");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
      input: buildPrompt(input, analysis),
    });
    const output = response.output_text?.trim();
    if (!output) throw new Error("OpenAI boş cevap döndürdü.");
    return parseAnswer(output);
  },
};
