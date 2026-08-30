import type { DifficultyLevel, SkillId } from '../student/student-model';

export interface GeneratedQuestion {
  id: string;
  subject: 'matematik';
  topic: 'denklemler';
  skill: SkillId;
  difficulty: DifficultyLevel;
  prompt: string;
  metadata: {
    generator: 'rule-based-v1';
    answerType: 'number';
  };
}

export interface QuestionSeed {
  studentId: string;
  grade: number;
  attempts: number;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function pick(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

export function generateQuestion(
  skill: SkillId,
  difficulty: DifficultyLevel,
  context: QuestionSeed,
): GeneratedQuestion {
  const seed = hash(`${context.studentId}:${context.grade}:${context.attempts}:${skill}:${difficulty}`);
  const x = pick(seed, 2, 9);
  const a = pick(seed >>> 3, 2, 6);
  const b = pick(seed >>> 7, 2, 12);
  const c = pick(seed >>> 11, 1, Math.max(1, a - 1));

  let prompt: string;
  switch (difficulty) {
    case 1:
      prompt = `x + ${b} = ${x + b} denkleminde x kaçtır?`;
      break;
    case 2:
      prompt = `${a}x = ${a * x} denkleminde x kaçtır?`;
      break;
    case 3:
      prompt = `${a}x + ${b} = ${a * x + b} denkleminde x kaçtır?`;
      break;
    case 4: {
      const rightCoefficient = c;
      const rightConstant = (a - rightCoefficient) * x + b;
      prompt = `${a}x + ${b} = ${rightCoefficient}x + ${rightConstant} denkleminde x kaçtır?`;
      break;
    }
    case 5:
      prompt = `${a}(x + ${b}) = ${a * (x + b)} denkleminde x kaçtır?`;
      break;
  }

  return {
    id: `eq-${hash(`${seed}:${prompt}`).toString(36)}`,
    subject: 'matematik',
    topic: 'denklemler',
    skill,
    difficulty,
    prompt,
    metadata: {
      generator: 'rule-based-v1',
      answerType: 'number',
    },
  };
}
