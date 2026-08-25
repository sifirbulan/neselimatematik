import type { AIAnswer } from "./types.js";

export interface VerificationResult {
  verified: boolean;
  status: "verified" | "failed" | "not_applicable";
  reason: string;
}

function parseLinearEquation(question: string): { a: number; b: number; c: number } | null {
  const normalized = question.replace(/\s+/g, "").replace(/,/g, ".");
  const match = normalized.match(/([+-]?\d*\.?\d*)x([+-]\d+(?:\.\d+)?)?=([+-]?\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const rawA = match[1];
  const a = rawA === "" || rawA === "+" ? 1 : rawA === "-" ? -1 : Number(rawA);
  const b = match[2] ? Number(match[2]) : 0;
  const c = Number(match[3]);
  if (![a, b, c].every(Number.isFinite) || a === 0) return null;
  return { a, b, c };
}

function extractAnswerNumber(answer: string): number | null {
  const explicit = answer.match(/x\s*=\s*([+-]?\d+(?:[.,]\d+)?)/i);
  const fallback = answer.match(/([+-]?\d+(?:[.,]\d+)?)/);
  const raw = explicit?.[1] ?? fallback?.[1];
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function verifyAnswer(question: string, answer: AIAnswer): VerificationResult {
  const equation = parseLinearEquation(question);
  if (!equation) {
    return { verified: false, status: "not_applicable", reason: "Bu soru için deterministik doğrulama uygulanamadı." };
  }

  const candidate = extractAnswerNumber(answer.answer);
  if (candidate === null) {
    return { verified: false, status: "failed", reason: "AI cevabından sayısal sonuç çıkarılamadı." };
  }

  const expected = (equation.c - equation.b) / equation.a;
  const verified = Math.abs(expected - candidate) < 1e-9;
  return {
    verified,
    status: verified ? "verified" : "failed",
    reason: verified ? "Sonuç denklemde yerine konarak doğrulandı." : "AI sonucu denklem çözümüyle uyuşmuyor.",
  };
}
