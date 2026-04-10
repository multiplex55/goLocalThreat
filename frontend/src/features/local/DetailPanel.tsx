import type { ThreatRowView } from './types';

export interface DetailPanelView {
  title: string;
  sections: Array<{ label: string; value: string }>;
}

export function buildDetailPanel(row: ThreatRowView | null): DetailPanelView {
  if (!row) {
    return {
      title: 'No pilot selected',
      sections: [{ label: 'Hint', value: 'Use arrow keys to select a pilot.' }],
    };
  }

  return {
    title: row.pilotName,
    sections: [
      { label: 'Corporation', value: row.corp },
      { label: 'Alliance', value: row.alliance },
      { label: 'Ship', value: row.ship },
      { label: 'Last Seen', value: row.lastSeen },
      { label: 'Threat Score', value: `${row.score}` },
    ],
  };
}
