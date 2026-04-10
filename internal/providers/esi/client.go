package esi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"golocalthreat/internal/cache"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi/dto"
)

const (
	defaultTimeout      = 5 * time.Second
	stableMetadataTTL   = 24 * time.Hour
	defaultRetryMax     = 2
	defaultBatchMaxSize = 1000
)

type Client struct {
	baseURL        string
	httpClient     *http.Client
	characterCache *cache.TTLCache[domain.CharacterIdentity]
	corpCache      *cache.TTLCache[string]
	allianceCache  *cache.TTLCache[string]
	retryMax       int
	batchMaxSize   int
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:        strings.TrimRight(baseURL, "/"),
		httpClient:     &http.Client{Timeout: defaultTimeout},
		characterCache: cache.NewTTLCache[domain.CharacterIdentity](),
		corpCache:      cache.NewTTLCache[string](),
		allianceCache:  cache.NewTTLCache[string](),
		retryMax:       defaultRetryMax,
		batchMaxSize:   defaultBatchMaxSize,
	}
}

func (c *Client) WithHTTPClient(h *http.Client) *Client { c.httpClient = h; return c }
func (c *Client) WithRetryMax(n int) *Client            { c.retryMax = n; return c }
func (c *Client) WithBatchMaxSize(n int) *Client        { c.batchMaxSize = n; return c }

