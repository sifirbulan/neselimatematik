import cors from 'cors';
import express from 'express';
import { getNextAdaptiveQuestion, recordAdaptiveResult } from './adaptive/adaptive-engine';
import { getKnowledgeGraph, getKnowledgeGraphView } from './knowledge/knowledge-graph';
import { analyzePrerequisiteNeed } from './knowledge/prerequisite-diagnosis';
import { learningMemoryService } from './memory/memory-service';
import { normalizeMistake } from './student/mistake-analysis';
import {
  createStudentModel,
  isSkillId,
  type DifficultyLevel,
  type StudentModel,
} from './student/student-model';
import { analyzeSolutionSteps } from './step-analysis/step-analyzer';
import { createTeacherPlan } from './teacher/teacher-engine';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readSolutionSteps(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) return undefined;
  if (value.some((step) => typeof step !== 'string' || !step.trim())) return undefined;
  return value.map((step) => step.trim());
}

app.get('/health', (_req, res) => {
  res.json({ service: 'nesevren-api', status: 'ok' });
});

app.get('/api/v1/memory/:studentId', async (req, res) => {
  const studentId = req.params.studentId.trim();
  if (!studentId) return res.status(400).json({ error: 'Öğrenci kimliği gerekli.' });
  const profile = await learningMemoryService.getProfile(studentId);
  if (!profile) return res.status(404).json({ error: 'Bu öğrenci için uzun süreli öğrenme hafızası bulunamadı.' });
  const summary = await learningMemoryService.getSummary(studentId);
  return res.json({ profile, summary });
});

app.get('/api/v1/memory/:studentId/review-plan', async (req, res) => {
  const studentId = req.params.studentId.trim();
  if (!studentId) return res.status(400).json({ error: 'Öğrenci kimliği gerekli.' });
  const summary = await learningMemoryService.getSummary(studentId);
  if (!summary) return res.status(404).json({ error: 'Bu öğrenci için uzun süreli öğrenme hafızası bulunamadı.' });
  return res.json({
    studentId,
    nextFocus: summary.nextFocus,
    reviewQueue: summary.reviewQueue,
    strengths: summary.strengths,
    needsReview: summary.needsReview,
    foundationRisks: summary.foundationRisks,
  });
});

app.delete('/api/v1/memory/:studentId', async (req, res) => {
  const studentId = req.params.studentId.trim();
  if (!studentId) return res.status(400).json({ error: 'Öğrenci kimliği gerekli.' });
  const deleted = await learningMemoryService.deleteProfile(studentId);
  if (!deleted) return res.status(404).json({ error: 'Silinecek öğrenme hafızası bulunamadı.' });
  return res.json({ status: 'deleted', studentId });
});

app.post('/api/v1/questions/analyze', (req, res) => {
  const { question } = req.body ?? {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Soru metni gerekli.' });
  }
  return res.json({
    status: 'accepted',
    message: 'Soru AI Orchestrator kuyruğuna alındı.',
    question,
    next: 'question-analyzer',
  });
});

app.get('/api/v1/knowledge/graph', (_req, res) => {
  return res.json(getKnowledgeGraph());
});

app.get('/api/v1/knowledge/prerequisites/:skill', (req, res) => {
  const skill = req.params.skill;
  if (!isSkillId(skill)) {
    return res.status(400).json({ error: 'Geçerli bir kazanım kodu gerekli.' });
  }
  return res.json(getKnowledgeGraphView(skill));
});

app.post('/api/v1/knowledge/diagnose', (req, res) => {
  const body = req.body ?? {};
  if (!body.student || typeof body.student.studentId !== 'string') {
    return res.status(400).json({ error: 'Güncel öğrenci modeli gerekli.' });
  }
  if (!isSkillId(body.skill)) {
    return res.status(400).json({ error: 'Geçerli bir kazanım kodu gerekli.' });
  }
  if (typeof body.correct !== 'boolean') {
    return res.status(400).json({ error: 'Sonucun doğru/yanlış bilgisi gerekli.' });
  }

  const solutionSteps = readSolutionSteps(body.solutionSteps);
  if (body.solutionSteps !== undefined && !solutionSteps) {
    return res.status(400).json({ error: 'Çözüm adımları 1 ile 30 arasında, boş olmayan metinlerden oluşmalı.' });
  }
  const stepAnalysis = typeof body.question === 'string' && solutionSteps
    ? analyzeSolutionSteps({ question: body.question, steps: solutionSteps })
    : undefined;
  const mistake = normalizeMistake(body.mistake)
    ?? (!body.correct ? stepAnalysis?.firstError?.mistake : undefined);

  return res.json(analyzePrerequisiteNeed({
    student: createStudentModel(body.student),
    skill: body.skill,
    correct: body.correct,
    ...(mistake ? { mistake } : {}),
    ...(stepAnalysis ? { stepAnalysis } : {}),
  }));
});

app.post('/api/v1/solutions/analyze-steps', (req, res) => {
  const body = req.body ?? {};
  if (typeof body.question !== 'string' || !body.question.trim()) {
    return res.status(400).json({ error: 'Başlangıç denklemi gerekli.' });
  }

  const solutionSteps = readSolutionSteps(body.steps ?? body.solutionSteps);
  if (!solutionSteps) {
    return res.status(400).json({ error: '1 ile 30 arasında, boş olmayan çözüm adımı gerekli.' });
  }

  return res.json(analyzeSolutionSteps({
    question: body.question,
    steps: solutionSteps,
  }));
});

