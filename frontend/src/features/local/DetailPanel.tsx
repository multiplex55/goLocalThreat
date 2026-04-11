import type { ThreatRowView } from './types';

export interface DetailPanelView {
  title: string;
  sections: Array<{ label: string; value: string }>;
  warnings: Array<{ text: string; muted: boolean }>;
  semanticBadges: Array<{ label: string; tone: 'neutral' | 'info' | 'warning' | 'danger' }>;
}

const SEMANTIC_TAGS: Record<string, DetailPanelView['semanticBadges'][number]> = {
  fc: { label: 'FC', tone: 'danger' },
  logi: { label: 'Logi', tone: 'info' },
  hunter: { label: 'Hunter', tone: 'warning' },
  cyno: { label: 'Cyno', tone: 'warning' },
  cloaky: { label: 'Cloaky', tone: 'warning' },
  gank: { label: 'Gank', tone: 'danger' },
  'high solo': { label: 'High Solo', tone: 'danger' },
  'high gang': { label: 'High Gang', tone: 'warning' },
  'recently active': { label: 'Recently Active', tone: 'info' },
  'stale data': { label: 'Stale Data', tone: 'warning' },
  'partial zkill': { label: 'Partial zKill', tone: 'warning' },
  pinned: { label: 'Pinned', tone: 'info' },
};

function toSemanticBadges(row: ThreatRowView): DetailPanelView['semanticBadges'] {
  const sourceTags = [...row.tags, row.soloGangTendency, row.freshness, ...row.dataCompletenessMarkers].filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  const mapped = sourceTags
    .map((tag) => SEMANTIC_TAGS[tag.toLowerCase()])
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  return mapped.filter((badge, index) => mapped.findIndex((entry) => entry.label === badge.label) === index);
}

export function buildDetailPanel(row: ThreatRowView | null): DetailPanelView {
  if (!row) {
    return {
      title: 'No pilot selected',
      sections: [{ label: 'Hint', value: 'Use arrow keys to select a pilot.' }],
      warnings: [],
      semanticBadges: [],
    };
  }

  const corpDisplay = row.corpTicker ? `${row.corp} [${row.corpTicker}]` : (row.corp || '—');
  const allianceDisplay = row.allianceTicker ? `${row.alliance} [${row.allianceTicker}]` : (row.alliance || '—');
  const metadataState = row.orgMetadataPartial ? 'Partial (ID fallback)' : 'Fresh';
  const reasons = row.reasonBreakdown.length
    ? row.reasonBreakdown.map((entry) => `${entry.label} (+${entry.score})`).join(', ')
    : 'No scored reasons available';
  const warnings = (row.warnings ?? []).map((warning) => ({
    text: warning.message,
    muted: warning.severity === 'info' || warning.userVisible === false,
  }));

  return {
    title: row.pilotName,
    sections: [
      { label: 'Pilot', value: row.pilotName },
      { label: 'Corporation', value: corpDisplay },
      { label: 'Alliance', value: allianceDisplay },
      { label: 'Threat', value: `${row.threatBand.toUpperCase()} · ${row.score}` },
      { label: 'Confidence', value: `${Math.round(row.confidence * 100)}%` },
      { label: 'Kills/Losses', value: `${row.kills ?? '—'}/${row.losses ?? '—'}` },
      { label: 'Solo/Gang tendency', value: row.soloGangTendency },
      { label: 'Danger %', value: row.dangerPercent === null ? '—' : `${row.dangerPercent}%` },
      { label: 'Main recent ship', value: row.mainRecentShip ?? '—' },
      { label: 'Last activity', value: row.lastActivitySummary },
      { label: 'Freshness', value: row.freshness ?? '—' },
      { label: 'Why this score', value: reasons },
      { label: 'Data completeness', value: row.dataCompletenessMarkers.join('; ') || metadataState },
    ],
    warnings,
    semanticBadges: toSemanticBadges(row),
  };
}
