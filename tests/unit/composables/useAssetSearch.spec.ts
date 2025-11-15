import { describe, expect, it } from 'vitest';

import { filterAssetsByQuery } from '@/composables/useAssetSearch';

import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

describe('useAssetSearch', () => {
  const assets: AccountAsset[] = [
    {
      address: 'xor',
      name: 'SORA',
      symbol: 'XOR',
      balance: { transferable: '1' },
    } as AccountAsset,
    {
      address: 'val',
      name: 'Val Token',
      symbol: 'VAL',
      balance: { transferable: '0' },
    } as AccountAsset,
  ];

  it('returns assets when query is empty', () => {
    const result = filterAssetsByQuery(assets, '');

    expect(result).toHaveLength(2);
    expect(result).not.toBe(assets);
  });

  it('filters assets by name and symbol', () => {
    expect(filterAssetsByQuery(assets, 'sora')).toHaveLength(1);
    expect(filterAssetsByQuery(assets, 'val')).toHaveLength(1);
  });

  it('matches full address and external address', () => {
    const registeredAssets: RegisteredAccountAsset[] = [
      {
        address: 'bridge-1',
        externalAddress: '0xABC',
        name: 'Bridge Token',
        symbol: 'BRG',
        balance: { transferable: '0' },
      } as RegisteredAccountAsset,
    ];

    expect(filterAssetsByQuery(registeredAssets, '0xabc', { useExternalAddress: true })).toHaveLength(1);
    expect(filterAssetsByQuery(registeredAssets, 'bridge-1')).toHaveLength(1);
  });
});
