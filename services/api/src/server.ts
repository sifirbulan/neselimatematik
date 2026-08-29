import express from "express";
import cors from "cors";
import { orchestrateQuestion } from "./orchestrator/orchestrator.js";
import { ValidationError, validateQuestionRequest } from "./validation.js";

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "16mb" }));

function healthPayload() {
  return {
    service: "nesevren-api",
    status: "ok",
    activeProviders: ["math-engine", "deepseek", "claude"],
    claudeConfigured: Boolean((process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY)?.trim()),
    claudeWorkspaceConfigured: Boolean(process.env.ANTHROPIC_WORKSPACE_ID?.trim()),
    deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    claudeModel: process.env.CLAUDE_MODEL?.trim() || "claude-sonnet-4-20250514",
    deepSeekModel: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
  };
}

app.get("/", (_req, res) => res.json(healthPayload()));
app.get("/health", (_req, res) => res.json(healthPayload()));

app.post("/api/v1/questions/analyze", async (req, res) => {
  let isImageRequest = false;
  try {
    const input = validateQuestionRequest(req.body);
    isImageRequest = input.inputType === "image";
    const result = await orchestrateQuestion(input);
    return res.json({
      status: "completed",
      question: input.question || (input.inputType === "image" ? "Fotoğraftaki soru" : ""),
      ...result,
      finalAnswer: result.answer,
      next: result.answer?.verificationStatus === "verified" ? "completed" : "verification-pending",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }

    const detail = error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";
    console.error("Neşevren provider error:", detail);
    return res.status(502).json({
      error: {
        code: isImageRequest ? "VISION_PROVIDER_ERROR" : "AI_PROVIDER_ERROR",
        message: isImageRequest
          ? "Fotoğraf yapay zekâ tarafından okunamadı. Lütfen tekrar deneyin."
          : "Yapay zekâ çözüm servisine şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.",
        detail,
      },
    });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Neşevren API listening on :${port}`));
