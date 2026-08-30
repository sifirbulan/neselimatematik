import type { FoundationNodeId, KnowledgeNodeId, PrerequisiteAnalysis } from '../knowledge/knowledge-model';
import type { DifficultyLevel, MistakeType, SkillId } from '../student/student-model';

export type SkillTrend = 'improving' | 'stable' | 'declining' | 'insufficient_data';

export interface MemoryAttemptRecord {
  at: string;
  skill: SkillId;
  correct: boolean;
  difficulty: DifficultyLevel;
  masteryAfter: number;
  mistake?: MistakeType;
}

export interface SkillMemorySnapshot {
  at: string;
  mastery: number;
  correct: boolean;
}

export interface LongTermSkillMemory {
  skill: SkillId;
  mastery: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  lastDifficulty: DifficultyLevel;
  lastMistake?: MistakeType;
  mistakeCounts: Partial<Record<MistakeType, number>>;
  firstPracticedAt?: string;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  stabilityDays: number;
  correctStreak: number;
  wrongStreak: number;
  recentOutcomes: boolean[];
  trend: SkillTrend;
  history: SkillMemorySnapshot[];
}

export interface FoundationMemory {
  nodeId: FoundationNodeId;
  risk: number;
  evidenceCount: number;
  lastEvidenceAt?: string;
  nextReviewAt?: string;
  reasons: string[];
}

export interface ReviewItem {
  nodeId: KnowledgeNodeId;
  kind: 'skill' | 'foundation';
  priority: number;
  dueAt: string;
  overdue: boolean;
  reason: string;
}

export interface LearningMemoryProfile {
  schemaVersion: 1;
  studentId: string;
  grade: number;
  subject: 'matematik';
  createdAt: string;
  updatedAt: string;
  revision: number;
  skills: Record<SkillId, LongTermSkillMemory>;
  foundations: Record<FoundationNodeId, FoundationMemory>;
  recentAttempts: MemoryAttemptRecord[];
  reviewQueue: ReviewItem[];
}

export interface RecordMemoryAttemptInput {
  skill: SkillId;
  correct: boolean;
  difficulty: DifficultyLevel;
  masteryAfter: number;
  mistake?: MistakeType;
  prerequisiteAnalysis?: PrerequisiteAnalysis;
  at?: string;
}

export interface SkillKnowledgeSummary {
  skill: SkillId;
  mastery: number;
  retention: number;
  accuracy: number;
  attempts: number;
  trend: SkillTrend;
  lastPracticedAt?: string;
  nextReviewAt?: string;
}

export interface KnowledgeProfileSummary {
  studentId: string;
  grade: number;
  overallMastery: number;
  overallAccuracy: number;
  practicedSkillCount: number;
  strengths: SkillKnowledgeSummary[];
  developing: SkillKnowledgeSummary[];
  needsReview: SkillKnowledgeSummary[];
  foundationRisks: FoundationMemory[];
  nextFocus?: ReviewItem;
  reviewQueue: ReviewItem[];
}
