import { afterEach, describe, expect, it, vi } from 'vitest';

import fixture from '../../../fixtures/tonswap/confirmed-burn-snapshot-20260921.json';
import { FPNumber } from '@sora-substrate/sdk';
import { allocateTonswapBurns } from '@/features/misc/lib/tonswapBurn';
import { fetchTonswapBurnSnapshot } from '@/indexer/queries/tonswapBurn';

// Keep SS58 hashing and TextEncoder byte arrays in the same realm.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');
vi.unmock('@sora-substrate/sdk/build/assets/consts');

// Supply only transport configuration; captured burns, address hashing and reward math stay real.
vi.mock('@/plugins/pinia', () => ({ resolveGlobalPinia: () => undefined }));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({ indexers: { polkaswap: { endpoint: 'https://mof.sora.org/graphql' } } }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('confirmed mainnet TONSWAP burn evidence', () => {
  it('accepts the observed two-XOR transaction and allocates its precise reward', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixture.capturedAt));
    // Retain the original captured evidence and add the later explicit freshness envelope.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...fixture.payload,
          data: {
            ...fixture.payload.data,
            tonswapBurnSnapshot: { ...fixture.payload.data.tonswapBurnSnapshot, fresh: true },
          },
        }),
      })
    );

    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('approved recovery');
    const allocations = allocateTonswapBurns(
      fixture.payload.data.tonswapBurnSnapshot.nodes.map((row) => ({
        ...row,
        amount: new FPNumber(row.amount),
      }))
    );
    expect(allocations.totalBurned.toString()).toBe('2');
    expect(allocations.totalEligible.toString()).toBe('2');
    expect(allocations.totalReward.toString()).toBe('99.999948669894379752');
    expect(allocations.remaining.toString()).toBe('1753355');
  });
});

// Snapshot arithmetic fixtures explicitly supply affirmative capability; negative real-gate tests are separate.
vi.mock('@/indexer/queries/capabilities', async (importOriginal) => {
  const { allowedFullCapabilities } = await import('@tests/fixtures/entitlementCapabilities');
  return { ...(await importOriginal()), requireEndpointEntitlements: vi.fn(async () => allowedFullCapabilities) };
});
