package domain_test

import (
	"encoding/json"
	"testing"
	"time"

	"golocalthreat/internal/domain"
)

func TestAnalysisSessionSerializationRoundTrip(t *testing.T) {
	now := time.Now().UTC()
	session := domain.AnalysisSession{
		SessionID: "session-1",
		CreatedAt: now,
		UpdatedAt: now,
		Source: domain.ParseResult{
			RawText:  "pilot one",
			ParsedAt: now,
		},
		Settings: domain.Settings{RefreshInterval: 30},
		Freshness: domain.FetchFreshness{
			Source:   "placeholder",
			DataAsOf: now,
		},
	}

	buf, err := json.Marshal(session)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var got domain.AnalysisSession
	if err := json.Unmarshal(buf, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if got.SessionID != session.SessionID {
		t.Fatalf("session id mismatch: %q != %q", got.SessionID, session.SessionID)
	}
	if got.Source.RawText != session.Source.RawText {
		t.Fatalf("source raw text mismatch: %q != %q", got.Source.RawText, session.Source.RawText)
	}
}

func TestRequiredFieldInvariants(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{name: "parse result", err: domain.ParseResult{}.Validate()},
		{name: "character identity", err: domain.CharacterIdentity{}.Validate()},
		{name: "pilot threat", err: domain.PilotThreatRecord{}.Validate()},
		{name: "analysis session", err: domain.AnalysisSession{}.Validate()},
		{name: "provider warning", err: domain.ProviderWarning{}.Validate()},
		{name: "fetch freshness", err: domain.FetchFreshness{}.Validate()},
	}

	for _, tt := range tests {
		if tt.err == nil {
			t.Fatalf("expected invariant error for %s", tt.name)
		}
	}
}
