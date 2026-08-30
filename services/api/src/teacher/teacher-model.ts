import type { DifficultyLevel, MistakeType, SkillId } from '../student/student-model';
import type { StepAnalysisResult } from '../step-analysis/step-model';
import type { KnowledgeNodeId, PrerequisiteAnalysis } from '../knowledge/knowledge-model';
import type { PrerequisiteReviewContent } from '../knowledge/prerequisite-content';

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
  prerequisiteReview?: PrerequisiteReviewContent;
  checkQuestion: CheckQuestion;
}

export interface TeacherPlan {
  action: TeacherAction;
  diagnosis: LearningDiagnosis;
  prerequisiteAnalysis: PrerequisiteAnalysis;
  feedback: {
    headline: string;
    message: string;
  };
  teaching: TeachingContent;
  stepAnalysis?: StepAnalysisResult;
  next: {
    skill: SkillId;
    difficulty: DifficultyLevel;
    prerequisite?: KnowledgeNodeId;
    retryRecommended: boolean;
    shouldExplain: boolean;
  };
}
