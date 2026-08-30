import { describe, expect, it } from 'vitest';
import { createStudentModel } from '../student/student-model';
import { createTeacherPlan } from '../teacher/teacher-engine';
import { analyzeSolutionSteps } from './step-analyzer';

const skill = 'bilinmeyeni_yalniz_birakma' as const;

describe('çözüm adımı analiz motoru', () => {
  it('doğru çözüm zincirini satır satır doğrular', () => {
    const result = analyzeSolutionSteps({
      question: '2x + 5 = 17',
      steps: ['2x = 12', 'x = 6'],
    });

    expect(result.validSoFar).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.finalSolution).toBe(6);
    expect(result.firstError).toBeUndefined();
    expect(result.transitions.map((step) => step.status)).toEqual(['valid', 'valid']);
  });

  it('ters işlem hatasının oluştuğu ilk satırı bulur', () => {
    const result = analyzeSolutionSteps({
      question: '2x + 5 = 17',
      steps: ['2x = 22', 'x = 11'],
    });

    expect(result.validSoFar).toBe(false);
    expect(result.firstError?.stepNumber).toBe(1);
    expect(result.firstError?.mistake).toBe('ters_islem_hatasi');
    expect(result.transitions[1].status).toBe('unverified');
  });

  it('katsayı kaldırılırken yapılan bölme hatasını tanır', () => {
    const result = analyzeSolutionSteps({
      question: '2x + 4 = 16',
      steps: ['2x = 12', 'x = 12'],
    });

    expect(result.firstError?.stepNumber).toBe(2);
    expect(result.firstError?.mistake).toBe('carpma_bolme_hatasi');
  });

  it('parantez açma hatasını tanır', () => {
    const result = analyzeSolutionSteps({
      question: '3(x + 2) = 15',
      steps: ['3x + 2 = 15'],
    });

    expect(result.firstError?.mistake).toBe('dagilma_hatasi');
    expect(result.firstError?.stepNumber).toBe(1);
  });

  it('öğretmen motoruna hata satırı ve hata türünü otomatik taşır', () => {
    const student = createStudentModel({ studentId: 'ogrenci-step', grade: 7 });
    const plan = createTeacherPlan({
      student,
      skill,
      correct: false,
      recommendedDifficulty: 2,
      shouldExplain: false,
      evidence: { question: '2x + 5 = 17', studentAnswer: 11, expectedAnswer: 6 },
      solutionSteps: ['2x = 22', 'x = 11'],
    });

    expect(plan.stepAnalysis?.firstError?.stepNumber).toBe(1);
    expect(plan.diagnosis.code).toBe('ters_islem_hatasi');
    expect(plan.stepAnalysis?.transitions[0].status).toBe('invalid');
  });
});
