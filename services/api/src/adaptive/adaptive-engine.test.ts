import { describe, expect, it } from 'vitest';
import { decideDifficulty } from './difficulty-engine';
import { getNextAdaptiveQuestion, recordAdaptiveResult } from './adaptive-engine';
import { createStudentModel } from '../student/student-model';

const skill = 'bilinmeyeni_yalniz_birakma' as const;

describe('adaptif soru motoru', () => {
  it('yeni öğrenciye temel seviyeden başlar', () => {
    const student = createStudentModel({ studentId: 'ogrenci-1', grade: 7 });
    const result = getNextAdaptiveQuestion({ student });

    expect(result.question.difficulty).toBe(1);
    expect(result.question.skill).toBe(skill);
    expect(result.question.prompt).toContain('x');
  });

  it('5/5 başarıdan sonra zorluğu artırır', () => {
    let student = createStudentModel({ studentId: 'ogrenci-2', grade: 7 });

    for (let index = 0; index < 5; index += 1) {
      student = recordAdaptiveResult({
        student,
        skill,
        difficulty: 2,
        correct: true,
      }).student;
    }

    const decision = decideDifficulty(student, skill);
    expect(decision.action).toBe('advance');
    expect(decision.difficulty).toBe(3);
    expect(decision.shouldExplain).toBe(false);
  });

  it('0-1/5 başarıda anlatıma dönmeyi önerir', () => {
    let student = createStudentModel({ studentId: 'ogrenci-3', grade: 7 });
    const results = [true, false, false, false, false];

    let lastResult;
    for (const correct of results) {
      lastResult = recordAdaptiveResult({
        student,
        skill,
        difficulty: 3,
        correct,
        mistake: correct ? undefined : 'ters_islem_hatasi',
      });
      student = lastResult.student;
    }

    const decision = decideDifficulty(student, skill);
    expect(decision.action).toBe('explain');
    expect(decision.difficulty).toBe(2);
    expect(decision.shouldExplain).toBe(true);
    expect(lastResult?.teacherPlan.next.shouldExplain).toBe(true);
    expect(lastResult?.teacherPlan.teaching.workedExample).toBeDefined();
  });

  it('doğru cevapta mastery değerini artırır, yanlışta azaltır', () => {
    const initial = createStudentModel({
      studentId: 'ogrenci-4',
      skills: { [skill]: { mastery: 0.5, lastDifficulty: 2 } },
    });

    const afterCorrect = recordAdaptiveResult({
      student: initial,
      skill,
      difficulty: 2,
      correct: true,
    });
    const afterWrong = recordAdaptiveResult({
      student: afterCorrect.student,
      skill,
      difficulty: 2,
      correct: false,
      mistake: 'isaret_hatasi',
      question: 'x + 2 = 7',
      studentAnswer: '9',
      expectedAnswer: '5',
    });

    expect(afterCorrect.mastery).toBeGreaterThan(0.5);
    expect(afterWrong.mastery).toBeLessThan(afterCorrect.mastery);
    expect(afterWrong.student.skills[skill].lastMistake).toBe('isaret_hatasi');
    expect(afterWrong.teacherPlan.diagnosis.evidence).toContain('Öğrenci cevabı: 9');
  });
});
