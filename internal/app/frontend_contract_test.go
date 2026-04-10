package app_test

import (
  "encoding/json"
  "testing"

  "golocalthreat/internal/app"
)

func TestFrontendContractAnalyzePastedTextShape(t *testing.T) {
  svc := app.NewAppService()

  session, err := svc.AnalyzePastedText("Alice\nBob")
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

  mustHaveKeys(t, payload, "sessionId", "createdAt", "updatedAt", "source", "pilots", "warnings")

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
