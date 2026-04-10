export interface ParseWarningView {
  provider?: string;
  code: string;
  message: string;
  characterId?: number;
  characterName?: string;
  severity?: 'info' | 'warn' | 'error';
  userVisible?: boolean;
  category?: string;
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
  diagnostics: {
    candidateNamesCount: number;
    resolvedCount: number;
    unresolvedNames: string[];
    invalidLines: number;
    warnings: ParseWarningView[];
    globalWarnings: ParseWarningView[];
    warningsByPilotId: Record<string, ParseWarningView[]>;
    severityCounts: Record<'info' | 'warn' | 'error', number>;
    providerCounts: Record<string, number>;
  };
  parseSummary: ParseSummaryView;
  pilots: PilotThreatView[];
}
