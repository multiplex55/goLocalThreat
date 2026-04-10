import type { ThreatRowView } from './types';

export interface DetailPanelView {
  title: string;
  sections: Array<{ label: string; value: string }>;
  warnings: Array<{ text: string; muted: boolean }>;
}

export function buildDetailPanel(row: ThreatRowView | null): DetailPanelView {
  if (!row) {
    return {
      title: 'No pilot selected',
      sections: [{ label: 'Hint', value: 'Use arrow keys to select a pilot.' }],
      warnings: [],
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
    warnings: (row.warnings ?? []).map((warning) => ({
      text: warning.message,
      muted: warning.severity === 'info' || warning.userVisible === false,
    })),
  };
}
