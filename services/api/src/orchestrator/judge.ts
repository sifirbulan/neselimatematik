import type { AIAnswer, ProviderAttempt, QuestionAnalysis, StudentQuestion } from "./types.js";
import { getExecutor } from "./executor.js";

export async function runJudge(
  providerId: string,
  input: StudentQuestion,
  analysis: QuestionAnalysis,
  candidates: ProviderAttempt[],
): Promise<AIAnswer | null> {
  const executor = getExecutor(providerId);
  if (!executor) return null;

  const candidateText = candidates
    .filter((item) => item.answer)
    .map((item, index) => `Aday ${index + 1}: ${item.answer?.answer}\n${item.answer?.explanation}`)
    .join("\n\n");

  const judgeInput: StudentQuestion = {
    ...input,
    question: `${input.question}\n\nAşağıdaki aday çözümler çelişiyor. Soruyu yeniden çöz ve en doğru sonucu üret.\n\n${candidateText}`,
  };

  return executor.execute(judgeInput, analysis);
}
