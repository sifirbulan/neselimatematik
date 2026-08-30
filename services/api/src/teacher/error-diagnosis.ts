import type { MistakeType, SkillId, StudentModel } from '../student/student-model';
import type { LearningDiagnosis, TeacherEvidence } from './teacher-model';

const MISTAKE_INFO: Record<MistakeType, { title: string; reason: string }> = {
  ters_islem_hatasi: {
    title: 'Ters işlem kuralı karışmış olabilir',
    reason: 'Bilinmeyeni yalnız bırakırken eşitliğin iki tarafına aynı işlemi uygulama fikri yeterince oturmamış görünüyor.',
  },
  isaret_hatasi: {
    title: 'İşaret takibi güçlendirilmeli',
    reason: 'Negatif ve pozitif işaretler arasında geçiş yapılırken işlem işareti karışmış olabilir.',
  },
  carpma_bolme_hatasi: {
    title: 'Çarpma-bölme ilişkisi tekrar edilmeli',
    reason: 'Katsayıyı kaldırmak için hangi işlemin uygulanacağı karışmış olabilir.',
  },
  dagilma_hatasi: {
    title: 'Dağılma özelliği tekrar edilmeli',
    reason: 'Parantez dışındaki çarpanın parantez içindeki tüm terimlere uygulanması adımı eksik kalmış olabilir.',
  },
  hesaplama_hatasi: {
    title: 'İşlem kontrolü gerekli',
    reason: 'Denklem yöntemi doğru olsa bile temel aritmetik işlem sırasında hata yapılmış olabilir.',
  },
  bilinmiyor: {
    title: 'Hata türü henüz net değil',
    reason: 'Sonuç yanlış ancak mevcut veriler hatanın hangi adımda oluştuğunu kesinleştirmeye yetmiyor.',
  },
};

function evidenceLines(evidence?: TeacherEvidence): string[] {
  if (!evidence) return [];
  const lines: string[] = [];
  if (evidence.question) lines.push(`Soru: ${evidence.question}`);
  if (evidence.studentAnswer !== undefined) lines.push(`Öğrenci cevabı: ${String(evidence.studentAnswer)}`);
  if (evidence.expectedAnswer !== undefined) lines.push(`Beklenen cevap: ${String(evidence.expectedAnswer)}`);
  return lines;
}

export function diagnoseLearningNeed(input: {
  student: StudentModel;
  skill: SkillId;
  correct: boolean;
  mistake?: MistakeType;
  evidence?: TeacherEvidence;
}): LearningDiagnosis {
  const { student, skill, correct } = input;
  const state = student.skills[skill];
  const recentWrong = student.recentAttempts
    .filter((attempt) => attempt.skill === skill && !attempt.correct)
    .slice(-5);

  if (correct) {
    return {
      code: 'basarili',
      title: 'Kazanım doğru uygulanıyor',
      reason: 'Öğrenci bu soruda hedeflenen kuralı doğru uyguladı.',
      confidence: 1,
      repeatedCount: 0,
      evidence: evidenceLines(input.evidence),
    };
  }

  const mistake = input.mistake ?? state.lastMistake ?? 'bilinmiyor';
  const repeatedCount = recentWrong.filter((attempt) => attempt.mistake === mistake).length;

  if (mistake !== 'bilinmiyor') {
    const info = MISTAKE_INFO[mistake];
    return {
      code: mistake,
      title: info.title,
      reason: info.reason,
      confidence: Math.min(0.98, 0.82 + repeatedCount * 0.04),
      repeatedCount,
      evidence: evidenceLines(input.evidence),
    };
  }

  if (state.mastery < 0.35) {
    return {
      code: 'kavram_temeli',
      title: 'Kazanımın temeli güçlendirilmeli',
      reason: 'Kazanım hâkimiyeti düşük olduğu için tek bir işlem hatasından çok temel kural eksikliği olasılığı öne çıkıyor.',
      confidence: 0.72,
      repeatedCount: recentWrong.length,
      evidence: evidenceLines(input.evidence),
    };
  }

  return {
    code: 'bilinmiyor',
    title: MISTAKE_INFO.bilinmiyor.title,
    reason: MISTAKE_INFO.bilinmiyor.reason,
    confidence: 0.55,
    repeatedCount: recentWrong.length,
    evidence: evidenceLines(input.evidence),
  };
}
