import { EQUATION_SKILLS, type SkillId } from '../student/student-model';
import type {
  KnowledgeEdge,
  KnowledgeGraphView,
  KnowledgeNode,
  KnowledgeNodeId,
} from './knowledge-model';

const KNOWLEDGE_NODES: Record<KnowledgeNodeId, KnowledgeNode> = {
  dort_islem: {
    id: 'dort_islem',
    title: 'Dört işlem',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'temel_aritmetik',
    description: 'Toplama, çıkarma, çarpma ve bölme işlemlerini doğru ve kontrollü uygulamak.',
    gradeFrom: 2,
    prerequisites: [],
  },
  tam_sayilar_ve_isaretler: {
    id: 'tam_sayilar_ve_isaretler',
    title: 'Tam sayılar ve işaretler',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'sayilar',
    description: 'Pozitif-negatif sayılarda işlem ve işaret takibini doğru yapmak.',
    gradeFrom: 6,
    prerequisites: ['dort_islem'],
  },
  ters_islem: {
    id: 'ters_islem',
    title: 'Ters işlem ilişkisi',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'islem_bilgisi',
    description: 'Toplama-çıkarma ve çarpma-bölme işlemlerinin birbirinin tersi olduğunu kullanmak.',
    gradeFrom: 4,
    prerequisites: ['dort_islem'],
  },
  esitlik_dengesi: {
    id: 'esitlik_dengesi',
    title: 'Eşitlik dengesi',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'esitlik',
    description: 'Eşitliğin iki tarafına aynı işlem uygulanınca dengenin korunduğunu anlamak.',
    gradeFrom: 5,
    prerequisites: ['ters_islem', 'tam_sayilar_ve_isaretler'],
  },
  carpma_bolme_iliskisi: {
    id: 'carpma_bolme_iliskisi',
    title: 'Çarpma-bölme ilişkisi',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'islem_bilgisi',
    description: 'Bir katsayıyı kaldırırken çarpma ve bölme arasındaki ters ilişkiyi kullanmak.',
    gradeFrom: 4,
    prerequisites: ['dort_islem'],
  },
  dagilma_ozelligi: {
    id: 'dagilma_ozelligi',
    title: 'Dağılma özelliği',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'cebirsel_ifadeler',
    description: 'Parantez dışındaki çarpanı parantez içindeki bütün terimlere dağıtmak.',
    gradeFrom: 6,
    prerequisites: ['dort_islem', 'tam_sayilar_ve_isaretler'],
  },
  benzer_terimler: {
    id: 'benzer_terimler',
    title: 'Benzer terimleri birleştirme',
    kind: 'foundation',
    subject: 'matematik',
    topic: 'cebirsel_ifadeler',
    description: 'Aynı değişkenli terimlerin katsayılarını doğru şekilde toplamak veya çıkarmak.',
    gradeFrom: 6,
    prerequisites: ['dort_islem', 'tam_sayilar_ve_isaretler'],
  },
  bilinmeyeni_yalniz_birakma: {
    id: 'bilinmeyeni_yalniz_birakma',
    title: 'Bilinmeyeni yalnız bırakma',
    kind: 'skill',
    subject: 'matematik',
    topic: 'denklemler',
    description: 'Eşitliğin dengesini koruyarak bilinmeyeni tek başına bırakmak.',
    gradeFrom: 6,
    prerequisites: ['esitlik_dengesi', 'ters_islem', 'tam_sayilar_ve_isaretler'],
  },
  carpma_bolme_ile_denklem_cozme: {
    id: 'carpma_bolme_ile_denklem_cozme',
    title: 'Çarpma-bölme ile denklem çözme',
    kind: 'skill',
    subject: 'matematik',
    topic: 'denklemler',
    description: 'Bilinmeyenin katsayısını çarpma-bölme ilişkisini kullanarak kaldırmak.',
    gradeFrom: 6,
    prerequisites: ['bilinmeyeni_yalniz_birakma', 'carpma_bolme_iliskisi'],
  },
  iki_adimli_denklem: {
    id: 'iki_adimli_denklem',
    title: 'İki adımlı denklem',
    kind: 'skill',
    subject: 'matematik',
    topic: 'denklemler',
    description: 'Toplama-çıkarma ve çarpma-bölme adımlarını doğru sırayla uygulamak.',
    gradeFrom: 7,
    prerequisites: ['bilinmeyeni_yalniz_birakma', 'carpma_bolme_ile_denklem_cozme'],
  },
  iki_tarafta_bilinmeyen: {
    id: 'iki_tarafta_bilinmeyen',
    title: 'İki tarafta bilinmeyen',
    kind: 'skill',
    subject: 'matematik',
    topic: 'denklemler',
    description: 'Bilinmeyenli terimleri bir tarafta toplayıp denklemi sadeleştirmek.',
    gradeFrom: 7,
    prerequisites: ['iki_adimli_denklem', 'benzer_terimler', 'tam_sayilar_ve_isaretler'],
  },
  parantezli_denklem: {
    id: 'parantezli_denklem',
    title: 'Parantezli denklem',
    kind: 'skill',
    subject: 'matematik',
    topic: 'denklemler',
    description: 'Dağılma özelliği ve benzer terimleri kullanarak parantezli denklemi çözmek.',
    gradeFrom: 7,
    prerequisites: ['iki_adimli_denklem', 'dagilma_ozelligi', 'benzer_terimler'],
  },
};

