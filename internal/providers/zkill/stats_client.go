package zkill

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"golocalthreat/internal/cache"
)

const (
	defaultUserAgent = "goLocalThreat/1.0 (+https://github.com/example/goLocalThreat)"
	statsTTL         = 2 * time.Minute
)

type StatsClient struct {
	baseURL   string
	http      *http.Client
	throttle  *Throttler
	cache     *endpointCache
	runMemo   *RunMemo
	userAgent string
}

func NewStatsClient(baseURL string) *StatsClient {
	return &StatsClient{
		baseURL:   normalizeBaseURL(baseURL),
		http:      &http.Client{Timeout: 5 * time.Second},
		throttle:  NewThrottler(120 * time.Millisecond),
		cache:     newEndpointCache(),
		runMemo:   NewRunMemo(),
		userAgent: defaultUserAgent,
	}
}

func (c *StatsClient) WithHTTPClient(h *http.Client) *StatsClient { c.http = h; return c }

func (c *StatsClient) FetchSummary(ctx context.Context, characterID int64) (SummaryRow, error) {
	key := fmt.Sprintf("summary:%d", characterID)
	v, err := c.runMemo.Do(key, func() (any, error) {
		return c.fetchSummary(ctx, characterID)
	})
	if err != nil {
		return SummaryRow{}, err
	}
	return v.(SummaryRow), nil
}

func (c *StatsClient) fetchSummary(ctx context.Context, characterID int64) (SummaryRow, error) {
	cacheKey := strconv.FormatInt(characterID, 10)
	if payload, ok := c.cache.get("stats", cacheKey); ok {
		row, _, err := parseSummaryRow(payload)
		return row, err
	}
	target := fmt.Sprintf("%s/api/stats/characterID/%s/", c.baseURL, cacheKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return SummaryRow{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)

	c.throttle.BeforeRequest()
	resp, err := c.http.Do(req)
	if err != nil {
		return SummaryRow{}, err
	}
	defer resp.Body.Close()
	c.throttle.AfterResponse(resp.StatusCode)
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return SummaryRow{}, fmt.Errorf("zkill stats request failed: %d %s", resp.StatusCode, string(b))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return SummaryRow{}, err
	}
	c.cache.set("stats", cacheKey, body, cache.TTLFromHeaders(resp.Header, statsTTL))
	row, _, err := parseSummaryRow(body)
	return row, err
}

type SummaryParseWarning struct {
	Code      string
	Message   string
	Source    string
	SourceVal float64
}

func parseSummaryRow(body []byte) (SummaryRow, *SummaryParseWarning, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return SummaryRow{}, nil, err
	}

	row := SummaryRow{}
	row.CharacterID = int64FromAny(payload["character_id"])
	if row.CharacterID == 0 {
		row.CharacterID = int64FromAny(payload["characterID"])
	}
	if row.CharacterID == 0 {
		row.CharacterID = int64FromAny(payload["id"])
	}
	if row.CharacterID == 0 {
		if info, ok := payload["info"].(map[string]any); ok {
			row.CharacterID = int64FromAny(info["id"])
		}
	}

	row.RecentKills, row.RecentKillsKnown = firstInt(payload,
		"kills",
		"shipsDestroyed",
		"ships_destroyed",
	)
	row.RecentLosses, row.RecentLossesKnown = firstInt(payload,
		"losses",
		"shipsLost",
		"ships_lost",
	)

	if danger, ok := firstFloat(payload, "danger"); ok {
		row.DangerRatio = danger
		row.DangerRatioKnown = true
	} else if dangerPct, ok := firstFloat(payload, "dangerRatio", "danger_ratio"); ok {
		row.DangerRatio = dangerPct / 100
		row.DangerRatioKnown = true
	}

	if ts := parseActivityTimestamp(payload); !ts.IsZero() {
		row.LastActivity = ts
	}

	if warning := detectParseDriftWarning(payload, row); warning != nil {
		return row, warning, nil
	}
	return row, nil, nil
}

