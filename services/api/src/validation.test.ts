import { describe, expect, it } from "vitest";
import { ValidationError, validateQuestionRequest } from "./validation.js";

describe("request validation", () => {
  it("geçerli metin sorusunu kabul eder", () => {
    const result = validateQuestionRequest({ question: "2x+5=17", inputType: "text", intent: "solve", grade: 8 });
    expect(result.question).toBe("2x+5=17");
    expect(result.grade).toBe(8);
  });

  it("boş soruyu reddeder", () => {
    expect(() => validateQuestionRequest({ question: "   " })).toThrow(ValidationError);
  });

  it("geçersiz sınıfı reddeder", () => {
    expect(() => validateQuestionRequest({ question: "1+1", grade: 13 })).toThrow("Sınıf bilgisi");
  });
});
