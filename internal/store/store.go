package store

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"golocalthreat/internal/domain"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("store: not found")

type RetentionPolicy struct {
	MaxSessions         int
	SessionMaxAge       time.Duration
	CacheMetadataMaxAge time.Duration
}

type ExportSnapshot struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	Format    string    `json:"format"`
	Status    string    `json:"status"`
	Payload   []byte    `json:"payload,omitempty"`
	Path      string    `json:"path,omitempty"`
}

type CacheMetadata struct {
	Key             string         `json:"key"`
	ExpiresAt       time.Time      `json:"expiresAt"`
	FreshUntil      time.Time      `json:"freshUntil"`
	LastRefreshedAt time.Time      `json:"lastRefreshedAt"`
	Metadata        map[string]any `json:"metadata,omitempty"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type AnalysisSessionRecord struct {
	SessionID        string                     `json:"sessionId"`
	CreatedAt        time.Time                  `json:"createdAt"`
	UpdatedAt        time.Time                  `json:"updatedAt"`
	SourceHash       string                     `json:"sourceHash"`
	SourcePreview    string                     `json:"sourcePreview"`
	ParseSummary     map[string]any             `json:"parseSummary"`
	PilotResultSet   []domain.PilotThreatRecord `json:"pilotResultSet"`
	SettingsSnapshot domain.Settings            `json:"settingsSnapshot"`
	Metrics          map[string]any             `json:"metrics"`
	Session          domain.AnalysisSession     `json:"session"`
}

type Store struct {
	db        *sql.DB
	now       func() time.Time
	retention RetentionPolicy
}

func OpenSQLite(path string, retention RetentionPolicy) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	s := &Store{db: db, now: func() time.Time { return time.Now().UTC() }, retention: retention}
	if err := s.migrate(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func OpenSQLiteInMemory(retention RetentionPolicy) (*Store, error) {
	return OpenSQLite(":memory:", retention)
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) SaveAnalysisSession(ctx context.Context, session domain.AnalysisSession) error {
	if err := session.Validate(); err != nil {
		return err
	}
	parseSummary := map[string]any{
		"inputKind":            session.Source.InputKind,
		"confidence":           session.Source.Confidence,
		"candidateCount":       len(session.Source.CandidateNames),
		"parsedCharacterCount": len(session.Source.ParsedCharacters),
		"invalidCount":         len(session.Source.InvalidLines),
		"removedDuplicates":    session.Source.RemovedDuplicates,
		"suspiciousArtifacts":  session.Source.SuspiciousArtifacts,
		"parsedAt":             session.Source.ParsedAt,
	}
	metrics := map[string]any{
		"durationMetrics": session.DurationMetrics,
		"warningCount":    session.WarningCount,
		"warnings":        session.Warnings,
		"unresolvedNames": session.UnresolvedNames,
	}
	sourceHash := hashText(session.Source.RawText)
	sourcePreview := preview(session.Source.RawText, 280)
	parseSummaryJSON, _ := json.Marshal(parseSummary)
	pilotsJSON, _ := json.Marshal(session.Pilots)
	settingsJSON, _ := json.Marshal(session.Settings)
	metricsJSON, _ := json.Marshal(metrics)
	sessionJSON, _ := json.Marshal(session)

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO analysis_sessions (
			session_id, created_at, updated_at, source_hash, source_preview,
			parse_summary_json, pilots_json, settings_json, metrics_json, session_json
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(session_id) DO UPDATE SET
			updated_at = excluded.updated_at,
			source_hash = excluded.source_hash,
			source_preview = excluded.source_preview,
			parse_summary_json = excluded.parse_summary_json,
			pilots_json = excluded.pilots_json,
			settings_json = excluded.settings_json,
			metrics_json = excluded.metrics_json,
			session_json = excluded.session_json
	`,
		session.SessionID, session.CreatedAt.UTC(), session.UpdatedAt.UTC(), sourceHash, sourcePreview,
		string(parseSummaryJSON), string(pilotsJSON), string(settingsJSON), string(metricsJSON), string(sessionJSON),
	)
	if err != nil {
		return err
	}
	_, err = s.pruneSessions(ctx)
	return err
}