func detectParseDriftWarning(payload map[string]any, row SummaryRow) *SummaryParseWarning {
	if (row.RecentKillsKnown && row.RecentKills != 0) || (row.RecentLossesKnown && row.RecentLosses != 0) || (row.DangerRatioKnown && row.DangerRatio != 0) {
		return nil
	}
	if v, ok := firstFloat(payload, "shipsDestroyed", "kills", "ships_destroyed"); ok && v > 0 {
		return &SummaryParseWarning{Code: "summary_all_zero_despite_nonzero_source", Message: "parsed summary returned all zero combat stats while source kills were nonzero", Source: "kills", SourceVal: v}
	}
	if v, ok := firstFloat(payload, "shipsLost", "losses", "ships_lost"); ok && v > 0 {
		return &SummaryParseWarning{Code: "summary_all_zero_despite_nonzero_source", Message: "parsed summary returned all zero combat stats while source losses were nonzero", Source: "losses", SourceVal: v}
	}
	if v, ok := firstFloat(payload, "dangerRatio", "danger", "danger_ratio"); ok && v > 0 {
		return &SummaryParseWarning{Code: "summary_all_zero_despite_nonzero_source", Message: "parsed summary returned all zero combat stats while source danger was nonzero", Source: "danger", SourceVal: v}
	}
	if v, ok := nestedFloat(payload, []string{"combat", "kills"}, []string{"summary", "kills"}, []string{"stats", "kills"}); ok && v > 0 {
		return &SummaryParseWarning{Code: "summary_all_zero_despite_nonzero_source", Message: "parsed summary returned all zero combat stats while nested source kills were nonzero", Source: "nested.kills", SourceVal: v}
	}
	return nil
}

func parseActivityTimestamp(payload map[string]any) time.Time {
	if s, ok := firstString(payload, "last_seen", "lastSeen", "last_activity", "lastActivity"); ok {
		if t, ok := parseTimestamp(s); ok {
			return t
		}
	}
	if epoch, ok := firstFloat(payload, "epoch"); ok && epoch > 0 {
		return time.Unix(int64(epoch), 0).UTC()
	}
	if info, ok := payload["info"].(map[string]any); ok {
		if t := parseMongoDate(info, "lastApiUpdate", "lastAffUpdate"); !t.IsZero() {
			return t
		}
	}
	return time.Time{}
}

func parseMongoDate(parent map[string]any, keys ...string) time.Time {
	for _, k := range keys {
		raw, ok := parent[k].(map[string]any)
		if !ok {
			continue
		}
		d, ok := raw["$date"].(map[string]any)
		if !ok {
			continue
		}
		ms := int64FromAny(d["$numberLong"])
		if ms <= 0 {
			continue
		}
		return time.UnixMilli(ms).UTC()
	}
	return time.Time{}
}

func parseTimestamp(raw string) (time.Time, bool) {
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, true
	}
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02T15:04:05"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return t.UTC(), true
		}
	}
	return time.Time{}, false
}

func firstInt(payload map[string]any, keys ...string) (int, bool) {
	for _, k := range keys {
		if n, ok := payload[k]; ok {
			return int(int64FromAny(n)), true
		}
	}
	return 0, false
}

func firstFloat(payload map[string]any, keys ...string) (float64, bool) {
	for _, k := range keys {
		if n, ok := payload[k]; ok {
			if v, ok := float64FromAny(n); ok {
				return v, true
			}
		}
	}
	return 0, false
}

func firstString(payload map[string]any, keys ...string) (string, bool) {
	for _, k := range keys {
		if raw, ok := payload[k]; ok {
			if s, ok := raw.(string); ok && s != "" {
				return s, true
			}
		}
	}
	return "", false
}

func int64FromAny(v any) int64 {
	f, ok := float64FromAny(v)
	if !ok {
		return 0
	}
	return int64(f)
}

func float64FromAny(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case int32:
		return float64(t), true
	case json.Number:
		f, err := t.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(t, 64)
		return f, err == nil
	default:
		return 0, false
	}
}

func nestedFloat(payload map[string]any, paths ...[]string) (float64, bool) {
	for _, path := range paths {
		var cur any = payload
		for _, part := range path {
			m, ok := cur.(map[string]any)
			if !ok {
				cur = nil
				break
			}
			cur = m[part]
		}
		if v, ok := float64FromAny(cur); ok {
			return v, true
		}
	}
	return 0, false
}
