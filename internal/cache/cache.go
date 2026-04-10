package cache

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type item[T any] struct {
	value     T
	expiresAt time.Time
}

type TTLCache[T any] struct {
	mu    sync.RWMutex
	items map[string]item[T]
	now   func() time.Time
}

func NewTTLCache[T any]() *TTLCache[T] {
	return &TTLCache[T]{
		items: make(map[string]item[T]),
		now:   time.Now,
	}
}

func (c *TTLCache[T]) SetNow(now func() time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = now
}

func (c *TTLCache[T]) Get(key string) (T, bool) {
	c.mu.RLock()
	it, ok := c.items[key]
	now := c.now
	c.mu.RUnlock()
	if !ok {
		var zero T
		return zero, false
	}
	if !it.expiresAt.IsZero() && now().After(it.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		var zero T
		return zero, false
	}
	return it.value, true
}

func (c *TTLCache[T]) Set(key string, value T, ttl time.Duration) {
	expiresAt := time.Time{}
	if ttl > 0 {
		c.mu.RLock()
		now := c.now
		c.mu.RUnlock()
		expiresAt = now().Add(ttl)
	}
	c.mu.Lock()
	c.items[key] = item[T]{value: value, expiresAt: expiresAt}
	c.mu.Unlock()
}

func TTLFromHeaders(h http.Header, fallback time.Duration) time.Duration {
	cc := h.Get("Cache-Control")
	for _, part := range strings.Split(cc, ",") {
		part = strings.TrimSpace(strings.ToLower(part))
		if strings.HasPrefix(part, "max-age=") {
			sec, err := strconv.Atoi(strings.TrimPrefix(part, "max-age="))
			if err == nil && sec > 0 {
				return time.Duration(sec) * time.Second
			}
		}
	}
	if exp := h.Get("Expires"); exp != "" {
		if when, err := http.ParseTime(exp); err == nil {
			d := time.Until(when)
			if d > 0 {
				return d
			}
		}
	}
	return fallback
}
