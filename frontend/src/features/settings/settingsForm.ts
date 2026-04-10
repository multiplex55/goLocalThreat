import { loadSettings, saveSettings } from '../../lib/api';
import type { SettingsFormState, SettingsViewModel } from './types';

export const defaultSettings: SettingsViewModel = {
  scoring: {
    weights: {
      activity: 1,
      lethality: 1,
      soloRisk: 1,
      recentness: 1,
      context: 1,
      uncertainty: 1,
    },
    thresholds: {
      low: 20,
      medium: 45,
      high: 70,
      critical: 90,
    },
  },
  visibleColumns: {
    pilotName: true,
    corp: true,
    alliance: true,
    ship: true,
    score: true,
    lastSeen: true,
  },
  appearance: {
    density: 'comfortable',
    theme: 'system',
  },
  ttl: {
    zkillStatsSeconds: 300,
    zkillDetailSeconds: 120,
  },
  entities: {
    ignoredCorporations: [],
    ignoredAlliances: [],
    pinnedCharacters: [],
  },
};

export function validateSettings(model: SettingsViewModel): string[] {
  const errors: string[] = [];
  const { low, medium, high, critical } = model.scoring.thresholds;
  if (!(low <= medium && medium <= high && high <= critical)) {
    errors.push('Score thresholds must be ordered low <= medium <= high <= critical.');
  }

  const weightValues = Object.values(model.scoring.weights);
  if (weightValues.some((value) => value < 0)) {
    errors.push('Score weights cannot be negative.');
  }
  if (weightValues.every((value) => value === 0)) {
    errors.push('At least one score weight must be greater than zero.');
  }

  if (model.ttl.zkillStatsSeconds <= 0 || model.ttl.zkillDetailSeconds <= 0) {
    errors.push('zKill TTL values must be positive seconds.');
  }

  return errors;
}

export async function initializeSettingsForm(): Promise<SettingsFormState> {
  const loaded = await loadSettings();
  return {
    model: {
      ...defaultSettings,
      ...loaded,
      scoring: {
        ...defaultSettings.scoring,
        ...loaded.scoring,
        weights: { ...defaultSettings.scoring.weights, ...(loaded.scoring?.weights ?? {}) },
        thresholds: { ...defaultSettings.scoring.thresholds, ...(loaded.scoring?.thresholds ?? {}) },
      },
      visibleColumns: { ...defaultSettings.visibleColumns, ...(loaded.visibleColumns ?? {}) },
      appearance: { ...defaultSettings.appearance, ...(loaded.appearance ?? {}) },
      ttl: { ...defaultSettings.ttl, ...(loaded.ttl ?? {}) },
      entities: {
        ...defaultSettings.entities,
        ...(loaded.entities ?? {}),
      },
    },
    errors: [],
    saving: false,
  };
}

export async function persistSettings(model: SettingsViewModel): Promise<SettingsFormState> {
  const errors = validateSettings(model);
  if (errors.length > 0) {
    return { model, errors, saving: false };
  }

  const saved = await saveSettings(model);
  return {
    model: saved,
    errors: [],
    saving: false,
  };
}
