package esi_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"golocalthreat/internal/providers/esi"
)

func TestCharacterCacheHitMissAndTTLExpiry(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "max-age=1")
		_ = json.NewEncoder(w).Encode(map[string]any{"character_id": int64(77), "name": "Cache Pilot", "corporation_id": int64(66)})
	}))
	defer srv.Close()

	client := esi.NewClient(srv.URL)
	ctx := context.Background()

	if _, err := client.GetCharacters(ctx, []int64{77}); err != nil {
		t.Fatalf("first GetCharacters err: %v", err)
	}
	if _, err := client.GetCharacters(ctx, []int64{77}); err != nil {
		t.Fatalf("second GetCharacters err: %v", err)
	}
	if got := calls.Load(); got != 1 {
		t.Fatalf("expected 1 call after cache hit, got %d", got)
	}

	time.Sleep(1100 * time.Millisecond)
	if _, err := client.GetCharacters(ctx, []int64{77}); err != nil {
		t.Fatalf("third GetCharacters err: %v", err)
	}
	if got := calls.Load(); got != 2 {
		t.Fatalf("expected cache miss after ttl expiry, got calls=%d", got)
	}
}