func (s *Store) LoadRecentSessions(ctx context.Context, limit int) ([]domain.AnalysisSession, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT session_json FROM analysis_sessions ORDER BY updated_at DESC LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.AnalysisSession, 0, limit)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		var s domain.AnalysisSession
		if err := json.Unmarshal([]byte(raw), &s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (s *Store) SaveSettings(ctx context.Context, settings domain.Settings) (domain.Settings, error) {
	if err := ValidateSettings(settings); err != nil {
		return domain.Settings{}, err
	}
	buf, _ := json.Marshal(settings)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Settings{}, err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `INSERT INTO settings (id, data_json, updated_at) VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`, string(buf), s.now())
	if err != nil {
		return domain.Settings{}, err
	}
	if err := replaceIDSet(ctx, tx, "pinned_pilots", "character_id", settings.PinnedPilots); err != nil {
		return domain.Settings{}, err
	}
	if err := replaceIDSet(ctx, tx, "ignored_corps", "corp_id", settings.IgnoredCorps); err != nil {
		return domain.Settings{}, err
	}
	if err := replaceIDSet(ctx, tx, "ignored_alliances", "alliance_id", settings.IgnoredAlliances); err != nil {
		return domain.Settings{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Settings{}, err
	}
	return s.LoadSettings(ctx)
}

func (s *Store) LoadSettings(ctx context.Context) (domain.Settings, error) {
	var raw string
	err := s.db.QueryRowContext(ctx, `SELECT data_json FROM settings WHERE id = 1`).Scan(&raw)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.Settings{}, err
	}
	settings := domain.Settings{}
	if raw != "" {
		if err := json.Unmarshal([]byte(raw), &settings); err != nil {
			return domain.Settings{}, err
		}
	}
	var errPins, errCorps, errAlliances error
	settings.PinnedPilots, errPins = loadIDSet(ctx, s.db, "SELECT character_id FROM pinned_pilots ORDER BY character_id")
	settings.IgnoredCorps, errCorps = loadIDSet(ctx, s.db, "SELECT corp_id FROM ignored_corps ORDER BY corp_id")
	settings.IgnoredAlliances, errAlliances = loadIDSet(ctx, s.db, "SELECT alliance_id FROM ignored_alliances ORDER BY alliance_id")
	if errPins != nil || errCorps != nil || errAlliances != nil {
		return domain.Settings{}, errors.Join(errPins, errCorps, errAlliances)
	}
	if settings.RefreshInterval == 0 {
		settings.RefreshInterval = 30
	}
	return settings, nil
}

func (s *Store) PinPilot(ctx context.Context, characterID int64) (domain.Settings, error) {
	if characterID <= 0 {
		return domain.Settings{}, fmt.Errorf("characterID must be positive")
	}
	_, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO pinned_pilots(character_id, created_at) VALUES(?, ?)`, characterID, s.now())
	if err != nil {
		return domain.Settings{}, err
	}
	return s.LoadSettings(ctx)
}

func (s *Store) IgnoreCorp(ctx context.Context, corpID int64) (domain.Settings, error) {
	if corpID <= 0 {
		return domain.Settings{}, fmt.Errorf("corpID must be positive")
	}
	_, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO ignored_corps(corp_id, created_at) VALUES(?, ?)`, corpID, s.now())
	if err != nil {
		return domain.Settings{}, err
	}
	return s.LoadSettings(ctx)
}

func (s *Store) IgnoreAlliance(ctx context.Context, allianceID int64) (domain.Settings, error) {
	if allianceID <= 0 {
		return domain.Settings{}, fmt.Errorf("allianceID must be positive")
	}
	_, err := s.db.ExecContext(ctx, `INSERT OR IGNORE INTO ignored_alliances(alliance_id, created_at) VALUES(?, ?)`, allianceID, s.now())
	if err != nil {
		return domain.Settings{}, err
	}
	return s.LoadSettings(ctx)
}

