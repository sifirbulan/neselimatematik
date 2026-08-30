import type { DifficultyLevel, SkillId } from '../student/student-model';
import type { LearningDiagnosis, TeacherAction, TeachingContent, WorkedExample } from './teacher-model';

const GOALS: Record<SkillId, string> = {
  bilinmeyeni_yalniz_birakma: 'Bilinmeyeni yalnız bırakmak için eşitliğin iki tarafına aynı işlemi uygulamak.',
  carpma_bolme_ile_denklem_cozme: 'Bilinmeyenin katsayısını ters işlemle kaldırmak.',
  iki_adimli_denklem: 'Denklemi doğru sırayla iki adımda sadeleştirmek.',
  iki_tarafta_bilinmeyen: 'Bilinmeyenli terimleri bir tarafta, sabitleri diğer tarafta toplamak.',
  parantezli_denklem: 'Önce dağılma özelliğini uygulayıp sonra denklemi çözmek.',
};

const EXPLANATIONS: Record<SkillId, string[]> = {
  bilinmeyeni_yalniz_birakma: [
    'Eşitlik bir terazidir; dengeyi korumak için bir tarafa yaptığın işlemi diğer tarafa da yap.',
    'x’in yanında toplama varsa çıkarma, çıkarma varsa toplama kullanarak o terimi kaldır.',
  ],
  carpma_bolme_ile_denklem_cozme: [
    'x bir sayı ile çarpılıyorsa, iki tarafı da aynı sayıya bölerek katsayıyı 1 yap.',
    'Bölme varsa tersine çarpma kullan; amaç x’i tek başına bırakmaktır.',
  ],
  iki_adimli_denklem: [
    'Önce x’ten uzak olan toplama veya çıkarma işlemini kaldır.',
    'Sonra x’in katsayısını çarpma-bölme ters işlemiyle kaldır.',
  ],
  iki_tarafta_bilinmeyen: [
    'Önce x’li terimleri aynı tarafta topla.',
    'Ardından sabit sayıları diğer tarafta topla ve oluşan basit denklemi çöz.',
  ],
  parantezli_denklem: [
    'Parantez dışındaki çarpanı parantezin içindeki her terimle çarp.',
    'Parantez kalkınca oluşan denklemi normal denklem adımlarıyla çöz.',
  ],
};

const HINTS: Record<SkillId, string[]> = {
  bilinmeyeni_yalniz_birakma: ['x’in yanında hangi işlem var?', 'O işlemin tersini iki tarafa da uygula.', 'Son işlemden sonra x tek başına kaldı mı?'],
  carpma_bolme_ile_denklem_cozme: ['x’in katsayısını bul.', 'Katsayıyı 1 yapmak için iki tarafı da aynı sayıya böl.', 'Sonucu yerine yazarak kontrol et.'],
  iki_adimli_denklem: ['Önce toplama/çıkarma adımını temizle.', 'Sonra katsayıyı kaldır.', 'Bulduğun değeri başlangıç denkleminde dene.'],
  iki_tarafta_bilinmeyen: ['x’li terimleri tek tarafta toplamayı dene.', 'Sabitleri karşı tarafa taşı.', 'Yeni oluşan denklemi sadeleştir.'],
  parantezli_denklem: ['Önce parantezi dağıt.', 'Benzer terimleri birleştir.', 'Sonra bilinmeyeni yalnız bırak.'],
};

const EXAMPLES: Record<SkillId, WorkedExample> = {
  bilinmeyeni_yalniz_birakma: {
    question: 'x + 4 = 9',
    steps: ['İki taraftan 4 çıkar: x + 4 - 4 = 9 - 4', 'Sadeleştir: x = 5'],
    answer: 'x = 5',
  },
  carpma_bolme_ile_denklem_cozme: {
    question: '3x = 15',
    steps: ['İki tarafı 3’e böl: 3x / 3 = 15 / 3', 'Sadeleştir: x = 5'],
    answer: 'x = 5',
  },
  iki_adimli_denklem: {
    question: '2x + 4 = 10',
    steps: ['İki taraftan 4 çıkar: 2x = 6', 'İki tarafı 2’ye böl: x = 3'],
    answer: 'x = 3',
  },
  iki_tarafta_bilinmeyen: {
    question: '5x + 2 = 3x + 10',
    steps: ['İki taraftan 3x çıkar: 2x + 2 = 10', 'İki taraftan 2 çıkar: 2x = 8', 'İki tarafı 2’ye böl: x = 4'],
    answer: 'x = 4',
  },
  parantezli_denklem: {
    question: '2(x + 3) = 14',
    steps: ['Parantezi dağıt: 2x + 6 = 14', 'İki taraftan 6 çıkar: 2x = 8', 'İki tarafı 2’ye böl: x = 4'],
    answer: 'x = 4',
  },
};

const CHECKS: Record<SkillId, { prompt: string; answer: string }> = {
  bilinmeyeni_yalniz_birakma: { prompt: 'x - 3 = 8 denkleminde x kaçtır?', answer: '11' },
  carpma_bolme_ile_denklem_cozme: { prompt: '4x = 20 denkleminde x kaçtır?', answer: '5' },
  iki_adimli_denklem: { prompt: '3x + 2 = 14 denkleminde x kaçtır?', answer: '4' },
  iki_tarafta_bilinmeyen: { prompt: '4x + 1 = 2x + 9 denkleminde x kaçtır?', answer: '4' },
  parantezli_denklem: { prompt: '3(x + 2) = 15 denkleminde x kaçtır?', answer: '3' },
};

export function chooseTeacherAction(input: {
  correct: boolean;
  shouldExplain: boolean;
  mastery: number;
  diagnosis: LearningDiagnosis;
}): TeacherAction {
  if (input.correct) return 'celebrate';
  if (input.shouldExplain && input.mastery < 0.35) return 'prerequisite_review';
  if (input.shouldExplain || input.diagnosis.repeatedCount >= 2) return 'worked_example';
  if (input.mastery < 0.5) return 'micro_explanation';
  return 'hint';
}

export function buildTeachingContent(input: {
  skill: SkillId;
  difficulty: DifficultyLevel;
  action: TeacherAction;
}): TeachingContent {
  const baseExplanation = EXPLANATIONS[input.skill];
  const explanation = input.action === 'celebrate'
    ? ['Doğru yaklaşımı koru; şimdi aynı kazanımı bir sonraki soruda tekrar kullan.']
    : input.action === 'hint'
      ? [baseExplanation[0]]
      : baseExplanation;

  return {
    goal: GOALS[input.skill],
    explanation,
    hints: HINTS[input.skill],
    ...(input.action === 'worked_example' || input.action === 'prerequisite_review'
      ? { workedExample: EXAMPLES[input.skill] }
      : {}),
    checkQuestion: {
      ...CHECKS[input.skill],
      skill: input.skill,
      difficulty: input.difficulty,
    },
  };
}
