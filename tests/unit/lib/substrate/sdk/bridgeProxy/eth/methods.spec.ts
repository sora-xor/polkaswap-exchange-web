import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/substrate/sdk/assets', () => ({
  toAssetId: (asset: { code: { toString(): string } }) => asset.code.toString(),
}));

import { formatApprovedRequest } from '@sora-substrate/sdk/build/bridgeProxy/eth/methods';
import { EthCurrencyType } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';

/** Supplies a SCALE-like string value without loading a network-backed API. */
const codec = (value: string) => ({ toString: () => value });

describe('formatApprovedRequest', () => {
  it.each([
    [EthCurrencyType.AssetId, '0x0200000000000000000000000000000000000000000000000000000000000000'],
    [EthCurrencyType.TokenAddress, `0x${'12'.repeat(20)}`],
  ])('preserves the exact signed %s currency and codec amount', (currencyType, currencyId) => {
    const request = {
      asTransfer: {
        txHash: codec(`0x${'34'.repeat(32)}`),
        from: codec(`0x${'56'.repeat(20)}`),
        to: codec(`0x${'78'.repeat(20)}`),
        amount: codec('240000000000000000001'),
        currencyId: {
          isAssetId: currencyType === EthCurrencyType.AssetId,
          asAssetId: codec(currencyId),
          asTokenAddress: codec(currencyId),
        },
      },
    };
    const proofs = [0, 1, 1].map((v, i) => ({
      v: { toNumber: () => v },
      r: codec(`r-${i}`),
      s: codec(`s-${i}`),
    }));

    expect(formatApprovedRequest(request as never, proofs as never)).toEqual({
      currencyType,
      currencyId,
      amount: '240000000000000000001',
      hash: `0x${'34'.repeat(32)}`,
      from: `0x${'56'.repeat(20)}`,
      to: `0x${'78'.repeat(20)}`,
      r: ['r-0', 'r-1', 'r-2'],
      s: ['s-0', 's-1', 's-2'],
      v: [27, 28, 28],
    });
  });
});