func (c *Client) ResolveNames(ctx context.Context, names []string) (ResolvedNames, error) {
	if len(names) == 0 {
		return ResolvedNames{Characters: map[string]int64{}}, nil
	}
	body, err := json.Marshal(dto.ResolveNamesRequest(names))
	if err != nil {
		return ResolvedNames{}, err
	}

	req, err := c.newRequest(ctx, http.MethodPost, "/universe/ids/", bytes.NewReader(body))
	if err != nil {
		return ResolvedNames{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	var payload dto.ResolveNamesResponse
	h, err := c.doJSON(req, &payload)
	if err != nil {
		return ResolvedNames{}, err
	}
	_ = h

	found := make(map[string]int64, len(payload.Characters))
	for _, ch := range payload.Characters {
		found[strings.ToLower(ch.Name)] = ch.ID
	}
	result := ResolvedNames{Characters: make(map[string]int64, len(names))}
	for _, name := range names {
		if id, ok := found[strings.ToLower(name)]; ok {
			result.Characters[name] = id
		} else {
			result.Unresolved = append(result.Unresolved, name)
		}
	}
	return result, nil
}

func (c *Client) GetCharacters(ctx context.Context, ids []int64) ([]domain.CharacterIdentity, error) {
	unique := dedupeIDs(ids)
	out := make([]domain.CharacterIdentity, 0, len(unique))
	missing := make([]int64, 0, len(unique))
	for _, id := range unique {
		if cached, ok := c.characterCache.Get(strconv.FormatInt(id, 10)); ok {
			out = append(out, cached)
			continue
		}
		missing = append(missing, id)
	}

	if len(missing) == 0 {
		sort.Slice(out, func(i, j int) bool { return out[i].CharacterID < out[j].CharacterID })
		return out, nil
	}

	failed := make([]int64, 0)
	for _, id := range missing {
		ch, ttl, err := c.fetchCharacter(ctx, id)
		if err != nil {
			if domain.IsRateLimited(err) {
				return out, err
			}
			failed = append(failed, id)
			continue
		}
		c.characterCache.Set(strconv.FormatInt(id, 10), ch, ttl)
		out = append(out, ch)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CharacterID < out[j].CharacterID })
	if len(failed) > 0 {
		return out, domain.PartialBatchError{Operation: "GetCharacters", FailedIDs: failed}
	}
	return out, nil
}

func (c *Client) GetCorporations(ctx context.Context, ids []int64) (map[int64]string, error) {
	return c.getEntityNames(ctx, ids, "/corporations/%d/", c.corpCache)
}

func (c *Client) GetAlliances(ctx context.Context, ids []int64) (map[int64]string, error) {
	return c.getEntityNames(ctx, ids, "/alliances/%d/", c.allianceCache)
}

func (c *Client) getEntityNames(ctx context.Context, ids []int64, pattern string, entityCache *cache.TTLCache[string]) (map[int64]string, error) {
	result := make(map[int64]string)
	failed := make([]int64, 0)
	for _, id := range dedupeIDs(ids) {
		cacheKey := strconv.FormatInt(id, 10)
		if v, ok := entityCache.Get(cacheKey); ok {
			result[id] = v
			continue
		}
		req, err := c.newRequest(ctx, http.MethodGet, fmt.Sprintf(pattern, id), nil)
		if err != nil {
			if domain.IsRateLimited(err) {
				return result, err
			}
			failed = append(failed, id)
			continue
		}
		var payload map[string]any
		headers, err := c.doJSON(req, &payload)
		if err != nil {
			if domain.IsRateLimited(err) {
				return result, err
			}
			failed = append(failed, id)
			continue
		}
		name, _ := payload["name"].(string)
		if name == "" {
			failed = append(failed, id)
			continue
		}
		ttl := cache.TTLFromHeaders(headers, stableMetadataTTL)
		entityCache.Set(cacheKey, name, ttl)
		result[id] = name
	}
	if len(failed) > 0 {
		return result, domain.PartialBatchError{Operation: "entity metadata", FailedIDs: failed}
	}
	return result, nil
}

func (c *Client) fetchCharacter(ctx context.Context, id int64) (domain.CharacterIdentity, time.Duration, error) {
	req, err := c.newRequest(ctx, http.MethodGet, fmt.Sprintf("/characters/%d/", id), nil)
	if err != nil {
		return domain.CharacterIdentity{}, 0, err
	}
	var payload dto.Character
	headers, err := c.doJSON(req, &payload)
	if err != nil {
		return domain.CharacterIdentity{}, 0, err
	}
	identity := domain.CharacterIdentity{
		CharacterID: payload.CharacterID,
		Name:        payload.Name,
		CorpID:      payload.CorporationID,
		AllianceID:  payload.AllianceID,
	}
	return identity, cache.TTLFromHeaders(headers, stableMetadataTTL), nil
}

func (c *Client) newRequest(ctx context.Context, method, path string, body io.Reader) (*http.Request, error) {
	target, err := url.JoinPath(c.baseURL, path)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, method, target, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	return req, nil
}

func (c *Client) doJSON(req *http.Request, out any) (http.Header, error) {
	var lastErr error
	for attempt := 0; attempt <= c.retryMax; attempt++ {
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
		} else {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusTooManyRequests {
				return nil, fmt.Errorf("esi request failed: %w", domain.ErrRateLimited)
			}
			if resp.StatusCode >= 500 {
				lastErr = fmt.Errorf("esi 5xx: %d", resp.StatusCode)
			} else if resp.StatusCode >= 400 {
				b, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
				return nil, fmt.Errorf("esi request failed: status=%d body=%s", resp.StatusCode, string(b))
			} else {
				if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
					return nil, err
				}
				return resp.Header, nil
			}
		}

		if attempt < c.retryMax && transient(lastErr) {
			backoff := time.Duration(math.Pow(2, float64(attempt))) * 50 * time.Millisecond
			select {
			case <-time.After(backoff):
			case <-req.Context().Done():
				return nil, req.Context().Err()
			}
			continue
		}
		break
	}
	if errors.Is(lastErr, context.DeadlineExceeded) || errors.Is(lastErr, context.Canceled) {
		return nil, lastErr
	}
	if lastErr == nil {
		lastErr = errors.New("unknown esi failure")
	}
	return nil, fmt.Errorf("esi request failed: %w", lastErr)
}

func transient(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "5xx") || strings.Contains(strings.ToLower(msg), "timeout")
}

func dedupeIDs(ids []int64) []int64 {
	seen := make(map[int64]struct{}, len(ids))
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
