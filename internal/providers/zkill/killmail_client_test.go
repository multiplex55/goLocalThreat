package zkill

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestKillmailClientRequestShapingAndHeaders(t *testing.T) {
	var gotPath, gotUA, gotEnc string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotUA = r.Header.Get("User-Agent")
		gotEnc = r.Header.Get("Accept-Encoding")
		_, _ = w.Write([]byte(`[{"killmail_id":99,"zkb_time":"2026-04-10T12:00:00Z"}]`))
	}))
	defer ts.Close()

	client := NewKillmailClient(ts.URL)
	_, err := client.FetchRecentByCharacter(context.Background(), 55, 1000)
	if err != nil {
		t.Fatalf("FetchRecentByCharacter err: %v", err)
	}
	if !strings.Contains(gotPath, "/characterID/55/") {
		t.Fatalf("missing character segment in path: %s", gotPath)
	}
	if !strings.Contains(gotPath, "/limit/200/") {
		t.Fatalf("expected clamped limit segment in path: %s", gotPath)
	}
	if !strings.Contains(gotPath, "/no-items/") || !strings.Contains(gotPath, "/orderDirection/desc/") {
		t.Fatalf("required modifiers missing in path: %s", gotPath)
	}
	if gotUA == "" {
		t.Fatal("expected user-agent header")
	}
	if !strings.Contains(gotEnc, "gzip") {
		t.Fatalf("expected gzip accept encoding, got %q", gotEnc)
	}
}

func TestKillmailClientRequiresCharacterID(t *testing.T) {
	client := NewKillmailClient("http://example.com")
	if _, err := client.FetchRecentByCharacter(context.Background(), 0, 10); err == nil {
		t.Fatal("expected character id validation error")
	}
}
