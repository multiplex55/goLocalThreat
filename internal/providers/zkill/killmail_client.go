package zkill

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
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
		baseURL:   strings.TrimRight(baseURL, "/"),
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
	key := fmt.Sprintf("killmail:%d:%d", characterID, limit)
	v, err := c.runMemo.Do(key, func() (any, error) {
		return c.fetchKillmails(ctx, characterID, limit)
	})
	if err != nil {
		return nil, err
	}
	return v.([]Killmail), nil
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

func (c *KillmailClient) fetchKillmails(ctx context.Context, characterID int64, limit int) ([]Killmail, error) {
	cacheKey := fmt.Sprintf("%d:%d", characterID, limit)
	if payload, ok := c.cache.get("killmail", cacheKey); ok {
		return parseKillmails(payload)
	}
	path := fmt.Sprintf("/api/kills/characterID/%d/limit/%d/no-items/orderDirection/desc/", characterID, limit)
	target, err := url.JoinPath(c.baseURL, path)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip")
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
	return parseKillmails(body)
}

func parseKillmails(body []byte) ([]Killmail, error) {
	var payload []struct {
		KillmailID int64  `json:"killmail_id"`
		Time       string `json:"zkb_time"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	out := make([]Killmail, 0, len(payload))
	for _, p := range payload {
		km := Killmail{KillID: p.KillmailID}
		if p.Time != "" {
			if ts, err := time.Parse(time.RFC3339, p.Time); err == nil {
				km.OccurredAt = ts
			}
		}
		out = append(out, km)
	}
	return out, nil
}
