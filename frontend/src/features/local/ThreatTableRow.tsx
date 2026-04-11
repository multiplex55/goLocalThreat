import { buildScoreBadge } from './ScoreBadge';
import { buildTagPill } from './TagPill';
import type { ThreatLevel, ThreatRowView } from './types';

const PLACEHOLDER = '—';
const MAX_VISIBLE_TAGS = 3;
const MAX_TEXT_CELL = 28;

export interface ThreatTableRowView {
  id: string;
  selected: boolean;
  compact: boolean;
  rowClassName: string;
  warningIcon: '⚠️' | null;
  warningIndicator: 'active' | 'muted' | 'none';
  warningBadgeText: '⚠' | '•' | null;
  threatBandClassName: string;
  score: ReturnType<typeof buildScoreBadge> & { badgeText: string };
  identity: {
    avatarLabel: string;
    name: string;
    metadata: string;
    dimmed: boolean;
    metadataClassName: string;
  };
  scoreCell: {
    align: 'right';
    text: string;
  };
  numericCells: {
    kills: string;
    losses: string;
    dangerPercent: string;
    soloPercent: string;
    avgGangSize: string;
  };
  tagCell: {
    visible: ReturnType<typeof buildTagPill>[];
    overflowCount: number;
    overflowTooltip: string | null;
  };
  cells: string[];
  tags: ReturnType<typeof buildTagPill>[];
  virtualizationKey: string;
}

function hasWarnings(row: ThreatRowView): boolean {
  return (row.warnings ?? []).some((warning) => warning.displayTier === 'row_hint');
}

function hasMutedWarnings(row: ThreatRowView): boolean {
  return (row.warnings ?? []).some((warning) => warning.displayTier !== 'row_hint');
}

function formatPlainNumber(value: number | null): string {
  if (value == null) return PLACEHOLDER;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number | null): string {
  if (value == null) return PLACEHOLDER;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

function formatThreatBand(level: ThreatLevel): 'LOW' | 'MED' | 'HIGH' {
  if (level === 'low') return 'LOW';
  if (level === 'medium') return 'MED';
  return 'HIGH';
}

function threatBandClassName(level: ThreatLevel): string {
  return `threat-band--${level}`;
}

function dimmedText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : PLACEHOLDER;
}

function truncateCellText(value: string): string {
  if (value === PLACEHOLDER || value.length <= MAX_TEXT_CELL) return value;
  return `${value.slice(0, MAX_TEXT_CELL - 1)}…`;
}

function isZeroTimestamp(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return trimmed === '0001-01-01T00:00:00Z' || trimmed.startsWith('0001-01-01');
}

function dimmedTimestamp(value: string | null | undefined): string {
  if (!value || isZeroTimestamp(value)) return PLACEHOLDER;
  return dimmedText(value);
}

export function formatKillLossCompact(kills: number | null, losses: number | null): string {
  if (kills == null && losses == null) return PLACEHOLDER;
  return `${formatPlainNumber(kills)}/${formatPlainNumber(losses)}`;
}

export function formatLastActivity(lastKill: string | null, lastLoss: string | null): string {
  const normalizedKill = dimmedTimestamp(lastKill);
  const normalizedLoss = dimmedTimestamp(lastLoss);
  if (normalizedKill === PLACEHOLDER && normalizedLoss === PLACEHOLDER) return PLACEHOLDER;
  if (normalizedKill === PLACEHOLDER) return normalizedLoss;
  if (normalizedLoss === PLACEHOLDER) return normalizedKill;
  return Date.parse(normalizedKill) >= Date.parse(normalizedLoss) ? normalizedKill : normalizedLoss;
}

export function buildThreatTableRow(row: ThreatRowView, selected: boolean, compact: boolean): ThreatTableRowView {
  const name = dimmedText(row.pilotName);
  const corpTicker = row.corpTicker?.trim() ? `[${row.corpTicker}]` : '';
  const allianceTicker = row.allianceTicker?.trim() ? `[${row.allianceTicker}]` : '';
  const corp = dimmedText(row.corp);
  const alliance = dimmedText(row.alliance);
  const identityMetadata = `${corp} ${corpTicker}`.trim() + ' · ' + `${alliance} ${allianceTicker}`.trim();
  const metadataClassName = corp === PLACEHOLDER || alliance === PLACEHOLDER ? 'threat-cell-meta-muted' : '';

  const tags = row.tags.map((tag) => buildTagPill(tag));
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = tags.slice(MAX_VISIBLE_TAGS);

  const score = buildScoreBadge(row.score);
  const scoreBand = formatThreatBand(row.threatBand);
  const scoreText = `${scoreBand} ${row.score}`;
  const activeWarnings = hasWarnings(row);
  const mutedWarnings = hasMutedWarnings(row);
  const warningIndicator: ThreatTableRowView['warningIndicator'] = activeWarnings ? 'active' : (mutedWarnings ? 'muted' : 'none');
  const warningBadgeText: ThreatTableRowView['warningBadgeText'] = activeWarnings ? '⚠' : (mutedWarnings ? '•' : null);

  return {
    id: row.id,
    selected,
    compact,
    rowClassName: ['threat-table-row', 'is-hoverable', selected ? 'is-selected' : '', compact ? 'is-compact' : ''].filter(Boolean).join(' '),
    warningIcon: activeWarnings ? '⚠️' : null,
    warningIndicator,
    warningBadgeText,
    threatBandClassName: threatBandClassName(row.threatBand),
    score: { ...score, badgeText: scoreText },
    identity: {
      avatarLabel: name === PLACEHOLDER ? '?' : name.slice(0, 1).toUpperCase(),
      name: truncateCellText(name),
      metadata: identityMetadata,
      dimmed: name === PLACEHOLDER,
      metadataClassName,
    },
    scoreCell: {
      align: 'right',
      text: scoreText,
    },
    numericCells: {
      kills: formatPlainNumber(row.kills),
      losses: formatPlainNumber(row.losses),
      dangerPercent: formatPercent(row.dangerPercent),
      soloPercent: formatPercent(row.soloPercent),
      avgGangSize: formatPlainNumber(row.avgGangSize),
    },
    tagCell: {
      visible,
      overflowCount: overflow.length,
      overflowTooltip: overflow.length ? overflow.map((tag) => tag.label).join(', ') : null,
    },
    cells: [truncateCellText(name), truncateCellText(corp), truncateCellText(alliance), truncateCellText(dimmedText(row.mainShip)), truncateCellText(dimmedTimestamp(row.lastSeen))],
    tags,
    virtualizationKey: `row-${row.id}`,
  };
}
