import type * as AppService from '../../../wailsjs/go/app/AppService';
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
  identity?: {
    characterId?: number;
    name?: string;
    corpId?: number;
    allianceId?: number;
  };
  freshness?: {
    dataAsOf?: string;
  };
  threat?: {
    threatScore?: number;
  };
}

export function toThreatRowView(dto: unknown, index: number): ThreatRowView {
  const pilot = dto as PilotDTOShape;
  const score = Math.max(0, Math.min(100, Number(pilot.score ?? pilot.threatScore ?? 0)));
  const level = score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return {
    id: pilot.id ?? String(pilot.characterId ?? index),
    pilotName: pilot.pilotName ?? pilot.name ?? pilot.identity?.name ?? `Unknown #${index + 1}`,
    corp: pilot.corp ?? pilot.corporationName ?? (pilot.identity?.corpId ? `Corp #${pilot.identity.corpId}` : 'Unknown corp'),
    alliance: pilot.alliance ?? pilot.allianceName ?? (pilot.identity?.allianceId ? `Alliance #${pilot.identity.allianceId}` : 'None'),
    ship: pilot.ship ?? pilot.shipTypeName ?? 'Unknown ship',
    score,
    level,
    tags: pilot.tags ?? [],
    lastSeen: pilot.lastSeen ?? pilot.freshness?.dataAsOf ?? 'Unknown',
    status: 'ready',
  };
}

export function toLocalScreenViewModel(dto: AppService.AnalysisSessionDTO): LocalScreenViewModel {
  const rows = dto.pilots.map((p, index) =>
    toThreatRowView({
      id: String(p.identity.characterId),
      characterId: p.identity.characterId,
      pilotName: p.identity.name,
      threatScore: p.threat.threatScore,
      corp: p.identity.corpId ? `Corp #${p.identity.corpId}` : undefined,
      alliance: p.identity.allianceId ? `Alliance #${p.identity.allianceId}` : undefined,
      lastSeen: p.freshness.dataAsOf,
      identity: p.identity,
      freshness: p.freshness,
      threat: p.threat,
    }, index),
  );
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
