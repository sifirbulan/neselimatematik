import { describe, expect, it } from 'vitest';
import { explainAtLevel, solveLinearEquation } from './verified-equation-solver';

describe('Doğrulanmış denklem çözümü', () => {
  it('iki tarafta bilinmeyenli denklemi çözer ve doğrular', () => {
    const result = solveLinearEquation('2x + 3 = x + 7');
    expect(result?.answer).toBe('x = 4');
    expect(result?.verification.passed).toBe(true);
    expect(explainAtLevel(result!, 'detailed')).toContain('kontrol');
  });
  it('negatif ve kesirli sonuçları çözer', () => {
    expect(solveLinearEquation('3x + 6 = 0')?.answer).toBe('x = -2');
    expect(solveLinearEquation('2x = 1')?.answer).toBe('x = 0.5');
    expect(solveLinearEquation('x = 5')?.answer).toBe('x = 5');
  });
  it('desteklenmeyen veya belirsiz ifadelerde sonuç üretmez', () => {
    for (const question of ['x^2 = 4', 'x + 1 = x + 1', 'x + 1 = x + 2', '2x + y = 4', '2(x+1)=4', 'Bu denklemi çöz: 2x=4', '2x/3=4', '2x=3=4']) {
      expect(solveLinearEquation(question)).toBeUndefined();
    }
  });
});
