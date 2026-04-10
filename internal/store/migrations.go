package store

import (
	"context"
	"database/sql"
	"fmt"
)

type migration struct {
	version int
	sql     string
}

var migrations = []migration{
	{version: 1, sql: `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at TIMESTAMP NOT NULL
		);
		CREATE TABLE IF NOT EXISTS settings (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			data_json TEXT NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);
		CREATE TABLE IF NOT EXISTS analysis_sessions (
			session_id TEXT PRIMARY KEY,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			source_hash TEXT NOT NULL,
			source_preview TEXT NOT NULL,
			parse_summary_json TEXT NOT NULL,
			pilots_json TEXT NOT NULL,
			settings_json TEXT NOT NULL,
			metrics_json TEXT NOT NULL,
			session_json TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_analysis_sessions_updated_at ON analysis_sessions(updated_at DESC);
		CREATE TABLE IF NOT EXISTS pinned_pilots (
			character_id INTEGER PRIMARY KEY,
			created_at TIMESTAMP NOT NULL
		);
		CREATE TABLE IF NOT EXISTS ignored_corps (
			corp_id INTEGER PRIMARY KEY,
			created_at TIMESTAMP NOT NULL
		);
		CREATE TABLE IF NOT EXISTS ignored_alliances (
			alliance_id INTEGER PRIMARY KEY,
			created_at TIMESTAMP NOT NULL
		);
		CREATE TABLE IF NOT EXISTS cache_metadata (
			cache_key TEXT PRIMARY KEY,
			expires_at TIMESTAMP NOT NULL,
			fresh_until TIMESTAMP NOT NULL,
			last_refreshed_at TIMESTAMP NOT NULL,
			metadata_json TEXT NOT NULL,
			updated_at TIMESTAMP NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires ON cache_metadata(expires_at);
		CREATE TABLE IF NOT EXISTS export_snapshots (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			created_at TIMESTAMP NOT NULL,
			format TEXT NOT NULL,
			status TEXT NOT NULL,
			payload_json TEXT NOT NULL,
			output_path TEXT NOT NULL
		);
	`},
}

func (s *Store) migrate(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMP NOT NULL)`); err != nil {
		return err
	}
	for _, m := range migrations {
		applied, err := migrationApplied(ctx, s.db, m.version)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, m.sql); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %d failed: %w", m.version, err)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations(version, applied_at) VALUES(?, CURRENT_TIMESTAMP)`, m.version); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

func migrationApplied(ctx context.Context, db *sql.DB, version int) (bool, error) {
	var v int
	err := db.QueryRowContext(ctx, `SELECT version FROM schema_migrations WHERE version = ?`, version).Scan(&v)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}
