package app

import (
	"testing"
	"time"

	"golocalthreat/internal/domain"
)

func TestToPilotDTOIncludesOrganizationDisplayFields(t *testing.T) {
	dto := toPilotDTO(domain.PilotThreatRecord{
		Identity: domain.CharacterIdentity{
			CharacterID:    7,
			Name:           "Pilot Seven",
			CorpID:         100,
			CorpName:       "Acme Corp",
			CorpTicker:     "ACME",
			AllianceID:     200,
			AllianceName:   "Blue Alliance",
			AllianceTicker: "BLUE",
		},
		LastUpdated: time.Now().UTC(),
		Freshness:   domain.FetchFreshness{Source: "zkill", DataAsOf: time.Now().UTC()},
	})

	if dto.Identity.CorpName != "Acme Corp" || dto.Identity.CorpTicker != "ACME" {
		t.Fatalf("corporation metadata was not mapped: %#v", dto.Identity)
	}
	if dto.Identity.AllianceName != "Blue Alliance" || dto.Identity.AllianceTicker != "BLUE" {
		t.Fatalf("alliance metadata was not mapped: %#v", dto.Identity)
	}
}
