import { describe, expect, it } from "vitest";
import { mathEngineExecutor } from "./math-engine-executor.js";
import type { QuestionAnalysis, StudentQuestion } from "./types.js";

const analysis: QuestionAnalysis = {
  topic: "Denklemler",
  subtopic: "Birinci dereceden denklemler",
  exam: "NONE",
  difficulty: "easy",
  needsVision: false,
  needsVerification: true,
  confidence: 0.95,
};

const baseInput: StudentQuestion = {
  question: "2x + 5 = 11",
  inputType: "text",
  intent: "solve",
};

describe("mathEngineExecutor", () => {
  it("basit doğrusal denklemi çözer", async () => {
    const answer = await mathEngineExecutor.execute(baseInput, analysis);
    expect(answer.answer).toBe("x = 3");
    expect(answer.verified).toBe(true);
    expect(answer.verificationStatus).toBe("verified");
  });

  it("desteklenmeyen soruda açık hata verir", async () => {
    await expect(
      mathEngineExecutor.execute({ ...baseInput, question: "Bir üçgenin alanı nasıl bulunur?" }, analysis),
    ).rejects.toThrow("henüz deterministik olarak çözemiyor");
  });
});
