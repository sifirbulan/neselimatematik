import type { DifficultyLevel, MistakeType, SkillId } from '../student/student-model';
import type { StepAnalysisResult } from '../step-analysis/step-model';

export type TeacherAction =
  | 'celebrate'
  | 'hint'
  | 'micro_explanation'
  | 'worked_example'
  | 'prerequisite_review';

export type DiagnosisCode = MistakeType | 'basarili' | 'kavram_temeli';

export interface TeacherEvidence {
  question?: string;
  studentAnswer?: string | number;
  expectedAnswer?: string | number;
}

export interface LearningDiagnosis {
  code: DiagnosisCode;
  title: string;
  reason: string;
  confidence: number;
  repeatedCount: number;
  evidence: string[];
}

export interface WorkedExample {
  question: string;
  steps: string[];
  answer: string;
}

export interface CheckQuestion {
  prompt: string;
  answer: string;
  skill: SkillId;
  difficulty: DifficultyLevel;
}

export interface TeachingContent {
  goal: string;
  explanation: string[];
  hints: string[];
  workedExample?: WorkedExample;
  checkQuestion: CheckQuestion;
}

export interface TeacherPlan {
  action: TeacherAction;
  diagnosis: LearningDiagnosis;
  feedback: {
    headline: string;
    message: string;
  };
  teaching: TeachingContent;
  stepAnalysis?: StepAnalysisResult;
  next: {
    skill: SkillId;
    difficulty: DifficultyLevel;
    retryRecommended: boolean;
    shouldExplain: boolean;
  };
}
