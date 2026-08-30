import type { MistakeType } from '../student/student-model';

export type StepStatus = 'valid' | 'invalid' | 'parse_error' | 'unverified';

export type StepOperation =
  | 'same_equation'
  | 'add_both_sides'
  | 'subtract_both_sides'
  | 'multiply_both_sides'
  | 'divide_both_sides'
  | 'distribute_simplify'
  | 'equivalent_transform'
  | 'invalid_transform'
  | 'unverified';

export interface StepTransition {
  stepNumber: number;
  from: string;
  to: string;
  status: StepStatus;
  operation: StepOperation;
  reason: string;
  hint: string;
  mistake?: MistakeType;
}

export interface StepError {
  stepNumber: number;
  previousLine: string;
  currentLine: string;
  mistake: MistakeType;
  reason: string;
  hint: string;
}

export interface StepAnalysisResult {
  question: string;
  validSoFar: boolean;
  completed: boolean;
  finalSolution?: number;
  firstError?: StepError;
  transitions: StepTransition[];
  summary: string;
}
