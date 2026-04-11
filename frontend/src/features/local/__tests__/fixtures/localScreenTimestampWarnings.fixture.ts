import type { AnalysisSessionView, ParseWarningView, PilotThreatView } from '../../../../types/analysis';

function buildTimestampWarning(index: number): ParseWarningView {
  return {
    code: 'DETAIL_TIME_INVALID',
    message: `Timestamp warning ${index + 1}`,
    severity: 'warn',
    userVisible: true,
    category: 'timing',
    provider: 'zkill',
  };
}

function buildPilot(index: number, warning?: ParseWarningView): PilotThreatView {
  const id = `pilot-${index + 1}`;
  return {
    id,
    identity: {
      characterId: index + 1,
      characterName: `Pilot ${index + 1}`,
      corporationName: `Corp ${index + 1}`,
      corporationTicker: null,
      allianceName: `Alliance ${index + 1}`,
      allianceTicker: null,
      portraitUrl: null,
      metadata: { corporationId: index + 100, allianceId: index + 200 },
    },
    score: 70 - index,
    band: index < 3 ? 'high' : 'medium',
    confidence: 0.8,
    reasons: ['Recent activity'],
    tags: ['Scout'],
    notes: warning ? 'Pilot has partial timestamp warning' : 'No warning',
    kills: 10 - (index % 4),
    losses: 2 + (index % 3),
    dangerPercent: 65,
    soloPercent: 30,
    avgGangSize: 4,
    mainShip: 'Caracal',
    lastKill: '2026-04-10T12:00:00Z',
    lastLoss: '2026-03-31T12:00:00Z',
    freshness: { source: 'zkill', dataAsOf: '2026-04-10T12:00:00Z', isStale: false },
    warnings: warning ? [warning] : [],
  };
}

export function buildTimestampWarningsRegressionFixture(): AnalysisSessionView {
  const globalWarnings = Array.from({ length: 18 }, (_, i) => buildTimestampWarning(i));
  const pilots = Array.from({ length: 17 }, (_, i) => buildPilot(i, i === 6 ? buildTimestampWarning(999) : undefined));

  return {
    sessionId: 'regression-17-plus-18',
    createdAt: '2026-04-11T00:00:00Z',
    pilotCount: pilots.length,
    warningCount: globalWarnings.length + 1,
    sourceTextLength: 400,
    diagnostics: {
      candidateNamesCount: pilots.length,
      resolvedCount: pilots.length,
      unresolvedNames: [],
      invalidLines: 0,
      warnings: [...globalWarnings, ...pilots[6]!.warnings],
      globalWarnings,
      warningsByPilotId: { [pilots[6]!.id]: pilots[6]!.warnings },
      warningCodeCounts: { DETAIL_TIME_INVALID: 18 },
      severityCounts: { info: 0, warn: globalWarnings.length + 1, error: 0 },
      providerCounts: { zkill: globalWarnings.length + 1 },
    },
    parseSummary: {
      candidateCount: pilots.length,
      invalidLineCount: 0,
      duplicateRemovalCount: 0,
      warningCount: globalWarnings.length + 1,
      warnings: [...globalWarnings, ...pilots[6]!.warnings],
    },
    pilots,
  };
}
