package zkill

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"
)

type statsClientStub struct {
	calledWith int64
	out        SummaryRow
	err        error
}

func (s *statsClientStub) FetchSummary(_ context.Context, characterID int64) (SummaryRow, error) {
	s.calledWith = characterID
	return s.out, s.err
}

type killmailClientStub struct {
	calledWithID    int64
	calledWithLimit int
	out             []Killmail
	err             error
}

func (k *killmailClientStub) FetchRecentByCharacter(_ context.Context, characterID int64, limit int) ([]Killmail, error) {
	k.calledWithID = characterID
	k.calledWithLimit = limit
	return k.out, k.err
}

func TestProviderFetchSummaryDelegatesToStatsClient(t *testing.T) {
	expected := SummaryRow{CharacterID: 7, RecentKills: 11, LastActivity: time.Unix(1712440000, 0).UTC()}
	stats := &statsClientStub{out: expected}
	killmail := &killmailClientStub{}
	provider := NewProvider(stats, killmail)

	got, err := provider.FetchSummary(context.Background(), 7)
	if err != nil {
		t.Fatalf("FetchSummary err: %v", err)
	}
	if stats.calledWith != 7 {
		t.Fatalf("expected stats client to receive character id 7, got %d", stats.calledWith)
	}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("summary mismatch: got %+v want %+v", got, expected)
	}
}

func TestProviderFetchRecentByCharacterDelegatesToKillmailClient(t *testing.T) {
	expected := []Killmail{{KillID: 1001}, {KillID: 1002}}
	stats := &statsClientStub{}
	killmail := &killmailClientStub{out: expected}
	provider := NewProvider(stats, killmail)

	got, err := provider.FetchRecentByCharacter(context.Background(), 42, 25)
	if err != nil {
		t.Fatalf("FetchRecentByCharacter err: %v", err)
	}
	if killmail.calledWithID != 42 {
		t.Fatalf("expected killmail client id 42, got %d", killmail.calledWithID)
	}
	if killmail.calledWithLimit != 25 {
		t.Fatalf("expected killmail client limit 25, got %d", killmail.calledWithLimit)
	}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("killmail mismatch: got %+v want %+v", got, expected)
	}
}

func TestProviderPropagatesDelegateErrors(t *testing.T) {
	statsErr := errors.New("stats failed")
	killmailErr := errors.New("killmail failed")

	stats := &statsClientStub{err: statsErr}
	killmail := &killmailClientStub{err: killmailErr}
	provider := NewProvider(stats, killmail)

	if _, err := provider.FetchSummary(context.Background(), 9); !errors.Is(err, statsErr) {
		t.Fatalf("expected stats error propagation, got %v", err)
	}
	if _, err := provider.FetchRecentByCharacter(context.Background(), 9, 10); !errors.Is(err, killmailErr) {
		t.Fatalf("expected killmail error propagation, got %v", err)
	}
}
