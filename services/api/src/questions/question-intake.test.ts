import { describe, expect, it } from 'vitest';
import { classifyQuestion, validateQuestionIntake } from './question-intake';

describe('Neş AI soru kabulü', () => {
  it('matematik sorusunu sınıflandırır', () => {
    const input = validateQuestionIntake({ question: '2x+3=7 denklemini çöz', stage: 'middle', grade: 7 });
    expect(input.intake).toBeDefined();
    expect(classifyQuestion(input.intake!).analysis?.subjectId).toBe('mathematics');
  });
  it('belirsiz soruyu tahminle cevaplamaz', () => {
    expect(classifyQuestion({ question: 'Bu neden böyle?', stage: 'high', grade: 10 }).analysis?.status)
      .toBe('needs_subject_selection');
  });
  it('bölüm dışı dersi reddeder', () => {
    expect(classifyQuestion({ question: 'Anatomi sorusu', stage: 'university', department: 'law', subjectId: 'anatomy' }).error)
      .toBeTruthy();
  });
  it('eksik ve aşırı uzun soruları reddeder', () => {
    expect(validateQuestionIntake({ question: '', stage: 'middle', grade: 7 }).error).toBeTruthy();
    expect(validateQuestionIntake({ question: 'x'.repeat(12001), stage: 'middle', grade: 7 }).error).toBeTruthy();
  });
});
