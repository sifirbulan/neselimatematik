import { getRecentAttempts } from '../student/mastery';
import { EQUATION_SKILLS, type SkillId, type StudentModel } from '../student/student-model';

export function selectNextSkill(student: StudentModel, requestedSkill?: SkillId): SkillId {
  if (requestedSkill) return requestedSkill;

  const currentIndex = EQUATION_SKILLS.indexOf(student.currentSkill);
  const currentState = student.skills[student.currentSkill];
  const recent = getRecentAttempts(student, student.currentSkill, 5);
  const recentCorrect = recent.filter((attempt) => attempt.correct).length;
  const isMastered = currentState.mastery >= 0.8 && recent.length === 5 && recentCorrect >= 4;

  if (!isMastered || currentIndex === EQUATION_SKILLS.length - 1) {
    return student.currentSkill;
  }

  return EQUATION_SKILLS[currentIndex + 1];
}
