package zkill

import (
	"testing"
	"time"
)

func TestEndpointCacheTTLsArePerEndpoint(t *testing.T) {
	c := newEndpointCache()
	c.set("stats", "42", []byte("a"), time.Hour)
	c.set("killmail", "42", []byte("b"), time.Hour)

	av, aok := c.get("stats", "42")
	bv, bok := c.get("killmail", "42")
	if !aok || !bok {
		t.Fatalf("expected cache entries for both endpoints")
	}
	if string(av) != "a" || string(bv) != "b" {
		t.Fatalf("unexpected per-endpoint values: %q %q", av, bv)
	}
}

func TestRunMemoMemoizesWithinRun(t *testing.T) {
	m := NewRunMemo()
	calls := 0
	fn := func() (any, error) {
		calls++
		return 7, nil
	}
	_, _ = m.Do("same", fn)
	_, _ = m.Do("same", fn)
	if calls != 1 {
		t.Fatalf("expected 1 call after memoization, got %d", calls)
	}
}
