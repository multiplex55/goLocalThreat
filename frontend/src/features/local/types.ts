export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatRowView {
  id: string;
  pilotName: string;
  corp: string;
  alliance: string;
  ship: string;
  score: number;
  level: ThreatLevel;
  tags: string[];
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

export interface ThreatTableOptions {
  sortBy?: keyof Pick<ThreatRowView, 'pilotName' | 'score' | 'corp' | 'alliance' | 'ship' | 'lastSeen'>;
  sortDirection?: 'asc' | 'desc';
  filterText?: string;
}
