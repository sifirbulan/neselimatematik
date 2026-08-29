import { describe, expect, it } from "vitest";
import { claudeHeaders } from "./claude-executor.js";

describe("Claude workspace authentication", () => {
  it("workspace kimliği verildiğinde Anthropic başlığını ekler", () => {
    expect(claudeHeaders("test-key", "workspace-123")).toMatchObject({
      "x-api-key": "test-key",
      "anthropic-workspace-id": "workspace-123",
    });
  });

  it("standart API anahtarında workspace başlığını zorunlu tutmaz", () => {
    expect(claudeHeaders("test-key")).not.toHaveProperty("anthropic-workspace-id");
  });
});
