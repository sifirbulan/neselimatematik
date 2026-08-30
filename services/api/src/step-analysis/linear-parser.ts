export interface LinearForm {
  x: number;
  constant: number;
}

export interface ParsedEquation {
  raw: string;
  left: LinearForm;
  right: LinearForm;
  normalized: LinearForm;
  solution?: number;
  identity: boolean;
  contradiction: boolean;
}

const EPS = 1e-9;

export const nearlyEqual = (a: number, b: number) => Math.abs(a - b) <= EPS;

const add = (a: LinearForm, b: LinearForm): LinearForm => ({ x: a.x + b.x, constant: a.constant + b.constant });
const subtract = (a: LinearForm, b: LinearForm): LinearForm => ({ x: a.x - b.x, constant: a.constant - b.constant });
const scale = (form: LinearForm, value: number): LinearForm => ({ x: form.x * value, constant: form.constant * value });

function multiply(a: LinearForm, b: LinearForm): LinearForm {
  if (!nearlyEqual(a.x, 0) && !nearlyEqual(b.x, 0)) {
    throw new Error('Doğrusal olmayan ifade desteklenmiyor.');
  }
  return {
    x: a.x * b.constant + b.x * a.constant,
    constant: a.constant * b.constant,
  };
}

function divide(a: LinearForm, b: LinearForm): LinearForm {
  if (!nearlyEqual(b.x, 0) || nearlyEqual(b.constant, 0)) {
    throw new Error('Değişken içeren veya sıfır olan bir ifadeye bölme desteklenmiyor.');
  }
  return scale(a, 1 / b.constant);
}

class LinearExpressionParser {
  private readonly input: string;
  private index = 0;

  constructor(raw: string) {
    this.input = raw
      .replace(/[−–—]/g, '-')
      .replace(/[×·]/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/\s+/g, '');
  }

  parse(): LinearForm {
    if (!this.input) throw new Error('Boş ifade.');
    const result = this.parseExpression();
    if (this.index !== this.input.length) {
      throw new Error(`Anlaşılamayan ifade: ${this.input.slice(this.index)}`);
    }
    return result;
  }

  private parseExpression(): LinearForm {
    let result = this.parseTerm();
    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.consume();
      const right = this.parseTerm();
      result = operator === '+' ? add(result, right) : subtract(result, right);
    }
    return result;
  }

  private parseTerm(): LinearForm {
    let result = this.parseFactor();
    while (true) {
      const next = this.peek();
      if (next === '*') {
        this.consume();
        result = multiply(result, this.parseFactor());
        continue;
      }
      if (next === '/') {
        this.consume();
        result = divide(result, this.parseFactor());
        continue;
      }
      if (this.startsPrimary(next)) {
        result = multiply(result, this.parseFactor());
        continue;
      }
      break;
    }
    return result;
  }

  private parseFactor(): LinearForm {
    const next = this.peek();
    if (next === '+') {
      this.consume();
      return this.parseFactor();
    }
    if (next === '-') {
      this.consume();
      return scale(this.parseFactor(), -1);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): LinearForm {
    const next = this.peek();
    if (next === '(') {
      this.consume();
      const inside = this.parseExpression();
      if (this.peek() !== ')') throw new Error('Kapanmayan parantez.');
      this.consume();
      return inside;
    }

    if (next?.toLowerCase() === 'x') {
      this.consume();
      return { x: 1, constant: 0 };
    }

    if (next && /[0-9.]/.test(next)) {
      const start = this.index;
      let dots = 0;
      while (this.index < this.input.length && /[0-9.]/.test(this.input[this.index])) {
        if (this.input[this.index] === '.') dots += 1;
        this.index += 1;
      }
      if (dots > 1) throw new Error('Geçersiz sayı biçimi.');
      const value = Number(this.input.slice(start, this.index));
      if (!Number.isFinite(value)) throw new Error('Geçersiz sayı.');
      return { x: 0, constant: value };
    }

    throw new Error(`Beklenmeyen sembol: ${next ?? 'son'}`);
  }

  private startsPrimary(value: string | undefined): boolean {
    return value === '(' || value?.toLowerCase() === 'x' || Boolean(value && /[0-9.]/.test(value));
  }

  private peek(): string | undefined {
    return this.input[this.index];
  }

  private consume(): string {
    const value = this.input[this.index];
    this.index += 1;
    return value;
  }
}

export function parseLinearExpression(raw: string): LinearForm {
  return new LinearExpressionParser(raw).parse();
}

export function parseLinearEquation(raw: string): ParsedEquation {
  const normalizedRaw = raw.replace(/[−–—]/g, '-').trim();
  const parts = normalizedRaw.split('=');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    throw new Error('Her çözüm satırı tek bir eşitlik içermeli.');
  }

  const left = parseLinearExpression(parts[0]);
  const right = parseLinearExpression(parts[1]);
  const normalized = subtract(left, right);
  const identity = nearlyEqual(normalized.x, 0) && nearlyEqual(normalized.constant, 0);
  const contradiction = nearlyEqual(normalized.x, 0) && !nearlyEqual(normalized.constant, 0);
  const solution = !nearlyEqual(normalized.x, 0)
    ? -normalized.constant / normalized.x
    : undefined;

  return {
    raw: normalizedRaw,
    left,
    right,
    normalized,
    ...(solution !== undefined ? { solution } : {}),
    identity,
    contradiction,
  };
}

export function areEquivalentEquations(a: ParsedEquation, b: ParsedEquation): boolean {
  if (a.identity || b.identity) return a.identity && b.identity;
  if (a.contradiction || b.contradiction) return a.contradiction && b.contradiction;
  return a.solution !== undefined && b.solution !== undefined && nearlyEqual(a.solution, b.solution);
}

export function solvedValue(equation: ParsedEquation): number | undefined {
  const leftSolved = nearlyEqual(equation.left.x, 1)
    && nearlyEqual(equation.left.constant, 0)
    && nearlyEqual(equation.right.x, 0);
  if (leftSolved) return equation.right.constant;

  const rightSolved = nearlyEqual(equation.right.x, 1)
    && nearlyEqual(equation.right.constant, 0)
    && nearlyEqual(equation.left.x, 0);
  if (rightSolved) return equation.left.constant;

  return undefined;
}
