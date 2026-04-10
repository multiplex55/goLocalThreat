import { Call } from '../../runtime/runtime';

export interface ParseWarningDTO {
  provider: string;
  code: string;
  message: string;
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
  identity?: {
    characterId?: number;
    name?: string;
    corpName?: string;
    allianceName?: string;
  };
  threat?: {
    threatScore?: number;
    threatBand?: string;
    threatReasons?: string[];
    confidence?: number;
  };
}

export interface AnalysisSessionDTO {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  source: ParseSourceDTO;
  pilots: PilotThreatDTO[];
  warnings: ParseWarningDTO[];
  unresolvedNames?: string[];
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

export function RefreshPilot(sessionID: string, characterID: number): Promise<unknown> {
  return Call.ByName('AppService.RefreshPilot', sessionID, characterID);
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
