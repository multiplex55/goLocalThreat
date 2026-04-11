package zkill

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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

func mustLoadFixture(t *testing.T, name string) []byte {
	t.Helper()
	body, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return body
}

func TestParseKillmailsValidRFC3339SetsOccurredAt(t *testing.T) {
	body := mustLoadFixture(t, "killmail_valid_canonical_time.json")
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
	if items[0].OccurredAtIssue != KillmailTimeIssueNone {
		t.Fatalf("unexpected issue reason: %q", items[0].OccurredAtIssue)
	}
}

func TestParseKillmailsParsesFallbackKillmailTime(t *testing.T) {
	body := mustLoadFixture(t, "killmail_alternate_valid_time.json")
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
		t.Fatal("expected non-zero occurredAt for fallback killmail_time")
	}
	if items[0].OccurredAtInvalid {
		t.Fatal("expected OccurredAtInvalid=false for fallback timestamp")
	}
	if items[0].OccurredAtIssue != KillmailTimeIssueNone {
		t.Fatalf("unexpected issue reason: %q", items[0].OccurredAtIssue)
	}
}

func TestParseKillmailsInvalidTimestampCountsAndLeavesZeroOccurredAt(t *testing.T) {
	body := mustLoadFixture(t, "killmail_invalid_time_string.json")
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
	if items[0].OccurredAtIssue != KillmailTimeIssueInvalid {
		t.Fatalf("expected invalid issue reason, got %q", items[0].OccurredAtIssue)
	}
	if items[0].VictimID == 0 || items[0].ShipTypeID == 0 || items[0].SystemID == 0 || items[0].Attackers == 0 {
		t.Fatalf("expected non-time fields to survive invalid timestamp, got %#v", items[0])
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
	body := mustLoadFixture(t, "killmail_missing_time.json")
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
	if items[0].OccurredAtIssue != KillmailTimeIssueMissing {
		t.Fatalf("expected missing issue reason, got %q", items[0].OccurredAtIssue)
	}
	if items[0].VictimID == 0 || items[0].ShipTypeID == 0 || items[0].SystemID == 0 || items[0].Attackers == 0 {
		t.Fatalf("expected non-time fields to survive missing timestamp, got %#v", items[0])
	}
}

func TestParseKillmailsInvalidTimeKeepsNonTimeFields(t *testing.T) {
	body := []byte(`[{
		"killmail_id":44,
		"zkb_time":"invalid",
		"solar_system_id":30000142,
		"victim":{"character_id":9001,"ship_type_id":587,"damage_taken":12345},
		"attackers":[{"character_id":100},{"character_id":200}]
	}]`)
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
	if items[0].VictimID != 9001 || items[0].Attackers != 2 || items[0].ShipTypeID != 587 || items[0].SystemID != 30000142 || items[0].DamageTaken != 12345 {
		t.Fatalf("expected non-time fields to be preserved, got %#v", items[0])
	}
	if !items[0].OccurredAtInvalid {
		t.Fatalf("expected OccurredAtInvalid=true")
	}
}

func TestParseKillmailOccurredAtClassifiesValidMissingInvalid(t *testing.T) {
	ts, issue, class := parseKillmailOccurredAt("2026-04-10T12:34:56Z", "", "")
	if ts.IsZero() || issue != KillmailTimeIssueNone || class != KillmailTimestampValid {
		t.Fatalf("expected valid classification, got ts=%v issue=%q class=%q", ts, issue, class)
	}

	ts, issue, class = parseKillmailOccurredAt("", "", "")
	if !ts.IsZero() || issue != KillmailTimeIssueMissing || class != KillmailTimestampMissing {
		t.Fatalf("expected missing classification, got ts=%v issue=%q class=%q", ts, issue, class)
	}

	ts, issue, class = parseKillmailOccurredAt("not-a-time", "", "")
	if !ts.IsZero() || issue != KillmailTimeIssueInvalid || class != KillmailTimestampInvalid {
		t.Fatalf("expected invalid classification, got ts=%v issue=%q class=%q", ts, issue, class)
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

func TestParseKillmailsMixedValidityStillSupportsDetailSummariesAndMainShip(t *testing.T) {
	body := []byte(`[
		{"killmail_id":1,"zkb_time":"2026-04-10T12:00:00Z","solar_system_id":30000142,"victim":{"character_id":7000,"ship_type_id":900,"damage_taken":10},"attackers":[{"character_id":1}]},
		{"killmail_id":2,"zkb_time":"bad-time","solar_system_id":30000142,"victim":{"character_id":7001,"ship_type_id":900,"damage_taken":20},"attackers":[{"character_id":2},{"character_id":3}]},
		{"killmail_id":3,"time":"","solar_system_id":30000142,"victim":{"character_id":7002,"ship_type_id":901,"damage_taken":30},"attackers":[{"character_id":4}]}
	]`)
	items, invalidCount, err := parseKillmails(body)
	if err != nil {
		t.Fatalf("parseKillmails err: %v", err)
	}
	if invalidCount != 2 {
		t.Fatalf("invalidCount = %d, want 2", invalidCount)
	}
	shipCounts := map[int64]int{}
	for _, km := range items {
		shipCounts[km.ShipTypeID]++
		if km.SystemID == 0 || km.VictimID == 0 || km.Attackers == 0 {
			t.Fatalf("expected detail fields for all rows, got %#v", km)
		}
	}
	if shipCounts[900] != 2 {
		t.Fatalf("expected mainShip derivation input to remain intact, counts=%v", shipCounts)
	}
	if items[1].OccurredAtIssue != KillmailTimeIssueInvalid || items[2].OccurredAtIssue != KillmailTimeIssueMissing {
		t.Fatalf("expected reason classifications invalid/missing, got %q and %q", items[1].OccurredAtIssue, items[2].OccurredAtIssue)
	}
}
