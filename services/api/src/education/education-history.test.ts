import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advanceEducationRecord } from './education-history';
import { JsonFileEducationStore } from './education-store';

describe('Ömür boyu eğitim profili', () => {
  it('öğrenci kimliğini ve tüm geçişleri korur', () => {
    const first = advanceEducationRecord(undefined, { studentId: 'ogrenci-1', stage: 'preschool' }).record!;
    const primary = advanceEducationRecord(first, { studentId: 'ogrenci-1', stage: 'primary', grade: 1 }).record!;
    const university = advanceEducationRecord(primary, { studentId: 'ogrenci-1', stage: 'university', department: 'medicine', universityYear: 1 }).record!;
    expect(university.studentId).toBe('ogrenci-1');
    expect(university.history).toHaveLength(3);
    expect(university.history[0].to.stage).toBe('preschool');
    expect(university.current.department).toBe('medicine');
    expect(university.revision).toBe(3);
    expect(advanceEducationRecord(university, university.current).record?.revision).toBe(3);
    expect(advanceEducationRecord(university, { studentId: 'ogrenci-1', stage: 'high', grade: 9 }).error).toBeTruthy();
  });

  it('dosyaya kaydeder ve tekrar açıldığında geçmişi yükler', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nesevren-education-'));
    const filePath = join(directory, 'profiles.json');
    try {
      const store = new JsonFileEducationStore(filePath);
      await store.advance({ studentId: 'a', stage: 'preschool' });
      await store.advance({ studentId: 'a', stage: 'primary', grade: 1 });
      const restored = await new JsonFileEducationStore(filePath).get('a');
      expect(restored?.current.grade).toBe(1);
      expect(restored?.history).toHaveLength(2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
