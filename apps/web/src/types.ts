export type VerificationStatus = "verified" | "failed" | "pending" | "not_applicable";
export type ConsensusStatus = "single" | "agreement" | "conflict" | "not_run";

export interface Analysis {
  topic: string;
  subtopic: string;
  exam: string;
  difficulty: string;
  needsVision: boolean;
  needsVerification: boolean;
  confidence: number;
}

export interface SolutionAnswer {
  answer: string;
  explanation: string;
  steps: string[];
  hint?: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  confidence: number;
}

export interface SolveResponse {
  status: string;
  question: string;
  analysis: Analysis;
  answer: SolutionAnswer | null;
  finalAnswer: SolutionAnswer | null;
  consensusStatus: ConsensusStatus;
  providersUsed: string[];
  agreementScore: number;
  finalAnswerSource: string;
  message: string;
  next: string;
}
