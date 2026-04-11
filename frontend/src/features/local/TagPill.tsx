export interface TagPillView {
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'danger';
}

const CATEGORY_TONES: Record<string, TagPillView['tone']> = {
  Active: 'danger',
  Solo: 'warning',
  Gang: 'warning',
  FC: 'danger',
  Cyno: 'danger',
  Cloaky: 'warning',
  Partial: 'info',
  'Summary-only': 'neutral',
  'Detail-enriched': 'info',
};

function looksLikeLongProse(input: string): boolean {
  if (input.length > 28) return true;
  if (/[.:;!?]/.test(input)) return true;
  return input.trim().split(/\s+/).length > 3;
}

export function normalizeTagLabel(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || looksLikeLongProse(trimmed)) return null;
  const lower = trimmed.toLowerCase();

  if (lower.includes('summary')) return 'Summary-only';
  if (lower.includes('detail-enriched') || lower.includes('detail enriched')) return 'Detail-enriched';
  if (lower.includes('partial') || lower.includes('fallback') || lower.includes('uncertain') || lower.includes('timestamp') || lower.includes('stale')) return 'Partial';
  if (lower.includes('cloak')) return 'Cloaky';
  if (lower.includes('cyno')) return 'Cyno';
  if (lower === 'fc' || lower.includes('fleet command')) return 'FC';
  if (lower.includes('solo')) return 'Solo';
  if (lower.includes('gang')) return 'Gang';
  if (lower.includes('active') || lower.includes('hunter') || lower.includes('hot') || lower.includes('watch')) return 'Active';

  return null;
}

export function normalizeTagsForGrid(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => normalizeTagLabel(tag))
    .filter((tag): tag is string => Boolean(tag));

  return normalized.filter((tag, index) => normalized.indexOf(tag) === index);
}

export function buildTagPill(label: string): TagPillView {
  const tone = CATEGORY_TONES[label] ?? 'neutral';

  return { label, tone };
}