app.post('/api/v1/adaptive/next-question', async (req, res) => {
  const body = req.body ?? {};
  const studentId = body.student?.studentId ?? body.studentId;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return res.status(400).json({ error: 'Öğrenci kimliği gerekli.' });
  }

  if (body.requestedSkill !== undefined && !isSkillId(body.requestedSkill)) {
    return res.status(400).json({ error: 'Geçersiz kazanım kodu.' });
  }

  let student: StudentModel;
  let memoryContext: Awaited<ReturnType<typeof learningMemoryService.getProfile>>;
  if (body.student) {
    student = createStudentModel(body.student);
    memoryContext = await learningMemoryService.getProfile(studentId);
  } else {
    const loaded = await learningMemoryService.getStudent(studentId, body.grade);
    student = loaded.student;
    memoryContext = loaded.memory;
  }

  const result = getNextAdaptiveQuestion({
    student,
    ...(body.requestedSkill ? { requestedSkill: body.requestedSkill } : {}),
  });
  const memorySummary = memoryContext ? await learningMemoryService.getSummary(studentId) : undefined;

  return res.json({
    ...result,
    ...(memoryContext
      ? {
          memoryContext: {
            revision: memoryContext.revision,
            nextFocus: memorySummary?.nextFocus,
            needsReview: memorySummary?.needsReview ?? [],
          },
        }
      : {}),
  });
});

app.post('/api/v1/adaptive/result', async (req, res) => {
  const body = req.body ?? {};
  const studentId = body.student?.studentId ?? body.studentId;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return res.status(400).json({ error: 'Öğrenci kimliği veya güncel öğrenci modeli gerekli.' });
  }
  if (!isSkillId(body.skill)) {
    return res.status(400).json({ error: 'Geçerli bir kazanım kodu gerekli.' });
  }
  if (typeof body.correct !== 'boolean') {
    return res.status(400).json({ error: 'Sonucun doğru/yanlış bilgisi gerekli.' });
  }
  if (![1, 2, 3, 4, 5].includes(body.difficulty)) {
    return res.status(400).json({ error: 'Zorluk seviyesi 1 ile 5 arasında olmalı.' });
  }

  const solutionSteps = readSolutionSteps(body.solutionSteps);
  if (body.solutionSteps !== undefined && !solutionSteps) {
    return res.status(400).json({ error: 'Çözüm adımları 1 ile 30 arasında, boş olmayan metinlerden oluşmalı.' });
  }

  const student = body.student
    ? createStudentModel(body.student)
    : (await learningMemoryService.getStudent(studentId, body.grade)).student;
  const result = recordAdaptiveResult({
    student,
    skill: body.skill,
    difficulty: body.difficulty as DifficultyLevel,
    correct: body.correct,
    mistake: normalizeMistake(body.mistake),
    ...(typeof body.question === 'string' ? { question: body.question } : {}),
    ...(typeof body.studentAnswer === 'string' || typeof body.studentAnswer === 'number'
      ? { studentAnswer: body.studentAnswer }
      : {}),
    ...(typeof body.expectedAnswer === 'string' || typeof body.expectedAnswer === 'number'
      ? { expectedAnswer: body.expectedAnswer }
      : {}),
    ...(solutionSteps ? { solutionSteps } : {}),
  });
  const recordedMistake = result.student.skills[result.teacherPlan.next.skill].lastMistake;
  const memory = await learningMemoryService.persistAttempt({
    seedStudent: student,
    skill: result.teacherPlan.next.skill,
    correct: body.correct,
    difficulty: body.difficulty as DifficultyLevel,
    masteryAfter: result.mastery,
    ...(recordedMistake ? { mistake: recordedMistake } : {}),
    prerequisiteAnalysis: result.teacherPlan.prerequisiteAnalysis,
  });

  return res.json({
    ...result,
    memory: {
      revision: memory.profile.revision,
      summary: memory.summary,
    },
  });
});

app.post('/api/v1/teacher/plan', (req, res) => {
  const body = req.body ?? {};

  if (!body.student || typeof body.student.studentId !== 'string') {
    return res.status(400).json({ error: 'Güncel öğrenci modeli gerekli.' });
  }
  if (!isSkillId(body.skill)) {
    return res.status(400).json({ error: 'Geçerli bir kazanım kodu gerekli.' });
  }
  if (typeof body.correct !== 'boolean') {
    return res.status(400).json({ error: 'Sonucun doğru/yanlış bilgisi gerekli.' });
  }
  if (![1, 2, 3, 4, 5].includes(body.difficulty)) {
    return res.status(400).json({ error: 'Zorluk seviyesi 1 ile 5 arasında olmalı.' });
  }

  const solutionSteps = readSolutionSteps(body.solutionSteps);
  if (body.solutionSteps !== undefined && !solutionSteps) {
    return res.status(400).json({ error: 'Çözüm adımları 1 ile 30 arasında, boş olmayan metinlerden oluşmalı.' });
  }

  const hasEvidence = typeof body.question === 'string'
    || typeof body.studentAnswer === 'string'
    || typeof body.studentAnswer === 'number'
    || typeof body.expectedAnswer === 'string'
    || typeof body.expectedAnswer === 'number';

  return res.json(createTeacherPlan({
    student: createStudentModel(body.student),
    skill: body.skill,
    correct: body.correct,
    recommendedDifficulty: body.difficulty as DifficultyLevel,
    shouldExplain: body.shouldExplain === true,
    mistake: normalizeMistake(body.mistake),
    ...(solutionSteps ? { solutionSteps } : {}),
    ...(hasEvidence
      ? {
          evidence: {
            ...(typeof body.question === 'string' ? { question: body.question } : {}),
            ...(typeof body.studentAnswer === 'string' || typeof body.studentAnswer === 'number'
              ? { studentAnswer: body.studentAnswer }
              : {}),
            ...(typeof body.expectedAnswer === 'string' || typeof body.expectedAnswer === 'number'
              ? { expectedAnswer: body.expectedAnswer }
              : {}),
          },
        }
      : {}),
  }));
});
