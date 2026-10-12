/**
 * Neşevren'in eğitim aşamasından bağımsız içerik kataloğu.
 * Mevcut matematik kazanım motorunu değiştirmeden diğer derslere genişleme sağlar.
 */
export const EDUCATION_STAGES = ['preschool', 'primary', 'middle', 'high', 'university'] as const;
export type EducationStage = (typeof EDUCATION_STAGES)[number];

export interface EducationProfile {
  studentId: string;
  stage: EducationStage;
  grade?: number;
  university?: string;
  faculty?: string;
  department?: string;
  universityYear?: number;
}

export interface SubjectDefinition {
  id: string;
  title: string;
  stages: readonly EducationStage[];
  departments?: readonly string[];
}

export const SUBJECT_CATALOG: readonly SubjectDefinition[] = [
  { id: 'early-math', title: 'Sayılar ve Matematik', stages: ['preschool'] },
  { id: 'early-language', title: 'Dil ve İletişim', stages: ['preschool'] },
  { id: 'early-discovery', title: 'Keşif ve Dikkat', stages: ['preschool'] },
  { id: 'mathematics', title: 'Matematik', stages: ['primary', 'middle', 'high', 'university'] },
  { id: 'turkish', title: 'Türkçe', stages: ['primary', 'middle'] },
  { id: 'science', title: 'Fen Bilimleri', stages: ['primary', 'middle'] },
  { id: 'social-studies', title: 'Sosyal Bilgiler', stages: ['primary', 'middle'] },
  { id: 'english', title: 'İngilizce', stages: ['primary', 'middle', 'high', 'university'] },
  { id: 'literature', title: 'Türk Dili ve Edebiyatı', stages: ['high'] },
  { id: 'physics', title: 'Fizik', stages: ['high', 'university'] },
  { id: 'chemistry', title: 'Kimya', stages: ['high', 'university'] },
  { id: 'biology', title: 'Biyoloji', stages: ['high', 'university'] },
  { id: 'history', title: 'Tarih', stages: ['high', 'university'] },
  { id: 'geography', title: 'Coğrafya', stages: ['high'] },
  { id: 'anatomy', title: 'Anatomi', stages: ['university'], departments: ['medicine'] },
  { id: 'physiology', title: 'Fizyoloji', stages: ['university'], departments: ['medicine'] },
  { id: 'programming', title: 'Programlama', stages: ['university'], departments: ['computer-engineering', 'software-engineering'] },
  { id: 'algorithms', title: 'Algoritmalar', stages: ['university'], departments: ['computer-engineering', 'software-engineering'] },
  { id: 'law', title: 'Hukuka Giriş', stages: ['university'], departments: ['law'] },
];

export function validateEducationProfile(value: unknown): { profile?: EducationProfile; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Eğitim profili gerekli.' };
  const input = value as Record<string, unknown>;
  if (typeof input.studentId !== 'string' || !input.studentId.trim()) return { error: 'Öğrenci kimliği gerekli.' };
  if (!EDUCATION_STAGES.includes(input.stage as EducationStage)) return { error: 'Geçerli bir eğitim aşaması gerekli.' };
  const stage = input.stage as EducationStage;
  const ranges: Partial<Record<EducationStage, [number, number]>> = {
    primary: [1, 4], middle: [5, 8], high: [9, 12],
  };
  const range = ranges[stage];
  if (range && (!Number.isInteger(input.grade) || (input.grade as number) < range[0] || (input.grade as number) > range[1])) {
    return { error: `Bu eğitim aşaması için sınıf ${range[0]}–${range[1]} arasında olmalı.` };
  }
  if (stage === 'university' && (typeof input.department !== 'string' || !input.department.trim())) {
    return { error: 'Üniversite öğrencisi için bölüm gerekli.' };
  }
  if (stage === 'university' && input.universityYear !== undefined &&
    (!Number.isInteger(input.universityYear) || (input.universityYear as number) < 1 || (input.universityYear as number) > 7)) {
    return { error: 'Üniversite sınıfı 1–7 arasında olmalı.' };
  }
  const profile: EducationProfile = { studentId: input.studentId.trim(), stage };
  if (range) profile.grade = input.grade as number;
  if (stage === 'university') {
    profile.department = (input.department as string).trim().toLowerCase();
    if (typeof input.university === 'string') profile.university = input.university.trim();
    if (typeof input.faculty === 'string') profile.faculty = input.faculty.trim();
    if (typeof input.universityYear === 'number') profile.universityYear = input.universityYear;
  }
  return { profile };
}

export function getSubjectsForProfile(profile: EducationProfile): SubjectDefinition[] {
  return SUBJECT_CATALOG.filter((subject) =>
    subject.stages.includes(profile.stage) &&
    (!subject.departments || (profile.department !== undefined && subject.departments.includes(profile.department))),
  );
}
