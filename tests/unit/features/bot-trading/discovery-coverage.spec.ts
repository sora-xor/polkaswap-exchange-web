import { describe, expect, it } from 'vitest';
import { estimateDiscoveryScanMinutes, summarizeDiscoveryCoverage } from '@/features/bot-trading/discovery-coverage';
import type { DiscoveryPair } from '@/features/bot-trading/discovery';

function pair(index: number, status: DiscoveryPair['status'], reason?: DiscoveryPair['reason']): DiscoveryPair {
  return {
    key: `a${index}>b${index}`,
    assetInAddress: `a${index}`,
    assetOutAddress: `b${index}`,
    status,
    ...(reason ? { reason } : {}),
  };
}

describe('discovery coverage', () => {
  it('separates screened, verified, skipped, and pending markets and groups every skip reason', () => {
    const summary = summarizeDiscoveryCoverage([
      pair(1, 'ready'),
      pair(2, 'pending'),
      pair(3, 'skipped', 'denomination'),
      pair(4, 'skipped', 'incompleteHistory'),
      pair(5, 'skipped', 'denomination'),
      pair(6, 'skipped'),
    ]);
    expect(summary).toEqual({
      total: 6,
      screened: 5,
      verified: 1,
      skipped: 4,
      pending: 1,
      reasons: [
        { reason: 'denomination', count: 2 },
        { reason: 'incompleteHistory', count: 1 },
        { reason: 'unknown', count: 1 },
      ],
    });
  });

  it('does not call a completed scan full evidence coverage', () => {
    const summary = summarizeDiscoveryCoverage([pair(1, 'ready'), pair(2, 'skipped', 'routeUnavailable')]);
    expect(summary.screened).toBe(2);
    expect(summary.verified).toBe(1);
    expect(summary.pending).toBe(0);
  });

  it('withholds unstable ETA estimates and rounds a measured scan to whole minutes', () => {
    expect(
      estimateDiscoveryScanMinutes(
        [
          { screened: 0, at: 0 },
          { screened: 8, at: 30_000 },
        ],
        30
      )
    ).toBeNull();
    expect(
      estimateDiscoveryScanMinutes(
        [
          { screened: 0, at: 0 },
          { screened: 20, at: 10_000 },
        ],
        30
      )
    ).toBeNull();
    expect(
      estimateDiscoveryScanMinutes(
        [
          { screened: 0, at: 0 },
          { screened: 20, at: 40_000 },
        ],
        30
      )
    ).toBe(1);
    expect(
      estimateDiscoveryScanMinutes(
        [
          { screened: 0, at: 0 },
          { screened: 20, at: 40_000 },
        ],
        0
      )
    ).toBeNull();
  });
});
