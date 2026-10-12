/**
 * Güvenli, bağımsız doğrulanabilen tek bilinmeyenli doğrusal denklem çözümü.
 * Bu modül genel amaçlı LLM değildir: desteklenmeyen ifadelerde sonuç uydurmaz.
 */
export interface VerifiedSolution {
  status: 'verified';
  answer: string;
  variable: string;
  steps: string[];
  verification: { left: number; right: number; passed: true };
  explanation: string;
  method: 'linear-equation';
}

type Linear = { coefficient: number; constant: number };
const EPS = 1e-9;
const round = (n: number) => Number(n.toFixed(8));
const format = (n: number) => String(round(n));

function parseSide(raw: string, variable: string): Linear | undefined {
  const side = raw.replace(/\s+/g, '').replace(/−/g, '-').replace(/×/g, '*');
  if (!side || /[^0-9.+*\-a-zA-Z]/.test(side)) return undefined;
  const terms = side.replace(/-/g, '+-').split('+').filter(Boolean);
  if (!terms.length || terms.length > 20) return undefined;
  let coefficient = 0;
  let constant = 0;
  for (const term of terms) {
    if (term.includes(variable)) {
      if (term.indexOf(variable) !== term.lastIndexOf(variable)) return undefined;
      const match = term.match(new RegExp('^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)?)(?:\\*)?' + variable + '$'));
      if (!match) return undefined;
      const prefix = match[1];
      const number = prefix === '' || prefix === '+' ? 1 : prefix === '-' ? -1 : Number(prefix);
      if (!Number.isFinite(number)) return undefined;
      coefficient += number;
    } else {
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(term)) return undefined;
      constant += Number(term);
    }
  }
  if (![coefficient, constant].every(Number.isFinite)) return undefined;
  return { coefficient, constant };
}

export function solveLinearEquation(question: string): VerifiedSolution | undefined {
  const cleaned = question.trim().replace(/[?？。]+$/, '').replace(/−/g, '-');
  // Sadece saf denklem ifadelerini kabul et; serbest metin içinden yanlış denklem seçme.
  const match = cleaned.match(/^([0-9a-zA-Z.+*\s\-]+)=([0-9a-zA-Z.+*\s\-]+)$/);
  if (!match) return undefined;
  const letters = [...new Set((cleaned.match(/[a-zA-Z]/g) ?? []).map((s) => s.toLowerCase()))];
  if (letters.length !== 1) return undefined;
  const variable = letters[0];
  const left = parseSide(match[1].toLowerCase(), variable);
  const right = parseSide(match[2].toLowerCase(), variable);
  if (!left || !right) return undefined;
  const a = left.coefficient - right.coefficient;
  const b = right.constant - left.constant;
  if (Math.abs(a) < EPS) return undefined; // Sonsuz/çözümsüz durumlar sonraki sürüme bırakılır.
  const value = b / a;
  if (!Number.isFinite(value) || Math.abs(value) > 1e10) return undefined;
  const lhs = left.coefficient * value + left.constant;
  const rhs = right.coefficient * value + right.constant;
  if (Math.abs(lhs - rhs) > EPS * Math.max(1, Math.abs(lhs), Math.abs(rhs))) return undefined;
  return {
    status: 'verified',
    answer: `${variable} = ${format(value)}`,
    variable,
    steps: [
      `Denklem: ${cleaned}`,
      `Bilinmeyenli terimleri bir tarafa, sabitleri diğer tarafa topla: ${format(a)}${variable} = ${format(b)}`,
      `Her iki tarafı ${format(a)} sayısına böl: ${variable} = ${format(value)}`,
      `Yerine koyarak kontrol et: sol taraf ≈ ${format(lhs)}, sağ taraf ≈ ${format(rhs)}`,
    ],
    verification: { left: round(lhs), right: round(rhs), passed: true },
    explanation: 'Önce bilinmeyenli terimleri bir tarafta topladık. Sonra bilinmeyenin katsayısına bölerek sonucu bulduk ve başlangıç denkleminde kontrol ettik.',
    method: 'linear-equation',
  };
}

export function explainAtLevel(solution: VerifiedSolution, level: 'simple' | 'detailed' = 'simple'): string {
  return level === 'detailed'
    ? solution.steps.join('\n') + '\n' + solution.explanation
    : `Bilinmeyeni yalnız bırakmak için iki tarafa aynı işlemi uygula. Sonuç: ${solution.answer}. Yerine koyma kontrolü başarılı.`;
}
