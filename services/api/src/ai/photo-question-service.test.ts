import { describe, expect, it } from 'vitest';
import { transcribeQuestionPhoto, validateImageDataUrl } from './photo-question-service';

const tinyPng = 'data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');

describe('Fotoğrafla soru kabulü', () => {
  it('geçerli PNG fotoğrafı tanır', () => {
    expect(validateImageDataUrl(tinyPng).dataUrl).toBe(tinyPng);
  });
  it('yanlış içerik ve desteklenmeyen türü reddeder', () => {
    expect(validateImageDataUrl('data:image/png;base64,YWJjZA==').error).toBeTruthy();
    expect(validateImageDataUrl('data:image/svg+xml;base64,YWJjZA==').error).toBeTruthy();
  });
  it('okunan soruyu öğrenci onayına sunar', async () => {
    const result = await transcribeQuestionPhoto({ imageDataUrl: tinyPng }, { transcribe: async () => '2x+3=7' });
    expect(result.status).toBe(200);
    expect(result.payload.confirmed).toBe(false);
    expect(result.payload.question).toBe('2x+3=7');
  });
  it('okunamayan fotoğrafı çözmeye göndermez', async () => {
    const result = await transcribeQuestionPhoto({ imageDataUrl: tinyPng }, { transcribe: async () => 'OKUNAMADI' });
    expect(result.status).toBe(422);
  });
});
