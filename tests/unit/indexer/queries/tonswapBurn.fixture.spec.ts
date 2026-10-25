import { afterEach, describe, expect, it, vi } from 'vitest';

import fixture from '../../../fixtures/tonswap/confirmed-burn-snapshot-20260921.json';
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

    const snapshot = await fetchTonswapBurnSnapshot();
    expect(snapshot.indexedThroughBlock).toBe(27_721_150);
    expect(snapshot.burns).toHaveLength(1);
    expect(snapshot.burns[0]).toMatchObject({
      address: 'cnTdP4jfCs6tEHoFTVvCUZtQqxjKXzQwYCNucDCkDsFrc9w6F',
      txHash: '0x0e302df6e88e4c0a6f208df146a3bab41f1d3d39de0198f6653f2b8dc0749896',
      blockHeight: 27_721_093,
      extrinsicIndex: 1,
    });
    const allocations = allocateTonswapBurns(snapshot.burns);
    expect(allocations.totalBurned.toString()).toBe('2');
    expect(allocations.totalEligible.toString()).toBe('2');
    expect(allocations.totalReward.toString()).toBe('99.999948669894379752');
    expect(allocations.remaining.toString()).toBe('1753355');
  });
});
