import { describe, expect, it } from 'vitest';
import { analyzePrerequisiteNeed } from '../knowledge/prerequisite-diagnosis';
import { createStudentModel } from '../student/student-model';
import {
  buildKnowledgeProfileSummary,
  createLearningMemory,
  createLearningMemoryFromStudent,
  getRetentionScore,
  memoryToStudentModel,
  recordMemoryAttempt,
} from './memory-engine';

const skill = 'bilinmeyeni_yalniz_birakma' as const;

describe('Nesevren uzun süreli öğrenme hafızası', () => {
  it('farklı denemeleri tek profilde biriktirir ve trend çıkarır', () => {
    let profile = createLearningMemory('ogrenci-1', 7, '2026-01-01T00:00:00Z');
    profile = recordMemoryAttempt(profile, {
      skill,
      correct: true,
      difficulty: 1,
      masteryAfter: 0.3,
      at: '2026-01-01T00:00:00Z',
    });
    profile = recordMemoryAttempt(profile, {
      skill,
      correct: true,
      difficulty: 2,
      masteryAfter: 0.52,
      at: '2026-01-03T00:00:00Z',
    });
    profile = recordMemoryAttempt(profile, {
      skill,
      correct: true,
      difficulty: 2,
      masteryAfter: 0.72,
      at: '2026-01-06T00:00:00Z',
    });

    expect(profile.revision).toBe(3);
    expect(profile.skills[skill].totalAttempts).toBe(3);
    expect(profile.skills[skill].correctAttempts).toBe(3);
    expect(profile.skills[skill].trend).toBe('improving');
    expect(profile.recentAttempts).toHaveLength(3);
  });

  it('zaman geçtikçe kalıcılık skorunu düşürüp tekrar planına taşır', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-2',
      skills: { [skill]: { mastery: 0.82, attempts: 6, correct: 5, lastDifficulty: 3 } },
    });
    const profile = createLearningMemoryFromStudent(student, '2026-01-01T00:00:00Z');

    const initialRetention = getRetentionScore(profile.skills[skill], '2026-01-01T00:00:00Z');
    const laterRetention = getRetentionScore(profile.skills[skill], '2026-03-01T00:00:00Z');
    const summary = buildKnowledgeProfileSummary(profile, '2026-03-01T00:00:00Z');

    expect(laterRetention).toBeLessThan(initialRetention);
    expect(summary.reviewQueue.some((item) => item.nodeId === skill && item.overdue)).toBe(true);
  });

  it('önkoşul teşhisini uzun süreli temel riskine dönüştürür', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-3',
      skills: { [skill]: { mastery: 0.35, attempts: 3, correct: 1, lastDifficulty: 2 } },
      recentAttempts: [
        { skill, correct: false, difficulty: 2, mistake: 'isaret_hatasi' },
        { skill, correct: false, difficulty: 2, mistake: 'isaret_hatasi' },
      ],
    });
    const prerequisiteAnalysis = analyzePrerequisiteNeed({
      student,
      skill,
      correct: false,
      mistake: 'isaret_hatasi',
    });
    const profile = recordMemoryAttempt(createLearningMemoryFromStudent(student, '2026-02-01T00:00:00Z'), {
      skill,
      correct: false,
      difficulty: 2,
      masteryAfter: 0.28,
      mistake: 'isaret_hatasi',
      prerequisiteAnalysis,
      at: '2026-02-02T00:00:00Z',
    });

    expect(prerequisiteAnalysis.status).toBe('review_recommended');
    expect(profile.foundations.tam_sayilar_ve_isaretler.risk).toBeGreaterThan(0);
    expect(profile.reviewQueue.some((item) => item.nodeId === 'tam_sayilar_ve_isaretler')).toBe(true);
  });

  it('mevcut öğrenci modelini hafızaya aktarırken deneme sayılarını korur', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-4',
      grade: 8,
      skills: { [skill]: { mastery: 0.6, attempts: 8, correct: 5, lastDifficulty: 3, lastMistake: 'ters_islem_hatasi' } },
      recentAttempts: [
        { skill, correct: true, difficulty: 2 },
        { skill, correct: false, difficulty: 3, mistake: 'ters_islem_hatasi' },
      ],
    });

    const profile = createLearningMemoryFromStudent(student, '2026-04-01T00:00:00Z');
    const hydrated = memoryToStudentModel(profile);

    expect(profile.skills[skill].totalAttempts).toBe(8);
    expect(profile.skills[skill].correctAttempts).toBe(5);
    expect(hydrated.grade).toBe(8);
    expect(hydrated.skills[skill].mastery).toBe(0.6);
    expect(hydrated.recentAttempts).toHaveLength(2);
  });

  it('bilgi profili güçlü, gelişen ve tekrar gerektiren kazanımları ayırır', () => {
    const student = createStudentModel({
      studentId: 'ogrenci-5',
      skills: {
        bilinmeyeni_yalniz_birakma: { mastery: 0.88, attempts: 6, correct: 6, lastDifficulty: 4 },
        carpma_bolme_ile_denklem_cozme: { mastery: 0.58, attempts: 4, correct: 3, lastDifficulty: 2 },
        iki_adimli_denklem: { mastery: 0.3, attempts: 5, correct: 1, lastDifficulty: 2 },
      },
    });
    const profile = createLearningMemoryFromStudent(student, '2026-05-01T00:00:00Z');
    const summary = buildKnowledgeProfileSummary(profile, '2026-05-01T00:00:00Z');

    expect(summary.strengths.some((item) => item.skill === 'bilinmeyeni_yalniz_birakma')).toBe(true);
    expect(summary.developing.some((item) => item.skill === 'carpma_bolme_ile_denklem_cozme')).toBe(true);
    expect(summary.needsReview.some((item) => item.skill === 'iki_adimli_denklem')).toBe(true);
    expect(summary.practicedSkillCount).toBe(3);
  });
});
