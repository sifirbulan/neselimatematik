import type { MistakeType } from './student-model';

const KNOWN_MISTAKES: MistakeType[] = [
  'ters_islem_hatasi',
  'isaret_hatasi',
  'carpma_bolme_hatasi',
  'dagilma_hatasi',
  'hesaplama_hatasi',
  'bilinmiyor',
];

export function normalizeMistake(value: unknown): MistakeType | undefined {
  if (typeof value !== 'string') return undefined;
  return KNOWN_MISTAKES.includes(value as MistakeType) ? (value as MistakeType) : 'bilinmiyor';
}
