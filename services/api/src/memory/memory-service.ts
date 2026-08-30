import type { PrerequisiteAnalysis } from '../knowledge/knowledge-model';
import { createStudentModel, type DifficultyLevel, type MistakeType, type SkillId, type StudentModel } from '../student/student-model';
import {
  buildKnowledgeProfileSummary,
  createLearningMemory,
  createLearningMemoryFromStudent,
  memoryToStudentModel,
  recordMemoryAttempt,
} from './memory-engine';
import type { KnowledgeProfileSummary, LearningMemoryProfile } from './memory-model';
import { createLearningMemoryStore, type LearningMemoryStore } from './memory-store';

export interface PersistLearningAttemptInput {
  seedStudent: StudentModel;
  skill: SkillId;
  correct: boolean;
  difficulty: DifficultyLevel;
  masteryAfter: number;
  mistake?: MistakeType;
  prerequisiteAnalysis?: PrerequisiteAnalysis;
  at?: string;
}

export interface LearningMemoryResult {
  profile: LearningMemoryProfile;
  summary: KnowledgeProfileSummary;
}

export class LearningMemoryService {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly store: LearningMemoryStore = createLearningMemoryStore()) {}

  async getProfile(studentId: string): Promise<LearningMemoryProfile | undefined> {
    return this.store.get(studentId.trim());
  }

  async getSummary(studentId: string, at?: string): Promise<KnowledgeProfileSummary | undefined> {
    const profile = await this.getProfile(studentId);
    return profile ? buildKnowledgeProfileSummary(profile, at) : undefined;
  }

  async getStudent(studentId: string, grade = 7): Promise<{ student: StudentModel; memory?: LearningMemoryProfile }> {
    const profile = await this.getProfile(studentId);
    if (!profile) return { student: createStudentModel({ studentId, grade }) };
    return { student: memoryToStudentModel(profile), memory: profile };
  }

  async ensureProfile(studentId: string, grade = 7): Promise<LearningMemoryResult> {
    const existing = await this.getProfile(studentId);
    if (existing) return { profile: existing, summary: buildKnowledgeProfileSummary(existing) };

    let result!: LearningMemoryResult;
    await this.enqueueMutation(async () => {
      const raceSafeExisting = await this.store.get(studentId.trim());
      const profile = raceSafeExisting ?? createLearningMemory(studentId, grade);
      if (!raceSafeExisting) await this.store.save(profile);
      result = { profile, summary: buildKnowledgeProfileSummary(profile) };
    });
    return result;
  }

  async persistAttempt(input: PersistLearningAttemptInput): Promise<LearningMemoryResult> {
    let result!: LearningMemoryResult;
    await this.enqueueMutation(async () => {
      const existing = await this.store.get(input.seedStudent.studentId);
      const base = existing ?? createLearningMemoryFromStudent(input.seedStudent, input.at);
      const profile = recordMemoryAttempt(base, {
        skill: input.skill,
        correct: input.correct,
        difficulty: input.difficulty,
        masteryAfter: input.masteryAfter,
        ...(input.mistake ? { mistake: input.mistake } : {}),
        ...(input.prerequisiteAnalysis ? { prerequisiteAnalysis: input.prerequisiteAnalysis } : {}),
        ...(input.at ? { at: input.at } : {}),
      });
      await this.store.save(profile);
      result = { profile, summary: buildKnowledgeProfileSummary(profile, input.at) };
    });
    return result;
  }

  async deleteProfile(studentId: string): Promise<boolean> {
    let deleted = false;
    await this.enqueueMutation(async () => {
      deleted = await this.store.delete(studentId.trim());
    });
    return deleted;
  }

  private async enqueueMutation(task: () => Promise<void>): Promise<void> {
    const previous = this.mutationQueue.catch(() => undefined);
    const next = previous.then(task);
    this.mutationQueue = next.catch(() => undefined);
    await next;
  }
}

export const learningMemoryService = new LearningMemoryService();
