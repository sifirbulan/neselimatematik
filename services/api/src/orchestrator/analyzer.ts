import type { ExamType, QuestionAnalysis, StudentQuestion } from "./types.js";

function detectExam(text: string): ExamType {
  const value = text.toLocaleLowerCase("tr-TR");
  if (value.includes("lgs")) return "LGS";
  if (value.includes("tyt")) return "TYT";
  if (value.includes("ayt")) return "AYT";
  if (value.includes("kpss")) return "KPSS";
  if (value.includes("ales")) return "ALES";
  return "NONE";
}

function detectTopic(text: string): { topic: string; subtopic: string } {
  const value = text.toLocaleLowerCase("tr-TR");
  if (value.includes("türev") || value.includes("turev")) return { topic: "Analiz", subtopic: "Türev" };
  if (value.includes("integral")) return { topic: "Analiz", subtopic: "İntegral" };
  if (value.includes("limit")) return { topic: "Analiz", subtopic: "Limit" };
  if (value.includes("üçgen") || value.includes("ucgen") || value.includes("geometri")) return { topic: "Geometri", subtopic: "Geometrik Şekiller" };
  if (value.includes("denklem") || /[a-z]\s*[+\-*/=]/i.test(text)) return { topic: "Cebir", subtopic: "Denklemler" };
  if (value.includes("olasılık") || value.includes("olasilik")) return { topic: "Olasılık ve İstatistik", subtopic: "Olasılık" };
  return { topic: "Matematik", subtopic: "Genel" };
}

export function analyzeQuestion(input: StudentQuestion): QuestionAnalysis {
  const question = input.question.trim();
  const { topic, subtopic } = detectTopic(question);
  const exam = input.exam && input.exam !== "NONE" ? input.exam : detectExam(question);
  const difficulty = question.length > 260 ? "hard" : question.length > 120 ? "medium" : question ? "easy" : "unknown";

  return {
    topic,
    subtopic,
    exam,
    difficulty,
    needsVision: input.inputType === "image",
    needsVerification: true,
    confidence: difficulty === "hard" ? 0.55 : 0.72,
  };
}
