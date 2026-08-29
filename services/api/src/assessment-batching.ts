import type { OrchestratorResult, StudentQuestion } from "./orchestrator/types.js";

export interface AssessmentBatchPlan {
  totalQuestions: number;
  batchSize: number;
  batchCount: number;
}

type Orchestrate = (input: StudentQuestion) => Promise<OrchestratorResult>;

const ASSESSMENT_MARKER = /seviye belirleme testi/i;
const TOTAL_QUESTION_PATTERN = /TAM OLARAK\s+(\d+)\s+çoktan seçmeli soru üret/i;

function cleanJsonArray(raw: string): unknown[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Seviye testi parçası geçerli bir soru dizisi döndürmedi.");
  return parsed;
}

export function getAssessmentBatchPlan(input: StudentQuestion): AssessmentBatchPlan | null {
  if (input.intent !== "generate_test" || input.inputType !== "text") return null;
  if (!ASSESSMENT_MARKER.test(input.question)) return null;
  const match = TOTAL_QUESTION_PATTERN.exec(input.question);
  const totalQuestions = Number(match?.[1] ?? 0);
  if (![10, 20, 40].includes(totalQuestions)) return null;
  const batchSize = Math.min(10, totalQuestions);
  return { totalQuestions, batchSize, batchCount: Math.ceil(totalQuestions / batchSize) };
}

function difficultyForBatch(batchIndex: number, batchCount: number) {
  if (batchCount <= 1) return "kolaydan zora dengeli";
  const ratio = batchIndex / (batchCount - 1);
  if (ratio <= 0.25) return "kolay ve temel ayırt edici";
  if (ratio <= 0.6) return "orta düzey ve ayırt edici";
  return "orta-zor ve güçlü öğrenciyi ayırt edici";
}

export function buildAssessmentBatchInput(input: StudentQuestion, plan: AssessmentBatchPlan, batchIndex: number): StudentQuestion {
  const remaining = plan.totalQuestions - batchIndex * plan.batchSize;
  const batchQuestionCount = Math.min(plan.batchSize, remaining);
  const partNumber = batchIndex + 1;
  const totalPattern = new RegExp(`TAM OLARAK\\s+${plan.totalQuestions}\\s+çoktan seçmeli soru üret`, "i");
  const objectPattern = new RegExp(`toplam\\s+${plan.totalQuestions}\\s+nesne bulunsun`, "i");
  const base = input.question
    .replace(totalPattern, `TAM OLARAK ${batchQuestionCount} çoktan seçmeli soru üret`)
    .replace(objectPattern, `toplam ${batchQuestionCount} nesne bulunsun`);
  const question = `${base}\n\nPARÇALI TEST ÜRETİMİ: Bu çağrı toplam ${plan.totalQuestions} soruluk testin ${partNumber}/${plan.batchCount}. parçasıdır. Bu yanıtta yalnızca TAM OLARAK ${batchQuestionCount} soru üret. Yukarıdaki toplam ${plan.totalQuestions} soru kuralı tüm parçalar birleştiğinde sağlanacaktır; tek çağrıda ${plan.totalQuestions} soru üretme. Bu parçada ${difficultyForBatch(batchIndex, plan.batchCount)} sorular kullan. Genel taramada önceki/sonraki parçalarla aynı soru kalıplarını tekrarlama; farklı alt konu ve becerilere yer ver. JSON dizisi dışında ek metin yazma.`;
  return { ...input, question };
}

function mergeBatchResults(results: OrchestratorResult[], plan: AssessmentBatchPlan): OrchestratorResult {
  if (results.length !== plan.batchCount) throw new Error("Seviye testinin tüm parçaları tamamlanamadı.");
  const mergedQuestions: unknown[] = [];
  for (let index = 0; index < results.length; index += 1) {
    const answer = results[index]?.answer;
    if (!answer?.answer) throw new Error(`${index + 1}. seviye testi parçasından cevap alınamadı.`);
    const items = cleanJsonArray(answer.answer);
    const expected = Math.min(plan.batchSize, plan.totalQuestions - index * plan.batchSize);
    if (items.length !== expected) throw new Error(`${index + 1}. seviye testi parçası ${expected} yerine ${items.length} soru döndürdü.`);
    mergedQuestions.push(...items);
  }
  if (mergedQuestions.length !== plan.totalQuestions) throw new Error(`Seviye testi toplam ${plan.totalQuestions} soruya tamamlanamadı.`);

  const first = results[0];
  const firstAnswer = first.answer!;
  const providersUsed = [...new Set(results.flatMap(result => result.providersUsed))];
  const confidence = results.reduce((sum, result) => sum + (result.answer?.confidence ?? 0), 0) / results.length;
  const answer = {
    ...firstAnswer,
    answer: JSON.stringify(mergedQuestions),
    explanation: `Seviye testi ${plan.batchCount} parça halinde hazırlandı ve ${plan.totalQuestions} soruda birleştirildi.`,
    steps: [],
    hint: undefined,
    verified: false,
    verificationStatus: "not_applicable" as const,
    confidence,
  };

  return {
    ...first,
    answer,
    consensusStatus: "single",
    providersUsed,
    agreementScore: 1,
    finalAnswerSource: `assessment-batches-${plan.batchCount}x${plan.batchSize}`,
    message: `Seviye testi ${plan.batchCount} adet 10 soruluk parça halinde hazırlandı.`,
  };
}

export async function orchestrateAssessmentBatches(input: StudentQuestion, orchestrate: Orchestrate): Promise<OrchestratorResult> {
  const plan = getAssessmentBatchPlan(input);
  if (!plan || plan.batchCount <= 1) return orchestrate(input);
  const batchPlan: AssessmentBatchPlan = plan;

  const results = new Array<OrchestratorResult>(batchPlan.batchCount);
  let cursor = 0;
  const workerCount = Math.min(2, batchPlan.batchCount);

  async function worker() {
    while (true) {
      const batchIndex = cursor;
      cursor += 1;
      if (batchIndex >= batchPlan.batchCount) return;
      const batchInput = buildAssessmentBatchInput(input, batchPlan, batchIndex);
      results[batchIndex] = await orchestrate(batchInput);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return mergeBatchResults(results, batchPlan);
}
