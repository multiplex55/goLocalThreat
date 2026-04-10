package app_test

import (
	"reflect"
	"strings"
	"testing"

	"golocalthreat/internal/app"
)

func TestPublicAPIMethodsReturnDomainContracts(t *testing.T) {
	svc := app.NewAppService()

	session, err := svc.AnalyzePastedText("Alice\nBob")
	if err != nil {
		t.Fatalf("AnalyzePastedText err: %v", err)
	}
	if session.SessionID == "" {
		t.Fatal("expected typed analysis session")
	}

	typeChecks := []struct {
		name string
		fn   func() any
	}{
		{name: "RefreshSession", fn: func() any { v, _ := svc.RefreshSession(session.SessionID); return v }},
		{name: "RefreshPilot", fn: func() any { v, _ := svc.RefreshPilot(session.SessionID, 42); return v }},
		{name: "LoadRecentSessions", fn: func() any { v, _ := svc.LoadRecentSessions(5); return v }},
		{name: "LoadSettings", fn: func() any { v, _ := svc.LoadSettings(); return v }},
		{name: "SaveSettings", fn: func() any { v, _ := svc.SaveSettings(session.Settings); return v }},
		{name: "PinPilot", fn: func() any { v, _ := svc.PinPilot(1); return v }},
		{name: "IgnoreCorp", fn: func() any { v, _ := svc.IgnoreCorp(2); return v }},
		{name: "IgnoreAlliance", fn: func() any { v, _ := svc.IgnoreAlliance(3); return v }},
		{name: "ClearCache", fn: func() any { v, _ := svc.ClearCache(); return v }},
	}

	for _, tc := range typeChecks {
		resultType := reflect.TypeOf(tc.fn())
		if resultType == nil {
			continue
		}
		if strings.Contains(strings.ToLower(resultType.String()), "provider") {
			t.Fatalf("%s exposed provider dto type: %s", tc.name, resultType.String())
		}
	}
}
