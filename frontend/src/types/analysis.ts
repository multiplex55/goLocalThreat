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

export type ThreatBand = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface PilotIdentityView {
  characterId: number;
  characterName: string;
  corporationName: string | null;
  corporationTicker: string | null;
  allianceName: string | null;
  allianceTicker: string | null;
  portraitUrl: string | null;
  metadata: {
    corporationId: number | null;
    allianceId: number | null;
  };
}

export interface PilotThreatView {
  id: string;
  identity: PilotIdentityView;
  score: number;
  band: ThreatBand;
  confidence: number;
  reasons: string[];
  tags: string[];
  notes: string | null;
  kills: number | null;
  losses: number | null;
  dangerPercent: number | null;
  soloPercent: number | null;
  avgGangSize: number | null;
  mainShip: string | null;
  lastKill: string | null;
  lastLoss: string | null;
  freshness: {
    source: string | null;
    dataAsOf: string | null;
    isStale: boolean | null;
  };
  warnings: ParseWarningView[];
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
