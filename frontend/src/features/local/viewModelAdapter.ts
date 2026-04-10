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
  threatBand?: string;
  kills?: number;
  losses?: number;
  dangerPercent?: number;
  soloPercent?: number;
  avgGangSize?: number;
  lastKill?: string;
  lastLoss?: string;
  mainShip?: string;
  notes?: string;
  tags?: string[];
  lastSeen?: string;
  identity?: {
    characterId?: number;
    name?: string;
    corpId?: number;
    corpName?: string;
    corpTicker?: string;
    allianceId?: number;
    allianceName?: string;
    allianceTicker?: string;
  };
  freshness?: {
    dataAsOf?: string;
  };
  threat?: {
    threatScore?: number;
    threatBand?: string;
    recentKills?: number;
    recentLosses?: number;
    dangerPercent?: number;
    soloPercent?: number;
    avgGangSize?: number;
    lastKill?: string;
    lastLoss?: string;
    mainShip?: string;
    notes?: string;
  };
}

function hasValue(value?: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function toThreatBand(score: number, band?: string): ThreatRowView['threatBand'] {
  if (band === 'critical' || band === 'high' || band === 'medium' || band === 'low') return band;
  return score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

export function toThreatRowView(dto: unknown, index: number): ThreatRowView {
  const pilot = dto as PilotDTOShape;
  const score = Math.max(0, Math.min(100, Number(pilot.score ?? pilot.threatScore ?? pilot.threat?.threatScore ?? 0)));
  const corpName = pilot.corp ?? pilot.corporationName ?? pilot.identity?.corpName;
  const allianceName = pilot.alliance ?? pilot.allianceName ?? pilot.identity?.allianceName;
  const corpFallback = pilot.identity?.corpId ? `Corp #${pilot.identity.corpId} (partial)` : 'Unknown corp (partial)';
  const allianceFallback = pilot.identity?.allianceId ? `Alliance #${pilot.identity.allianceId} (partial)` : 'None (partial)';
  const orgMetadataPartial = !hasValue(corpName) || (!hasValue(allianceName) && Boolean(pilot.identity?.allianceId));

  return {
    id: pilot.id ?? String(pilot.characterId ?? pilot.identity?.characterId ?? index),
    pilotName: pilot.pilotName ?? pilot.name ?? pilot.identity?.name ?? `Unknown #${index + 1}`,
    corp: hasValue(corpName) ? corpName! : corpFallback,
    corpTicker: pilot.identity?.corpTicker,
    alliance: hasValue(allianceName) ? allianceName! : allianceFallback,
    allianceTicker: pilot.identity?.allianceTicker,
    orgMetadataPartial,
    mainShip: pilot.mainShip ?? pilot.ship ?? pilot.shipTypeName ?? pilot.threat?.mainShip ?? 'Unknown ship',
    score,
    threatBand: toThreatBand(score, pilot.threatBand ?? pilot.threat?.threatBand),
    kills: Number(pilot.kills ?? pilot.threat?.recentKills ?? 0),
    losses: Number(pilot.losses ?? pilot.threat?.recentLosses ?? 0),
    dangerPercent: Number(pilot.dangerPercent ?? pilot.threat?.dangerPercent ?? 0),
    soloPercent: Number(pilot.soloPercent ?? pilot.threat?.soloPercent ?? 0),
    avgGangSize: Number(pilot.avgGangSize ?? pilot.threat?.avgGangSize ?? 0),
    lastKill: pilot.lastKill ?? pilot.threat?.lastKill ?? 'Unknown',
    lastLoss: pilot.lastLoss ?? pilot.threat?.lastLoss ?? 'Unknown',
    tags: pilot.tags ?? [],
    notes: pilot.notes ?? pilot.threat?.notes ?? '',
    lastSeen: pilot.lastSeen ?? pilot.freshness?.dataAsOf ?? 'Unknown',
    status: 'ready',
  };
}

export function toLocalScreenViewModel(dto: AppService.AnalysisSessionDTO): LocalScreenViewModel {
  const warningsByPilotId = (dto.warnings ?? []).reduce<Record<string, AppService.ParseWarningDTO[]>>((acc, warning) => {
    if (!warning.characterId) return acc;
    const key = String(warning.characterId);
    acc[key] = acc[key] ?? [];
    acc[key].push(warning);
    return acc;
  }, {});
  const globalWarnings = (dto.warnings ?? []).filter((warning) => !warning.characterId);
  const severityCounts = globalWarnings.reduce<Record<'info' | 'warn' | 'error', number>>((acc, warning) => {
    const severity = warning.severity ?? 'info';
    acc[severity] += 1;
    return acc;
  }, { info: 0, warn: 0, error: 0 });
  const providerCounts = globalWarnings.reduce<Record<string, number>>((acc, warning) => {
    const provider = warning.provider ?? 'unknown';
    acc[provider] = (acc[provider] ?? 0) + 1;
    return acc;
  }, {});

  const rows = dto.pilots.map((p, index) =>
    toThreatRowView({
      id: String(p.identity.characterId),
      characterId: p.identity.characterId,
      pilotName: p.pilot,
      corp: p.corp,
      alliance: p.alliance,
      threatScore: p.threatScore,
      threatBand: p.threatBand,
      kills: p.kills,
      losses: p.losses,
      dangerPercent: p.dangerPercent,
      soloPercent: p.soloPercent,
      avgGangSize: p.avgGangSize,
      lastKill: p.lastKill,
      lastLoss: p.lastLoss,
      mainShip: p.mainShip,
      notes: p.notes,
      tags: [...(p.tags ?? []), ...(warningsByPilotId[String(p.identity.characterId)] ?? []).map((warning) => `${warning.code}: ${warning.message}`)],
      lastSeen: p.freshness.dataAsOf,
      identity: p.identity,
      freshness: p.freshness,
      threat: p.threat,
    }, index),
  ).map((row) => ({
    ...row,
    warnings: warningsByPilotId[row.id]?.map((warning) => ({
      provider: warning.provider,
      severity: warning.severity,
      userVisible: warning.userVisible,
      message: warning.message,
    })) ?? [],
  }));
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
      provider: globalWarnings.length ? 'degraded' : 'online',
      cache: 'warming',
      rate: 'ok',
      updatedAt: dto.updatedAt,
    },
    provisional: false,
    loading: false,
    diagnosticsSummary: {
      severityCounts,
      providerCounts,
    },
  };
}
