import { describe, expect, it } from "vitest";
import { shouldUseGoogleSearch } from "./gemini-executor.js";
import type { QuestionAnalysis, StudentQuestion } from "./types.js";

const baseInput: StudentQuestion = {
  question: "",
  inputType: "text",
  intent: "solve",
};

const baseAnalysis: QuestionAnalysis = {
  topic: "Genel",
  subtopic: "Genel",
  exam: "NONE",
  difficulty: "easy",
  needsVision: false,
  needsVerification: false,
  confidence: 0.7,
};

describe("Gemini Google Search grounding policy", () => {
  it("güncel veya açık web araştırması isteyen sorularda Google Search kullanır", () => {
    expect(shouldUseGoogleSearch({ ...baseInput, question: "Bugün yapay zekâ alanındaki son gelişmeler neler?" }, baseAnalysis)).toBe(true);
    expect(shouldUseGoogleSearch({ ...baseInput, question: "Bu konuyu Google'da araştır ve kaynak göster." }, baseAnalysis)).toBe(true);
  });

  it("sabit ders bilgisinde gereksiz Google Search çağrısı yapmaz", () => {
    expect(shouldUseGoogleSearch(
      { ...baseInput, question: "Fotosentezin temel aşamalarını açıkla." },
      { ...baseAnalysis, topic: "Biyoloji" },
    )).toBe(false);
  });

  it("test üretiminde ve ipucu isteklerinde web aramasını kapalı tutar", () => {
    expect(shouldUseGoogleSearch(
      { ...baseInput, question: "TYT matematik testi hazırla", intent: "generate_test" },
      { ...baseAnalysis, topic: "Matematik" },
    )).toBe(false);
    expect(shouldUseGoogleSearch(
      { ...baseInput, question: "Bugünkü konu için ipucu ver", intent: "hint" },
      baseAnalysis,
    )).toBe(false);
  });

  it("sade matematik çözümünde gereksiz Google Search çağrısı yapmaz", () => {
    expect(shouldUseGoogleSearch(
      { ...baseInput, question: "2x + 5 = 17 denklemini çöz." },
      { ...baseAnalysis, topic: "Matematik", needsVerification: true },
    )).toBe(false);
  });
});
