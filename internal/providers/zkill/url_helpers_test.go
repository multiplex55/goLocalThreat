package zkill

import "testing"

func TestNormalizeBaseURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		raw  string
		want string
	}{
		{
			name: "already normalized",
			raw:  "https://zkillboard.com",
			want: "https://zkillboard.com",
		},
		{
			name: "trailing slash removed",
			raw:  "https://zkillboard.com/",
			want: "https://zkillboard.com",
		},
		{
			name: "api suffix removed",
			raw:  "https://zkillboard.com/api",
			want: "https://zkillboard.com",
		},
		{
			name: "api suffix and trailing slash removed",
			raw:  "https://zkillboard.com/api/",
			want: "https://zkillboard.com",
		},
		{
			name: "whitespace trimmed",
			raw:  "  https://zkillboard.com/api/  ",
			want: "https://zkillboard.com",
		},
		{
			name: "non api suffix preserved",
			raw:  "https://zkillboard.com/apix/",
			want: "https://zkillboard.com/apix",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeBaseURL(tc.raw)
			if got != tc.want {
				t.Fatalf("normalizeBaseURL(%q) = %q, want %q", tc.raw, got, tc.want)
			}
		})
	}
}

func TestConstructorsNormalizeBaseURL(t *testing.T) {
	t.Parallel()

	stats := NewStatsClient(" https://zkillboard.com/api/ ")
	if stats.baseURL != "https://zkillboard.com" {
		t.Fatalf("stats baseURL = %q, want %q", stats.baseURL, "https://zkillboard.com")
	}

	killmail := NewKillmailClient(" https://zkillboard.com/api/ ")
	if killmail.baseURL != "https://zkillboard.com" {
		t.Fatalf("killmail baseURL = %q, want %q", killmail.baseURL, "https://zkillboard.com")
	}
}
