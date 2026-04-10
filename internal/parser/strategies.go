package parser

import (
	"strings"
	"time"
)

type LocalMemberListParser struct{}

type ChatTranscriptParser struct{}

type FallbackLooseParser struct{}

func (p LocalMemberListParser) Name() string { return "LocalMemberListParser" }
func (p ChatTranscriptParser) Name() string  { return "ChatTranscriptParser" }
func (p FallbackLooseParser) Name() string   { return "FallbackLooseParser" }

func (p LocalMemberListParser) Parse(rawText string, normalizedLines []string) ParseResult {
	candidates, invalid, dupes, suspicious := extractCandidates(normalizedLines)
	confidence := 0.45
	if len(normalizedLines) > 0 {
		confidence = 0.6
	}
	chatLike := countChatLike(normalizedLines)
	if chatLike == 0 {
		confidence += 0.25
	} else {
		confidence -= 0.3
	}
	if len(candidates) == 0 {
		confidence -= 0.25
	}
	return buildResult(rawText, normalizedLines, candidates, invalid, dupes, suspicious, InputKindLocalMemberList, clampConfidence(confidence), p.Name(), chatLike)
}

func (p ChatTranscriptParser) Parse(rawText string, normalizedLines []string) ParseResult {
	candidates, invalid, dupes, suspicious := extractCandidates(normalizedLines)
	chatLike := countChatLike(strings.Split(strings.ReplaceAll(rawText, "\r\n", "\n"), "\n"))
	confidence := 0.3
	if chatLike > 0 {
		confidence = 0.85
	}
	if len(candidates) == 0 {
		confidence -= 0.2
	}
	return buildResult(rawText, normalizedLines, candidates, invalid, dupes, suspicious, InputKindChatTranscript, clampConfidence(confidence), p.Name(), chatLike)
}

func (p FallbackLooseParser) Parse(rawText string, normalizedLines []string) ParseResult {
	candidates, invalid, dupes, suspicious := extractCandidates(normalizedLines)
	confidence := 0.4
	if len(candidates) > 0 {
		confidence = 0.55
	}
	chatLike := countChatLike(strings.Split(strings.ReplaceAll(rawText, "\r\n", "\n"), "\n"))
	return buildResult(rawText, normalizedLines, candidates, invalid, dupes, suspicious, InputKindUnknown, confidence, p.Name(), chatLike)
}

func buildResult(rawText string, normalizedLines, candidates []string, invalid []InvalidLine, dupes, suspicious int, kind InputKind, confidence float64, strategy string, chatLike int) ParseResult {
	warnings := make([]string, 0)
	if chatLike > 0 {
		warnings = append(warnings, "chat_like_input_detected")
	}
	if dupes > 0 {
		warnings = append(warnings, "duplicates_removed")
	}
	if suspicious > 0 {
		warnings = append(warnings, "suspicious_artifacts_detected")
	}
	if len(candidates) == 0 && len(normalizedLines) > 0 {
		warnings = append(warnings, "no_valid_candidates")
	}

	return ParseResult{
		RawText:             rawText,
		NormalizedText:      strings.Join(normalizedLines, "\n"),
		Candidates:          candidates,
		InvalidLines:        invalid,
		Warnings:            warnings,
		InputKind:           kind,
		Confidence:          clampConfidence(confidence),
		Strategy:            strategy,
		ParsedAt:            time.Now().UTC(),
		RemovedDuplicates:   dupes,
		SuspiciousArtifacts: suspicious,
	}
}

func countChatLike(lines []string) int {
	count := 0
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if timestampPrefixPattern.MatchString(trimmed) || chatPrefixPattern.MatchString(trimmed) {
			count++
		}
	}
	return count
}

func clampConfidence(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
