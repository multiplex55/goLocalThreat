export interface ScoreWeights {
  activity: number;
  lethality: number;
  soloRisk: number;
  recentness: number;
  context: number;
  uncertainty: number;
}

export interface ScoreThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface TTLSettings {
  zkillStatsSeconds: number;
  zkillDetailSeconds: number;
}

export interface AppearanceSettings {
  density: 'comfortable' | 'compact';
  theme: 'system' | 'light' | 'dark';
}

export interface EntitySettings {
  ignoredCorporations: number[];
  ignoredAlliances: number[];
  pinnedCharacters: number[];
}

export interface SettingsViewModel {
  scoring: {
    weights: ScoreWeights;
    thresholds: ScoreThresholds;
  };
  visibleColumns: Record<string, boolean>;
  appearance: AppearanceSettings;
  ttl: TTLSettings;
  entities: EntitySettings;
}

export interface SettingsFormState {
  model: SettingsViewModel;
  errors: string[];
  saving: boolean;
}
