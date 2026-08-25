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
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
  };
}

app.get("/", (_req, res) => res.json(healthPayload()));
app.get("/health", (_req, res) => res.json(healthPayload()));

app.post("/api/v1/questions/analyze", async (req, res) => {
  try {
    const input = validateQuestionRequest(req.body);
    const result = await orchestrateQuestion(input);
    return res.json({
      status: "completed",
      question: input.question || (input.inputType === "image" ? "Fotoğraftaki matematik sorusu" : ""),
      ...result,
      finalAnswer: result.answer,
      next: result.answer?.verificationStatus === "verified" ? "completed" : "verification-pending",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
    const message = error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.";
    console.error("Neşevren provider error:", message);
    return res.status(502).json({
      error: { code: "AI_PROVIDER_ERROR", message: "Yapay zekâ çözüm servisine şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin." },
    });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Neşevren API listening on :${port}`));
