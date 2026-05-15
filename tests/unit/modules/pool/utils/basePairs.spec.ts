import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

import {
  getSupportedPoolBaseAssetIds,
  isSupportedPoolBaseAsset,
  isSupportedPoolBasePair,
  normalizeSupportedPoolBasePair,
} from '@/modules/pool/utils/basePairs';

const mocks = vi.hoisted(() => ({
  poolBaseAssetsIds: [] as string[],
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    dex: {
      get poolBaseAssetsIds() {
        return mocks.poolBaseAssetsIds;
      },
    },
  },
}));

describe('pool base pair helpers', () => {
  beforeEach(() => {
    mocks.poolBaseAssetsIds = ['base-a', 'base-b', XSTUSD.address];
  });

  it('reads supported pool base assets from dex metadata', () => {
    expect(getSupportedPoolBaseAssetIds()).toEqual(['base-a', 'base-b', XSTUSD.address]);
    expect(isSupportedPoolBaseAsset('base-a')).toBe(true);
    expect(isSupportedPoolBaseAsset('target')).toBe(false);
  });

  it('accepts pairs where either side is a supported pool base asset', () => {
    expect(isSupportedPoolBasePair('base-a', 'target')).toBe(true);
    expect(isSupportedPoolBasePair('target', 'base-b')).toBe(true);
  });

  it('rejects duplicate, baseless, and unsupported XSTUSD-to-XOR pairs', () => {
    expect(isSupportedPoolBasePair('base-a', 'base-a')).toBe(false);
    expect(isSupportedPoolBasePair('target-a', 'target-b')).toBe(false);
    expect(isSupportedPoolBasePair(XSTUSD.address, XOR.address)).toBe(false);
  });

  it('normalizes route-provided pairs so the supported base asset is first', () => {
    expect(normalizeSupportedPoolBasePair({ firstAddress: 'target', secondAddress: 'base-b' })).toEqual({
      firstAddress: 'base-b',
      secondAddress: 'target',
    });
    expect(normalizeSupportedPoolBasePair({ firstAddress: 'base-a', secondAddress: 'target' })).toEqual({
      firstAddress: 'base-a',
      secondAddress: 'target',
    });
  });
});
