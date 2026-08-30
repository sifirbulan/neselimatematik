import type { DifficultyLevel, MistakeType, SkillId, StudentModel } from '../student/student-model';
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
}

function feedbackFor(action: TeacherPlan['action'], correct: boolean): TeacherPlan['feedback'] {
  if (correct) {
    return {
      headline: 'Doğru cevap',
      message: 'Kuralı doğru uyguladın. Şimdi aynı fikri biraz farklı bir soruda deneyelim.',
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
        message: 'Bu hata için uzun konu anlatımı yerine gerekli kuralı kısa ve net biçimde tekrar edeceğiz.',
      };
    case 'worked_example':
      return {
        headline: 'Benzer bir örneği birlikte çözelim',
        message: 'Aynı hata tekrar ettiği için önce benzer bir örneği adım adım görelim, sonra yeniden deneyelim.',
      };
    case 'prerequisite_review':
      return {
        headline: 'Temel adıma dönelim',
        message: 'Bu kazanımda temel eksik göründüğü için daha zor soruya geçmeden önce ana kuralı ve basit bir örneği tekrar edeceğiz.',
      };
    default:
      return {
        headline: 'Devam edelim',
        message: 'Bir sonraki adımı mevcut performansına göre seçiyorum.',
      };
  }
}

export function createTeacherPlan(input: CreateTeacherPlanInput): TeacherPlan {
  const diagnosis = diagnoseLearningNeed({
    student: input.student,
    skill: input.skill,
    correct: input.correct,
    ...(input.mistake ? { mistake: input.mistake } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
  });
  const mastery = input.student.skills[input.skill].mastery;
  const action = chooseTeacherAction({
    correct: input.correct,
    shouldExplain: input.shouldExplain,
    mastery,
    diagnosis,
  });
  const teaching = buildTeachingContent({
    skill: input.skill,
    difficulty: input.recommendedDifficulty,
    action,
  });

  return {
    action,
    diagnosis,
    feedback: feedbackFor(action, input.correct),
    teaching,
    next: {
      skill: input.skill,
      difficulty: input.recommendedDifficulty,
      retryRecommended: !input.correct,
      shouldExplain: input.shouldExplain || action === 'worked_example' || action === 'prerequisite_review',
    },
  };
}
