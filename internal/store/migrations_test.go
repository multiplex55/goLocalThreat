package store

import (
	"database/sql"
	"testing"
)

func TestMigrationsApplyAndAreIdempotent(t *testing.T) {
	s := newTestStore(t, RetentionPolicy{})

	if err := s.migrate(bg()); err != nil {
		t.Fatalf("second migrate should be idempotent: %v", err)
	}

	var count int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&count); err != nil {
		t.Fatalf("count migrations: %v", err)
	}
	if count != len(migrations) {
		t.Fatalf("expected %d migrations recorded, got %d", len(migrations), count)
	}

	tables := []string{"settings", "analysis_sessions", "pinned_pilots", "ignored_corps", "ignored_alliances", "cache_metadata", "export_snapshots"}
	for _, table := range tables {
		var name string
		err := s.db.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&name)
		if err != nil {
			if err == sql.ErrNoRows {
				t.Fatalf("expected table %s to exist", table)
			}
			t.Fatalf("check table %s: %v", table, err)
		}
	}
}
