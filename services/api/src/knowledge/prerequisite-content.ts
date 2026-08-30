import { getKnowledgeNode } from './knowledge-graph';
import type { KnowledgeNodeId } from './knowledge-model';

export interface PrerequisiteReviewContent {
  nodeId: KnowledgeNodeId;
  title: string;
  goal: string;
  explanation: string[];
  hints: string[];
  checkQuestion: {
    prompt: string;
    answer: string;
  };
}

const CONTENT: Partial<Record<KnowledgeNodeId, Omit<PrerequisiteReviewContent, 'nodeId' | 'title'>>> = {
  dort_islem: {
    goal: 'Temel işlemleri hatasız ve kontrollü uygulamak.',
    explanation: ['Denklem çözümünde doğru yöntem kadar toplama, çıkarma, çarpma ve bölmenin doğru yapılması da gerekir.'],
    hints: ['İşlemi tek satırda zihinden yapmak yerine ara sonucu yaz.', 'Sonucu ters işlemle kontrol et.'],
    checkQuestion: { prompt: '-7 + 12 işleminin sonucu kaçtır?', answer: '5' },
  },
  tam_sayilar_ve_isaretler: {
    goal: 'Pozitif ve negatif sayılarda işaretleri doğru takip etmek.',
    explanation: ['Negatif sayıların önündeki işaret işlemin bir parçasıdır; terim taşırken değil, uygulanan işlem nedeniyle değişiklik oluşur.'],
    hints: ['Her negatif sayıyı parantez içinde düşün.', 'Çıkarma işlemini karşıtını ekleme olarak kontrol edebilirsin.'],
    checkQuestion: { prompt: '-3 - (-5) işleminin sonucu kaçtır?', answer: '2' },
  },
  ters_islem: {
    goal: 'Bir işlemi kaldırmak için doğru ters işlemi seçmek.',
    explanation: ['Toplamanın tersi çıkarma, çarpmanın tersi bölmedir. Amaç bilinmeyene uygulanmış işlemi geri almaktır.'],
    hints: ['x’e en son hangi işlem uygulanmış?', 'O işlemin tersini seç.'],
    checkQuestion: { prompt: 'x üzerine 9 eklenmişse bu işlemi kaldırmak için hangi işlem yapılır?', answer: '9 çıkarılır' },
  },
  esitlik_dengesi: {
    goal: 'Eşitliğin iki tarafına aynı işlemi uygulayarak dengeyi korumak.',
    explanation: ['Bir denklem terazinin iki kefesi gibidir. Bir tarafa yapılan işlem diğer tarafa da aynı şekilde uygulanmalıdır.'],
    hints: ['Sol tarafta yaptığın işlemi sağ tarafta da yaz.', 'Her satırda eşitliğin iki tarafını birlikte kontrol et.'],
    checkQuestion: { prompt: 'x + 4 = 10 denkleminde 4’ü kaldırmak için iki tarafa ne yapılır?', answer: '4 çıkarılır' },
  },
  carpma_bolme_iliskisi: {
    goal: 'Katsayıyı kaldırmak için çarpma-bölme ters ilişkisini kullanmak.',
    explanation: ['5x ifadesinde x, 5 ile çarpılmıştır. x’i yalnız bırakmak için eşitliğin iki tarafı 5’e bölünür.'],
    hints: ['x’in katsayısını bul.', 'İki tarafı da aynı katsayıya böl.'],
    checkQuestion: { prompt: '5x = 20 denkleminde x kaçtır?', answer: '4' },
  },
  dagilma_ozelligi: {
    goal: 'Parantez dışındaki çarpanı tüm terimlere doğru dağıtmak.',
    explanation: ['a(b + c) ifadesi ab + ac olur. Çarpan parantez içindeki yalnızca ilk terime değil, her terime uygulanır.'],
    hints: ['Çarpanı ilk terimle çarp.', 'Aynı çarpanı ikinci terimle de çarp.', 'İşaretleri ayrıca kontrol et.'],
    checkQuestion: { prompt: '3(x - 2) ifadesinin açılmış hâli nedir?', answer: '3x - 6' },
  },
  benzer_terimler: {
    goal: 'Aynı değişkenli terimlerin katsayılarını doğru birleştirmek.',
    explanation: ['4x ve -2x benzer terimlerdir; yalnızca katsayıları birleştirilir ve x korunur.'],
    hints: ['Önce x’li terimleri grupla.', 'Sabit sayıları ayrı tut.'],
    checkQuestion: { prompt: '4x - 2x + 3 ifadesinin sade hâli nedir?', answer: '2x + 3' },
  },
  bilinmeyeni_yalniz_birakma: {
    goal: 'Bilinmeyeni eşitliğin dengesini bozmadan yalnız bırakmak.',
    explanation: ['Bilinmeyenin yanındaki işlemi ters işlemle kaldır ve aynı işlemi eşitliğin diğer tarafına da uygula.'],
    hints: ['x’in yanındaki işlemi belirle.', 'Ters işlemi iki tarafa uygula.'],
    checkQuestion: { prompt: 'x + 6 = 11 denkleminde x kaçtır?', answer: '5' },
  },
  carpma_bolme_ile_denklem_cozme: {
    goal: 'Bilinmeyenin katsayısını doğru şekilde kaldırmak.',
    explanation: ['Katsayı ile çarpılmış bilinmeyen için iki taraf aynı katsayıya bölünür.'],
    hints: ['Katsayıyı belirle.', 'İki tarafı da o sayıya böl.'],
    checkQuestion: { prompt: '3x = 18 denkleminde x kaçtır?', answer: '6' },
  },
  iki_adimli_denklem: {
    goal: 'Denklemi iki doğru ters işlem adımıyla çözmek.',
    explanation: ['Önce x’ten uzak toplama-çıkarma işlemini, sonra katsayıyı kaldır.'],
    hints: ['Önce sabit terimi temizle.', 'Sonra katsayıyı kaldır.'],
    checkQuestion: { prompt: '2x + 3 = 11 denkleminde x kaçtır?', answer: '4' },
  },
  iki_tarafta_bilinmeyen: {
    goal: 'Bilinmeyenli terimleri tek tarafta toplayarak denklemi sadeleştirmek.',
    explanation: ['Önce x’li terimleri aynı tarafta, sabitleri diğer tarafta topla.'],
    hints: ['Küçük x katsayısını bir taraftan kaldır.', 'Sabitleri sonra düzenle.'],
    checkQuestion: { prompt: '4x = 2x + 8 denkleminde x kaçtır?', answer: '4' },
  },
  parantezli_denklem: {
    goal: 'Parantezi doğru açıp oluşan denklemi çözmek.',
    explanation: ['Önce dağılma özelliğini uygula, sonra benzer terimleri birleştir ve denklemi çöz.'],
    hints: ['Parantezi dağıt.', 'Benzer terimleri birleştir.', 'Bilinmeyeni yalnız bırak.'],
    checkQuestion: { prompt: '2(x + 2) = 10 denkleminde x kaçtır?', answer: '3' },
  },
};

export function buildPrerequisiteReview(nodeId: KnowledgeNodeId): PrerequisiteReviewContent {
  const node = getKnowledgeNode(nodeId);
  const content = CONTENT[nodeId];
  if (!content) {
    return {
      nodeId,
      title: node.title,
      goal: node.description,
      explanation: [node.description],
      hints: ['Bu önkoşulu kısa bir örnek üzerinde tekrar et.', 'Sonucu hedef kazanıma geçmeden önce kontrol et.'],
      checkQuestion: { prompt: `${node.title} için temel kuralı kendi cümlenle açıkla.`, answer: node.description },
    };
  }
  return { nodeId, title: node.title, ...content };
}
