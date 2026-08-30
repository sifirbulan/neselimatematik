import { FOUNDATION_NODE_IDS, type FoundationNodeId } from '../knowledge/knowledge-model';
import { EQUATION_SKILLS, createStudentModel, type SkillId, type StudentModel } from '../student/student-model';
import type {
  FoundationMemory,
  KnowledgeProfileSummary,
  LearningMemoryProfile,
  LongTermSkillMemory,
  RecordMemoryAttemptInput,
  ReviewItem,
  SkillKnowledgeSummary,
  SkillTrend,
} from './memory-model';

const round = (value: number) => Math.round(value * 1000) / 1000;
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function normalizedGrade(grade: number): number {
  return Math.max(1, Math.min(12, Math.round(Number.isFinite(grade) ? grade : 7)));
}

function isoNow(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + Math.max(0, days));
  return date.toISOString();
}

function daysBetween(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, diff / 86_400_000);
}

function initialStabilityDays(mastery: number): number {
  if (mastery >= 0.85) return 14;
  if (mastery >= 0.7) return 7;
  if (mastery >= 0.5) return 3;
  return 1;
}

function emptySkillMemory(skill: SkillId): LongTermSkillMemory {
  return {
    skill,
    mastery: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: 0,
    lastDifficulty: 1,
    mistakeCounts: {},
    stabilityDays: 1,
    correctStreak: 0,
    wrongStreak: 0,
    recentOutcomes: [],
    trend: 'insufficient_data',
    history: [],
  };
}

function emptyFoundationMemory(nodeId: FoundationNodeId): FoundationMemory {
  return {
    nodeId,
    risk: 0,
    evidenceCount: 0,
    reasons: [],
  };
}

function inferTrend(history: LongTermSkillMemory['history']): SkillTrend {
  if (history.length < 3) return 'insufficient_data';
  const window = history.slice(-6);
  const delta = window[window.length - 1].mastery - window[0].mastery;
  if (delta >= 0.06) return 'improving';
  if (delta <= -0.06) return 'declining';
  return 'stable';
}

function nextStabilityDays(skill: LongTermSkillMemory, correct: boolean, masteryAfter: number): number {
  if (!correct) return 1;
  const multiplier = masteryAfter >= 0.85 ? 2 : masteryAfter >= 0.7 ? 1.7 : masteryAfter >= 0.5 ? 1.35 : 1.1;
  return Math.min(60, Math.max(1, Math.round(skill.stabilityDays * multiplier)));
}

export function getRetentionScore(skill: LongTermSkillMemory, at = new Date().toISOString()): number {
  if (!skill.lastPracticedAt) return clamp01(skill.mastery);
  const elapsedDays = daysBetween(skill.lastPracticedAt, isoNow(at));
  const halfLifeDays = Math.max(7, skill.stabilityDays * 4);
  const retentionFactor = Math.pow(0.5, elapsedDays / halfLifeDays);
  return round(clamp01(skill.mastery * retentionFactor));
}

function buildReviewQueue(profile: LearningMemoryProfile, at: string): ReviewItem[] {
  const now = isoNow(at);
  const items: ReviewItem[] = [];

  for (const skillId of EQUATION_SKILLS) {
    const skill = profile.skills[skillId];
    if (skill.totalAttempts === 0 || !skill.nextReviewAt) continue;
    const retention = getRetentionScore(skill, now);
    const overdue = new Date(skill.nextReviewAt).getTime() <= new Date(now).getTime();
    const priority = round(clamp01(
      0.38 * (1 - retention)
      + 0.22 * (1 - skill.accuracy)
      + Math.min(0.2, skill.wrongStreak * 0.08)
      + (overdue ? 0.2 : 0),
    ));
    items.push({
      nodeId: skillId,
      kind: 'skill',
      priority,
      dueAt: skill.nextReviewAt,
      overdue,
      reason: overdue
        ? `Bu kazanımın tekrar zamanı geldi. Güncel kalıcılık skoru %${Math.round(retention * 100)}.`
        : `Kazanımın planlı tekrar tarihi ${skill.nextReviewAt.slice(0, 10)}.`,
    });
  }

  for (const nodeId of FOUNDATION_NODE_IDS) {
    const foundation = profile.foundations[nodeId];
    if (foundation.risk < 0.2 || !foundation.nextReviewAt) continue;
    const overdue = new Date(foundation.nextReviewAt).getTime() <= new Date(now).getTime();
    const priority = round(clamp01(foundation.risk * 0.8 + (overdue ? 0.2 : 0)));
    items.push({
      nodeId,
      kind: 'foundation',
      priority,
      dueAt: foundation.nextReviewAt,
      overdue,
      reason: foundation.reasons[foundation.reasons.length - 1] ?? 'Temel önkoşul için tekrar öneriliyor.',
    });
  }

  return items.sort((a, b) => b.priority - a.priority || a.dueAt.localeCompare(b.dueAt)).slice(0, 20);
}

