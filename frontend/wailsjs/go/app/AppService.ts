import { Call } from '../../runtime/runtime';

export interface ParseWarningDTO {
  provider: string;
  code: string;
  message: string;
  characterId?: number;
  characterName?: string;
  severity?: 'info' | 'warn' | 'error';
  userVisible?: boolean;
  category?: string;
}

export interface FreshnessDTO {
  source: string;
  dataAsOf: string;
  isStale: boolean;
}

export interface ParseSourceDTO {
  rawText: string;
  normalizedText: string;
  parsedCharacters: unknown[];
  candidateNames: string[];
  invalidLines: Array<{ line: string; reasonCode: string }>;
  warnings: ParseWarningDTO[];
  inputKind: string;
  confidence: number;
  removedDuplicates: number;
  suspiciousArtifacts: number;
  parsedAt: string;
}

export interface PilotThreatDTO {
  identity: {
    characterId: number;
    name: string;
    corpId: number;
    allianceId: number;
  };
  threat: {
    threatScore: number;
    threatBand: string;
    threatReasons: string[];
    confidence: number;
  };
  lastUpdated: string;
  freshness: FreshnessDTO;
}

export interface AnalysisSessionDTO {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  source: ParseSourceDTO;
  pilots: PilotThreatDTO[];
  settings: SettingsDTO;
  warnings: ParseWarningDTO[];
  freshness: FreshnessDTO;
  durationMetrics?: Record<string, number>;
  warningCount?: number;
  unresolvedNames?: string[];
  providerWarningSummary?: Array<{ provider: string; count: number }>;
}

export interface BuildInfoDTO {
  version: string;
  commit: string;
  date: string;
}

export interface ScoringWeightsDTO {
  activity: number;
  lethality: number;
  soloRisk: number;
  recentness: number;
  context: number;
  uncertainty: number;
}

export interface ScoringThresholdsDTO {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface SettingsDTO {
  ignoredCorps: number[];
  ignoredAlliances: number[];
  pinnedPilots: number[];
  refreshInterval: number;
  scoring: {
    weights: ScoringWeightsDTO;
    thresholds: ScoringThresholdsDTO;
  };
}

export function GetBuildInfo(): Promise<BuildInfoDTO> {
  return Call.ByName('AppService.GetBuildInfo') as Promise<BuildInfoDTO>;
}

export function AnalyzePastedText(text: string): Promise<AnalysisSessionDTO> {
  return Call.ByName('AppService.AnalyzePastedText', text) as Promise<AnalysisSessionDTO>;
}

export function RefreshSession(sessionID: string): Promise<AnalysisSessionDTO> {
  return Call.ByName('AppService.RefreshSession', sessionID) as Promise<AnalysisSessionDTO>;
}

export function RefreshPilot(sessionID: string, characterID: number): Promise<PilotThreatDTO> {
  return Call.ByName('AppService.RefreshPilot', sessionID, characterID) as Promise<PilotThreatDTO>;
}

export function LoadRecentSessions(limit: number): Promise<AnalysisSessionDTO[]> {
  return Call.ByName('AppService.LoadRecentSessions', limit) as Promise<AnalysisSessionDTO[]>;
}

export function LoadSettings(): Promise<SettingsDTO> {
  return Call.ByName('AppService.LoadSettings') as Promise<SettingsDTO>;
}

export function SaveSettings(settings: SettingsDTO): Promise<SettingsDTO> {
  return Call.ByName('AppService.SaveSettings', settings) as Promise<SettingsDTO>;
}

export function PinPilot(characterID: number): Promise<SettingsDTO> {
  return Call.ByName('AppService.PinPilot', characterID) as Promise<SettingsDTO>;
}

export function IgnoreCorp(corpID: number): Promise<SettingsDTO> {
  return Call.ByName('AppService.IgnoreCorp', corpID) as Promise<SettingsDTO>;
}

export function IgnoreAlliance(allianceID: number): Promise<SettingsDTO> {
  return Call.ByName('AppService.IgnoreAlliance', allianceID) as Promise<SettingsDTO>;
}

export function ClearCache(): Promise<boolean> {
  return Call.ByName('AppService.ClearCache') as Promise<boolean>;
}
