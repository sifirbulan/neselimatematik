import type { MistakeType } from '../student/student-model';
import {
  areEquivalentEquations,
  nearlyEqual,
  parseLinearEquation,
  solvedValue,
  type LinearForm,
  type ParsedEquation,
} from './linear-parser';
import type { StepAnalysisResult, StepOperation, StepTransition } from './step-model';

interface OperationInfo {
  operation: StepOperation;
  reason: string;
  hint: string;
}

interface MistakeInfo {
  mistake: MistakeType;
  reason: string;
  hint: string;
}

function formEquals(a: LinearForm, b: LinearForm): boolean {
  return nearlyEqual(a.x, b.x) && nearlyEqual(a.constant, b.constant);
}

function scaleBetween(from: LinearForm, to: LinearForm): number | undefined {
  const pairs: Array<[number, number]> = [
    [from.x, to.x],
    [from.constant, to.constant],
  ];
  let ratio: number | undefined;

  for (const [source, target] of pairs) {
    if (nearlyEqual(source, 0)) {
      if (!nearlyEqual(target, 0)) return undefined;
      continue;
    }
    const current = target / source;
    if (ratio === undefined) ratio = current;
    else if (!nearlyEqual(ratio, current)) return undefined;
  }

  return ratio ?? (formEquals(from, to) ? 1 : undefined);
}

function detectValidOperation(previous: ParsedEquation, current: ParsedEquation): OperationInfo {
  if (formEquals(previous.left, current.left) && formEquals(previous.right, current.right)) {
    return {
      operation: 'same_equation',
      reason: 'Bu satır önceki denklemle aynıdır.',
      hint: 'Sonraki satırda bilinmeyeni yalnız bırakacak işlemi seçebilirsin.',
    };
  }

  const leftConstantChange = current.left.constant - previous.left.constant;
  const rightConstantChange = current.right.constant - previous.right.constant;
  const sameVariableCoefficients = nearlyEqual(current.left.x, previous.left.x)
    && nearlyEqual(current.right.x, previous.right.x);

  if (sameVariableCoefficients && nearlyEqual(leftConstantChange, rightConstantChange)) {
    if (leftConstantChange < 0) {
      return {
        operation: 'subtract_both_sides',
        reason: `Eşitliğin iki tarafından da ${Math.abs(leftConstantChange)} çıkarılmış.`,
        hint: 'Eşitliğin iki tarafına aynı işlem uygulandığı için denklem korunur.',
      };
    }
    if (leftConstantChange > 0) {
      return {
        operation: 'add_both_sides',
        reason: `Eşitliğin iki tarafına da ${leftConstantChange} eklenmiş.`,
        hint: 'Eşitliğin iki tarafına aynı işlem uygulandığı için denklem korunur.',
      };
    }
  }

  const leftScale = scaleBetween(previous.left, current.left);
  const rightScale = scaleBetween(previous.right, current.right);
  if (leftScale !== undefined && rightScale !== undefined && nearlyEqual(leftScale, rightScale) && !nearlyEqual(leftScale, 1)) {
    if (Math.abs(leftScale) < 1) {
      return {
        operation: 'divide_both_sides',
        reason: 'Eşitliğin iki tarafı da aynı sayıya bölünmüş.',
        hint: 'Katsayıyı kaldırırken iki tarafın da aynı sayıya bölündüğünü kontrol et.',
      };
    }
    return {
      operation: 'multiply_both_sides',
      reason: 'Eşitliğin iki tarafı da aynı sayı ile çarpılmış.',
      hint: 'İki tarafa aynı çarpma işlemi uygulandığı için çözüm kümesi korunur.',
    };
  }

  if (previous.raw.includes('(') && !current.raw.includes('(')) {
    return {
      operation: 'distribute_simplify',
      reason: 'Parantez açılıp denklem eşdeğer biçimde sadeleştirilmiş.',
      hint: 'Parantez dışındaki çarpanın tüm terimlere uygulandığını kontrol etmeye devam et.',
    };
  }

  return {
    operation: 'equivalent_transform',
    reason: 'Bu adım denklemin çözümünü değiştirmeyen eşdeğer bir dönüşümdür.',
    hint: 'Sonraki adımda da eşitliğin iki tarafına yapılan işlemleri dengeli uygula.',
  };
}

