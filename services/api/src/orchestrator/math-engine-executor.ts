import type { AIAnswer, ProviderExecutor } from "./types.js";

interface LinearEquation {
  a: number;
  b: number;
  c: number;
}

function parseLinearEquation(question: string): LinearEquation | null {
  const normalized = question
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[−–]/g, "-");

  const match = normalized.match(/(?:^|[^a-z])([+-]?\d*\.?\d*)x([+-]\d+(?:\.\d+)?)?=([+-]?\d+(?:\.\d+)?)(?:$|[^a-z])/i);
  if (!match) return null;

  const rawA = match[1];
  const a = rawA === "" || rawA === "+" ? 1 : rawA === "-" ? -1 : Number(rawA);
  const b = match[2] ? Number(match[2]) : 0;
  const c = Number(match[3]);

  if (![a, b, c].every(Number.isFinite) || a === 0) return null;
  return { a, b, c };
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}

function solveLinearEquation(question: string): AIAnswer | null {
  const equation = parseLinearEquation(question);
  if (!equation) return null;

  const { a, b, c } = equation;
  const rhs = c - b;
  const x = rhs / a;
  const rhsText = formatNumber(rhs);
  const xText = formatNumber(x);

  return {
    answer: `x = ${xText}`,
    explanation: "Denklemde x'i yalnız bırakmak için önce sabit terimi diğer tarafa geçirir, sonra x'in katsayısına böleriz.",
    steps: [
      `${formatNumber(a)}x ${b >= 0 ? "+" : "-"} ${formatNumber(Math.abs(b))} = ${formatNumber(c)}`,
      `${formatNumber(a)}x = ${rhsText}`,
      `x = ${rhsText} / ${formatNumber(a)} = ${xText}`,
    ],
    hint: "Önce x'in yanındaki sabit sayıyı karşı tarafa geçir.",
    verified: true,
    verificationStatus: "verified",
    confidence: 0.99,
  };
}

export const mathEngineExecutor: ProviderExecutor = {
  providerId: "math-engine",
  async execute(input) {
    const answer = solveLinearEquation(input.question);
    if (!answer) {
      throw new Error("Math engine bu soru tipini henüz deterministik olarak çözemiyor.");
    }
    return answer;
  },
};

export { parseLinearEquation, solveLinearEquation };
