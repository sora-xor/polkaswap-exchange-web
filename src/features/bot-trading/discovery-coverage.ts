import type { DiscoveryPair } from './discovery';

export type DiscoverySkipReason = NonNullable<DiscoveryPair['reason']> | 'unknown';

export interface DiscoveryCoverageSummary {
  total: number;
  screened: number;
  verified: number;
  skipped: number;
  pending: number;
  reasons: { reason: DiscoverySkipReason; count: number }[];
}

export interface DiscoveryScanSample {
  screened: number;
  at: number;
}

/** Summarize only frozen pair statuses; skipped pairs without a reason stay visibly unexplained. */
export function summarizeDiscoveryCoverage(pairs: readonly DiscoveryPair[]): DiscoveryCoverageSummary {
  let verified = 0;
  let skipped = 0;
  const reasons = new Map<DiscoverySkipReason, number>();
  for (const pair of pairs) {
    if (pair.status === 'ready') {
      verified += 1;
    } else if (pair.status === 'skipped') {
      skipped += 1;
      const reason = pair.reason ?? 'unknown';
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }
  return {
    total: pairs.length,
    screened: verified + skipped,
    verified,
    skipped,
    pending: pairs.length - verified - skipped,
    reasons: [...reasons]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
  };
}

/** Estimate the remaining scan time only after enough progress in this visible run. */
export function estimateDiscoveryScanMinutes(samples: readonly DiscoveryScanSample[], pending: number): number | null {
  if (pending <= 0 || samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;
  const elapsed = last.at - first.at;
  const screened = last.screened - first.screened;
  if (elapsed < 20_000 || screened < 10 || elapsed <= 0 || screened <= 0) return null;
  const remainingMinutes = Math.ceil((pending * elapsed) / screened / 60_000);
  return Number.isSafeInteger(remainingMinutes) && remainingMinutes > 0 ? remainingMinutes : null;
}
