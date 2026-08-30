import { getRecentAttempts } from '../student/mastery';
import type { DifficultyLevel, SkillId, StudentModel } from '../student/student-model';

export type LearningAction = 'advance' | 'challenge' | 'practice' | 'simplify' | 'explain';

export interface DifficultyDecision {
  difficulty: DifficultyLevel;
  action: LearningAction;
  shouldExplain: boolean;
  recentCorrect: number;
  recentCount: number;
  reason: string;
}

const clamp = (value: number): DifficultyLevel => Math.max(1, Math.min(5, value)) as DifficultyLevel;

function baseDifficulty(mastery: number): DifficultyLevel {
  if (mastery < 0.25) return 1;
  if (mastery < 0.5) return 2;
  if (mastery < 0.7) return 3;
  if (mastery < 0.85) return 4;
  return 5;
}

export function decideDifficulty(student: StudentModel, skill: SkillId): DifficultyDecision {
  const state = student.skills[skill];
  const recent = getRecentAttempts(student, skill, 5);
  const recentCorrect = recent.filter((attempt) => attempt.correct).length;

  if (recent.length === 5) {
    if (recentCorrect === 5) {
      return {
        difficulty: clamp(state.lastDifficulty + 1),
        action: 'advance',
        shouldExplain: false,
        recentCorrect,
        recentCount: 5,
        reason: 'Son 5 sorunun tamamı doğru; zorluk artırıldı.',
      };
    }

    if (recentCorrect === 4) {
      return {
        difficulty: clamp(state.lastDifficulty + 1),
        action: 'challenge',
        shouldExplain: false,
        recentCorrect,
        recentCount: 5,
        reason: 'Son 5 soruda 4 doğru; aynı kazanım biraz zorlaştırıldı.',
      };
    }

    if (recentCorrect === 3) {
      return {
        difficulty: state.lastDifficulty,
        action: 'practice',
        shouldExplain: false,
        recentCorrect,
        recentCount: 5,
        reason: 'Son 5 soruda 3 doğru; seviye korunuyor.',
      };
    }

    if (recentCorrect === 2) {
      return {
        difficulty: clamp(state.lastDifficulty - 1),
        action: 'simplify',
        shouldExplain: false,
        recentCorrect,
        recentCount: 5,
        reason: 'Son 5 soruda 2 doğru; daha temel bir soru seçildi.',
      };
    }

    return {
      difficulty: clamp(state.lastDifficulty - 1),
      action: 'explain',
      shouldExplain: true,
      recentCorrect,
      recentCount: 5,
      reason: 'Son 5 soruda en fazla 1 doğru; yeni sorudan önce kısa konu anlatımı öneriliyor.',
    };
  }

  return {
    difficulty: baseDifficulty(state.mastery),
    action: 'practice',
    shouldExplain: false,
    recentCorrect,
    recentCount: recent.length,
    reason: 'Henüz 5 soruluk pencere oluşmadı; kazanım hâkimiyetine göre seviye seçildi.',
  };
}
