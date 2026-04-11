import { describe, expect, it } from 'vitest';
import { toLocalScreenViewModel } from './viewModelAdapter';
import { defaultWorkspacePrefs } from './workspacePrefs';

const expectedVisible = {
  pilotName: true,
  corp: true,
  alliance: true,
  tags: true,
  score: true,
  threatBand: true,
  kl: true,
  kills: false,
  losses: false,
  lastActivity: true,
  lastKill: false,
  mainShip: true,
  dangerPercent: true,
  soloPercent: false,
  avgGangSize: false,
  lastLoss: false,
  notes: false,
};

describe('Settings default columns', () => {
  it('uses compact default visible columns in workspace prefs', () => {
    expect(defaultWorkspacePrefs().table.columnVisibility).toEqual(expectedVisible);
  });

  it('uses compact default visible columns in local view-model adapter', () => {
    const model = toLocalScreenViewModel({
      sessionId: 's',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      source: { rawText: 'Pilot', normalizedText: 'Pilot', parsedCharacters: [], candidateNames: ['Pilot'], invalidLines: [], warnings: [], inputKind: 'local_member_list', confidence: 1, removedDuplicates: 0, suspiciousArtifacts: 0, parsedAt: '2026-01-01T00:00:00Z' },
      pilots: [],
      settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
      warnings: [],
      freshness: { source: 'composite', dataAsOf: '2026-01-01T00:00:00Z', isStale: false },
    });

    expect(model.settings.visibleColumns).toEqual(expectedVisible);
  });
});
