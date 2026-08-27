import type { AIAnswer, ProviderExecutor, QuestionAnalysis, StudentQuestion } from "./types.js";

function buildPrompt(input: StudentQuestion, analysis: QuestionAnalysis): string {
  const parts = [
    "Sen Neşevren adlı yapay zekâ destekli eğitim platformunun matematik çözüm motorusun.",
    "Türkçe, açık, pedagojik ve matematiksel olarak doğru cevap ver.",
    "Cevabı yalnızca geçerli JSON olarak döndür. Alanlar: answer, explanation, steps, hint.",
    `İstek türü: ${input.intent}`,
    `Konu: ${analysis.topic} / ${analysis.subtopic}`,
    `Sınav: ${analysis.exam}`,
    `Zorluk: ${analysis.difficulty}`,
  ];
  if (input.inputType === "image") parts.push("Ekli kırpılmış görselde yalnızca seçili matematik sorusunu oku; metin, sayı, seçenek ve sembolleri dikkatle yorumla. Okunmuyorsa uydurma yapma.");
  if (input.question) parts.push(`Öğrencinin ek notu: ${input.question}`);
  return parts.join("\n");
}

function parseAnswer(raw: string): AIAnswer {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Mistral yapılandırılmış bir matematik cevabı döndürmedi."); }
  if (!value || typeof value !== "object") throw new Error("Mistral cevabı geçersiz.");
  const data = value as Record<string, unknown>;
  if (typeof data.answer !== "string" || typeof data.explanation !== "string" || !Array.isArray(data.steps) || !data.steps.every((item) => typeof item === "string")) {
    throw new Error("Mistral cevabında zorunlu çözüm alanları eksik.");
  }
  return { answer: data.answer, explanation: data.explanation, steps: data.steps, hint: typeof data.hint === "string" && data.hint ? data.hint : undefined, verified: false, verificationStatus: "pending", confidence: 0.8 };
}

type ChatResponse = { choices?: Array<{ message?: { content?: string } }>; message?: string };

export const mistralExecutor: ProviderExecutor = {
  providerId: "mistral",
  async execute(input, analysis) {
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) throw new Error("MISTRAL_API_KEY tanımlı değil.");
    const isImage = input.inputType === "image" && Boolean(input.imageDataUrl);
    const model = isImage
      ? (process.env.MISTRAL_VISION_MODEL?.trim() || "mistral-small-2506")
      : (process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest");
    const prompt = buildPrompt(input, analysis);
    const content = isImage
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: input.imageDataUrl! }]
      : prompt;
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content }], response_format: { type: "json_object" }, temperature: 0.2 }),
    });
    const payload = await response.json() as ChatResponse;
    if (!response.ok) throw new Error(`Mistral çağrısı başarısız: ${response.status} ${payload.message ?? response.statusText}`);
    const output = payload.choices?.[0]?.message?.content?.trim();
    if (!output) throw new Error("Mistral boş cevap döndürdü.");
    return parseAnswer(output);
  },
};
