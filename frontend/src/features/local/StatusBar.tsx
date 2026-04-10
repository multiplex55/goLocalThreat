import type { LocalStatusView } from './types';

export function renderStatusBar(status: LocalStatusView): string {
  return `Provider:${status.provider} | Cache:${status.cache} | Rate:${status.rate} | Updated:${status.updatedAt}`;
}
