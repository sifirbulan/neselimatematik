import { describe, expect, it } from 'vitest';
import { createStudentModel } from '../student/student-model';
import { createTeacherPlan } from './teacher-engine';

const skill = 'bilinmeyeni_yalniz_birakma' as const;

describe('Nesevren öğretmen motoru', () => {
  it('yanlış cevapta hata türünü teşhis edip ipucu üretir', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-1',
      skills: { [skill]: { mastery: 0.62, lastDifficulty: 3 } },
    });

    const plan = createTeacherPlan({
      student,
      skill,
      correct: false,
      recommendedDifficulty: 3,
      shouldExplain: false,
      mistake: 'ters_islem_hatasi',
      evidence: {
        question: 'x + 5 = 12',
        studentAnswer: '17',
        expectedAnswer: '7',
      },
    });

    expect(plan.action).toBe('hint');
    expect(plan.diagnosis.code).toBe('ters_islem_hatasi');
    expect(plan.teaching.hints.length).toBeGreaterThan(0);
    expect(plan.next.retryRecommended).toBe(true);
  });

  it('düşük hâkimiyet ve anlatım ihtiyacında temel adıma döner', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-2',
      skills: { [skill]: { mastery: 0.2, lastDifficulty: 2 } },
      recentAttempts: [
        { skill, correct: false, difficulty: 2, mistake: 'ters_islem_hatasi' },
        { skill, correct: false, difficulty: 2, mistake: 'ters_islem_hatasi' },
        { skill, correct: false, difficulty: 2, mistake: 'ters_islem_hatasi' },
      ],
    });

    const plan = createTeacherPlan({
      student,
      skill,
      correct: false,
      recommendedDifficulty: 1,
      shouldExplain: true,
      mistake: 'ters_islem_hatasi',
    });

    expect(plan.action).toBe('prerequisite_review');
    expect(plan.teaching.workedExample).toBeDefined();
    expect(plan.next.shouldExplain).toBe(true);
  });

  it('tekrarlayan hatada çözülmüş örneğe geçer', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-3',
      skills: { [skill]: { mastery: 0.55, lastDifficulty: 3 } },
      recentAttempts: [
        { skill, correct: false, difficulty: 3, mistake: 'isaret_hatasi' },
        { skill, correct: false, difficulty: 3, mistake: 'isaret_hatasi' },
      ],
    });

    const plan = createTeacherPlan({
      student,
      skill,
      correct: false,
      recommendedDifficulty: 3,
      shouldExplain: false,
      mistake: 'isaret_hatasi',
    });

    expect(plan.action).toBe('worked_example');
    expect(plan.diagnosis.repeatedCount).toBe(2);
    expect(plan.teaching.workedExample?.steps.length).toBeGreaterThan(0);
  });

  it('doğru cevapta öğrenciyi tebrik edip yeniden anlatım istemez', () => {
    const student = createStudentModel({ studentId: 'ogrenci-4' });

    const plan = createTeacherPlan({
      student,
      skill,
      correct: true,
      recommendedDifficulty: 2,
      shouldExplain: false,
    });

    expect(plan.action).toBe('celebrate');
    expect(plan.diagnosis.code).toBe('basarili');
    expect(plan.next.retryRecommended).toBe(false);
    expect(plan.next.shouldExplain).toBe(false);
  });
});
