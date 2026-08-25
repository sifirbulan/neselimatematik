import type { ExamType, InputType, StudentIntent, StudentQuestion } from "./orchestrator/types.js";

const inputTypes: InputType[] = ["text", "image", "voice"];
const intents: StudentIntent[] = ["solve", "hint", "teach", "generate_test", "explain_audio"];
const exams: ExamType[] = ["LGS", "TYT", "AYT", "KPSS", "ALES", "NONE"];
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,/i;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateQuestionRequest(body: unknown): StudentQuestion {
  if (!body || typeof body !== "object") throw new ValidationError("İstek gövdesi geçersiz.");
  const value = body as Record<string, unknown>;
  const question = typeof value.question === "string" ? value.question.trim() : "";
  if (question.length > 8000) throw new ValidationError("Soru metni çok uzun.");

  const inputType = (value.inputType ?? "text") as InputType;
  const intent = (value.intent ?? "solve") as StudentIntent;
  const exam = (value.exam ?? "NONE") as ExamType;

  if (!inputTypes.includes(inputType)) throw new ValidationError("Geçersiz soru giriş türü.");
  if (!intents.includes(intent)) throw new ValidationError("Geçersiz öğrenci isteği.");
  if (!exams.includes(exam)) throw new ValidationError("Geçersiz sınav türü.");

  const imageDataUrl = typeof value.imageDataUrl === "string" ? value.imageDataUrl.trim() : undefined;
  if (inputType === "image") {
    if (!imageDataUrl || !IMAGE_DATA_URL.test(imageDataUrl)) {
      throw new ValidationError("Geçerli bir kırpılmış soru fotoğrafı gerekli.");
    }
    if (imageDataUrl.length > 14_000_000) {
      throw new ValidationError("Fotoğraf verisi çok büyük. Lütfen daha küçük bir alan kırpın.");
    }
  } else if (!question) {
    throw new ValidationError("Soru metni gerekli.");
  }

  let grade: number | undefined;
  if (value.grade !== undefined) {
    if (typeof value.grade !== "number" || !Number.isInteger(value.grade) || value.grade < 1 || value.grade > 12) {
      throw new ValidationError("Sınıf bilgisi 1 ile 12 arasında tam sayı olmalıdır.");
    }
    grade = value.grade;
  }

  return { question, inputType, intent, exam, grade, imageDataUrl };
}
