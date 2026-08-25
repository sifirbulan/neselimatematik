import { describe, expect, it } from "vitest";
import { verifyAnswer } from "./verifier.js";
import type { AIAnswer } from "./types.js";

function answer(value: string): AIAnswer {
  return {
    answer: value,
    explanation: "",
    steps: [],
    verified: false,
    verificationStatus: "pending",
    confidence: 0.7,
  };
}

describe("deterministic verifier", () => {
  it("2x + 5 = 17 için x = 6 sonucunu doğrular", () => {
    const result = verifyAnswer("2x + 5 = 17", answer("x = 6"));
    expect(result.verified).toBe(true);
    expect(result.status).toBe("verified");
  });

  it("yanlış sonucu reddeder", () => {
    const result = verifyAnswer("2x + 5 = 17", answer("x = 5"));
    expect(result.verified).toBe(false);
    expect(result.status).toBe("failed");
  });
});
