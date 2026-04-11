import type { AnalysisSessionDTO, PilotThreatDTO } from '../../../../../wailsjs/go/app/AppService';

export type GoldenPilotFixture = {
  profile: 'solo' | 'gang_fc' | 'low_activity' | 'recent_kill_loss' | 'timestamp_warning';
  pilot: PilotThreatDTO;
  expected: {
    kills: number | null;
    losses: number | null;
    dangerPercent: number | null;
    soloPercent: number | null;
    avgGangSize: number | null;
    lastKill: string | null;
    lastLoss: string | null;
    mainShip: string | null;
    threatBand: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
    threatBandInputs: {
      threatScore: number;
      threatBand: string;
    };
  };
};

const basePilot: PilotThreatDTO = {
  identity: { characterId: 900000, name: 'Base', corpId: 1, corpName: 'Corp', corpTicker: 'CORP', allianceId: 2, allianceName: 'Alliance', allianceTicker: 'ALLY' },
  pilot: 'Base',
  corp: 'Corp',
  alliance: 'Alliance',
  threatScore: 0,
  threatBand: 'unknown',
  kills: 0,
  losses: 0,
  dangerPercent: 0,
  soloPercent: 0,
  avgGangSize: 0,
  lastKill: '',
  lastLoss: '',
  mainShip: '',
  notes: '',
  tags: [],
  lastUpdated: '2026-03-31T00:00:00Z',
  freshness: { source: 'zkill', dataAsOf: '2026-03-31T00:00:00Z', isStale: false },
  threat: {
    threatScore: 0,
    threatBand: 'unknown',
    threatReasons: [],
    confidence: 1,
    recentKills: 0,
    recentLosses: 0,
    dangerPercent: 0,
    soloPercent: 0,
    avgGangSize: 0,
    lastKill: '',
    lastLoss: '',
    mainShip: '',
    notes: '',
  },
};

export const goldenPilotFixtures: GoldenPilotFixture[] = [
  {
    profile: 'solo',
    pilot: {
      ...basePilot,
      identity: { ...basePilot.identity, characterId: 900001, name: 'Solo' },
      threatScore: 82,
      threatBand: 'high',
      threat: { ...basePilot.threat, threatScore: 82, threatBand: 'high', recentKills: 3, recentLosses: 0, dangerPercent: 100, soloPercent: 100, avgGangSize: 1, lastKill: '2026-03-01T10:00:00Z', mainShip: 'ShipType #17715' },
    },
    expected: { kills: 3, losses: 0, dangerPercent: 100, soloPercent: 100, avgGangSize: 1, lastKill: '2026-03-01T10:00:00Z', lastLoss: null, mainShip: 'ShipType #17715', threatBand: 'high', threatBandInputs: { threatScore: 82, threatBand: 'high' } },
  },
  {
    profile: 'gang_fc',
    pilot: {
      ...basePilot,
      identity: { ...basePilot.identity, characterId: 900002, name: 'Gang FC' },
      threatScore: 68,
      threatBand: 'medium',
      threat: { ...basePilot.threat, threatScore: 68, threatBand: 'medium', recentKills: 1, recentLosses: 1, dangerPercent: 50, soloPercent: 0, avgGangSize: 7, lastKill: '2026-03-01T08:00:00Z', lastLoss: '2026-03-01T07:50:00Z', mainShip: 'ShipType #22456' },
    },
    expected: { kills: 1, losses: 1, dangerPercent: 50, soloPercent: 0, avgGangSize: 7, lastKill: '2026-03-01T08:00:00Z', lastLoss: '2026-03-01T07:50:00Z', mainShip: 'ShipType #22456', threatBand: 'medium', threatBandInputs: { threatScore: 68, threatBand: 'medium' } },
  },
  {
    profile: 'low_activity',
    pilot: {
      ...basePilot,
      identity: { ...basePilot.identity, characterId: 900003, name: 'Low Activity' },
      threatScore: 8,
      threatBand: 'low',
      threat: { ...basePilot.threat, threatScore: 8, threatBand: 'low', recentKills: undefined, recentLosses: undefined, dangerPercent: undefined, soloPercent: undefined, avgGangSize: undefined, lastKill: '', lastLoss: '', mainShip: '' },
      kills: 0,
      losses: 0,
      dangerPercent: 0,
    },
    expected: { kills: null, losses: null, dangerPercent: null, soloPercent: null, avgGangSize: null, lastKill: null, lastLoss: null, mainShip: null, threatBand: 'low', threatBandInputs: { threatScore: 8, threatBand: 'low' } },
  },
  {
    profile: 'recent_kill_loss',
    pilot: {
      ...basePilot,
      identity: { ...basePilot.identity, characterId: 900004, name: 'Recent KL' },
      threatScore: 57,
      threatBand: 'medium',
      threat: { ...basePilot.threat, threatScore: 57, threatBand: 'medium', recentKills: 1, recentLosses: 1, dangerPercent: 50, soloPercent: 0, avgGangSize: 2, lastKill: '2026-03-30T23:00:00Z', lastLoss: '2026-03-30T22:45:00Z', mainShip: 'ShipType #11174' },
    },
    expected: { kills: 1, losses: 1, dangerPercent: 50, soloPercent: 0, avgGangSize: 2, lastKill: '2026-03-30T23:00:00Z', lastLoss: '2026-03-30T22:45:00Z', mainShip: 'ShipType #11174', threatBand: 'medium', threatBandInputs: { threatScore: 57, threatBand: 'medium' } },
  },
  {
    profile: 'timestamp_warning',
    pilot: {
      ...basePilot,
      identity: { ...basePilot.identity, characterId: 900005, name: 'Timestamp Warning' },
      threatScore: 49,
      threatBand: 'medium',
      threat: { ...basePilot.threat, threatScore: 49, threatBand: 'medium', recentKills: 1, recentLosses: 1, dangerPercent: 50, soloPercent: 100, avgGangSize: 1, mainShip: 'ShipType #33818', lastKill: '0001-01-01T00:00:00Z', lastLoss: '0001-01-01T00:00:00Z' },
    },
    expected: { kills: 1, losses: 1, dangerPercent: 50, soloPercent: 100, avgGangSize: 1, lastKill: null, lastLoss: null, mainShip: 'ShipType #33818', threatBand: 'medium', threatBandInputs: { threatScore: 49, threatBand: 'medium' } },
  },
];

export function toSessionDTO(pilot: PilotThreatDTO): AnalysisSessionDTO {
  return {
    sessionId: `session-${pilot.identity.characterId}`,
    createdAt: '2026-03-31T00:00:00Z',
    updatedAt: '2026-03-31T00:00:00Z',
    source: {
      rawText: pilot.identity.name,
      normalizedText: pilot.identity.name,
      parsedCharacters: [],
      candidateNames: [pilot.identity.name],
      invalidLines: [],
      warnings: [],
      inputKind: 'local_member_list',
      confidence: 1,
      removedDuplicates: 0,
      suspiciousArtifacts: 0,
      parsedAt: '2026-03-31T00:00:00Z',
    },
    pilots: [pilot],
    settings: { ignoredCorps: [], ignoredAlliances: [], pinnedPilots: [], refreshInterval: 30, scoring: { weights: { activity: 1, lethality: 1, soloRisk: 1, recentness: 1, context: 1, uncertainty: 1 }, thresholds: { low: 20, medium: 40, high: 70, critical: 90 } } },
    warnings: [],
    freshness: { source: 'composite', dataAsOf: '2026-03-31T00:00:00Z', isStale: false },
  };
}
