import type { AIAnswer, ConsensusStatus, ProviderAttempt } from "./types.js";

function normalizeAnswer(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

export interface ConsensusResult {
  status: ConsensusStatus;
  agreementScore: number;
  preferred?: ProviderAttempt;
}

export function compareAttempts(attempts: ProviderAttempt[]): ConsensusResult {
  const successful = attempts.filter((item): item is ProviderAttempt & { answer: AIAnswer } => Boolean(item.answer));
  if (successful.length <= 1) {
    return { status: successful.length === 1 ? "single" : "not_run", agreementScore: successful.length === 1 ? 1 : 0, preferred: successful[0] };
  }

  const first = normalizeAnswer(successful[0].answer.answer);
  const matching = successful.filter((item) => normalizeAnswer(item.answer.answer) === first).length;
  const agreementScore = matching / successful.length;

  return {
    status: agreementScore === 1 ? "agreement" : "conflict",
    agreementScore,
    preferred: agreementScore === 1 ? successful[0] : undefined,
  };
}
