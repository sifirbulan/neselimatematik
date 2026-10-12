import { validateEducationProfile, type EducationProfile } from './education-catalog';

export interface EducationTransition {
  from: EducationProfile | null;
  to: EducationProfile;
  at: string;
}

export interface LifelongEducationRecord {
  studentId: string;
  current: EducationProfile;
  history: EducationTransition[];
  createdAt: string;
  updatedAt: string;
  revision: number;
}

const ORDER = { preschool: 0, primary: 1, middle: 2, high: 3, university: 4 } as const;

function position(profile: EducationProfile): number {
  const year = profile.stage === 'university' ? profile.universityYear ?? 1 : profile.grade ?? 0;
  return ORDER[profile.stage] * 100 + year;
}

export function advanceEducationRecord(
  existing: LifelongEducationRecord | undefined,
  input: unknown,
  at = new Date().toISOString(),
): { record?: LifelongEducationRecord; error?: string } {
  const validated = validateEducationProfile(input);
  if (!validated.profile) return { error: validated.error };
  const next = validated.profile;
  if (existing && existing.studentId !== next.studentId) return { error: 'Öğrenci kimliği değiştirilemez.' };
  if (existing && position(next) < position(existing.current)) {
    return { error: 'Önceki eğitim aşamasına geçiş yapılamaz. Düzeltme için ayrı bir işlem gereklidir.' };
  }
  if (existing && JSON.stringify(existing.current) === JSON.stringify(next)) return { record: existing };
  const transition: EducationTransition = { from: existing?.current ?? null, to: next, at };
  return {
    record: {
      studentId: next.studentId,
      current: next,
      history: [...(existing?.history ?? []), transition],
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
      revision: (existing?.revision ?? 0) + 1,
    },
  };
}
