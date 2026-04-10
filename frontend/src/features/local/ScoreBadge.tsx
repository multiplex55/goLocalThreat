import type { ThreatLevel } from './types';

export interface ScoreBadgeView {
  text: string;
  level: ThreatLevel;
}

export function buildScoreBadge(score: number): ScoreBadgeView {
  const level: ThreatLevel = score >= 90
    ? 'critical'
    : score >= 70
      ? 'high'
      : score >= 40
        ? 'medium'
        : 'low';

  return { text: `${score}`, level };
}
