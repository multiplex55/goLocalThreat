export interface TagPillView {
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'danger';
}

export function buildTagPill(label: string): TagPillView {
  const lower = label.toLowerCase();
  const tone: TagPillView['tone'] = lower.includes('hot') || lower.includes('suspect')
    ? 'danger'
    : lower.includes('watch') || lower.includes('spike')
      ? 'warning'
      : lower.includes('intel')
        ? 'info'
        : 'neutral';

  return { label, tone };
}
