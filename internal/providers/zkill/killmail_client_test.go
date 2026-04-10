package zkill

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestKillmailClientRequestShapingAndHeaders(t *testing.T) {
	var gotPath, gotUA, gotEnc string
	client := NewKillmailClient("https://zkillboard.com")
	client.WithHTTPClient(&http.Client{Transport: roundTripperFunc(func(r *http.Request) (*http.Response, error) {
		gotPath = r.URL.Path
		gotUA = r.Header.Get("User-Agent")
		gotEnc = r.Header.Get("Accept-Encoding")
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`[{"killmail_id":99,"zkb_time":"2026-04-10T12:00:00Z"}]`)),
			Header:     make(http.Header),
		}, nil
	})})

	_, err := client.FetchRecentByCharacter(context.Background(), 55, 1000)
	if err != nil {
		t.Fatalf("FetchRecentByCharacter err: %v", err)
	}
	if gotPath != "/api/kills/characterID/55/" {
		t.Fatalf("unexpected path: got %q", gotPath)
	}
	if strings.Contains(gotPath, "/limit/") || strings.Contains(gotPath, "/no-items/") || strings.Contains(gotPath, "/orderDirection/") {
		t.Fatalf("deprecated path segments present: %s", gotPath)
	}
	if gotUA == "" {
		t.Fatal("expected user-agent header")
	}
	if gotEnc != "" {
		t.Fatalf("expected no explicit accept-encoding header, got %q", gotEnc)
	}
}

func TestKillmailClientAppliesLimitLocallyWithCharacterScopedMemoization(t *testing.T) {
	calls := 0
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		_, _ = w.Write([]byte(`[
			{"killmail_id":1,"zkb_time":"2026-04-10T12:00:00Z"},
			{"killmail_id":2,"zkb_time":"2026-04-10T12:01:00Z"},
			{"killmail_id":3,"zkb_time":"2026-04-10T12:02:00Z"}
		]`))
	}))
	defer ts.Close()

	client := NewKillmailClient(ts.URL)

	first, err := client.FetchRecentByCharacter(context.Background(), 55, 3)
	if err != nil {
		t.Fatalf("first fetch err: %v", err)
	}
	if len(first) != 3 {
		t.Fatalf("first fetch len = %d, want 3", len(first))
	}
	if calls != 1 {
		t.Fatalf("network calls after first request = %d, want 1", calls)
	}

	second, err := client.FetchRecentByCharacter(context.Background(), 55, 1)
	if err != nil {
		t.Fatalf("second fetch err: %v", err)
	}
	if len(second) != 1 {
		t.Fatalf("second fetch len = %d, want 1", len(second))
	}
	if calls != 1 {
		t.Fatalf("network calls after second request = %d, want 1", calls)
	}
}

func TestKillmailClientLimitAboveAvailableReturnsAllAvailable(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`[
			{"killmail_id":10,"zkb_time":"2026-04-10T12:00:00Z"},
			{"killmail_id":11,"zkb_time":"2026-04-10T12:01:00Z"}
		]`))
	}))
	defer ts.Close()

	client := NewKillmailClient(ts.URL)
	items, err := client.FetchRecentByCharacter(context.Background(), 77, 999)
	if err != nil {
		t.Fatalf("FetchRecentByCharacter err: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("len(items) = %d, want 2", len(items))
	}
}

func TestKillmailClientRequiresCharacterID(t *testing.T) {
	client := NewKillmailClient("http://example.com")
	if _, err := client.FetchRecentByCharacter(context.Background(), 0, 10); err == nil {
		t.Fatal("expected character id validation error")
	}
}

func TestParseKillmailsValidRFC3339SetsOccurredAt(t *testing.T) {
	body := []byte(`[{"killmail_id":7,"zkb_time":"2026-04-10T12:34:56Z"}]`)
	items, invalidCount, err := parseKillmails(body)
	if err != nil {
		t.Fatalf("parseKillmails err: %v", err)
	}
	if invalidCount != 0 {
		t.Fatalf("invalidCount = %d, want 0", invalidCount)
	}
	if len(items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(items))
	}
	if items[0].OccurredAt.IsZero() {
		t.Fatal("expected non-zero occurredAt for valid RFC3339 timestamp")
	}
	if items[0].OccurredAtInvalid {
		t.Fatal("expected OccurredAtInvalid=false for valid timestamp")
	}
}

func TestParseKillmailsInvalidTimestampCountsAndLeavesZeroOccurredAt(t *testing.T) {
	body := []byte(`[{"killmail_id":8,"zkb_time":"not-a-time"}]`)
	items, invalidCount, err := parseKillmails(body)
	if err != nil {
		t.Fatalf("parseKillmails err: %v", err)
	}
	if invalidCount != 1 {
		t.Fatalf("invalidCount = %d, want 1", invalidCount)
	}
	if len(items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(items))
	}
	if !items[0].OccurredAt.IsZero() {
		t.Fatalf("occurredAt = %s, want zero time", items[0].OccurredAt)
	}
	if !items[0].OccurredAtInvalid {
		t.Fatal("expected OccurredAtInvalid=true for invalid timestamp")
	}
}

func TestParseKillmailsMixedPayloadPreservesOrderAndCountsInvalidTimes(t *testing.T) {
	body := []byte(`[
		{"killmail_id":1,"zkb_time":"2026-04-10T12:00:00Z"},
		{"killmail_id":2,"zkb_time":"bad-time"},
		{"killmail_id":3,"zkb_time":"2026-04-10 12:03:00"}
	]`)
	items, invalidCount, err := parseKillmails(body)
	if err != nil {
		t.Fatalf("parseKillmails err: %v", err)
	}
	if invalidCount != 1 {
		t.Fatalf("invalidCount = %d, want 1", invalidCount)
	}
	if len(items) != 3 {
		t.Fatalf("len(items) = %d, want 3", len(items))
	}
	gotIDs := []int64{items[0].KillID, items[1].KillID, items[2].KillID}
	wantIDs := []int64{1, 2, 3}
	for i := range wantIDs {
		if gotIDs[i] != wantIDs[i] {
			t.Fatalf("killmail order mismatch at %d: got %v want %v", i, gotIDs, wantIDs)
		}
	}
	if items[0].OccurredAt.IsZero() || items[2].OccurredAt.IsZero() {
		t.Fatalf("expected alternate and RFC3339 formats to parse: %#v", items)
	}
}

func TestParseKillmailsEmptyTimestampCountedAsMissing(t *testing.T) {
	body := []byte(`[{"killmail_id":9,"zkb_time":""}]`)
	items, invalidCount, err := parseKillmails(body)
	if err != nil {
		t.Fatalf("parseKillmails err: %v", err)
	}
	if invalidCount != 1 {
		t.Fatalf("invalidCount = %d, want 1", invalidCount)
	}
	if len(items) != 1 {
		t.Fatalf("len(items) = %d, want 1", len(items))
	}
	if !items[0].OccurredAt.IsZero() {
		t.Fatalf("occurredAt = %s, want zero time", items[0].OccurredAt)
	}
	if !items[0].OccurredAtInvalid {
		t.Fatal("expected OccurredAtInvalid=true for empty timestamp")
	}
}

func TestParseZKillTimeParsesRFC3339First(t *testing.T) {
	got, ok := parseZKillTime("2026-04-10T12:34:56Z")
	if !ok {
		t.Fatal("expected RFC3339 parse success")
	}
	want := time.Date(2026, 4, 10, 12, 34, 56, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("parsed time = %s, want %s", got, want)
	}
}
