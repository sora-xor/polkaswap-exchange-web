import { beforeEach, describe, expect, it, vi } from 'vitest';

const getChameleonPoolsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/substrate/liquidity-proxy/runtime', () => ({
  getChameleonPools: getChameleonPoolsMock,
}));

import { Errors } from '@/lib/substrate/liquidity-proxy/consts';
import { getPairInfo, getTradingPair } from '@/lib/substrate/liquidity-proxy/pallets/poolXyk/utils';

describe('pool XYK utils', () => {
  beforeEach(() => {
    getChameleonPoolsMock.mockReturnValue([null, []]);
  });

  it('resolves the non-base asset as the trading pair target', () => {
    expect(getPairInfo('base', 'base', 'target')).toEqual([
      { baseAssetId: 'base', targetAssetId: 'target' },
      null,
      false,
    ]);
    expect(getTradingPair('base', 'target', 'base')).toEqual({ baseAssetId: 'base', targetAssetId: 'target' });
  });

  it('rejects identical assets and pairs without the configured base asset', () => {
    expect(() => getPairInfo('base', 'asset', 'asset')).toThrow(Errors.AssetsMustNotBeSame);
    expect(() => getPairInfo('base', 'asset-a', 'asset-b')).toThrow(
      Errors.BaseAssetIsNotMatchedWithAnyAssetArguments
    );
  });

  it('resolves allowed chameleon pools through the runtime registry', () => {
    getChameleonPoolsMock.mockReturnValue(['kxor', ['eth', 'dai']]);

    expect(getPairInfo('xor', 'kxor', 'eth')).toEqual([
      { baseAssetId: 'xor', targetAssetId: 'eth' },
      'kxor',
      true,
    ]);
    expect(getPairInfo('xor', 'dai', 'kxor')).toEqual([
      { baseAssetId: 'xor', targetAssetId: 'dai' },
      'kxor',
      true,
    ]);
  });

  it('rejects restricted or unrelated chameleon pairs', () => {
    getChameleonPoolsMock.mockReturnValue(['kxor', ['eth']]);

    expect(() => getPairInfo('xor', 'kxor', 'dai')).toThrow(Errors.RestrictedChameleonPool);
    expect(() => getPairInfo('xor', 'dai', 'kxor')).toThrow(Errors.RestrictedChameleonPool);
    expect(() => getPairInfo('xor', 'asset-a', 'asset-b')).toThrow(
      Errors.BaseAssetIsNotMatchedWithAnyAssetArguments
    );
  });
});
