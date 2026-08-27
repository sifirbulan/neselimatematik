import { analyzeQuestion } from "./analyzer.js";
import { compareAttempts } from "./consensus.js";
import { chooseExecutionPolicy } from "./execution-policy.js";
import { getExecutor, getRegisteredProviderIds, registerExecutor } from "./executor.js";
import { geminiExecutor } from "./gemini-executor.js";
import { groqExecutor } from "./groq-executor.js";
import { mathEngineExecutor } from "./math-engine-executor.js";
import { mistralExecutor } from "./mistral-executor.js";
import { openAIExecutor } from "./openai-executor.js";
import { openRouterExecutor } from "./openrouter-executor.js";
import { verifyAnswer } from "./verifier.js";
import type { AIAnswer, OrchestratorResult, ProviderAttempt, StudentQuestion } from "./types.js";

registerExecutor(mathEngineExecutor);
registerExecutor(geminiExecutor);
registerExecutor(groqExecutor);
registerExecutor(mistralExecutor);
registerExecutor(openRouterExecutor);
registerExecutor(openAIExecutor);

async function runProvider(
  providerId: string,
  input: StudentQuestion,
  analysis: ReturnType<typeof analyzeQuestion>,
): Promise<ProviderAttempt> {
  const executor = getExecutor(providerId);
  if (!executor) return { providerId, error: "Executor bulunamadı." };

  try {
    return { providerId, answer: await executor.execute(input, analysis) };
  } catch (error) {
    return {
      providerId,
      error: error instanceof Error ? error.message : "Bilinmeyen sağlayıcı hatası.",
    };
  }
}

function applyVerification(input: StudentQuestion, answer: AIAnswer): AIAnswer {
  if (answer.verified && answer.verificationStatus === "verified") return answer;

  const verification = verifyAnswer(input.question, answer);
  if (verification.status === "verified") {
    return {
      ...answer,
      verified: true,
      verificationStatus: "verified",
      confidence: Math.max(answer.confidence, 0.96),
    };
  }

  if (verification.status === "failed") {
    return {
      ...answer,
      verified: false,
      verificationStatus: "failed",
      confidence: Math.min(answer.confidence, 0.35),
    };
  }

  return { ...answer, verified: false, verificationStatus: "pending" };
}

export async function orchestrateQuestion(input: StudentQuestion): Promise<OrchestratorResult> {
  const analysis = analyzeQuestion(input);
  const policy = chooseExecutionPolicy(analysis);
  const registered = getRegisteredProviderIds();

  if (registered.length === 0) {
    throw new Error("Çalışan AI sağlayıcısı bulunamadı.");
  }

  const attempts: ProviderAttempt[] = [];
  const successful: ProviderAttempt[] = [];

  for (const providerId of registered) {
    const attempt = await runProvider(providerId, input, analysis);
    attempts.push(attempt);
    if (attempt.answer) successful.push(attempt);

    if (successful.length >= policy.desiredProviders) break;
  }

  if (successful.length === 0) {
    const detail = attempts
      .map((attempt) => `${attempt.providerId}: ${attempt.error ?? "hata"}`)
      .join(" | ");
    throw new Error(`Çalışan AI sağlayıcılarından çözüm alınamadı. ${detail}`);
  }

  const consensus = compareAttempts(successful);
  const chosen = consensus.preferred?.answer ?? successful[0].answer!;
  const verifiedAnswer = applyVerification(input, chosen);

  const localMathAnswer = successful.find((item) => item.providerId === "math-engine")?.answer;
  const finalAnswer = localMathAnswer?.verified ? localMathAnswer : verifiedAnswer;

  return {
    analysis,
    answer: finalAnswer,
    consensusStatus: consensus.status,
    providersUsed: successful.map((item) => item.providerId),
    agreementScore: consensus.agreementScore,
    finalAnswerSource: finalAnswer === localMathAnswer
      ? "deterministic-math-engine"
      : consensus.status === "agreement"
        ? "consensus"
        : finalAnswer.verified
          ? "deterministic-verification"
          : successful[0].providerId,
    message: finalAnswer.verified
      ? "Çözüm üretildi ve matematiksel olarak doğrulandı."
      : consensus.status === "agreement"
        ? "Birden fazla çözüm karşılaştırıldı ve aynı sonuca ulaşıldı."
        : "Çözüm üretildi; doğrulama durumu öğrenciye açıkça gösteriliyor.",
  };
}
