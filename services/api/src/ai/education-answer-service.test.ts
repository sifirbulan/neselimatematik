import { describe, expect, it, vi } from 'vitest';
import { answerEducationalQuestion, type AiProvider } from './education-answer-service';

const fake: AiProvider = { generate: vi.fn(async () => 'Hücre, canlıların temel yapı birimidir.') };

describe('Çok dersli Neş AI', () => {
  it('doğrulanabilir matematiği sağlayıcı olmadan çözer', async () => {
    const result = await answerEducationalQuestion({ question: '2x+3=x+7', stage: 'middle', grade: 7, subjectId: 'mathematics' });
    expect(result.status).toBe(200);
    expect(result.payload.verified).toBe(true);
    expect(result.payload.answer).toBe('x = 4');
  });
  it('biyoloji yanıtını doğrulanmamış olarak işaretler', async () => {
    const result = await answerEducationalQuestion({ question: 'Hücre nedir?', stage: 'high', grade: 9, subjectId: 'biology' }, fake);
    expect(result.status).toBe(200);
    expect(result.payload.verified).toBe(false);
    expect(result.payload.source).toBe('ai_provider');
  });
  it('sağlayıcı yoksa açık hata verir', async () => {
    const result = await answerEducationalQuestion({ question: 'Hücre nedir?', stage: 'high', grade: 9, subjectId: 'biology' });
    expect(result.status).toBe(503);
  });
  it('ders seçilmemiş belirsiz soruda tahmin yapmaz', async () => {
    const result = await answerEducationalQuestion({ question: 'Bunu açıklar mısın?', stage: 'high', grade: 9 }, fake);
    expect(result.status).toBe(422);
  });
});
