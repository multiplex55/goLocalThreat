package parser

type Orchestrator struct {
	strategies []ParserStrategy
}

func NewOrchestrator() *Orchestrator {
	return &Orchestrator{strategies: []ParserStrategy{
		ChatTranscriptParser{},
		LocalMemberListParser{},
		FallbackLooseParser{},
	}}
}

func (o *Orchestrator) Parse(rawText string) ParseResult {
	normalizedText, lines := NormalizeText(rawText)
	best := ParseResult{RawText: rawText, NormalizedText: normalizedText, InputKind: InputKindUnknown, Strategy: "none"}
	for _, strategy := range o.strategies {
		result := strategy.Parse(rawText, lines)
		if result.Confidence > best.Confidence {
			best = result
		}
	}
	if len(best.Candidates) == 0 && rawText == "" {
		best.Warnings = append(best.Warnings, "empty_input")
	}
	fallback := FallbackLooseParser{}.Parse(rawText, lines)
	if len(lines) > 0 && best.Strategy != "FallbackLooseParser" {
		mixedMalformed := len(fallback.InvalidLines) > 0 && len(fallback.Candidates) > 0
		if best.Confidence < 0.5 || mixedMalformed {
			best = fallback
		}
	}
	return best
}
