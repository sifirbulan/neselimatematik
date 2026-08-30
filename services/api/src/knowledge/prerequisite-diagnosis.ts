import type { MistakeType, SkillId, StudentModel } from '../student/student-model';
import type { StepAnalysisResult } from '../step-analysis/step-model';
import { findPathToTarget, getDirectPrerequisites, getKnowledgeGraphView, getKnowledgeNode } from './knowledge-graph';
import type { KnowledgeNodeId, PrerequisiteAnalysis, PrerequisiteCandidate } from './knowledge-model';

const MISTAKE_ROOTS: Record<MistakeType, Array<{ id: KnowledgeNodeId; confidence: number; reason: string }>> = {
  ters_islem_hatasi: [
    { id: 'esitlik_dengesi', confidence: 0.9, reason: 'Eşitliğin iki tarafına aynı işlemi uygulama ilkesi bu hatanın temel önkoşuludur.' },
    { id: 'ters_islem', confidence: 0.82, reason: 'Toplama-çıkarma veya çarpma-bölme ters işlem ilişkisi karışmış olabilir.' },
  ],
  isaret_hatasi: [
    { id: 'tam_sayilar_ve_isaretler', confidence: 0.94, reason: 'İşaret hataları çoğunlukla negatif ve pozitif sayılardaki işlem bilgisinden kaynaklanır.' },
    { id: 'dort_islem', confidence: 0.7, reason: 'İşlem doğruluğu zayıfsa işaret takibi de bozulabilir.' },
  ],
  carpma_bolme_hatasi: [
    { id: 'carpma_bolme_iliskisi', confidence: 0.93, reason: 'Katsayı kaldırma adımı doğrudan çarpma-bölme ters ilişkisine dayanır.' },
    { id: 'dort_islem', confidence: 0.68, reason: 'Temel çarpma-bölme işlemi kontrol edilmelidir.' },
  ],
  dagilma_hatasi: [
    { id: 'dagilma_ozelligi', confidence: 0.97, reason: 'Parantez açma hatası doğrudan dağılma özelliğiyle ilişkilidir.' },
    { id: 'tam_sayilar_ve_isaretler', confidence: 0.73, reason: 'Negatif terim içeren parantezlerde işaret bilgisi ek bir risk oluşturur.' },
  ],
  hesaplama_hatasi: [
    { id: 'dort_islem', confidence: 0.86, reason: 'Yöntem doğru olsa bile aritmetik işlem hatası temel dört işlem kontrolü gerektirir.' },
    { id: 'tam_sayilar_ve_isaretler', confidence: 0.66, reason: 'Hesaplama hatası negatif sayılar içeriyorsa işaret bilgisi de kontrol edilmelidir.' },
  ],
  bilinmiyor: [],
};

const round = (value: number) => Math.round(value * 1000) / 1000;
const clamp = (value: number) => Math.max(0, Math.min(0.99, value));

function repeatedMistakeCount(student: StudentModel, skill: SkillId, mistake: MistakeType): number {
  return student.recentAttempts
    .filter((attempt) => attempt.skill === skill && !attempt.correct && attempt.mistake === mistake)
    .slice(-5)
    .length;
}

function candidateEvidence(input: {
  student: StudentModel;
  skill: SkillId;
  mistake: MistakeType;
  stepAnalysis?: StepAnalysisResult;
}): string[] {
  const evidence: string[] = [];
  const repeated = repeatedMistakeCount(input.student, input.skill, input.mistake);
  if (repeated > 0) evidence.push(`Son denemelerde aynı hata ${repeated} kez görüldü.`);
  const mastery = input.student.skills[input.skill].mastery;
  evidence.push(`Hedef kazanım hâkimiyeti: %${Math.round(mastery * 100)}.`);
  if (input.stepAnalysis?.firstError) {
    evidence.push(`${input.stepAnalysis.firstError.stepNumber}. çözüm adımı: ${input.stepAnalysis.firstError.reason}`);
  }
  return evidence;
}

export function analyzePrerequisiteNeed(input: {
  student: StudentModel;
  skill: SkillId;
  correct: boolean;
  mistake?: MistakeType;
  stepAnalysis?: StepAnalysisResult;
}): PrerequisiteAnalysis {
  const graph = getKnowledgeGraphView(input.skill);
  if (input.correct) {
    return {
      targetSkill: input.skill,
      status: 'not_needed',
      candidates: [],
      graph,
    };
  }

  const mistake = input.mistake ?? input.stepAnalysis?.firstError?.mistake ?? 'bilinmiyor';
  const mastery = input.student.skills[input.skill].mastery;
  const repeated = repeatedMistakeCount(input.student, input.skill, mistake);
  const evidence = candidateEvidence({ ...input, mistake });

  let roots = MISTAKE_ROOTS[mistake];
  if (roots.length === 0) {
    roots = getDirectPrerequisites(input.skill).slice(0, 3).map((node, index) => ({
      id: node.id,
      confidence: Math.max(0.42, 0.56 - index * 0.05),
      reason: 'Hata türü kesinleşmediği için hedef kazanımın doğrudan önkoşulları kontrol ediliyor.',
    }));
  }

  const candidates: PrerequisiteCandidate[] = roots
    .map((root) => {
      const pathToTarget = findPathToTarget(root.id, input.skill);
      if (pathToTarget.length === 0) return undefined;
      const masteryBoost = mastery < 0.35 ? 0.06 : mastery < 0.5 ? 0.03 : 0;
      const repeatBoost = Math.min(0.07, repeated * 0.02);
      const stepBoost = input.stepAnalysis?.firstError ? 0.03 : 0;
      return {
        node: getKnowledgeNode(root.id),
        confidence: round(clamp(root.confidence + masteryBoost + repeatBoost + stepBoost)),
        reason: root.reason,
        evidence,
        pathToTarget,
      } satisfies PrerequisiteCandidate;
    })
    .filter((candidate): candidate is PrerequisiteCandidate => candidate !== undefined)
    .sort((a, b) => b.confidence - a.confidence);

  const recommended = candidates[0];
  const status = recommended?.confidence !== undefined && recommended.confidence >= 0.72
    ? 'review_recommended'
    : 'uncertain';

  return {
    targetSkill: input.skill,
    status,
    ...(recommended ? { recommended } : {}),
    candidates,
    graph,
  };
}