export function createLearningMemory(studentId: string, grade = 7, at?: string): LearningMemoryProfile {
  const now = isoNow(at);
  const skills = Object.fromEntries(EQUATION_SKILLS.map((skill) => [skill, emptySkillMemory(skill)])) as LearningMemoryProfile['skills'];
  const foundations = Object.fromEntries(FOUNDATION_NODE_IDS.map((nodeId) => [nodeId, emptyFoundationMemory(nodeId)])) as LearningMemoryProfile['foundations'];

  return {
    schemaVersion: 1,
    studentId: studentId.trim(),
    grade: normalizedGrade(grade),
    subject: 'matematik',
    createdAt: now,
    updatedAt: now,
    revision: 0,
    skills,
    foundations,
    recentAttempts: [],
    reviewQueue: [],
  };
}

export function createLearningMemoryFromStudent(student: StudentModel, at?: string): LearningMemoryProfile {
  const now = isoNow(at);
  const profile = createLearningMemory(student.studentId, student.grade, now);

  for (const skillId of EQUATION_SKILLS) {
    const state = student.skills[skillId];
    const recentForSkill = student.recentAttempts.filter((attempt) => attempt.skill === skillId);
    const recentOutcomes = recentForSkill.slice(-10).map((attempt) => attempt.correct);
    const mistakeCounts = recentForSkill.reduce<LongTermSkillMemory['mistakeCounts']>((counts, attempt) => {
      if (!attempt.correct && attempt.mistake) counts[attempt.mistake] = (counts[attempt.mistake] ?? 0) + 1;
      return counts;
    }, {});
    const stabilityDays = initialStabilityDays(state.mastery);
    const practiced = state.attempts > 0;

    profile.skills[skillId] = {
      skill: skillId,
      mastery: clamp01(state.mastery),
      totalAttempts: state.attempts,
      correctAttempts: Math.min(state.attempts, state.correct),
      accuracy: state.attempts > 0 ? round(Math.min(state.attempts, state.correct) / state.attempts) : 0,
      lastDifficulty: state.lastDifficulty,
      ...(state.lastMistake ? { lastMistake: state.lastMistake } : {}),
      mistakeCounts,
      ...(practiced ? { firstPracticedAt: now, lastPracticedAt: now, nextReviewAt: addDays(now, stabilityDays) } : {}),
      stabilityDays,
      correctStreak: recentOutcomes.slice().reverse().findIndex((value) => !value) === -1
        ? recentOutcomes.filter(Boolean).length
        : recentOutcomes.slice().reverse().findIndex((value) => !value),
      wrongStreak: recentOutcomes.slice().reverse().findIndex((value) => value) === -1
        ? recentOutcomes.filter((value) => !value).length
        : recentOutcomes.slice().reverse().findIndex((value) => value),
      recentOutcomes,
      trend: 'insufficient_data',
      history: practiced ? [{ at: now, mastery: clamp01(state.mastery), correct: recentOutcomes.at(-1) ?? state.correct > 0 }] : [],
    };
  }

  profile.recentAttempts = student.recentAttempts.slice(-20).map((attempt) => ({
    at: now,
    skill: attempt.skill,
    correct: attempt.correct,
    difficulty: attempt.difficulty,
    masteryAfter: profile.skills[attempt.skill].mastery,
    ...(attempt.mistake ? { mistake: attempt.mistake } : {}),
  }));
  profile.reviewQueue = buildReviewQueue(profile, now);
  return profile;
}