func (s *Store) UpsertCacheMetadata(ctx context.Context, meta CacheMetadata) error {
	if meta.Key == "" {
		return errors.New("cache key is required")
	}
	if meta.ExpiresAt.IsZero() || meta.FreshUntil.IsZero() {
		return errors.New("expiresAt and freshUntil are required")
	}
	if meta.LastRefreshedAt.IsZero() {
		meta.LastRefreshedAt = s.now()
	}
	meta.UpdatedAt = s.now()
	buf, _ := json.Marshal(meta.Metadata)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cache_metadata(cache_key, expires_at, fresh_until, last_refreshed_at, metadata_json, updated_at)
		VALUES(?, ?, ?, ?, ?, ?)
		ON CONFLICT(cache_key) DO UPDATE SET
			expires_at=excluded.expires_at,
			fresh_until=excluded.fresh_until,
			last_refreshed_at=excluded.last_refreshed_at,
			metadata_json=excluded.metadata_json,
			updated_at=excluded.updated_at
	`, meta.Key, meta.ExpiresAt.UTC(), meta.FreshUntil.UTC(), meta.LastRefreshedAt.UTC(), string(buf), meta.UpdatedAt.UTC())
	return err
}

func (s *Store) GetCacheMetadata(ctx context.Context, key string) (CacheMetadata, error) {
	var out CacheMetadata
	var raw string
	err := s.db.QueryRowContext(ctx, `SELECT cache_key, expires_at, fresh_until, last_refreshed_at, metadata_json, updated_at FROM cache_metadata WHERE cache_key = ?`, key).
		Scan(&out.Key, &out.ExpiresAt, &out.FreshUntil, &out.LastRefreshedAt, &raw, &out.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CacheMetadata{}, ErrNotFound
		}
		return CacheMetadata{}, err
	}
	if raw != "" {
		_ = json.Unmarshal([]byte(raw), &out.Metadata)
	}
	return out, nil
}

func (s *Store) PruneCacheMetadata(ctx context.Context) (int64, error) {
	maxAge := s.retention.CacheMetadataMaxAge
	if maxAge <= 0 {
		maxAge = 7 * 24 * time.Hour
	}
	cutoff := s.now().Add(-maxAge)
	res, err := s.db.ExecContext(ctx, `DELETE FROM cache_metadata WHERE expires_at <= ? OR updated_at <= ?`, s.now(), cutoff)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (s *Store) CreateExportSnapshotScaffold(ctx context.Context, format string) (ExportSnapshot, error) {
	if strings.TrimSpace(format) == "" {
		format = "json"
	}
	now := s.now()
	res, err := s.db.ExecContext(ctx, `INSERT INTO export_snapshots(created_at, format, status, payload_json, output_path) VALUES(?, ?, 'pending', '', '')`, now, format)
	if err != nil {
		return ExportSnapshot{}, err
	}
	id, _ := res.LastInsertId()
	return ExportSnapshot{ID: id, CreatedAt: now, Format: format, Status: "pending"}, nil
}

func (s *Store) pruneSessions(ctx context.Context) (int64, error) {
	maxSessions := s.retention.MaxSessions
	if maxSessions <= 0 {
		maxSessions = 100
	}
	maxAge := s.retention.SessionMaxAge
	if maxAge <= 0 {
		maxAge = 14 * 24 * time.Hour
	}
	res1, err := s.db.ExecContext(ctx, `DELETE FROM analysis_sessions WHERE updated_at <= ?`, s.now().Add(-maxAge))
	if err != nil {
		return 0, err
	}
	res2, err := s.db.ExecContext(ctx, `DELETE FROM analysis_sessions WHERE session_id NOT IN (SELECT session_id FROM analysis_sessions ORDER BY updated_at DESC LIMIT ?)`, maxSessions)
	if err != nil {
		return 0, err
	}
	a, _ := res1.RowsAffected()
	b, _ := res2.RowsAffected()
	return a + b, nil
}

func hashText(v string) string {
	h := sha256.Sum256([]byte(v))
	return hex.EncodeToString(h[:])
}

func preview(v string, n int) string {
	v = strings.TrimSpace(v)
	if len(v) <= n {
		return v
	}
	return strings.TrimSpace(v[:n])
}

func replaceIDSet(ctx context.Context, tx *sql.Tx, table, field string, ids []int64) error {
	if _, err := tx.ExecContext(ctx, fmt.Sprintf("DELETE FROM %s", table)); err != nil {
		return err
	}
	uniq := make(map[int64]struct{}, len(ids))
	for _, id := range ids {
		if id > 0 {
			uniq[id] = struct{}{}
		}
	}
	sorted := make([]int64, 0, len(uniq))
	for id := range uniq {
		sorted = append(sorted, id)
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	for _, id := range sorted {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf("INSERT INTO %s(%s, created_at) VALUES(?, ?)", table, field), id, time.Now().UTC()); err != nil {
			return err
		}
	}
	return nil
}

func loadIDSet(ctx context.Context, q interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}, stmt string, args ...any) ([]int64, error) {
	rows, err := q.QueryContext(ctx, stmt, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}
