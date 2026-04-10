package zkill

import "context"

type StatsSummaryClient interface {
	FetchSummary(ctx context.Context, characterID int64) (SummaryRow, error)
}

type KillmailRecentClient interface {
	FetchRecentByCharacter(ctx context.Context, characterID int64, limit int) ([]Killmail, error)
}

type Provider struct {
	stats    StatsSummaryClient
	killmail KillmailRecentClient
}

func NewProvider(stats StatsSummaryClient, killmail KillmailRecentClient) *Provider {
	return &Provider{stats: stats, killmail: killmail}
}

func (p *Provider) FetchSummary(ctx context.Context, characterID int64) (SummaryRow, error) {
	return p.stats.FetchSummary(ctx, characterID)
}

func (p *Provider) FetchRecentByCharacter(ctx context.Context, characterID int64, limit int) ([]Killmail, error) {
	return p.killmail.FetchRecentByCharacter(ctx, characterID, limit)
}
