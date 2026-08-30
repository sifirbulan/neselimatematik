import { decideDifficulty, type DifficultyDecision } from './difficulty-engine';
import { selectNextSkill } from './next-skill-selector';
import { generateQuestion, type GeneratedQuestion } from './question-generator';
import { appendAttempt, updateMastery } from '../student/mastery';
import type {
  DifficultyLevel,
  MistakeType,
  SkillId,
  StudentModel,
} from '../student/student-model';
import { normalizeStudentModel } from '../student/student-model';

export interface NextQuestionInput {
  student: StudentModel;
  requestedSkill?: SkillId;
}

export interface NextQuestionResult {
  student: StudentModel;
  decision: DifficultyDecision;
  question: GeneratedQuestion;
}

export interface RecordResultInput {
  student: StudentModel;
  skill: SkillId;
  difficulty: DifficultyLevel;
  correct: boolean;
  mistake?: MistakeType;
}

export interface RecordResultOutput {
  student: StudentModel;
  mastery: number;
  shouldExplainNext: boolean;
}

export function getNextAdaptiveQuestion(input: NextQuestionInput): NextQuestionResult {
  const student = normalizeStudentModel(input.student);
  const skill = selectNextSkill(student, input.requestedSkill);
  const decision = decideDifficulty(student, skill);
  const question = generateQuestion(skill, decision.difficulty, {
    studentId: student.studentId,
    grade: student.grade,
    attempts: student.skills[skill].attempts,
  });

  return {
    student: { ...student, currentSkill: skill },
    decision,
    question,
  };
}

export function recordAdaptiveResult(input: RecordResultInput): RecordResultOutput {
  const student = normalizeStudentModel(input.student);
  const updatedSkill = {
    ...updateMastery(student.skills[input.skill], input.correct, input.mistake),
    lastDifficulty: input.difficulty,
  };

  const updatedStudent = appendAttempt(
    {
      ...student,
      skills: {
        ...student.skills,
        [input.skill]: updatedSkill,
      },
    },
    {
      skill: input.skill,
      correct: input.correct,
      difficulty: input.difficulty,
      ...(input.mistake ? { mistake: input.mistake } : {}),
    },
  );

  const decision = decideDifficulty(updatedStudent, input.skill);

  return {
    student: updatedStudent,
    mastery: updatedSkill.mastery,
    shouldExplainNext: decision.shouldExplain,
  };
}
