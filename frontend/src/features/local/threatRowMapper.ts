import type { PilotThreatView } from '../../types/analysis';
import type { ThreatRowView } from './types';

function toThreatBand(score: number, band: PilotThreatView['band']): ThreatRowView['threatBand'] {
  if (band === 'critical' || band === 'high' || band === 'medium' || band === 'low') return band;
  return score >= 90 ? 'critical' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

export function toThreatRowView(pilot: PilotThreatView, status: ThreatRowView['status']): ThreatRowView {
  const reasonBreakdown = pilot.reasons.map((reason, reasonIndex) => ({
    label: reason,
    score: Math.max(5, 30 - (reasonIndex * 5)),
  }));
  const hasPartialTimestampWarning = pilot.warnings.some((warning) => warning.normalizedLabel === 'Partial timestamps');
  const hasRecentActivityIncomplete = pilot.warnings.some((warning) => warning.normalizedLabel === 'Recent activity incomplete');
  const dataCompletenessMarkers = [
    ...(hasPartialTimestampWarning ? ['Partial timestamps'] : []),
    ...(hasRecentActivityIncomplete ? ['Recent activity incomplete'] : []),
    ...(!pilot.reasons.length ? ['Derived from summary only'] : []),
  ];

  return {
    id: pilot.id,
    pilotName: pilot.identity.characterName,
    corp: pilot.identity.corporationName ?? '',
    corpTicker: pilot.identity.corporationTicker ?? undefined,
    alliance: pilot.identity.allianceName ?? '',
    allianceTicker: pilot.identity.allianceTicker ?? undefined,
    orgMetadataPartial: Boolean(pilot.identity.metadata.corporationId && !pilot.identity.corporationName),
    mainShip: pilot.mainShip,
    mainRecentShip: pilot.mainShip,
    score: pilot.score,
    threatBand: toThreatBand(pilot.score, pilot.band),
    confidence: pilot.confidence,
    reasonBreakdown,
    kills: pilot.kills,
    losses: pilot.losses,
    dangerPercent: pilot.dangerPercent,
    soloPercent: pilot.soloPercent,
    avgGangSize: pilot.avgGangSize,
    soloGangTendency: pilot.soloPercent !== null && pilot.soloPercent >= 60
      ? 'High Solo'
      : pilot.avgGangSize !== null && pilot.avgGangSize >= 4
        ? 'High Gang'
        : 'Balanced',
    lastKill: pilot.lastKill,
    lastLoss: pilot.lastLoss,
    lastActivitySummary: `Last kill: ${pilot.lastKill ?? '—'} · Last loss: ${pilot.lastLoss ?? '—'}`,
    freshness: pilot.freshness.dataAsOf,
    tags: pilot.tags,
    notes: pilot.notes ?? '',
    lastSeen: pilot.freshness.dataAsOf,
    status,
    dataCompletenessMarkers,
    warnings: pilot.warnings.map((warning) => ({
      code: warning.code,
      rawCode: warning.rawCode,
      provider: warning.provider,
      category: warning.category,
      normalizedLabel: warning.normalizedLabel,
      displayTier: warning.displayTier,
      severity: warning.severity,
      userVisible: warning.userVisible,
      message: warning.normalizedLabel ?? warning.message,
    })),
  };
}
