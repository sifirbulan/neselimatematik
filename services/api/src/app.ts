import cors from 'cors';
import express from 'express';
import { getNextAdaptiveQuestion, recordAdaptiveResult } from './adaptive/adaptive-engine';
import { getKnowledgeGraph, getKnowledgeGraphView } from './knowledge/knowledge-graph';
import { analyzePrerequisiteNeed } from './knowledge/prerequisite-diagnosis';
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

app.post('/api/v1/adaptive/next-question', (req, res) => {
  const body = req.body ?? {};
  const studentId = body.student?.studentId ?? body.studentId;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return res.status(400).json({ error: 'Öğrenci kimliği gerekli.' });
  }

  if (body.requestedSkill !== undefined && !isSkillId(body.requestedSkill)) {
    return res.status(400).json({ error: 'Geçersiz kazanım kodu.' });
  }

  const student: StudentModel = body.student
    ? createStudentModel(body.student)
    : createStudentModel({ studentId, grade: body.grade });

  return res.json(getNextAdaptiveQuestion({
    student,
    ...(body.requestedSkill ? { requestedSkill: body.requestedSkill } : {}),
  }));
});

app.post('/api/v1/adaptive/result', (req, res) => {
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

  return res.json(recordAdaptiveResult({
    student: createStudentModel(body.student),
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
  }));
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
