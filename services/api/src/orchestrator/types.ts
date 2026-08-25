export type InputType = "text" | "image" | "voice";
export type StudentIntent = "solve" | "hint" | "teach" | "generate_test" | "explain_audio";
export type ExamType = "LGS" | "TYT" | "AYT" | "KPSS" | "ALES" | "NONE";
export type Difficulty = "easy" | "medium" | "hard" | "unknown";
export type VerificationStatus = "verified" | "failed" | "pending" | "not_applicable";
export type ConsensusStatus = "single" | "agreement" | "conflict" | "not_run";

export interface StudentQuestion {
  question: string;
  inputType: InputType;
  intent: StudentIntent;
  grade?: number;
  exam?: ExamType;
  imageDataUrl?: string;
}

export interface QuestionAnalysis {
  topic: string;
  subtopic: string;
  exam: ExamType;
  difficulty: Difficulty;
  needsVision: boolean;
  needsVerification: boolean;
  confidence: number;
}

export interface AIAnswer {
  answer: string;
  explanation: string;
  steps: string[];
  hint?: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  confidence: number;
}

export interface ProviderExecutor {
  providerId: string;
  execute(input: StudentQuestion, analysis: QuestionAnalysis): Promise<AIAnswer>;
}

export interface ProviderAttempt {
  providerId: string;
  answer?: AIAnswer;
  error?: string;
}

export interface OrchestratorResult {
  analysis: QuestionAnalysis;
  answer: AIAnswer | null;
  consensusStatus: ConsensusStatus;
  providersUsed: string[];
  agreementScore: number;
  finalAnswerSource: string;
  message: string;
}
