import { describe, expect, it, vi } from 'vitest';

import { collectAssets, resolveAssetRef, type AgentAssetContext } from '@/features/agent-trading/assets';

import type { AccountBalance, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

const balance: AccountBalance = {
  free: '10',
  reserved: '0',
  frozen: '0',
  bonded: '0',
  locked: '0',
  total: '10',
  transferable: '9',
};

const createAsset = (address: string, symbol: string): Asset => ({
  address,
  symbol,
  name: `${symbol} token`,
  decimals: 18,
  isMintable: true,
  type: 'Regular',
});

const createContext = (assets: Asset[] = []): AgentAssetContext => {
  const accountAsset = {
    ...createAsset('0xaccount', 'ACCT'),
    balance,
  } as RegisteredAccountAsset;

  return {
    walletStore: {
      assets,
      accountAssetsAddressTable: {
        [accountAsset.address]: accountAsset,
      },
    },
    assetsStore: {
      assetDataByAddress: vi.fn((address?: string | null) => {
        if (address === accountAsset.address) return accountAsset;
        const found = assets.find((asset) => asset.address === address);
        return found ? ({ ...found, balance } as RegisteredAccountAsset) : null;
      }),
    },
    api: {
      assets: {
        getAssetInfo: vi.fn(async (address: string) => createAsset(address, 'NET')),
      },
    },
    nodeReady: true,
  };
};

describe('agent-trading assets', () => {
  it('collects known, wallet, and account assets with optional balances', () => {
    const context = createContext([createAsset('0xcustom', 'CUSTOM')]);
    const assets = collectAssets(context, { query: 'custom', includeBalances: true });

    expect(assets).toEqual([
      expect.objectContaining({
        address: '0xcustom',
        symbol: 'CUSTOM',
        balance,
      }),
    ]);
  });

  it('resolves an unambiguous symbol', async () => {
    const context = createContext([createAsset('0xcustom', 'CUSTOM')]);

    await expect(resolveAssetRef(context, { symbol: 'custom' }, 'assetIn')).resolves.toEqual(
      expect.objectContaining({ address: '0xcustom' })
    );
  });

  it('rejects ambiguous symbols and asks callers to use addresses', async () => {
    const context = createContext([createAsset('0xone', 'DUP'), createAsset('0xtwo', 'DUP')]);

    await expect(resolveAssetRef(context, { symbol: 'DUP' }, 'assetIn')).rejects.toMatchObject({
      code: 'ASSET_AMBIGUOUS',
    });
  });

  it('falls back to chain asset metadata for unknown addresses when the node is ready', async () => {
    const context = createContext();

    await expect(resolveAssetRef(context, { address: '0xnetwork' }, 'assetOut')).resolves.toEqual(
      expect.objectContaining({ address: '0xnetwork', symbol: 'NET' })
    );
    expect(context.api.assets?.getAssetInfo).toHaveBeenCalledWith('0xnetwork');
  });
});
