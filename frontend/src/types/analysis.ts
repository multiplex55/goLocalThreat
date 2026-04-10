export interface ParseWarningView {
  code: string;
  message: string;
}

export interface ParseSummaryView {
  candidateCount: number;
  invalidLineCount: number;
  duplicateRemovalCount: number;
  warningCount: number;
  warnings: ParseWarningView[];
}

export interface AnalysisSessionView {
  sessionId: string;
  createdAt: string;
  pilotCount: number;
  warningCount: number;
  sourceTextLength: number;
  parseSummary: ParseSummaryView;
}