export function isKnowledgeNodeId(value: unknown): value is KnowledgeNodeId {
  return typeof value === 'string' && value in KNOWLEDGE_NODES;
}

export function getKnowledgeNode(id: KnowledgeNodeId): KnowledgeNode {
  return KNOWLEDGE_NODES[id];
}

export function getDirectPrerequisites(id: KnowledgeNodeId): KnowledgeNode[] {
  return KNOWLEDGE_NODES[id].prerequisites.map((prerequisite) => KNOWLEDGE_NODES[prerequisite]);
}

export function getAllPrerequisites(id: KnowledgeNodeId): KnowledgeNode[] {
  const ordered: KnowledgeNode[] = [];
  const visited = new Set<KnowledgeNodeId>();
  const visiting = new Set<KnowledgeNodeId>();

  const visit = (current: KnowledgeNodeId) => {
    if (visited.has(current)) return;
    if (visiting.has(current)) throw new Error(`Bilgi grafiğinde döngü bulundu: ${current}`);
    visiting.add(current);
    for (const prerequisite of KNOWLEDGE_NODES[current].prerequisites) {
      visit(prerequisite);
      if (!visited.has(prerequisite)) {
        visited.add(prerequisite);
        ordered.push(KNOWLEDGE_NODES[prerequisite]);
      }
    }
    visiting.delete(current);
  };

  visit(id);
  return ordered;
}

export function getLearningPath(target: KnowledgeNodeId): KnowledgeNode[] {
  return [...getAllPrerequisites(target), KNOWLEDGE_NODES[target]];
}

export function getKnowledgeGraphView(target: SkillId): KnowledgeGraphView {
  return {
    target: KNOWLEDGE_NODES[target],
    directPrerequisites: getDirectPrerequisites(target),
    allPrerequisites: getAllPrerequisites(target),
    learningPath: getLearningPath(target),
  };
}

export function findPathToTarget(source: KnowledgeNodeId, target: SkillId): KnowledgeNodeId[] {
  const search = (current: KnowledgeNodeId, visited: Set<KnowledgeNodeId>): KnowledgeNodeId[] | undefined => {
    if (current === source) return [source];
    if (visited.has(current)) return undefined;
    visited.add(current);

    for (const prerequisite of KNOWLEDGE_NODES[current].prerequisites) {
      const partial = search(prerequisite, new Set(visited));
      if (partial) return [...partial, current];
    }
    return undefined;
  };

  return search(target, new Set()) ?? [];
}

export function getKnowledgeGraph(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const nodes = Object.values(KNOWLEDGE_NODES);
  const edges: KnowledgeEdge[] = [];
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      edges.push({ from: prerequisite, to: node.id, relation: 'prerequisite_for' });
    }
  }
  return { nodes, edges };
}

export function assertKnowledgeGraphIntegrity(): true {
  for (const skill of EQUATION_SKILLS) getAllPrerequisites(skill);
  return true;
}
