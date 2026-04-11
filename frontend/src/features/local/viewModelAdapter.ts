import type * as AppService from '../../../wailsjs/go/app/AppService';
import { toAnalysisSessionView } from '../../lib/api/adapter';
import { renderParseSummary } from './PastePanel';
import { toThreatRowView as mapThreatRowView } from './threatRowMapper';
import type { LocalScreenViewModel, ThreatRowView } from './types';

export function toThreatRowView(dto: AppService.PilotThreatDTO, index: number): ThreatRowView {
  const sessionView = toAnalysisSessionView({
    sessionId: 'legacy-row-adapter',
    createdAt: '',
    updatedAt: '',
    source: {
      rawText: '',
      normalizedText: '',
      parsedCharacters: [],
      candidateNames: [],
      invalidLines: [],
      warnings: [],
      inputKind: 'local_member_list',
      confidence: 1,
      removedDuplicates: 0,
      suspiciousArtifacts: 0,
      parsedAt: '',
    },
    pilots: [dto],
    settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
    warnings: [],
    freshness: { source: 'composite', dataAsOf: '', isStale: false },
  });

  const pilot = sessionView.pilots[0];
  if (!pilot) {
    throw new Error(`Pilot mapping failed at index ${index}`);
  }
  return mapThreatRowView(pilot, 'ready');
}

export function toLocalScreenViewModel(dto: AppService.AnalysisSessionDTO): LocalScreenViewModel {
  const session = toAnalysisSessionView(dto);
  const rows = session.pilots.map((pilot) => mapThreatRowView(pilot, 'ready'));
  const selectedRowId = rows[0]?.id ?? null;

  return {
    actions: ['paste', 'import', 'analyze', 'refresh', 'settings'],
    parseSummaryText: renderParseSummary(session.parseSummary),
    parseWarnings: session.parseSummary.warnings.map((w) => `${w.code}: ${w.message}`),
    unresolvedWarnings: session.parseSummary.warningCount,
    rows,
    selectedRowId,
    detail: rows.find((row) => row.id === selectedRowId) ?? null,
    settings: {
      density: 'comfortable',
      visibleColumns: {
        pilotName: true,
        corp: true,
        alliance: true,
        score: true,
        threatBand: true,
        kills: true,
        losses: true,
        dangerPercent: true,
        soloPercent: true,
        avgGangSize: true,
        lastKill: true,
        lastLoss: true,
        mainShip: true,
        tags: true,
        notes: true,
      },
    },
    status: {
      provider: session.diagnostics.globalWarnings.length ? 'degraded' : 'online',
      cache: 'warming',
      rate: 'ok',
      updatedAt: dto.updatedAt,
      diagnostics: {
        partialKillmailTimestamps: session.diagnostics.warningCodeCounts.DETAIL_TIME_INVALID ?? 0,
      },
    },
    provisional: false,
    loading: false,
    diagnosticsSummary: {
      severityCounts: session.diagnostics.severityCounts,
      providerCounts: session.diagnostics.providerCounts,
    },
  };
}

export { mapThreatRowView };
