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

export interface GeometryPoint { label:string; x:number; y:number; }
export interface GeometrySegment { from:string; to:string; label?:string; }
export interface GeometryAngle { at:string; label?:string; }
export interface GeometryCircle { center:string; through?:string; radius?:number; label?:string; }
export type VisualizationSpec =
  | { type:"function"|"integral"; title?:string; expression:string; xMin?:number; xMax?:number; lower?:number; upper?:number; }
  | { type:"geometry"; title?:string; points:GeometryPoint[]; segments:GeometrySegment[]; angles:GeometryAngle[]; circles:GeometryCircle[]; };

export interface SearchSource {
  title: string;
  url: string;
}

export interface SolutionAnswer {
  answer: string;
  explanation: string;
  steps: string[];
  hint?: string;
  visualization?: VisualizationSpec;
  sources?: SearchSource[];
  webSearchQueries?: string[];
  googleSearchEntryPoint?: string;
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
