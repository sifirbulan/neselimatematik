import type { SkillId } from '../student/student-model';

export const FOUNDATION_NODE_IDS = [
  'dort_islem',
  'tam_sayilar_ve_isaretler',
  'ters_islem',
  'esitlik_dengesi',
  'carpma_bolme_iliskisi',
  'dagilma_ozelligi',
  'benzer_terimler',
] as const;

export type FoundationNodeId = (typeof FOUNDATION_NODE_IDS)[number];
export type KnowledgeNodeId = FoundationNodeId | SkillId;
export type KnowledgeNodeKind = 'foundation' | 'skill';

export interface KnowledgeNode {
  id: KnowledgeNodeId;
  title: string;
  kind: KnowledgeNodeKind;
  subject: 'matematik';
  topic: string;
  description: string;
  gradeFrom: number;
  prerequisites: KnowledgeNodeId[];
}

export interface KnowledgeGraphView {
  target: KnowledgeNode;
  directPrerequisites: KnowledgeNode[];
  allPrerequisites: KnowledgeNode[];
  learningPath: KnowledgeNode[];
}

export interface KnowledgeEdge {
  from: KnowledgeNodeId;
  to: KnowledgeNodeId;
  relation: 'prerequisite_for';
}

export interface PrerequisiteCandidate {
  node: KnowledgeNode;
  confidence: number;
  reason: string;
  evidence: string[];
  pathToTarget: KnowledgeNodeId[];
}

export type PrerequisiteStatus = 'not_needed' | 'uncertain' | 'review_recommended';

export interface PrerequisiteAnalysis {
  targetSkill: SkillId;
  status: PrerequisiteStatus;
  recommended?: PrerequisiteCandidate;
  candidates: PrerequisiteCandidate[];
  graph: KnowledgeGraphView;
}
