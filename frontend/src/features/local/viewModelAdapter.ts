import type * as AppService from '@app-service';
import { renderParseSummary } from './PastePanel';
import type { LocalScreenViewModel, ThreatRowView } from './types';

interface PilotDTOShape {
  id?: string;
  characterId?: number;
  name?: string;
  pilotName?: string;
  corp?: string;
  corporationName?: string;
  alliance?: string;
  allianceName?: string;
  ship?: string;
  shipTypeName?: string;
  score?: number;
  threatScore?: number;
  tags?: string[];
  lastSeen?: string;
}

export function toThreatRowView(dto: unknown, index: number): ThreatRowView {
  const pilot = dto as PilotDTOShape;
  const score = Math.max(0, Math.min(100, Number(pilot.score ?? pilot.threatScore ?? 0)));
  const level = score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return {
    id: pilot.id ?? String(pilot.characterId ?? index),
    pilotName: pilot.pilotName ?? pilot.name ?? `Unknown #${index + 1}`,
    corp: pilot.corp ?? pilot.corporationName ?? 'Unknown corp',
    alliance: pilot.alliance ?? pilot.allianceName ?? 'None',
    ship: pilot.ship ?? pilot.shipTypeName ?? 'Unknown ship',
    score,
    level,
    tags: pilot.tags ?? [],
    lastSeen: pilot.lastSeen ?? 'Unknown',
    status: 'ready',
  };
}

export function toLocalScreenViewModel(dto: AppService.AnalysisSessionDTO): LocalScreenViewModel {
  const rows = dto.pilots.map((p, index) => toThreatRowView(p, index));
  const selectedRowId = rows[0]?.id ?? null;

  return {
    actions: ['paste', 'import', 'analyze', 'refresh', 'settings'],
    parseSummaryText: renderParseSummary({
      candidateCount: dto.source.candidateNames.length,
      invalidLineCount: dto.source.invalidLines.length,
      duplicateRemovalCount: dto.source.removedDuplicates,
      warningCount: dto.source.warnings.length,
      warnings: dto.source.warnings.map((w) => ({ code: w.code, message: w.message })),
    }),
    parseWarnings: dto.source.warnings.map((w) => `${w.code}: ${w.message}`),
    unresolvedWarnings: dto.source.warnings.length,
    rows,
    selectedRowId,
    detail: rows.find((row) => row.id === selectedRowId) ?? null,
    settings: {
      density: 'comfortable',
      visibleColumns: {
        pilotName: true,
        corp: true,
        alliance: true,
        ship: true,
        score: true,
        tags: true,
        lastSeen: true,
      },
    },
    status: {
      provider: dto.warnings.length ? 'degraded' : 'online',
      cache: 'warming',
      rate: 'ok',
      updatedAt: dto.updatedAt,
    },
    provisional: false,
    loading: false,
  };
}
