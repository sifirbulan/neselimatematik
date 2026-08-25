import express from "express";
import cors from "cors";
import { analyzeQuestion } from "./orchestrator/analyzer.js";
import type { ExamType, InputType, StudentIntent, StudentQuestion } from "./orchestrator/types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ service: "nesevren-api", status: "ok" });
});

app.post("/api/v1/questions/analyze", (req, res) => {
  const body = req.body ?? {};
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Soru metni gerekli.",
      },
    });
  }

  const grade = typeof body.grade === "number" && Number.isInteger(body.grade) && body.grade >= 1 && body.grade <= 12
    ? body.grade
    : undefined;

  const input: StudentQuestion = {
    question,
    inputType: (body.inputType ?? "text") as InputType,
    intent: (body.intent ?? "solve") as StudentIntent,
    grade,
    exam: (body.exam ?? "NONE") as ExamType,
  };

  const analysis = analyzeQuestion(input);

  return res.json({
    status: "analyzed",
    message: "Soru Neşevren ön analizinden geçti.",
    question,
    analysis,
    next: "provider-execution",
  });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Neşevren API listening on :${port}`));
