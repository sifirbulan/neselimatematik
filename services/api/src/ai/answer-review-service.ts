import type { AiProvider } from './education-answer-service';

export interface ReviewResult {
  status: 'reviewed' | 'uncertain' | 'unavailable';
  verified: false;
  confidence: 'medium' | 'low' | 'unknown';
  findings: string[];
  reviewer: 'ai_second_pass' | 'none';
}

/**
 * İkinci değerlendirme, bağımsız matematiksel doğrulama DEĞİLDİR.
 * Model onayı hiçbir zaman verified=true üretmez.
 */
export async function reviewAiAnswer(
  provider: AiProvider | undefined,
  input: { question: string; answer: string; subject: string; stage: string; grade?: number },
): Promise<ReviewResult> {
  if (!provider) return {
    status: 'unavailable', verified: false, confidence: 'unknown',
    findings: ['İkinci değerlendirme hizmeti yapılandırılmadı.'], reviewer: 'none',
  };
  try {
    const raw = await provider.generate({
      question: [
        'Aşağıdaki eğitim sorusuna verilmiş cevabı eleştirel değerlendir.',
        'Hataları, kanıt eksiklerini ve belirsizlikleri bul. Yeni bir cevap uydurma.',
        'Yalnızca JSON döndür: {"assessment":"acceptable"|"uncertain","findings":["..."]}.',
        `SORU: ${input.question}`,
        `CEVAP: ${input.answer}`,
      ].join('\n'),
      subject: input.subject,
      stage: input.stage,
      ...(input.grade === undefined ? {} : { grade: input.grade }),
      explanationLevel: 'detailed',
    });
    // Güvenilmez metni regex ile sonuç saymak yerine yalnızca JSON nesnesini kabul et.
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    const data = parsed as { assessment?: unknown; findings?: unknown };
    if (!['acceptable', 'uncertain'].includes(String(data.assessment)) ||
      !Array.isArray(data.findings) ||
      !data.findings.every((item) => typeof item === 'string') ||
      data.findings.length > 10) throw new Error('invalid');
    const findings = (data.findings as string[]).map((s) => s.slice(0, 500));
    return {
      status: data.assessment === 'acceptable' ? 'reviewed' : 'uncertain',
      verified: false,
      confidence: data.assessment === 'acceptable' ? 'medium' : 'low',
      findings,
      reviewer: 'ai_second_pass',
    };
  } catch {
    return {
      status: 'unavailable', verified: false, confidence: 'unknown',
      findings: ['İkinci değerlendirme tamamlanamadı.'], reviewer: 'none',
    };
  }
}
