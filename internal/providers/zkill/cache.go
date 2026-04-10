package zkill

import (
	"sync"
	"time"

	"golocalthreat/internal/cache"
)

type endpointCache struct {
	mu   sync.Mutex
	data map[string]*cache.TTLCache[[]byte]
}

func newEndpointCache() *endpointCache {
	return &endpointCache{data: map[string]*cache.TTLCache[[]byte]{}}
}

func (e *endpointCache) get(endpoint, key string) ([]byte, bool) {
	e.mu.Lock()
	c := e.ensure(endpoint)
	e.mu.Unlock()
	return c.Get(key)
}

func (e *endpointCache) set(endpoint, key string, payload []byte, ttl time.Duration) {
	e.mu.Lock()
	c := e.ensure(endpoint)
	e.mu.Unlock()
	c.Set(key, payload, ttl)
}

func (e *endpointCache) ensure(endpoint string) *cache.TTLCache[[]byte] {
	if c, ok := e.data[endpoint]; ok {
		return c
	}
	c := cache.NewTTLCache[[]byte]()
	e.data[endpoint] = c
	return c
}

type memoEntry struct {
	value any
	err   error
}

type RunMemo struct {
	mu      sync.Mutex
	results map[string]memoEntry
}

func NewRunMemo() *RunMemo {
	return &RunMemo{results: map[string]memoEntry{}}
}

func (m *RunMemo) Do(key string, fn func() (any, error)) (any, error) {
	m.mu.Lock()
	if it, ok := m.results[key]; ok {
		m.mu.Unlock()
		return it.value, it.err
	}
	m.mu.Unlock()
	v, err := fn()
	m.mu.Lock()
	m.results[key] = memoEntry{value: v, err: err}
	m.mu.Unlock()
	return v, err
}