function inferMistake(previous: ParsedEquation, current: ParsedEquation): MistakeInfo {
  if (previous.raw.includes('(') && !current.raw.includes('(')) {
    return {
      mistake: 'dagilma_hatasi',
      reason: 'Parantez açıldıktan sonra oluşan denklem önceki denklemle eşdeğer değil.',
      hint: 'Parantez dışındaki çarpanı parantez içindeki her terimle ayrı ayrı çarp.',
    };
  }

  const sameVariableCoefficients = nearlyEqual(current.left.x, previous.left.x)
    && nearlyEqual(current.right.x, previous.right.x);
  const leftConstantChange = current.left.constant - previous.left.constant;
  const rightConstantChange = current.right.constant - previous.right.constant;

  if (sameVariableCoefficients && !nearlyEqual(leftConstantChange, rightConstantChange)) {
    return {
      mistake: 'ters_islem_hatasi',
      reason: 'Bir sabit terim değiştirilirken eşitliğin iki tarafına aynı işlem uygulanmamış.',
      hint: 'Bir terimi yok etmek için seçtiğin işlemi eşitliğin hem soluna hem sağına aynı şekilde uygula.',
    };
  }

  const leftScale = scaleBetween(previous.left, current.left);
  const rightScale = scaleBetween(previous.right, current.right);
  if (
    (leftScale !== undefined || rightScale !== undefined)
    && (leftScale === undefined || rightScale === undefined || !nearlyEqual(leftScale, rightScale))
  ) {
    return {
      mistake: 'carpma_bolme_hatasi',
      reason: 'Katsayı değiştirilirken denklemin iki tarafı aynı oranda çarpılmamış veya bölünmemiş.',
      hint: 'x’in katsayısını kaldırmak için hangi sayıya bölüyorsan eşitliğin diğer tarafını da aynı sayıya böl.',
    };
  }

  if (
    (!nearlyEqual(previous.normalized.x, 0) && !nearlyEqual(current.normalized.x, 0)
      && previous.normalized.x * current.normalized.x < 0)
    || previous.normalized.constant * current.normalized.constant < 0
  ) {
    return {
      mistake: 'isaret_hatasi',
      reason: 'Dönüşüm sırasında bir terimin işareti değişmiş ve denklemin çözümü korunmamış.',
      hint: 'Negatif ve pozitif işaretleri satır satır kontrol et; işaret değişiyorsa bunun hangi işlemden geldiğini göster.',
    };
  }

  return {
    mistake: 'hesaplama_hatasi',
    reason: 'Bu satırdaki aritmetik dönüşüm önceki denklemle aynı çözümü vermiyor.',
    hint: 'Son yaptığın toplama, çıkarma, çarpma veya bölme işlemini yeniden hesapla.',
  };
}

export function analyzeSolutionSteps(input: { question: string; steps: string[] }): StepAnalysisResult {
  const question = input.question.trim();
  const steps = input.steps.map((step) => step.trim()).filter(Boolean);
  const transitions: StepTransition[] = [];

  let previousLine = question;
  let previousEquation: ParsedEquation;
  try {
    previousEquation = parseLinearEquation(question);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Soru denklemi çözümlenemedi.';
    return {
      question,
      validSoFar: false,
      completed: false,
      firstError: {
        stepNumber: 0,
        previousLine: question,
        currentLine: question,
        mistake: 'bilinmiyor',
        reason,
        hint: 'Şimdilik x değişkenli birinci dereceden denklemler için tek eşitlik kullan.',
      },
      transitions,
      summary: 'Başlangıç denklemi analiz edilemedi.',
    };
  }

  let firstError: StepAnalysisResult['firstError'];
  let finalEquation = previousEquation;

  for (let index = 0; index < steps.length; index += 1) {
    const currentLine = steps[index];
    const stepNumber = index + 1;

    if (firstError) {
      transitions.push({
        stepNumber,
        from: previousLine,
        to: currentLine,
        status: 'unverified',
        operation: 'unverified',
        reason: 'Önceki bir adımda hata bulunduğu için bu satır matematiksel doğruluk açısından puanlanmadı.',
        hint: 'Önce ilk hatalı adıma dönüp onu düzelt.',
      });
      previousLine = currentLine;
      continue;
    }

    let currentEquation: ParsedEquation;
    try {
      currentEquation = parseLinearEquation(currentLine);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Bu çözüm satırı çözümlenemedi.';
      const hint = 'Her satırı örneğin “2x = 12” gibi açık bir eşitlik olarak yaz.';
      firstError = {
        stepNumber,
        previousLine,
        currentLine,
        mistake: 'bilinmiyor',
        reason,
        hint,
      };
      transitions.push({
        stepNumber,
        from: previousLine,
        to: currentLine,
        status: 'parse_error',
        operation: 'invalid_transform',
        mistake: 'bilinmiyor',
        reason,
        hint,
      });
      previousLine = currentLine;
      continue;
    }

    if (areEquivalentEquations(previousEquation, currentEquation)) {
      const operation = detectValidOperation(previousEquation, currentEquation);
      transitions.push({
        stepNumber,
        from: previousLine,
        to: currentLine,
        status: 'valid',
        ...operation,
      });
      previousEquation = currentEquation;
      finalEquation = currentEquation;
      previousLine = currentLine;
      continue;
    }

    const mistake = inferMistake(previousEquation, currentEquation);
    firstError = {
      stepNumber,
      previousLine,
      currentLine,
      mistake: mistake.mistake,
      reason: mistake.reason,
      hint: mistake.hint,
    };
    transitions.push({
      stepNumber,
      from: previousLine,
      to: currentLine,
      status: 'invalid',
      operation: 'invalid_transform',
      ...mistake,
    });
    previousLine = currentLine;
  }

  const finalValue = !firstError ? solvedValue(finalEquation) : undefined;
  const completed = !firstError && finalValue !== undefined;
  const validSoFar = !firstError;

  let summary: string;
  if (firstError) {
    summary = `İlk matematiksel hata ${firstError.stepNumber}. adımda bulundu: ${firstError.reason}`;
  } else if (completed) {
    summary = `Çözüm adımları tutarlı ve sonuç x = ${finalValue}.`;
  } else if (steps.length === 0) {
    summary = 'Henüz öğrenci çözüm adımı girilmedi.';
  } else {
    summary = 'Şu ana kadarki adımlar matematiksel olarak tutarlı; çözüm henüz tamamlanmamış.';
  }

  return {
    question,
    validSoFar,
    completed,
    ...(finalValue !== undefined ? { finalSolution: finalValue } : {}),
    ...(firstError ? { firstError } : {}),
    transitions,
    summary,
  };
}
