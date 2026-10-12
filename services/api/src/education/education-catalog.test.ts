import { describe, expect, it } from 'vitest';
import { getSubjectsForProfile, validateEducationProfile } from './education-catalog';

describe('Neşevren eğitim kataloğu', () => {
  it('ana sınıfından üniversiteye aşamaları kabul eder', () => {
    expect(validateEducationProfile({ studentId: 'a', stage: 'preschool' }).profile?.stage).toBe('preschool');
    expect(validateEducationProfile({ studentId: 'b', stage: 'primary', grade: 1 }).profile?.grade).toBe(1);
    expect(validateEducationProfile({ studentId: 'c', stage: 'middle', grade: 7 }).profile?.grade).toBe(7);
    expect(validateEducationProfile({ studentId: 'd', stage: 'high', grade: 12 }).profile?.grade).toBe(12);
    expect(validateEducationProfile({ studentId: 'e', stage: 'university', department: 'medicine', universityYear: 4 }).profile?.department).toBe('medicine');
  });
  it('yanlış sınıf ve eksik bölümü reddeder', () => {
    expect(validateEducationProfile({ studentId: 'a', stage: 'primary', grade: 11 }).error).toBeTruthy();
    expect(validateEducationProfile({ studentId: 'a', stage: 'university' }).error).toBeTruthy();
  });
  it('bölüme özel dersleri ayırır', () => {
    const medicine = getSubjectsForProfile({ studentId: 'a', stage: 'university', department: 'medicine' });
    const engineering = getSubjectsForProfile({ studentId: 'b', stage: 'university', department: 'computer-engineering' });
    expect(medicine.some((s) => s.id === 'anatomy')).toBe(true);
    expect(engineering.some((s) => s.id === 'anatomy')).toBe(false);
    expect(engineering.some((s) => s.id === 'programming')).toBe(true);
    expect(medicine.some((s) => s.id === 'mathematics')).toBe(true);
  });
});