export function recordMemoryAttempt(
  inputProfile: LearningMemoryProfile,
  input: RecordMemoryAttemptInput,
): LearningMemoryProfile {
  const at = isoNow(input.at);
  const current = inputProfile.skills[input.skill];
  const masteryAfter = clamp01(input.masteryAfter);
  const totalAttempts = current.totalAttempts + 1;
  const correctAttempts = current.correctAttempts + (input.correct ? 1 : 0);
  const stabilityDays = nextStabilityDays(current, input.correct, masteryAfter);
  const history = [...current.history, { at, mastery: masteryAfter, correct: input.correct }].slice(-30);
  const mistakeCounts = { ...current.mistakeCounts };
  if (!input.correct && input.mistake) {
    mistakeCounts[input.mistake] = (mistakeCounts[input.mistake] ?? 0) + 1;
  }

  const updatedSkill: LongTermSkillMemory = {
    ...current,
    mastery: masteryAfter,
    totalAttempts,
    correctAttempts,
    accuracy: round(correctAttempts / totalAttempts),
    lastDifficulty: input.difficulty,
    ...(!input.correct && input.mistake ? { lastMistake: input.mistake } : input.correct ? { lastMistake: undefined } : {}),
    mistakeCounts,
    firstPracticedAt: current.firstPracticedAt ?? at,
    lastPracticedAt: at,
    nextReviewAt: addDays(at, stabilityDays),
    stabilityDays,
    correctStreak: input.correct ? current.correctStreak + 1 : 0,
    wrongStreak: input.correct ? 0 : current.wrongStreak + 1,
    recentOutcomes: [...current.recentOutcomes, input.correct].slice(-10),
    trend: inferTrend(history),
    history,
  };

  const foundations = { ...inputProfile.foundations };
  const recommended = input.prerequisiteAnalysis?.recommended;
  if (recommended?.node.kind === 'foundation') {
    const nodeId = recommended.node.id as FoundationNodeId;
    const currentFoundation = foundations[nodeId];
    const statusMultiplier = input.prerequisiteAnalysis?.status === 'review_recommended' ? 0.24 : 0.1;
    const evidenceWeight = recommended.confidence * statusMultiplier;
    const risk = round(clamp01(currentFoundation.risk + (1 - currentFoundation.risk) * evidenceWeight));
    foundations[nodeId] = {
      ...currentFoundation,
      risk,
      evidenceCount: currentFoundation.evidenceCount + 1,
      lastEvidenceAt: at,
      nextReviewAt: risk >= 0.55 ? at : addDays(at, 1),
      reasons: [...currentFoundation.reasons, recommended.reason].slice(-8),
    };
  }

  const profile: LearningMemoryProfile = {
    ...inputProfile,
    grade: normalizedGrade(inputProfile.grade),
    updatedAt: at,
    revision: inputProfile.revision + 1,
    skills: {
      ...inputProfile.skills,
      [input.skill]: updatedSkill,
    },
    foundations,
    recentAttempts: [
      ...inputProfile.recentAttempts,
      {
        at,
        skill: input.skill,
        correct: input.correct,
        difficulty: input.difficulty,
        masteryAfter,
        ...(input.mistake ? { mistake: input.mistake } : {}),
      },
    ].slice(-50),
    reviewQueue: [],
  };

  return { ...profile, reviewQueue: buildReviewQueue(profile, at) };
}

function toSkillSummary(skill: LongTermSkillMemory, at: string): SkillKnowledgeSummary {
  return {
    skill: skill.skill,
    mastery: round(skill.mastery),
    retention: getRetentionScore(skill, at),
    accuracy: round(skill.accuracy),
    attempts: skill.totalAttempts,
    trend: skill.trend,
    ...(skill.lastPracticedAt ? { lastPracticedAt: skill.lastPracticedAt } : {}),
    ...(skill.nextReviewAt ? { nextReviewAt: skill.nextReviewAt } : {}),
  };
}

