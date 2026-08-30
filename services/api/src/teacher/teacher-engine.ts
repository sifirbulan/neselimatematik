import type { DifficultyLevel, MistakeType, SkillId, StudentModel } from '../student/student-model';
import { analyzeSolutionSteps } from '../step-analysis/step-analyzer';
import type { StepAnalysisResult } from '../step-analysis/step-model';
import { analyzePrerequisiteNeed } from '../knowledge/prerequisite-diagnosis';
import { diagnoseLearningNeed } from './error-diagnosis';
import { buildTeachingContent, chooseTeacherAction } from './lesson-builder';
import type { TeacherEvidence, TeacherPlan } from './teacher-model';

export interface CreateTeacherPlanInput {
  student: StudentModel;
  skill: SkillId;
  correct: boolean;
  recommendedDifficulty: DifficultyLevel;
  shouldExplain: boolean;
  mistake?: MistakeType;
  evidence?: TeacherEvidence;
  solutionSteps?: string[];
  stepAnalysis?: StepAnalysisResult;
}

function feedbackFor(
  action: TeacherPlan['action'],
  correct: boolean,
  stepAnalysis?: StepAnalysisResult,
  prerequisiteTitle?: string,
): TeacherPlan['feedback'] {
  if (correct) {
    return {
      headline: 'Doğru cevap',
      message: 'Kuralı doğru uyguladın. Şimdi aynı fikri biraz farklı bir soruda deneyelim.',
    };
  }

  if (stepAnalysis?.firstError) {
    return {
      headline: `${stepAnalysis.firstError.stepNumber}. adımı kontrol edelim`,
      message: prerequisiteTitle
        ? `${stepAnalysis.firstError.reason} Bu hata ${prerequisiteTitle} önkoşuluyla ilişkili görünüyor.`
        : stepAnalysis.firstError.reason,
    };
  }

  switch (action) {
    case 'hint':
      return {
        headline: 'Bir ipucu deneyelim',
        message: 'Cevabı hemen vermek yerine doğru adımı bulmana yardımcı olacak kısa bir ipucu veriyorum.',
      };
    case 'micro_explanation':
      return {
        headline: 'Kuralı kısaca hatırlayalım',
        message: prerequisiteTitle
          ? `Bu hatanın altında ${prerequisiteTitle} önkoşulu olabilir. Önce ilgili temel kuralı kısa ve net biçimde hatırlayalım.`
          : 'Bu hata için uzun konu anlatımı yerine gerekli kuralı kısa ve net biçimde tekrar edeceğiz.',
      };
    case 'worked_example':
      return {
        headline: 'Benzer bir örneği birlikte çözelim',
        message: prerequisiteTitle
          ? `Aynı hata tekrar ettiği için ${prerequisiteTitle} bağlantısını da kontrol ederek benzer bir örneği adım adım çözelim.`
          : 'Aynı hata tekrar ettiği için önce benzer bir örneği adım adım görelim, sonra yeniden deneyelim.',
      };
    case 'prerequisite_review':
      return {
        headline: prerequisiteTitle ? `${prerequisiteTitle} temelini güçlendirelim` : 'Temel adıma dönelim',
        message: prerequisiteTitle
          ? `Hedef kazanıma devam etmeden önce ${prerequisiteTitle} önkoşulunu kısa bir tekrar ve kontrol sorusuyla güçlendireceğiz.`
          : 'Bu kazanımda temel eksik göründüğü için daha zor soruya geçmeden önce ana kuralı ve basit bir örneği tekrar edeceğiz.',
      };
    default:
      return {
        headline: 'Devam edelim',
        message: 'Bir sonraki adımı mevcut performansına göre seçiyorum.',
      };
  }
}

export function createTeacherPlan(input: CreateTeacherPlanInput): TeacherPlan {
  const stepAnalysis = input.stepAnalysis ?? (
    input.evidence?.question && input.solutionSteps?.length
      ? analyzeSolutionSteps({ question: input.evidence.question, steps: input.solutionSteps })
      : undefined
  );
  const inferredMistake = input.mistake
    ?? (!input.correct ? stepAnalysis?.firstError?.mistake : undefined);

  const diagnosis = diagnoseLearningNeed({
    student: input.student,
    skill: input.skill,
    correct: input.correct,
    ...(inferredMistake ? { mistake: inferredMistake } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
  });
  const prerequisiteAnalysis = analyzePrerequisiteNeed({
    student: input.student,
    skill: input.skill,
    correct: input.correct,
    ...(inferredMistake ? { mistake: inferredMistake } : {}),
    ...(stepAnalysis ? { stepAnalysis } : {}),
  });
  const mastery = input.student.skills[input.skill].mastery;
  const action = chooseTeacherAction({
    correct: input.correct,
    shouldExplain: input.shouldExplain,
    mastery,
    diagnosis,
  });
  const prerequisite = prerequisiteAnalysis.status === 'review_recommended'
    ? prerequisiteAnalysis.recommended?.node.id
    : undefined;
  const teaching = buildTeachingContent({
    skill: input.skill,
    difficulty: input.recommendedDifficulty,
    action,
    ...(prerequisite ? { prerequisite } : {}),
  });

  return {
    action,
    diagnosis,
    prerequisiteAnalysis,
    feedback: feedbackFor(action, input.correct, stepAnalysis, prerequisiteAnalysis.recommended?.node.title),
    teaching,
    ...(stepAnalysis ? { stepAnalysis } : {}),
    next: {
      skill: input.skill,
      difficulty: input.recommendedDifficulty,
      ...(prerequisite ? { prerequisite } : {}),
      retryRecommended: !input.correct,
      shouldExplain: input.shouldExplain || action === 'worked_example' || action === 'prerequisite_review',
    },
  };
}
