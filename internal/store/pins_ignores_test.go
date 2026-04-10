package store

import "testing"

func TestPinsAndIgnoresUniqueness(t *testing.T) {
	s := newTestStore(t, RetentionPolicy{})
	if _, err := s.SaveSettings(bg(), validSettings()); err != nil {
		t.Fatalf("seed settings: %v", err)
	}

	if _, err := s.PinPilot(bg(), 10); err != nil {
		t.Fatalf("pin pilot first: %v", err)
	}
	settings, err := s.PinPilot(bg(), 10)
	if err != nil {
		t.Fatalf("pin pilot duplicate: %v", err)
	}
	if len(settings.PinnedPilots) != 1 {
		t.Fatalf("expected unique pinned pilots, got %#v", settings.PinnedPilots)
	}

	if _, err := s.IgnoreCorp(bg(), 44); err != nil {
		t.Fatalf("ignore corp first: %v", err)
	}
	settings, err = s.IgnoreCorp(bg(), 44)
	if err != nil {
		t.Fatalf("ignore corp duplicate: %v", err)
	}
	if len(settings.IgnoredCorps) != 1 {
		t.Fatalf("expected unique ignored corps, got %#v", settings.IgnoredCorps)
	}

	if _, err := s.IgnoreAlliance(bg(), 77); err != nil {
		t.Fatalf("ignore alliance first: %v", err)
	}
	settings, err = s.IgnoreAlliance(bg(), 77)
	if err != nil {
		t.Fatalf("ignore alliance duplicate: %v", err)
	}
	if len(settings.IgnoredAlliances) != 1 {
		t.Fatalf("expected unique ignored alliances, got %#v", settings.IgnoredAlliances)
	}
}
