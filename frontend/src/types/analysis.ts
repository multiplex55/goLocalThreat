export interface ParseWarningView {
  provider?: string;
  code: string;
  rawCode?: string;
  message: string;
  normalizedLabel?: string;
  characterId?: number;
  characterName?: string;
  severity: 'info' | 'warn' | 'error';
  userVisible: boolean;
  category: string;
  displayTier?: 'status_strip' | 'detail_panel' | 'row_hint' | 'debug_only';
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
  kills: number | null | undefined;
  losses: number | null | undefined;
  dangerPercent: number | null | undefined;
  soloPercent: number | null | undefined;
  avgGangSize: number | null | undefined;
  mainShip: string | null | undefined;
  lastKill: string | null | undefined;
  lastLoss: string | null | undefined;
  freshness: {
    source: string | null;
    dataAsOf: string | null;
    isStale: boolean | null;
  };
  detailRequested?: boolean;
  detailFetched?: boolean;
  detailPolicyReason?: string | null;
  detailPolicySummary?: string | null;
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
    warningCodeCounts: Record<string, number>;
    severityCounts: Record<'info' | 'warn' | 'error', number>;
    providerCounts: Record<string, number>;
    warningDisplay?: {
      global: Array<{ label: string; count: number }>;
      rowHints: Record<string, { count: number; hasImpact: boolean }>;
      byPilot: Record<string, Array<{ label: string; count: number; impactsRecency: boolean; impactsTimestamps: boolean }>>;
    };
    detailCoverage?: {
      detailRequested: number;
      detailFetched: number;
      policySummary: string;
    };
  };
  parseSummary: ParseSummaryView;
  pilots: PilotThreatView[];
}
