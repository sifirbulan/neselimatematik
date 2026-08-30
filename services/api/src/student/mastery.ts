import type { AttemptRecord, MistakeType, SkillId, SkillMastery, StudentModel } from './student-model';

const round = (value: number) => Math.round(value * 1000) / 1000;

export function updateMastery(
  mastery: SkillMastery,
  correct: boolean,
  mistake?: MistakeType,
): SkillMastery {
  const nextMastery = correct
    ? mastery.mastery + (1 - mastery.mastery) * 0.18
    : mastery.mastery - mastery.mastery * 0.22;

  return {
    ...mastery,
    mastery: round(Math.max(0, Math.min(1, nextMastery))),
    attempts: mastery.attempts + 1,
    correct: mastery.correct + (correct ? 1 : 0),
    ...(correct ? { lastMistake: undefined } : { lastMistake: mistake ?? 'bilinmiyor' }),
  };
}

export function appendAttempt(student: StudentModel, attempt: AttemptRecord): StudentModel {
  return {
    ...student,
    currentSkill: attempt.skill,
    recentAttempts: [...student.recentAttempts, attempt].slice(-20),
  };
}

export function getRecentAttempts(student: StudentModel, skill: SkillId, size = 5): AttemptRecord[] {
  return student.recentAttempts.filter((attempt) => attempt.skill === skill).slice(-size);
}