export function buildKnowledgeProfileSummary(
  profile: LearningMemoryProfile,
  at = new Date().toISOString(),
): KnowledgeProfileSummary {
  const now = isoNow(at);
  const practiced = EQUATION_SKILLS
    .map((skillId) => profile.skills[skillId])
    .filter((skill) => skill.totalAttempts > 0);
  const summaries = practiced.map((skill) => toSkillSummary(skill, now));
  const overdueSkillIds = new Set(
    profile.reviewQueue.filter((item) => item.kind === 'skill' && item.overdue).map((item) => item.nodeId),
  );

  const strengths = summaries
    .filter((item) => item.attempts >= 3 && item.mastery >= 0.75 && item.retention >= 0.65)
    .sort((a, b) => b.retention - a.retention);
  const needsReview = summaries
    .filter((item) => item.retention < 0.5 || overdueSkillIds.has(item.skill) || profile.skills[item.skill].wrongStreak >= 2)
    .sort((a, b) => a.retention - b.retention);
  const reviewIds = new Set(needsReview.map((item) => item.skill));
  const strengthIds = new Set(strengths.map((item) => item.skill));
  const developing = summaries
    .filter((item) => !reviewIds.has(item.skill) && !strengthIds.has(item.skill))
    .sort((a, b) => a.mastery - b.mastery);

  const totalAttempts = practiced.reduce((sum, skill) => sum + skill.totalAttempts, 0);
  const totalCorrect = practiced.reduce((sum, skill) => sum + skill.correctAttempts, 0);
  const weighted = practiced.reduce((acc, skill) => {
    const weight = Math.min(10, skill.totalAttempts);
    return { total: acc.total + getRetentionScore(skill, now) * weight, weight: acc.weight + weight };
  }, { total: 0, weight: 0 });
  const reviewQueue = buildReviewQueue(profile, now);
  const foundationRisks = FOUNDATION_NODE_IDS
    .map((nodeId) => profile.foundations[nodeId])
    .filter((foundation) => foundation.risk >= 0.2)
    .sort((a, b) => b.risk - a.risk);

  return {
    studentId: profile.studentId,
    grade: profile.grade,
    overallMastery: weighted.weight > 0 ? round(weighted.total / weighted.weight) : 0,
    overallAccuracy: totalAttempts > 0 ? round(totalCorrect / totalAttempts) : 0,
    practicedSkillCount: practiced.length,
    strengths,
    developing,
    needsReview,
    foundationRisks,
    ...(reviewQueue[0] ? { nextFocus: reviewQueue[0] } : {}),
    reviewQueue,
  };
}

export function memoryToStudentModel(profile: LearningMemoryProfile): StudentModel {
  const nextSkill = profile.reviewQueue.find((item) => item.kind === 'skill')?.nodeId;
  const currentSkill = typeof nextSkill === 'string' && EQUATION_SKILLS.includes(nextSkill as SkillId)
    ? nextSkill as SkillId
    : EQUATION_SKILLS[0];

  return createStudentModel({
    studentId: profile.studentId,
    grade: profile.grade,
    currentSkill,
    skills: Object.fromEntries(EQUATION_SKILLS.map((skillId) => {
      const memory = profile.skills[skillId];
      return [skillId, {
        mastery: memory.mastery,
        attempts: memory.totalAttempts,
        correct: memory.correctAttempts,
        lastDifficulty: memory.lastDifficulty,
        ...(memory.lastMistake ? { lastMistake: memory.lastMistake } : {}),
      }];
    })),
    recentAttempts: profile.recentAttempts.slice(-20).map((attempt) => ({
      skill: attempt.skill,
      correct: attempt.correct,
      difficulty: attempt.difficulty,
      ...(attempt.mistake ? { mistake: attempt.mistake } : {}),
    })),
  });
}
