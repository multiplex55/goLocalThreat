import { buildScoreBadge } from './ScoreBadge';
import { buildTagPill } from './TagPill';
import type { ThreatRowView } from './types';

export interface ThreatTableRowView {
  id: string;
  selected: boolean;
  compact: boolean;
  score: ReturnType<typeof buildScoreBadge>;
  cells: string[];
  tags: ReturnType<typeof buildTagPill>[];
}

export function buildThreatTableRow(row: ThreatRowView, selected: boolean, compact: boolean): ThreatTableRowView {
  const corpDisplay = row.corpTicker ? `${row.corp} [${row.corpTicker}]` : (row.corp || '—');
  const allianceDisplay = row.allianceTicker ? `${row.alliance} [${row.allianceTicker}]` : (row.alliance || '—');
  return {
    id: row.id,
    selected,
    compact,
    score: buildScoreBadge(row.score),
    cells: [row.pilotName, corpDisplay, allianceDisplay, row.mainShip ?? '—', row.lastSeen ?? '—'],
    tags: row.tags.map((tag) => buildTagPill(tag)),
  };
}
