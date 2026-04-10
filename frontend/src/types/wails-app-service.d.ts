declare module '@app-service' {
  export interface ParseWarningDTO {
    provider: string;
    code: string;
    message: string;
  }

  export interface ParseSourceDTO {
    rawText: string;
    normalizedText: string;
    parsedCharacters: unknown[];
    candidateNames: string[];
    invalidLines: Array<{ line: string; reasonCode: string }>;
    warnings: ParseWarningDTO[];
    inputKind: string;
    confidence: number;
    removedDuplicates: number;
    suspiciousArtifacts: number;
    parsedAt: string;
  }

  export interface AnalysisSessionDTO {
    sessionId: string;
    createdAt: string;
    updatedAt: string;
    source: ParseSourceDTO;
    pilots: unknown[];
    warnings: ParseWarningDTO[];
  }

  export function AnalyzePastedText(text: string): Promise<AnalysisSessionDTO>;
  export function LoadRecentSessions(): Promise<AnalysisSessionDTO[]>;
  export function LoadSettings(): Promise<unknown>;
  export function SaveSettings<T>(settings: T): Promise<T>;
}
