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

export interface PilotThreatView {
  id: string;
  name: string;
  corporation: string;
  alliance: string;
  score: number;
  band: string;
  reasons: string[];
  confidence: number;
}

export interface AnalysisSessionView {
  sessionId: string;
  createdAt: string;
  pilotCount: number;
  warningCount: number;
  sourceTextLength: number;
  parseSummary: ParseSummaryView;
  pilots: PilotThreatView[];
}
