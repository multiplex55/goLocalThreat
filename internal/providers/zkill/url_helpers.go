package zkill

import "strings"

func normalizeBaseURL(raw string) string {
	normalized := strings.TrimSpace(raw)
	normalized = strings.TrimRight(normalized, "/")
	normalized = strings.TrimSuffix(normalized, "/api")
	normalized = strings.TrimRight(normalized, "/")
	return normalized
}
