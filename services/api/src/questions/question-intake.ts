import { EDUCATION_STAGES, SUBJECT_CATALOG, type EducationStage } from '../education/education-catalog';

export interface QuestionIntake {
  question: string;
  stage: EducationStage;
  grade?: number;
  department?: string;
  subjectId?: string;
}

export interface QuestionAnalysis {
  status: 'classified' | 'needs_subject_selection';
  question: string;
  stage: EducationStage;
  grade?: number;
  subjectId?: string;
  subjectTitle?: string;
  classificationMethod: 'explicit' | 'keyword' | 'undetermined';
  message: string;
}

const KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  mathematics: ['denklem', 'integral', 'türev', 'fonksiyon', 'üçgen', 'eşitsizlik', 'matematik', 'polinom', 'parabol', 'çarpan'],
  physics: ['kuvvet', 'ivme', 'elektrik alan', 'manyetik', 'fizik', 'basınç'],
  chemistry: ['mol', 'periyodik', 'kimyasal', 'atom', 'asit', 'baz'],
  biology: ['hücre', 'mitoz', 'mayoz', 'fotosentez', 'biyoloji', 'dna'],
  history: ['osmanlı', 'selçuklu', 'tarih', 'inkılap'],
  geography: ['iklim', 'coğrafya', 'nüfus yoğunluğu'],
  english: ['english', 'present perfect', 'past tense'],
  turkish: ['fiilimsi', 'yüklem', 'özne', 'noktalama'],
  literature: ['edebiyat', 'şiir', 'roman', 'nazım'],
  anatomy: ['anatomi', 'kas grubu', 'iskelet sistemi'],
  programming: ['programlama', 'typescript', 'python kodu', 'algoritma yaz'],
};

export function validateQuestionIntake(value: unknown): { intake?: QuestionIntake; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Soru bilgileri gerekli.' };
  const v = value as Record<string, unknown>;
  if (typeof v.question !== 'string' || !v.question.trim()) return { error: 'Soru metni gerekli.' };
  if (v.question.length > 12000) return { error: 'Soru metni en fazla 12000 karakter olabilir.' };
  if (!EDUCATION_STAGES.includes(v.stage as EducationStage)) return { error: 'Geçerli eğitim aşaması gerekli.' };
  const stage = v.stage as EducationStage;
  const ranges: Partial<Record<EducationStage, [number, number]>> = {
    primary: [1, 4], middle: [5, 8], high: [9, 12],
  };
  const range = ranges[stage];
  if (range && (!Number.isInteger(v.grade) || (v.grade as number) < range[0] || (v.grade as number) > range[1])) {
    return { error: `Sınıf ${range[0]}–${range[1]} arasında olmalı.` };
  }
  if (stage === 'university' && (typeof v.department !== 'string' || !v.department.trim())) {
    return { error: 'Üniversite öğrencisi için bölüm gerekli.' };
  }
  if (v.subjectId !== undefined && (typeof v.subjectId !== 'string' || !v.subjectId.trim())) {
    return { error: 'Ders kodu geçersiz.' };
  }
  const intake: QuestionIntake = { question: v.question.trim(), stage };
  if (typeof v.grade === 'number') intake.grade = v.grade;
  if (typeof v.department === 'string') intake.department = v.department.trim().toLowerCase();
  if (typeof v.subjectId === 'string') intake.subjectId = v.subjectId.trim();
  return { intake };
}

export function classifyQuestion(input: QuestionIntake): { analysis?: QuestionAnalysis; error?: string } {
  const available = SUBJECT_CATALOG.filter((s) => s.stages.includes(input.stage) &&
    (!s.departments || (input.department !== undefined && s.departments.includes(input.department))));
  if (input.subjectId && !available.some((s) => s.id === input.subjectId)) {
    return { error: 'Seçilen ders bu eğitim aşaması veya bölüm için uygun değil.' };
  }
  const normalized = input.question.toLocaleLowerCase('tr-TR');
  const scored = available.map((s) => ({
    subject: s,
    score: (KEYWORDS[s.id] ?? []).filter((word) => normalized.includes(word)).length,
  })).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  // Belirsiz sorularda yanlış ders atamak yerine öğrenciden seçim isteriz.
  const winner = input.subjectId
    ? available.find((s) => s.id === input.subjectId)
    : scored.length && (scored.length === 1 || scored[0].score > scored[1].score)
      ? scored[0].subject : undefined;
  return {
    analysis: {
      status: winner ? 'classified' : 'needs_subject_selection',
      question: input.question,
      stage: input.stage,
      ...(input.grade !== undefined ? { grade: input.grade } : {}),
      ...(winner ? { subjectId: winner.id, subjectTitle: winner.title } : {}),
      classificationMethod: input.subjectId ? 'explicit' : winner ? 'keyword' : 'undetermined',
      message: winner
        ? 'Ders belirlendi. Soru çözüm motoruna gönderilmeye hazır.'
        : 'Ders güvenle belirlenemedi. Lütfen ders seçin.',
    },
  };
}
