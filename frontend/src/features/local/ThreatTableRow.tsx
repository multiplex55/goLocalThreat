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
  return {
    id: row.id,
    selected,
    compact,
    score: buildScoreBadge(row.score),
    cells: [row.pilotName, row.corp, row.alliance, row.ship, row.lastSeen],
    tags: row.tags.map((tag) => buildTagPill(tag)),
  };
}
