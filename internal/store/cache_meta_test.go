package store

import (
	"testing"
	"time"
)

func TestCacheMetadataTTLUpdatesAndPruning(t *testing.T) {
	s := newTestStore(t, RetentionPolicy{CacheMetadataMaxAge: time.Hour})
	now := time.Now().UTC()
	s.now = func() time.Time { return now }

	meta := CacheMetadata{
		Key:             "esi:pilot:101",
		ExpiresAt:       now.Add(30 * time.Minute),
		FreshUntil:      now.Add(10 * time.Minute),
		LastRefreshedAt: now,
		Metadata:        map[string]any{"provider": "esi"},
	}
	if err := s.UpsertCacheMetadata(bg(), meta); err != nil {
		t.Fatalf("upsert cache metadata: %v", err)
	}

	stored, err := s.GetCacheMetadata(bg(), meta.Key)
	if err != nil {
		t.Fatalf("get cache metadata: %v", err)
	}
	if !stored.ExpiresAt.Equal(meta.ExpiresAt) {
		t.Fatalf("expected expiry %s got %s", meta.ExpiresAt, stored.ExpiresAt)
	}

	meta.ExpiresAt = now.Add(-time.Minute)
	meta.FreshUntil = now.Add(-2 * time.Minute)
	if err := s.UpsertCacheMetadata(bg(), meta); err != nil {
		t.Fatalf("upsert expired metadata: %v", err)
	}

	pruned, err := s.PruneCacheMetadata(bg())
	if err != nil {
		t.Fatalf("prune cache metadata: %v", err)
	}
	if pruned == 0 {
		t.Fatalf("expected at least one pruned row")
	}
}
