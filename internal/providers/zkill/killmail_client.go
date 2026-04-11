package zkill

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"golocalthreat/internal/cache"
)

const (
	killmailTTL          = 45 * time.Second
	defaultKillmailLimit = 25
	maxKillmailLimit     = 200
)

type KillmailClient struct {
	baseURL   string
	http      *http.Client
	throttle  *Throttler
	cache     *endpointCache
	runMemo   *RunMemo
	userAgent string
}

func NewKillmailClient(baseURL string) *KillmailClient {
	return &KillmailClient{
		baseURL:   normalizeBaseURL(baseURL),
		http:      &http.Client{Timeout: 5 * time.Second},
		throttle:  NewThrottler(200 * time.Millisecond),
		cache:     newEndpointCache(),
		runMemo:   NewRunMemo(),
		userAgent: defaultUserAgent,
	}
}

func (c *KillmailClient) WithHTTPClient(h *http.Client) *KillmailClient { c.http = h; return c }

func (c *KillmailClient) FetchRecentByCharacter(ctx context.Context, characterID int64, limit int) ([]Killmail, error) {
	if characterID <= 0 {
		return nil, fmt.Errorf("character id is required")
	}
	limit = clampLimit(limit)
	key := fmt.Sprintf("killmail:%d", characterID)
	v, err := c.runMemo.Do(key, func() (any, error) {
		return c.fetchKillmails(ctx, characterID)
	})
	if err != nil {
		return nil, err
	}
	items := v.([]Killmail)
	n := limit
	if n > len(items) {
		n = len(items)
	}
	return append([]Killmail(nil), items[:n]...), nil
}

func clampLimit(n int) int {
	if n <= 0 {
		return defaultKillmailLimit
	}
	if n > maxKillmailLimit {
		return maxKillmailLimit
	}
	return n
}

func (c *KillmailClient) fetchKillmails(ctx context.Context, characterID int64) ([]Killmail, error) {
	cacheKey := fmt.Sprintf("%d", characterID)
	if payload, ok := c.cache.get("killmail", cacheKey); ok {
		items, _, _ := parseKillmails(payload)
		return items, nil
	}
	path := fmt.Sprintf("/api/kills/characterID/%d/", characterID)
	target, err := url.JoinPath(c.baseURL, path)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)

	c.throttle.BeforeRequest()
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	c.throttle.AfterResponse(resp.StatusCode)
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return nil, fmt.Errorf("zkill killmail request failed: %d %s", resp.StatusCode, string(b))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	c.cache.set("killmail", cacheKey, body, cache.TTLFromHeaders(resp.Header, killmailTTL))
	items, _, _ := parseKillmails(body)
	return items, nil
}

var zkillTimeFormats = []string{
	"2006-01-02 15:04:05",       // common zKill timestamp form without timezone
	"2006-01-02T15:04:05",       // ISO-like timestamp without timezone
	"2006-01-02 15:04:05 -0700", // timestamp with explicit numeric offset
}

func parseKillmails(body []byte) ([]Killmail, int, error) {
	var payload []struct {
		KillmailID    int64  `json:"killmail_id"`
		CanonicalTime string `json:"zkb_time"`
		FallbackTime  string `json:"killmail_time"`
		LegacyTime    string `json:"time"`
		SystemID      int64  `json:"solar_system_id"`
		Attackers     []struct {
			CharacterID int64 `json:"character_id"`
		} `json:"attackers"`
		Victim struct {
			CharacterID int64 `json:"character_id"`
			ShipTypeID  int64 `json:"ship_type_id"`
			DamageTaken int64 `json:"damage_taken"`
		} `json:"victim"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, 0, err
	}
	out := make([]Killmail, 0, len(payload))
	invalidTimeCount := 0
	for _, p := range payload {
		km := Killmail{
			KillID:      p.KillmailID,
			VictimID:    p.Victim.CharacterID,
			Attackers:   len(p.Attackers),
			ShipTypeID:  p.Victim.ShipTypeID,
			SystemID:    p.SystemID,
			DamageTaken: p.Victim.DamageTaken,
		}
		ts, issue, class := parseKillmailOccurredAt(p.CanonicalTime, p.FallbackTime, p.LegacyTime)
		km.TimestampClass = class
		if issue == KillmailTimeIssueNone {
			km.OccurredAt = ts
		} else {
			km.OccurredAtInvalid = true
			km.OccurredAtIssue = issue
			invalidTimeCount++
		}
		out = append(out, km)
	}
	return out, invalidTimeCount, nil
}

func parseKillmailOccurredAt(canonicalTime string, fallbackTime string, legacyTime string) (time.Time, KillmailTimeIssue, KillmailTimestampClass) {
	timestampFields := []string{canonicalTime, fallbackTime, legacyTime}
	hadValue := false
	for _, raw := range timestampFields {
		if raw == "" {
			continue
		}
		hadValue = true
		if ts, ok := parseZKillTime(raw); ok {
			return ts, KillmailTimeIssueNone, KillmailTimestampValid
		}
	}
	if !hadValue {
		return time.Time{}, KillmailTimeIssueMissing, KillmailTimestampMissing
	}
	return time.Time{}, KillmailTimeIssueInvalid, KillmailTimestampInvalid
}

func parseZKillTime(raw string) (time.Time, bool) {
	if ts, err := time.Parse(time.RFC3339, raw); err == nil {
		return ts, true
	}
	for _, layout := range zkillTimeFormats {
		if ts, err := time.Parse(layout, raw); err == nil {
			return ts, true
		}
	}
	return time.Time{}, false
}
