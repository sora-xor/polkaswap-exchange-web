import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

// TextEncoder returns Node-realm arrays; SS58 hashing must use that same constructor in jsdom.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');

import {
  allocateTonswapBurns,
  TONSWAP_START_BLOCK,
  TONSWAP_XOR_CAP,
  type TonswapBurn,
} from '@/features/misc/lib/tonswapBurn';
import { summarizeTonswapCampaign } from '@/features/misc/lib/tonswapCampaignStatus';

const burn = (amount: string, index = 0): TonswapBurn => ({
  address: 'alice',
  amount: new FPNumber(amount),
  blockHeight: TONSWAP_START_BLOCK + index,
  extrinsicIndex: index,
  txHash: `0x${(index + 1).toString(16).padStart(2, '0').repeat(32)}`,
});

describe('TONSWAP campaign summary', () => {
  it('reads a fresh campaign with nothing burned as live at the starting rate', () => {
    const summary = summarizeTonswapCampaign(allocateTonswapBurns([]), TONSWAP_START_BLOCK + 5);

    expect(summary.live).toBe(true);
    expect(summary.rate.toString()).toBe('50');
    expect(summary.burned.toString()).toBe('0');
    expect(summary.remaining.toString()).toBe(TONSWAP_XOR_CAP);
    expect(summary.reserved.toString()).toBe('0');
    expect(summary.percent.toString()).toBe('0');
    expect(summary.indexedThroughBlock).toBe(TONSWAP_START_BLOCK + 5);
  });

  it('reports the marginal rate, remaining XOR and reserved TS after real burns', () => {
    const allocation = allocateTonswapBurns([burn('876678.5')]);
    const summary = summarizeTonswapCampaign(allocation, TONSWAP_START_BLOCK + 100);

    expect(summary.live).toBe(true);
    // Half of the cap is not burned yet, so the marginal rate sits between 50 and 5.
    expect(summary.rate.toString()).toBe('27.5');
    expect(summary.burned.toString()).toBe('876678.5');
    expect(summary.remaining.toString()).toBe('876678.5');
    expect(summary.reserved.toString()).toBe(allocation.totalReward.toString());
    expect(summary.percent.toString()).toBe('50');
  });

  it('is no longer live once the rewarded cap is reached, and extra XOR does not push the percentage past 100', () => {
    const summary = summarizeTonswapCampaign(
      allocateTonswapBurns([burn(TONSWAP_XOR_CAP, 0), burn('1000', 1)]),
      TONSWAP_START_BLOCK + 10
    );

    expect(summary.live).toBe(false);
    expect(summary.remaining.toString()).toBe('0');
    expect(summary.burned.toString()).toBe(TONSWAP_XOR_CAP);
    expect(summary.percent.toString()).toBe('100');
    expect(summary.rate.toString()).toBe('5');
  });

  it('stays live while even a fraction of the cap is still open', () => {
    const almost = new FPNumber(TONSWAP_XOR_CAP).sub(new FPNumber('0.000001'));
    const summary = summarizeTonswapCampaign(allocateTonswapBurns([burn(almost.toString())]), TONSWAP_START_BLOCK);

    expect(summary.live).toBe(true);
    expect(summary.remaining.toString()).toBe('0.000001');
  });
});
