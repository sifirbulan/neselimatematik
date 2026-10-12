import { describe, expect, it } from 'vitest';
import { reviewAiAnswer } from './answer-review-service';
import type { AiProvider } from './education-answer-service';

const input = { question: 'Hücre nedir?', answer: 'Canlıların temel yapı birimidir.', subject: 'Biyoloji', stage: 'high' };

describe('Neş AI ikinci değerlendirme', () => {
  it('olumlu model incelemesini bağımsız doğrulama saymaz', async () => {
    const provider: AiProvider = { generate: async () => '{"assessment":"acceptable","findings":[]}' };
    const result = await reviewAiAnswer(provider, input);
    expect(result.status).toBe('reviewed');
    expect(result.verified).toBe(false);
    expect(result.confidence).toBe('medium');
  });
  it('şüpheli yanıtta belirsizlik döndürür', async () => {
    const provider: AiProvider = { generate: async () => '{"assessment":"uncertain","findings":["Kaynak eksik."]}' };
    expect((await reviewAiAnswer(provider, input)).status).toBe('uncertain');
  });
  it('hatalı biçim ve servis kesintisinde güvenli geri döner', async () => {
    const provider: AiProvider = { generate: async () => 'OK' };
    expect((await reviewAiAnswer(provider, input)).status).toBe('unavailable');
    expect((await reviewAiAnswer(undefined, input)).verified).toBe(false);
  });
});
