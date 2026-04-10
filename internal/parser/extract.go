package parser

import (
	"regexp"
	"strings"
)

const (
	reasonEmptyAfterNormalization = "empty_after_normalization"
	reasonTickerArtifact          = "ticker_artifact"
	reasonMarkupArtifact          = "markup_artifact"
	reasonTooShort                = "too_short"
	reasonTooLong                 = "too_long"
	reasonNoLetters               = "no_letters"
)

var (
	namePattern           = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9 .'-]{1,62}[A-Za-z0-9]$`)
	tickerPattern         = regexp.MustCompile(`\$[A-Z]{1,5}\b`)
	markupPattern         = regexp.MustCompile(`(?:<[^>]+>|\{\{[^}]+\}\}|\[[^\]]+\]\([^\)]+\))`)
	containsLetterPattern = regexp.MustCompile(`[A-Za-z]`)
)

func extractCandidates(lines []string) (candidates []string, invalid []InvalidLine, duplicateCount int, suspiciousCount int) {
	seen := map[string]struct{}{}
	candidates = make([]string, 0, len(lines))
	invalid = make([]InvalidLine, 0)
	for _, line := range lines {
		candidate, ok, reason, suspicious := validateCandidateLine(line)
		if suspicious {
			suspiciousCount++
		}
		if !ok {
			invalid = append(invalid, InvalidLine{Line: line, ReasonCode: reason})
			continue
		}
		key := strings.ToLower(candidate)
		if _, exists := seen[key]; exists {
			duplicateCount++
			continue
		}
		seen[key] = struct{}{}
		candidates = append(candidates, candidate)
	}
	return candidates, invalid, duplicateCount, suspiciousCount
}

func validateCandidateLine(line string) (candidate string, ok bool, reason string, suspicious bool) {
	candidate = strings.TrimSpace(line)
	if candidate == "" {
		return "", false, reasonEmptyAfterNormalization, false
	}
	if tickerPattern.MatchString(candidate) {
		return "", false, reasonTickerArtifact, true
	}
	if markupPattern.MatchString(candidate) {
		return "", false, reasonMarkupArtifact, true
	}
	if len(candidate) < 3 {
		return "", false, reasonTooShort, false
	}
	if len(candidate) > 64 {
		return "", false, reasonTooLong, false
	}
	if !containsLetterPattern.MatchString(candidate) {
		return "", false, reasonNoLetters, false
	}
	if !namePattern.MatchString(candidate) {
		return "", false, reasonMarkupArtifact, true
	}
	return candidate, true, "", false
}
