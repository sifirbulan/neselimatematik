export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export const EQUATION_SKILLS = [
  'bilinmeyeni_yalniz_birakma',
  'carpma_bolme_ile_denklem_cozme',
  'iki_adimli_denklem',
  'iki_tarafta_bilinmeyen',
  'parantezli_denklem',
] as const;

export type SkillId = (typeof EQUATION_SKILLS)[number];

export type MistakeType =
  | 'ters_islem_hatasi'
  | 'isaret_hatasi'
  | 'carpma_bolme_hatasi'
  | 'dagilma_hatasi'
  | 'hesaplama_hatasi'
  | 'bilinmiyor';

export interface SkillMastery {
  skill: SkillId;
  mastery: number;
  attempts: number;
  correct: number;
  lastDifficulty: DifficultyLevel;
  lastMistake?: MistakeType;
}

export interface AttemptRecord {
  skill: SkillId;
  correct: boolean;
  difficulty: DifficultyLevel;
  mistake?: MistakeType;
}

export interface StudentModel {
  studentId: string;
  grade: number;
  subject: 'matematik';
  topic: 'denklemler';
  currentSkill: SkillId;
  skills: Record<SkillId, SkillMastery>;
  recentAttempts: AttemptRecord[];
}

export interface StudentModelInput {
  studentId: string;
  grade?: number;
  currentSkill?: SkillId;
  skills?: Partial<Record<SkillId, Partial<SkillMastery>>>;
  recentAttempts?: AttemptRecord[];
}

const clampMastery = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

const clampDifficulty = (value: number): DifficultyLevel =>
  Math.max(1, Math.min(5, Math.round(value))) as DifficultyLevel;

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && EQUATION_SKILLS.includes(value as SkillId);
}

export function createStudentModel(input: StudentModelInput): StudentModel {
  const skills = Object.fromEntries(
    EQUATION_SKILLS.map((skill) => {
      const incoming = input.skills?.[skill];
      return [
        skill,
        {
          skill,
          mastery: clampMastery(incoming?.mastery ?? 0),
          attempts: Math.max(0, Math.round(incoming?.attempts ?? 0)),
          correct: Math.max(0, Math.round(incoming?.correct ?? 0)),
          lastDifficulty: clampDifficulty(incoming?.lastDifficulty ?? 1),
          ...(incoming?.lastMistake ? { lastMistake: incoming.lastMistake } : {}),
        } satisfies SkillMastery,
      ];
    }),
  ) as Record<SkillId, SkillMastery>;

  return {
    studentId: input.studentId,
    grade: Math.max(1, Math.min(12, Math.round(input.grade ?? 7))),
    subject: 'matematik',
    topic: 'denklemler',
    currentSkill: input.currentSkill && isSkillId(input.currentSkill)
      ? input.currentSkill
      : EQUATION_SKILLS[0],
    skills,
    recentAttempts: (input.recentAttempts ?? [])
      .filter((attempt) => isSkillId(attempt.skill) && typeof attempt.correct === 'boolean')
      .slice(-20)
      .map((attempt) => ({ ...attempt, difficulty: clampDifficulty(attempt.difficulty) })),
  };
}

export function normalizeStudentModel(input: StudentModel): StudentModel {
  return createStudentModel(input);
}
