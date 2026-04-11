import { describe, expect, it } from 'vitest';
import { toAnalysisSessionView } from '../adapter';
import { goldenPilotFixtures, toSessionDTO, type GoldenPilotFixture } from './fixtures/parityGoldenPilots.fixture';

type ParityMetricRow = {
  profile: GoldenPilotFixture['profile'];
  metric: 'kills' | 'losses' | 'dangerPercent' | 'soloPercent' | 'avgGangSize' | 'lastKill' | 'lastLoss' | 'mainShip' | 'threatBand';
  endpointSource: string;
  transformPath: string;
  expectedReferenceValue: string | number | null;
  appOutput: string | number | null | undefined;
  pass: boolean;
};

function metricSource(metric: ParityMetricRow['metric']): string {
  if (metric === 'threatBand') return 'stats/detail.threatBand';
  if (metric === 'lastKill' || metric === 'lastLoss' || metric === 'mainShip') return 'detail (fallback stats)';
  return 'detail.threat metrics (fallback stats)';
}

function buildParityRows(fixture: GoldenPilotFixture): ParityMetricRow[] {
  const view = toAnalysisSessionView(toSessionDTO(fixture.pilot)).pilots[0];

  const rows: Omit<ParityMetricRow, 'endpointSource' | 'transformPath'>[] = [
    { profile: fixture.profile, metric: 'kills', expectedReferenceValue: fixture.expected.kills, appOutput: view.kills, pass: view.kills === fixture.expected.kills },
    { profile: fixture.profile, metric: 'losses', expectedReferenceValue: fixture.expected.losses, appOutput: view.losses, pass: view.losses === fixture.expected.losses },
    { profile: fixture.profile, metric: 'dangerPercent', expectedReferenceValue: fixture.expected.dangerPercent, appOutput: view.dangerPercent, pass: view.dangerPercent === fixture.expected.dangerPercent },
    { profile: fixture.profile, metric: 'soloPercent', expectedReferenceValue: fixture.expected.soloPercent, appOutput: view.soloPercent, pass: view.soloPercent === fixture.expected.soloPercent },
    { profile: fixture.profile, metric: 'avgGangSize', expectedReferenceValue: fixture.expected.avgGangSize, appOutput: view.avgGangSize, pass: view.avgGangSize === fixture.expected.avgGangSize },
    { profile: fixture.profile, metric: 'lastKill', expectedReferenceValue: fixture.expected.lastKill, appOutput: view.lastKill, pass: view.lastKill === fixture.expected.lastKill },
    { profile: fixture.profile, metric: 'lastLoss', expectedReferenceValue: fixture.expected.lastLoss, appOutput: view.lastLoss, pass: view.lastLoss === fixture.expected.lastLoss },
    { profile: fixture.profile, metric: 'mainShip', expectedReferenceValue: fixture.expected.mainShip, appOutput: view.mainShip, pass: view.mainShip === fixture.expected.mainShip },
    { profile: fixture.profile, metric: 'threatBand', expectedReferenceValue: fixture.expected.threatBand, appOutput: view.band, pass: view.band === fixture.expected.threatBand },
  ];

  return rows.map((row) => ({
    ...row,
    endpointSource: metricSource(row.metric),
    transformPath: `toAnalysisSessionView -> toPilotView -> resolvePilotMetrics.${row.metric}`,
  }));
}

describe('golden fixture parity harness', () => {
  it.each(goldenPilotFixtures)('golden fixture parity for $profile', (fixture) => {
    const rows = buildParityRows(fixture);
    rows.forEach((row) => {
      expect(row.pass, `${fixture.profile}.${row.metric}`).toBe(true);
    });
  });

  it('transform-path extraction keeps detail-first behavior for parity-sensitive metrics', () => {
    const fixture = goldenPilotFixtures.find((item) => item.profile === 'solo');
    if (!fixture) throw new Error('solo fixture missing');

    const summaryOnlyConflict = {
      ...fixture.pilot,
      kills: 99,
      losses: 88,
      dangerPercent: 13,
      soloPercent: 5,
      avgGangSize: 9,
      mainShip: 'Wrong summary ship',
      lastKill: '2020-01-01T00:00:00Z',
      lastLoss: '2020-01-01T00:00:00Z',
    };
    const view = toAnalysisSessionView(toSessionDTO(summaryOnlyConflict)).pilots[0];

    expect(view.kills).toBe(3);
    expect(view.losses).toBe(0);
    expect(view.dangerPercent).toBe(100);
    expect(view.soloPercent).toBe(100);
    expect(view.avgGangSize).toBe(1);
    expect(view.mainShip).toBe('ShipType #17715');
    expect(view.lastKill).toBe('2026-03-01T10:00:00Z');
  });

  it('threat band derivation follows known profile expectations', () => {
    const expectedByProfile = Object.fromEntries(goldenPilotFixtures.map((f) => [f.profile, f.expected.threatBand]));
    for (const fixture of goldenPilotFixtures) {
      const view = toAnalysisSessionView(toSessionDTO(fixture.pilot)).pilots[0];
      expect(view.score).toBe(fixture.expected.threatBandInputs.threatScore);
      expect(view.band).toBe(expectedByProfile[fixture.profile]);
    }
  });

  it('parity report contract remains stable', () => {
    const report = {
      generatedAt: '2026-03-31T00:00:00Z',
      rows: goldenPilotFixtures.flatMap(buildParityRows),
      totals: {
        profiles: goldenPilotFixtures.length,
        checks: goldenPilotFixtures.length * 9,
      },
    };

    const contract = {
      generatedAt: report.generatedAt,
      totals: report.totals,
      rowCount: report.rows.length,
      rowShape: Object.keys(report.rows[0] ?? {}).sort(),
    };

    expect(contract).toMatchInlineSnapshot(`
      {
        "generatedAt": "2026-03-31T00:00:00Z",
        "rowCount": 45,
        "rowShape": [
          "appOutput",
          "endpointSource",
          "expectedReferenceValue",
          "metric",
          "pass",
          "profile",
          "transformPath",
        ],
        "totals": {
          "checks": 45,
          "profiles": 5,
        },
      }
    `);
  });
});
