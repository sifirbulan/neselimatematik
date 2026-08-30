import { describe, expect, it } from 'vitest';
import { createStudentModel } from '../student/student-model';
import { analyzeSolutionSteps } from '../step-analysis/step-analyzer';
import { createTeacherPlan } from '../teacher/teacher-engine';
import {
  assertKnowledgeGraphIntegrity,
  getDirectPrerequisites,
  getKnowledgeGraphView,
  getLearningPath,
} from './knowledge-graph';
import { analyzePrerequisiteNeed } from './prerequisite-diagnosis';

describe('Nesevren kazanım ve önkoşul bilgi grafiği', () => {
  it('grafiği döngüsüz kurar ve öğrenme yolunda önkoşulları hedeften önce sıralar', () => {
    expect(assertKnowledgeGraphIntegrity()).toBe(true);
    const path = getLearningPath('parantezli_denklem').map((node) => node.id);

    expect(path.at(-1)).toBe('parantezli_denklem');
    expect(path).toContain('dagilma_ozelligi');
    expect(path).toContain('dort_islem');
    expect(path.indexOf('dort_islem')).toBeLessThan(path.indexOf('dagilma_ozelligi'));
  });

  it('hedef kazanımın doğrudan ve tüm önkoşullarını verir', () => {
    const direct = getDirectPrerequisites('iki_tarafta_bilinmeyen').map((node) => node.id);
    const view = getKnowledgeGraphView('iki_tarafta_bilinmeyen');

    expect(direct).toEqual(['iki_adimli_denklem', 'benzer_terimler', 'tam_sayilar_ve_isaretler']);
    expect(view.allPrerequisites.map((node) => node.id)).toContain('esitlik_dengesi');
    expect(view.allPrerequisites.map((node) => node.id)).toContain('dort_islem');
  });

  it('işaret hatasını tam sayılar ve işaretler önkoşuluna bağlar', () => {
    const skill = 'iki_tarafta_bilinmeyen' as const;
    const student = createStudentModel({
      studentId: 'ogrenci-bilgi-1',
      skills: { [skill]: { mastery: 0.48, lastDifficulty: 3 } },
      recentAttempts: [
        { skill, correct: false, difficulty: 3, mistake: 'isaret_hatasi' },
      ],
    });

    const analysis = analyzePrerequisiteNeed({
      student,
      skill,
      correct: false,
      mistake: 'isaret_hatasi',
    });

    expect(analysis.status).toBe('review_recommended');
    expect(analysis.recommended?.node.id).toBe('tam_sayilar_ve_isaretler');
    expect(analysis.recommended?.pathToTarget.at(-1)).toBe(skill);
    expect(analysis.recommended?.confidence).toBeGreaterThan(0.9);
  });

  it('çözüm adımındaki dağılma hatasından kök önkoşulu otomatik çıkarır', () => {
    const skill = 'parantezli_denklem' as const;
    const student = createStudentModel({ studentId: 'ogrenci-bilgi-2' });
    const stepAnalysis = analyzeSolutionSteps({
      question: '2(x + 3) = 14',
      steps: ['2x + 3 = 14', '2x = 11'],
    });

    const analysis = analyzePrerequisiteNeed({
      student,
      skill,
      correct: false,
      stepAnalysis,
    });

    expect(stepAnalysis.firstError?.mistake).toBe('dagilma_hatasi');
    expect(analysis.recommended?.node.id).toBe('dagilma_ozelligi');
    expect(analysis.recommended?.evidence.join(' ')).toContain('çözüm adımı');
  });

  it('öğretmen planına hedefli önkoşul tekrarı ekler', () => {
    const skill = 'parantezli_denklem' as const;
    const student = createStudentModel({
      studentId: 'ogrenci-bilgi-3',
      skills: { [skill]: { mastery: 0.2, lastDifficulty: 2 } },
    });

    const plan = createTeacherPlan({
      student,
      skill,
      correct: false,
      recommendedDifficulty: 1,
      shouldExplain: true,
      evidence: { question: '2(x + 3) = 14' },
      solutionSteps: ['2x + 3 = 14'],
    });

    expect(plan.action).toBe('prerequisite_review');
    expect(plan.prerequisiteAnalysis.recommended?.node.id).toBe('dagilma_ozelligi');
    expect(plan.teaching.prerequisiteReview?.nodeId).toBe('dagilma_ozelligi');
    expect(plan.next.prerequisite).toBe('dagilma_ozelligi');
  });

  it('doğru cevapta gereksiz önkoşul tekrarı önermez', () => {
    const skill = 'iki_adimli_denklem' as const;
    const student = createStudentModel({ studentId: 'ogrenci-bilgi-4' });
    const analysis = analyzePrerequisiteNeed({ student, skill, correct: true });

    expect(analysis.status).toBe('not_needed');
    expect(analysis.candidates).toHaveLength(0);
  });
});
