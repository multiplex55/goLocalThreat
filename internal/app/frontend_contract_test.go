package app_test

import (
	"encoding/json"
	"testing"

	"golocalthreat/internal/app"
	"golocalthreat/internal/domain"
	"golocalthreat/internal/providers/esi"
	"golocalthreat/internal/providers/zkill"
)

func TestFrontendContractAnalyzePastedTextShape(t *testing.T) {
	svc := app.NewAppServiceWithProviders(
		mockESIProvider{
			resolved:  esi.ResolvedNames{Characters: map[string]int64{"Alice": 101}},
			idents:    []domain.CharacterIdentity{{CharacterID: 101, Name: "Alice", CorpID: 500001, AllianceID: 990001}},
			corps:     map[int64]domain.OrganizationMetadata{500001: {Name: "Acme Corp", Ticker: "ACME"}},
			alliances: map[int64]domain.OrganizationMetadata{990001: {Name: "Blue Bloc", Ticker: "BLUE"}},
		},
		mockZKillProvider{
			summaries: map[int64]zkill.SummaryRow{
				101: {CharacterID: 101},
			},
		},
	)

	session, err := svc.AnalyzePastedText("Alice")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}

	raw, err := json.Marshal(session)
	if err != nil {
		t.Fatalf("marshal session: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("unmarshal session payload: %v", err)
	}

	mustHaveKeys(t, payload, "sessionId", "createdAt", "updatedAt", "source", "pilots", "warnings", "freshness")
	mustBeString(t, payload, "createdAt")
	mustBeString(t, payload, "updatedAt")

	source, ok := payload["source"].(map[string]any)
	if !ok {
		t.Fatalf("source has unexpected type %T", payload["source"])
	}
	mustHaveKeys(t, source,
		"rawText",
		"normalizedText",
		"parsedCharacters",
		"candidateNames",
		"invalidLines",
		"warnings",
		"inputKind",
		"confidence",
		"removedDuplicates",
		"suspiciousArtifacts",
		"parsedAt",
	)
	mustBeString(t, source, "parsedAt")

	freshness, ok := payload["freshness"].(map[string]any)
	if !ok {
		t.Fatalf("freshness has unexpected type %T", payload["freshness"])
	}
	mustHaveKeys(t, freshness, "source", "dataAsOf", "isStale")
	mustBeString(t, freshness, "source")
	mustBeString(t, freshness, "dataAsOf")

	pilots, ok := payload["pilots"].([]any)
	if !ok {
		t.Fatalf("pilots has unexpected type %T", payload["pilots"])
	}
	if len(pilots) == 0 {
		t.Fatalf("expected at least one pilot")
	}
	firstPilot, ok := pilots[0].(map[string]any)
	if !ok {
		t.Fatalf("pilot has unexpected type %T", pilots[0])
	}
	mustHaveKeys(t, firstPilot, "identity", "threat", "lastUpdated", "freshness")
	identity, ok := firstPilot["identity"].(map[string]any)
	if !ok {
		t.Fatalf("identity has unexpected type %T", firstPilot["identity"])
	}
	mustHaveKeys(t, identity, "characterId", "name", "corpId", "corpName", "corpTicker", "allianceId", "allianceName", "allianceTicker")
	mustBeString(t, firstPilot, "lastUpdated")
	pilotFreshness, ok := firstPilot["freshness"].(map[string]any)
	if !ok {
		t.Fatalf("pilot freshness has unexpected type %T", firstPilot["freshness"])
	}
	mustHaveKeys(t, pilotFreshness, "source", "dataAsOf", "isStale")
	mustBeString(t, pilotFreshness, "source")
	mustBeString(t, pilotFreshness, "dataAsOf")
}

func TestFrontendContractSettingsShape(t *testing.T) {
	svc := app.NewAppService()

	settings, err := svc.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings err: %v", err)
	}

	saved, err := svc.SaveSettings(settings)
	if err != nil {
		t.Fatalf("SaveSettings err: %v", err)
	}

	raw, err := json.Marshal(saved)
	if err != nil {
		t.Fatalf("marshal settings: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("unmarshal settings payload: %v", err)
	}

	mustHaveKeys(t, payload, "ignoredCorps", "ignoredAlliances", "pinnedPilots", "refreshInterval", "scoring")

	scoring, ok := payload["scoring"].(map[string]any)
	if !ok {
		t.Fatalf("scoring has unexpected type %T", payload["scoring"])
	}
	mustHaveKeys(t, scoring, "weights", "thresholds")
}

func mustHaveKeys(t *testing.T, payload map[string]any, keys ...string) {
	t.Helper()
	for _, key := range keys {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected key %q in payload: %#v", key, payload)
		}
	}
}

func mustBeString(t *testing.T, payload map[string]any, key string) {
	t.Helper()
	value, ok := payload[key]
	if !ok {
		t.Fatalf("missing key %q", key)
	}
	if _, ok := value.(string); !ok {
		t.Fatalf("expected %q to be string, got %T", key, value)
	}
}
