package parser

import "time"

type InputKind string

const (
	InputKindLocalMemberList InputKind = "local_member_list"
	InputKindChatTranscript  InputKind = "chat_transcript"
	InputKindUnknown         InputKind = "unknown"
)

type InvalidLine struct {
	Line       string `json:"line"`
	ReasonCode string `json:"reasonCode"`
}

type ParseResult struct {
	RawText             string        `json:"rawText"`
	NormalizedText      string        `json:"normalizedText"`
	Candidates          []string      `json:"candidates"`
	InvalidLines        []InvalidLine `json:"invalidLines"`
	Warnings            []string      `json:"warnings"`
	InputKind           InputKind     `json:"inputKind"`
	Confidence          float64       `json:"confidence"`
	Strategy            string        `json:"strategy"`
	ParsedAt            time.Time     `json:"parsedAt"`
	RemovedDuplicates   int           `json:"removedDuplicates"`
	SuspiciousArtifacts int           `json:"suspiciousArtifacts"`
}

type ParserStrategy interface {
	Name() string
	Parse(rawText string, normalizedLines []string) ParseResult
}
