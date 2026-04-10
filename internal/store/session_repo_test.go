package store

import (
	"testing"
	"time"
)

func TestSessionPersistLoadRoundTrip(t *testing.T) {
	s := newTestStore(t, RetentionPolicy{MaxSessions: 2, SessionMaxAge: 24 * time.Hour})
	now := time.Now().UTC()
	session := validSession("s1", now)
	if err := s.SaveAnalysisSession(bg(), session); err != nil {
		t.Fatalf("save session: %v", err)
	}

	loaded, err := s.LoadRecentSessions(bg(), 10)
	if err != nil {
		t.Fatalf("load sessions: %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("expected 1 session, got %d", len(loaded))
	}
	if loaded[0].SessionID != session.SessionID {
		t.Fatalf("session id mismatch: %q != %q", loaded[0].SessionID, session.SessionID)
	}
	if loaded[0].Source.RawText != session.Source.RawText {
		t.Fatalf("source raw text mismatch")
	}
	if len(loaded[0].Pilots) != len(session.Pilots) {
		t.Fatalf("pilots length mismatch")
	}

	if err := s.SaveAnalysisSession(bg(), validSession("s2", now.Add(time.Minute))); err != nil {
		t.Fatalf("save session s2: %v", err)
	}
	if err := s.SaveAnalysisSession(bg(), validSession("s3", now.Add(2*time.Minute))); err != nil {
		t.Fatalf("save session s3: %v", err)
	}
	loaded, err = s.LoadRecentSessions(bg(), 10)
	if err != nil {
		t.Fatalf("load sessions after prune: %v", err)
	}
	if len(loaded) != 2 {
		t.Fatalf("expected retention max 2 sessions, got %d", len(loaded))
	}
}
