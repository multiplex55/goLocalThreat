package esi_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync/atomic"
	"testing"
	"time"

	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
)

func TestResolveNamesSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/universe/ids/" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"characters": []map[string]any{{"id": int64(1001), "name": "Alice"}}})
	}))
	defer srv.Close()

	client := esi.NewClient(srv.URL).WithHTTPClient(&http.Client{Timeout: time.Second})
	result, err := client.ResolveNames(context.Background(), []string{"Alice"})
	if err != nil {
		t.Fatalf("ResolveNames err: %v", err)
	}
	if got := result.Characters["Alice"]; got != 1001 {
		t.Fatalf("expected 1001, got %d", got)
	}
}

func TestResolveNamesPartialUnresolved(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"characters": []map[string]any{{"id": int64(1001), "name": "Alice"}}})
	}))
	defer srv.Close()

	client := esi.NewClient(srv.URL)
	result, err := client.ResolveNames(context.Background(), []string{"Alice", "Bob"})
	if err != nil {
		t.Fatalf("ResolveNames err: %v", err)
	}
	if !reflect.DeepEqual(result.Unresolved, []string{"Bob"}) {
		t.Fatalf("unexpected unresolved: %#v", result.Unresolved)
	}
}

func TestRetryOn5xxThenSuccess(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		call := calls.Add(1)
		if call == 1 {
			http.Error(w, "oops", http.StatusBadGateway)
			return
		}
		w.Header().Set("Cache-Control", "max-age=60")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"character_id": int64(7), "name": "Alice", "corporation_id": int64(44), "alliance_id": int64(55)})
	}))
	defer srv.Close()

	client := esi.NewClient(srv.URL).WithRetryMax(2)
	chars, err := client.GetCharacters(context.Background(), []int64{7})
	if err != nil {
		t.Fatalf("GetCharacters err: %v", err)
	}
	if len(chars) != 1 || chars[0].CharacterID != 7 {
		t.Fatalf("unexpected characters: %#v", chars)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected 2 calls, got %d", calls.Load())
	}
}

func TestErrorNormalizationOnHardFailures(t *testing.T) {
	t.Run("rate-limited", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "slow", http.StatusTooManyRequests)
		}))
		defer srv.Close()

		client := esi.NewClient(srv.URL)
		_, err := client.GetCharacters(context.Background(), []int64{1})
		if err == nil {
			t.Fatal("expected error")
		}
		if !errors.Is(err, domain.ErrRateLimited) {
			t.Fatalf("expected rate-limited error, got: %v", err)
		}
	})

	t.Run("partial-batch", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/characters/1/" {
				http.Error(w, "boom", http.StatusInternalServerError)
				return
			}
			if r.URL.Path != "/characters/2/" {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"character_id": int64(2), "name": "Bob", "corporation_id": int64(88)})
		}))
		defer srv.Close()

		client := esi.NewClient(srv.URL).WithRetryMax(0)
		chars, err := client.GetCharacters(context.Background(), []int64{1, 2})
		if len(chars) != 1 || chars[0].CharacterID != 2 {
			t.Fatalf("expected successful character 2, got: %#v", chars)
		}
		var partial domain.PartialBatchError
		if !errors.As(err, &partial) {
			t.Fatalf("expected PartialBatchError, got: %v", err)
		}
	})
}
