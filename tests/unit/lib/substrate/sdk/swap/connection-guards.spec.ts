import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { describe, expect, it, vi } from 'vitest';

import { SwapModule } from '@/lib/substrate/sdk/swap';

describe('SwapModule connection guards', () => {
  it('returns empty primary market assets when TBC/XST queries are unavailable', async () => {
    const swap = new SwapModule({
      connection: { api: { query: {} } },
    } as any);

    await expect(swap.getTbcAssets()).resolves.toEqual([]);
    await expect(swap.getXstAssets()).resolves.toEqual({});
    await expect(swap.getPrimaryMarketsEnabledAssets()).resolves.toEqual({ tbc: [], xst: {} });
  });

  it('returns empty primary market assets when TBC/XST queries fail', async () => {
    const swap = new SwapModule({
      connection: {
        api: {
          query: {
            multicollateralBondingCurvePool: {
              enabledTargets: vi.fn().mockRejectedValue(new Error('offline')),
            },
            xstPool: {
              enabledSynthetics: {
                entries: vi.fn().mockRejectedValue(new Error('offline')),
              },
            },
          },
        },
      },
    } as any);

    await expect(swap.getTbcAssets()).resolves.toEqual([]);
    await expect(swap.getXstAssets()).resolves.toEqual({});
    await expect(swap.getPrimaryMarketsEnabledAssets()).resolves.toEqual({ tbc: [], xst: {} });
  });

  it('returns null quote observable when selected source is unsupported by metadata', () => {
    const swap = new SwapModule({
      connection: {
        api: {
          query: {},
          rx: { query: {} },
          consts: {},
        },
      },
      dex: {
        getBaseAssetId: vi.fn(() => 'base-asset'),
        getSyntheticBaseAssetId: vi.fn(() => 'synthetic-base-asset'),
        enabledSources: [LiquiditySourceTypes.MulticollateralBondingCurvePool],
        lockedSources: [],
      },
    } as any);

    swap.enabledAssets = { tbc: [], xst: {} };

    expect(swap.subscribeOnReserves('asset-a', 'asset-b')).toBeNull();
  });
});
