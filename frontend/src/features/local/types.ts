export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatRowView {
  id: string;
  pilotName: string;
  corp: string;
  corpTicker?: string;
  alliance: string;
  allianceTicker?: string;
  orgMetadataPartial?: boolean;
  mainShip: string;
  score: number;
  threatBand: ThreatLevel;
  kills: number;
  losses: number;
  dangerPercent: number;
  soloPercent: number;
  avgGangSize: number;
  lastKill: string;
  lastLoss: string;
  tags: string[];
  notes: string;
  lastSeen: string;
  status: 'ready' | 'provisional' | 'loading';
  warnings?: Array<{
    provider?: string;
    severity?: 'info' | 'warn' | 'error';
    userVisible?: boolean;
    message: string;
  }>;
}

export interface LocalSettingsView {
  density: 'comfortable' | 'compact';
  visibleColumns: Record<string, boolean>;
}

export interface LocalStatusView {
  provider: 'online' | 'degraded' | 'offline';
  cache: 'hot' | 'warming' | 'cold';
  rate: 'ok' | 'limited' | 'blocked';
  updatedAt: string;
}

export interface LocalScreenViewModel {
  actions: Array<'paste' | 'import' | 'analyze' | 'refresh' | 'settings'>;
  parseSummaryText: string;
  parseWarnings: string[];
  unresolvedWarnings: number;
  rows: ThreatRowView[];
  selectedRowId: string | null;
  detail: ThreatRowView | null;
  settings: LocalSettingsView;
  status: LocalStatusView;
  provisional: boolean;
  loading: boolean;
  diagnosticsSummary: {
    severityCounts: Record<'info' | 'warn' | 'error', number>;
    providerCounts: Record<string, number>;
  };
}

export const THREAT_TABLE_COLUMNS = [
  'pilotName',
  'corp',
  'alliance',
  'score',
  'threatBand',
  'kills',
  'losses',
  'dangerPercent',
  'soloPercent',
  'avgGangSize',
  'lastKill',
  'lastLoss',
  'mainShip',
  'tags',
  'notes',
] as const;

export type ThreatTableColumn = typeof THREAT_TABLE_COLUMNS[number];

export interface ThreatTableOptions {
  sortBy?: ThreatTableColumn;
  sortDirection?: 'asc' | 'desc';
  filterText?: string;
  visibleColumns?: Partial<Record<ThreatTableColumn, boolean>>;
}
