import { describe, expect, it } from "vitest";
import { geminiExecutor } from "./gemini-executor.js";

describe("Gemini executor", () => {
  it("Google Search eklentisi olmadan normal Gemini sağlayıcısı olarak yüklenir", () => {
    expect(geminiExecutor.providerId).toBe("gemini");
  });
});
