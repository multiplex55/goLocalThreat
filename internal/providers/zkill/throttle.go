package zkill

import (
	"sync"
	"time"
)

type Throttler struct {
	mu         sync.Mutex
	now        func() time.Time
	sleep      func(time.Duration)
	minSpacing time.Duration
	penalty    time.Duration
	maxPenalty time.Duration
	lastSent   time.Time
}

func NewThrottler(minSpacing time.Duration) *Throttler {
	return &Throttler{
		now:        time.Now,
		sleep:      time.Sleep,
		minSpacing: minSpacing,
		maxPenalty: 2 * time.Second,
	}
}

func (t *Throttler) SetClock(now func() time.Time, sleep func(time.Duration)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if now != nil {
		t.now = now
	}
	if sleep != nil {
		t.sleep = sleep
	}
}

func (t *Throttler) BeforeRequest() {
	t.mu.Lock()
	defer t.mu.Unlock()
	wait := t.minSpacing + t.penalty - t.now().Sub(t.lastSent)
	if wait > 0 {
		t.sleep(wait)
	}
	t.lastSent = t.now()
}

func (t *Throttler) AfterResponse(status int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if status == 429 || status >= 500 {
		if t.penalty == 0 {
			t.penalty = t.minSpacing
		} else {
			t.penalty *= 2
		}
		if t.penalty > t.maxPenalty {
			t.penalty = t.maxPenalty
		}
		return
	}
	t.penalty = 0
}
