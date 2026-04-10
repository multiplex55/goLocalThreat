package store

import "testing"

func TestSettingsCRUDAndValidation(t *testing.T) {
	s := newTestStore(t, RetentionPolicy{})

	if _, err := s.SaveSettings(bg(), validSettings()); err != nil {
		t.Fatalf("save settings: %v", err)
	}

	got, err := s.LoadSettings(bg())
	if err != nil {
		t.Fatalf("load settings: %v", err)
	}
	if got.RefreshInterval != 30 {
		t.Fatalf("expected refresh interval 30, got %d", got.RefreshInterval)
	}

	invalid := validSettings()
	invalid.Scoring.Weights.Activity = -1
	if _, err := s.SaveSettings(bg(), invalid); err == nil {
		t.Fatalf("expected validation error")
	}

	updated := validSettings()
	updated.RefreshInterval = 45
	updated.PinnedPilots = []int64{4, 4, 7}
	updated.IgnoredCorps = []int64{1001}
	updated.IgnoredAlliances = []int64{2002}
	if _, err := s.SaveSettings(bg(), updated); err != nil {
		t.Fatalf("update settings: %v", err)
	}

	got, err = s.LoadSettings(bg())
	if err != nil {
		t.Fatalf("load updated settings: %v", err)
	}
	if got.RefreshInterval != 45 || len(got.PinnedPilots) != 2 {
		t.Fatalf("unexpected updated settings: %#v", got)
	}
}
