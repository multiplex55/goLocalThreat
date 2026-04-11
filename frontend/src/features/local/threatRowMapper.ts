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
  const hasSummaryOnlyWarning = pilot.warnings.some((warning) => warning.normalizedLabel === 'Derived from summary only');
  const derivedFromSummaryOnly = hasSummaryOnlyWarning || !pilot.reasons.length;
  const fallbackSource = pilot.freshness.source && pilot.freshness.source !== 'zkill' ? pilot.freshness.source : null;

  const mainShipState: NonNullable<ThreatRowView['provenance']>['mainShip'] = pilot.mainShip
    ? (fallbackSource ? 'fallback' : 'known')
    : (derivedFromSummaryOnly ? 'unknown' : 'partial');
  const canDeriveDangerSolo = !derivedFromSummaryOnly;
  const dangerPercent = canDeriveDangerSolo ? pilot.dangerPercent : null;
  const soloPercent = canDeriveDangerSolo ? pilot.soloPercent : null;
  const dangerPercentState: NonNullable<ThreatRowView['provenance']>['dangerPercent'] = dangerPercent !== null
    ? (fallbackSource ? 'fallback' : 'known')
    : (derivedFromSummaryOnly ? 'unknown' : 'partial');
  const soloPercentState: NonNullable<ThreatRowView['provenance']>['soloPercent'] = soloPercent !== null
    ? (fallbackSource ? 'fallback' : 'known')
    : (derivedFromSummaryOnly ? 'unknown' : 'partial');

  const activityCandidates = [pilot.lastKill, pilot.lastLoss].filter((value): value is string => Boolean(value));
  const lastSeen = activityCandidates.length ? activityCandidates.sort().at(-1) ?? null : null;
  const lastSeenState: NonNullable<ThreatRowView['provenance']>['lastSeen'] = lastSeen
    ? (hasPartialTimestampWarning || hasRecentActivityIncomplete ? 'partial' : (fallbackSource ? 'fallback' : 'known'))
    : (hasPartialTimestampWarning || hasRecentActivityIncomplete || derivedFromSummaryOnly ? 'partial' : 'unknown');

  const dataCompletenessMarkers = [
    ...(pilot.detailFetched ? ['Detail-enriched'] : ['Summary-only']),
    ...(hasPartialTimestampWarning ? ['Partial timestamps'] : []),
    ...(hasRecentActivityIncomplete ? ['Recent activity incomplete'] : []),
    ...(derivedFromSummaryOnly ? ['Derived from summary only'] : []),
    ...(fallbackSource ? [`Fallback source: ${fallbackSource}`] : []),
  ];

  return {
    id: pilot.id,
    pilotName: pilot.identity.characterName,
    corp: pilot.identity.corporationName ?? '',
    corpTicker: pilot.identity.corporationTicker ?? undefined,
    alliance: pilot.identity.allianceName ?? '',
    allianceTicker: pilot.identity.allianceTicker ?? undefined,
    orgMetadataPartial: Boolean(pilot.identity.metadata.corporationId && !pilot.identity.corporationName),
    mainShip: mainShipState === 'unknown' ? null : pilot.mainShip,
    mainRecentShip: pilot.mainShip,
    score: pilot.score,
    threatBand: toThreatBand(pilot.score, pilot.band),
    confidence: pilot.confidence,
    reasonBreakdown,
    kills: pilot.kills,
    losses: pilot.losses,
    dangerPercent,
    soloPercent,
    avgGangSize: pilot.avgGangSize,
    soloGangTendency: soloPercent !== null && soloPercent >= 60
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
    lastSeen,
    status,
    dataCompletenessMarkers,
    detailRequested: pilot.detailRequested ?? false,
    detailFetched: pilot.detailFetched ?? false,
    detailPolicyReason: pilot.detailPolicyReason ?? null,
    detailPolicySummary: pilot.detailPolicySummary ?? null,
    provenance: {
      mainShip: mainShipState,
      dangerPercent: dangerPercentState,
      soloPercent: soloPercentState,
      lastSeen: lastSeenState,
      fallbackSource,
    },
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
