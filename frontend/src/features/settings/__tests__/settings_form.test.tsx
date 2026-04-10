import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, initializeSettingsForm, persistSettings } from '../settingsForm';
import type { SettingsViewModel } from '../types';

vi.mock('../../../lib/api', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { loadSettings, saveSettings } from '../../../lib/api';

const mockedLoadSettings = vi.mocked(loadSettings);
const mockedSaveSettings = vi.mocked(saveSettings);

describe('settings form', () => {
  beforeEach(() => {
    mockedLoadSettings.mockReset();
    mockedSaveSettings.mockReset();
  });

  it('validates scoring weights before persistence', async () => {
    const invalid: SettingsViewModel = {
      ...defaultSettings,
      scoring: {
        ...defaultSettings.scoring,
        weights: {
          ...defaultSettings.scoring.weights,
          activity: 0,
          lethality: 0,
          soloRisk: 0,
          recentness: 0,
          context: 0,
          uncertainty: 0,
        },
      },
    };

    const state = await persistSettings(invalid);

    expect(state.errors).toContain('At least one score weight must be greater than zero.');
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  it('loads from api and persists validated payload through saveSettings', async () => {
    mockedLoadSettings.mockResolvedValue({
      ...defaultSettings,
      appearance: { density: 'compact', theme: 'dark' },
    });
    mockedSaveSettings.mockImplementation(async (model) => model);

    const initialized = await initializeSettingsForm();
    expect(initialized.model.appearance).toEqual({ density: 'compact', theme: 'dark' });

    const saved = await persistSettings(initialized.model);
    expect(saved.errors).toEqual([]);
    expect(mockedSaveSettings).toHaveBeenCalledWith(initialized.model);
  });
});
