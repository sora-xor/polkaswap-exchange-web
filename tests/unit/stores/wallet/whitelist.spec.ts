import { describe, expect, it, vi } from 'vitest';

import { resolveWhitelist, resolveWhitelistIdsBySymbol, type WhitelistAssetsApi } from '@/stores/wallet/whitelist';

import type { Whitelist, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

const xorAsset = {
  address: 'xor-address',
  symbol: 'xor',
  name: 'SORA',
  decimals: 18,
} as WhitelistArrayItem;

const createAssetsApi = (overrides: Partial<WhitelistAssetsApi> = {}): WhitelistAssetsApi => ({
  getWhitelist: vi.fn((whitelist: WhitelistArrayItem[]) =>
    whitelist.reduce<Whitelist>((lookup, asset) => {
      lookup[asset.address] = {
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
      };
      return lookup;
    }, {})
  ),
  getWhitelistIdsBySymbol: vi.fn((whitelist: WhitelistArrayItem[]) =>
    whitelist.reduce<Record<string, string>>((lookup, asset) => {
      lookup[asset.symbol.toUpperCase()] = asset.address;
      return lookup;
    }, {})
  ),
  ...overrides,
});

describe('wallet whitelist helpers', () => {
  it('returns empty lookup objects without calling the SDK adapter for empty catalogs', () => {
    const assetsApi = createAssetsApi();

    expect(resolveWhitelist([], assetsApi)).toEqual({});
    expect(resolveWhitelistIdsBySymbol([], assetsApi)).toEqual({});
    expect(assetsApi.getWhitelist).not.toHaveBeenCalled();
    expect(assetsApi.getWhitelistIdsBySymbol).not.toHaveBeenCalled();
  });

  it('resolves address and symbol lookup tables without mutating the source catalog', () => {
    const assetsApi = createAssetsApi();
    const catalog = Object.freeze([xorAsset]);

    expect(resolveWhitelist(catalog, assetsApi)).toEqual({
      'xor-address': {
        symbol: 'xor',
        name: 'SORA',
        decimals: 18,
      },
    });
    expect(resolveWhitelistIdsBySymbol(catalog, assetsApi)).toEqual({
      XOR: 'xor-address',
    });
    expect(assetsApi.getWhitelist).toHaveBeenCalledWith([xorAsset]);
    expect(assetsApi.getWhitelistIdsBySymbol).toHaveBeenCalledWith([xorAsset]);
  });

  it('keeps the wallet store usable when SDK whitelist adapters throw', () => {
    const assetsApi = createAssetsApi({
      getWhitelist: vi.fn(() => {
        throw new Error('bad whitelist');
      }),
      getWhitelistIdsBySymbol: vi.fn(() => {
        throw new Error('bad whitelist symbols');
      }),
    });

    expect(resolveWhitelist([xorAsset], assetsApi)).toEqual({});
    expect(resolveWhitelistIdsBySymbol([xorAsset], assetsApi)).toEqual({});
  });
});
