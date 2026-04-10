package dto

type ResolveNamesRequest []string

type ResolveNamesResponse struct {
	Characters   []NamedEntity `json:"characters"`
	Corporations []NamedEntity `json:"corporations"`
	Alliances    []NamedEntity `json:"alliances"`
}

type NamedEntity struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type Character struct {
	CharacterID   int64  `json:"character_id"`
	Name          string `json:"name"`
	CorporationID int64  `json:"corporation_id"`
	AllianceID    int64  `json:"alliance_id,omitempty"`
}

type Corporation struct {
	CorporationID int64  `json:"corporation_id"`
	Name          string `json:"name"`
	AllianceID    int64  `json:"alliance_id,omitempty"`
}

type Alliance struct {
	AllianceID int64  `json:"alliance_id"`
	Name       string `json:"name"`
}
