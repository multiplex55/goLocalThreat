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

export async function AnalyzePastedText(_text: string): Promise<AnalysisSessionDTO> {
  throw new Error('AnalyzePastedText is unavailable in unit tests');
}

export async function LoadRecentSessions(): Promise<AnalysisSessionDTO[]> {
  return [];
}

export async function LoadSettings(): Promise<unknown> {
  return {};
}

export async function SaveSettings<T>(settings: T): Promise<T> {
  return settings;
}
