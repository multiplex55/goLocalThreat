package zkill

import (
	"testing"
	"time"
)

func TestThrottlerSpacingAndBackoff(t *testing.T) {
	var now = time.Unix(0, 0)
	var slept []time.Duration
	thr := NewThrottler(100 * time.Millisecond)
	thr.SetClock(func() time.Time { return now }, func(d time.Duration) {
		slept = append(slept, d)
		now = now.Add(d)
	})

	thr.BeforeRequest()
	now = now.Add(20 * time.Millisecond)
	thr.BeforeRequest()
	if len(slept) == 0 || slept[len(slept)-1] != 80*time.Millisecond {
		t.Fatalf("expected spacing sleep of 80ms, got %#v", slept)
	}

	thr.AfterResponse(429)
	now = now.Add(20 * time.Millisecond)
	thr.BeforeRequest()
	if slept[len(slept)-1] <= 80*time.Millisecond {
		t.Fatalf("expected increased wait after 429, got %#v", slept)
	}

	thr.AfterResponse(200)
	now = now.Add(20 * time.Millisecond)
	thr.BeforeRequest()
	if slept[len(slept)-1] != 80*time.Millisecond {
		t.Fatalf("expected penalty reset after success, got %#v", slept)
	}
}
