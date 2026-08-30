import cors from 'cors';
import express from 'express';
import { getNextAdaptiveQuestion, recordAdaptiveResult } from './adaptive/adaptive-engine';
import { normalizeMistake } from './student/mistake-analysis';
import {
  createStudentModel,
  isSkillId,
  type DifficultyLevel,
  type StudentModel,
} from './student/student-model';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

  return res.json(recordAdaptiveResult({
    student: createStudentModel(body.student),
    skill: body.skill,
    difficulty: body.difficulty as DifficultyLevel,
    correct: body.correct,
    mistake: normalizeMistake(body.mistake),
  }));
});
