package parser

import (
	"regexp"
	"strings"
)

var (
	timestampPrefixPattern = regexp.MustCompile(`^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-|]?\s*|\[?\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\]?\s*[-|]?\s*)`)
	chatPrefixPattern      = regexp.MustCompile(`^\s*(?:[<\[(][^>\])]{1,32}[>\])]:?\s*|(?:[A-Za-z0-9_ .'-]{2,32}:\s+))`)
)

func NormalizeText(raw string) (string, []string) {
	text := strings.ReplaceAll(raw, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	parts := strings.Split(text, "\n")
	lines := make([]string, 0, len(parts))
	for _, line := range parts {
		cleaned := strings.TrimSpace(line)
		if cleaned == "" {
			continue
		}
		cleaned = stripTimestamp(cleaned)
		cleaned = stripChatPrefix(cleaned)
		cleaned = strings.TrimSpace(cleaned)
		if cleaned == "" {
			continue
		}
		lines = append(lines, cleaned)
	}
	return strings.Join(lines, "\n"), lines
}

func stripTimestamp(line string) string {
	return timestampPrefixPattern.ReplaceAllString(line, "")
}

func stripChatPrefix(line string) string {
	return chatPrefixPattern.ReplaceAllString(line, "")
}
