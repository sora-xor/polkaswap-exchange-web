import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import { allocateTonswapBurns, TONSWAP_START_BLOCK, TONSWAP_XOR_CAP } from '@/features/misc/lib/tonswapBurn';
import { createTonswapReceipt, parseTonswapPreviewAmount } from '@/features/misc/lib/tonswapReceipt';

const finalized = (amount = '2') =>
  allocateTonswapBurns([
    {
      address: 'owner',
      amount: new FPNumber(amount),
      blockHeight: TONSWAP_START_BLOCK,
      extrinsicIndex: 0,
      txHash: `0x${'a'.repeat(64)}`,
    },
  ]).allocations[0];

describe('TONSWAP public receipts and previews', () => {
  it('keeps 18-decimal amounts exact and rejects unsafe or nonpositive previews', () => {
    expect(parseTonswapPreviewAmount('0.000000000000000001')?.toString()).toBe('0.000000000000000001');
    for (const value of ['', '0', '-1', '1e3', 'Infinity', '01', '0.0000000000000000001', '9'.repeat(98)]) {
      expect(parseTonswapPreviewAmount(value)).toBeNull();
    }
  });

  it('exports finalized evidence without copying unrelated wallet or private fields', () => {
    const allocation = finalized();
    const receipt = JSON.parse(
      createTonswapReceipt({ ...allocation, privateKey: 'never-export' } as typeof allocation)
    );
    expect(receipt.signingSoraAddress).toBe('owner');
    expect(receipt.tsReserved).toBe(allocation.reward.toString());
    expect(receipt.xorBurned).toBe('2');
    expect(receipt.status).toBe('reserved-for-launch');
    expect(receipt.privateKey).toBeUndefined();
    expect(receipt.notice).toContain('receipt alone cannot authorize a claim');
  });

  it('records the unrewarded amount when a finalized burn crosses the cap', () => {
    const receipt = JSON.parse(
      createTonswapReceipt(finalized(new FPNumber(TONSWAP_XOR_CAP).add(new FPNumber('1')).toString()))
    );
    expect(receipt.unrewardedXor).toBe('1');
    expect(receipt.tsReserved).toBe('48217317.5');
  });

  it('rejects missing finalized transaction evidence', () => {
    expect(() => createTonswapReceipt({ ...finalized(), txHash: 'pending' })).toThrow();
    expect(() => createTonswapReceipt({ ...finalized(), extrinsicIndex: -1 })).toThrow();
    expect(() => createTonswapReceipt({ ...finalized(), reward: new FPNumber('-1') })).toThrow();
  });
});
