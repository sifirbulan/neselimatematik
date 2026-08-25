import type { QuestionAnalysis } from "./types.js";

export interface ExecutionPolicy {
  desiredProviders: number;
  needsJudgeOnConflict: boolean;
}

export function chooseExecutionPolicy(analysis: QuestionAnalysis): ExecutionPolicy {
  const lowConfidence = analysis.confidence < 0.65;
  const hard = analysis.difficulty === "hard";
  return {
    desiredProviders: hard || lowConfidence ? 2 : 1,
    needsJudgeOnConflict: true,
  };
}
