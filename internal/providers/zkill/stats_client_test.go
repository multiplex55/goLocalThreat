package zkill

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseSummaryRowAndMapThreat(t *testing.T) {
	row, err := parseSummaryRow([]byte(`{"character_id":42,"kills":7,"losses":2,"danger":1.5,"last_seen":"2026-04-10T12:00:00Z"}`))
	if err != nil {
		t.Fatalf("parseSummaryRow err: %v", err)
	}
	if row.CharacterID != 42 || row.RecentKills != 7 || row.RecentLosses != 2 {
		t.Fatalf("unexpected summary row: %#v", row)
	}
	threat := row.ToThreatBreakdown()
	if threat.RecentKills != 7 || threat.RecentLosses != 2 || threat.Total <= 0 {
		t.Fatalf("unexpected threat mapping: %#v", threat)
	}
}

func TestStatsClientUsesCacheBeforeNetwork(t *testing.T) {
	calls := 0
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Cache-Control", "max-age=60")
		_, _ = w.Write([]byte(`{"character_id":7,"kills":2,"losses":1,"danger":0.5}`))
	}))
	defer ts.Close()

	client := NewStatsClient(ts.URL)
	if _, err := client.FetchSummary(context.Background(), 7); err != nil {
		t.Fatalf("FetchSummary #1 err: %v", err)
	}
	if _, err := client.FetchSummary(context.Background(), 7); err != nil {
		t.Fatalf("FetchSummary #2 err: %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected one network call due to cache+memo, got %d", calls)
	}
}

func TestStatsClientFetchSummaryBuildsExactPathAndUserAgent(t *testing.T) {
	const characterID int64 = 90000001
	const expectedPath = "/api/stats/characterID/90000001/"

	var gotPath string
	var gotAccept string
	var gotAcceptEncoding string
	var gotUserAgent string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAccept = r.Header.Get("Accept")
		gotAcceptEncoding = r.Header.Get("Accept-Encoding")
		gotUserAgent = r.Header.Get("User-Agent")
		_, _ = w.Write([]byte(`{"character_id":90000001,"kills":1,"losses":0,"danger":1.0}`))
	}))
	defer ts.Close()

	httpClient := &http.Client{
		Transport: &http.Transport{
			DisableCompression: true,
		},
	}
	client := NewStatsClient(ts.URL + "/api/").WithHTTPClient(httpClient)
	if _, err := client.FetchSummary(context.Background(), characterID); err != nil {
		t.Fatalf("FetchSummary err: %v", err)
	}

	if gotPath != expectedPath {
		t.Fatalf("request path = %q, want %q", gotPath, expectedPath)
	}
	if gotAccept != "application/json" {
		t.Fatalf("request Accept = %q, want %q", gotAccept, "application/json")
	}
	if gotAcceptEncoding != "" {
		t.Fatalf("request should not set Accept-Encoding explicitly, got %q", gotAcceptEncoding)
	}
	if gotUserAgent == "" {
		t.Fatal("request missing User-Agent header")
	}
}
