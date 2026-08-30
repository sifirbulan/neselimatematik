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
import { analyzeSolutionSteps } from '../step-analysis/step-analyzer';
import { createTeacherPlan } from '../teacher/teacher-engine';
import type { TeacherPlan } from '../teacher/teacher-model';

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
  question?: string;
  studentAnswer?: string | number;
  expectedAnswer?: string | number;
  solutionSteps?: string[];
}

export interface RecordResultOutput {
  student: StudentModel;
  mastery: number;
  shouldExplainNext: boolean;
  teacherPlan: TeacherPlan;
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
  const stepAnalysis = input.question && input.solutionSteps?.length
    ? analyzeSolutionSteps({ question: input.question, steps: input.solutionSteps })
    : undefined;
  const inferredMistake = input.mistake
    ?? (!input.correct ? stepAnalysis?.firstError?.mistake : undefined);

  const updatedSkill = {
    ...updateMastery(student.skills[input.skill], input.correct, inferredMistake),
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
      ...(inferredMistake ? { mistake: inferredMistake } : {}),
    },
  );

  const decision = decideDifficulty(updatedStudent, input.skill);
  const hasEvidence = input.question !== undefined
    || input.studentAnswer !== undefined
    || input.expectedAnswer !== undefined;
  const teacherPlan = createTeacherPlan({
    student: updatedStudent,
    skill: input.skill,
    correct: input.correct,
    recommendedDifficulty: decision.difficulty,
    shouldExplain: decision.shouldExplain,
    ...(inferredMistake ? { mistake: inferredMistake } : {}),
    ...(input.solutionSteps ? { solutionSteps: input.solutionSteps } : {}),
    ...(stepAnalysis ? { stepAnalysis } : {}),
    ...(hasEvidence
      ? {
          evidence: {
            ...(input.question !== undefined ? { question: input.question } : {}),
            ...(input.studentAnswer !== undefined ? { studentAnswer: input.studentAnswer } : {}),
            ...(input.expectedAnswer !== undefined ? { expectedAnswer: input.expectedAnswer } : {}),
          },
        }
      : {}),
  });

  return {
    student: updatedStudent,
    mastery: updatedSkill.mastery,
    shouldExplainNext: decision.shouldExplain,
    teacherPlan,
  };
}
