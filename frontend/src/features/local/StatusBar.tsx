import type { LocalStatusView } from './types';

export function renderStatusBar(status: LocalStatusView): string {
  const partialCount = status.diagnostics?.partialKillmailTimestamps ?? 0;
  return `Provider:${status.provider} | Cache:${status.cache} | Rate:${status.rate} | Updated:${status.updatedAt} | Partial killmail timestamps: ${partialCount}`;
}
