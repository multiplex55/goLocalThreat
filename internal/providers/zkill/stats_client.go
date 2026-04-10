package zkill

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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
		baseURL:   strings.TrimRight(baseURL, "/"),
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
		return parseSummaryRow(payload)
	}
	target, err := url.JoinPath(c.baseURL, "/stats/character", cacheKey)
	if err != nil {
		return SummaryRow{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return SummaryRow{}, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip")
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
	return parseSummaryRow(body)
}

func parseSummaryRow(body []byte) (SummaryRow, error) {
	var payload struct {
		CharacterID int64   `json:"character_id"`
		Kills       int     `json:"kills"`
		Losses      int     `json:"losses"`
		Danger      float64 `json:"danger"`
		LastSeen    string  `json:"last_seen"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return SummaryRow{}, err
	}
	parsed := SummaryRow{
		CharacterID:  payload.CharacterID,
		RecentKills:  payload.Kills,
		RecentLosses: payload.Losses,
		DangerRatio:  payload.Danger,
	}
	if payload.LastSeen != "" {
		if t, err := time.Parse(time.RFC3339, payload.LastSeen); err == nil {
			parsed.LastActivity = t
		}
	}
	return parsed, nil
}
