import { describe, expect, it, vi } from 'vitest';

import { SubAdapter } from '@/utils/bridge/sub/classes/adapters/substrate';

import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';

type AdapterHarness = SubAdapter & {
  withConnection: <T>(onSuccess: () => T | Promise<T>, fallback: T) => Promise<T>;
};

const createLiquidAssetAccount = (balance: string) => ({
  isEmpty: false,
  unwrap: () => ({
    status: {
      isLiquid: true,
    },
    balance: {
      toString: () => balance,
    },
  }),
});

const createMalformedLiquidAssetAccount = (balance: unknown) => ({
  isEmpty: false,
  unwrap: () => ({
    status: {
      isLiquid: true,
    },
    balance: {
      toString: () => balance,
    },
  }),
});

const createEmptyAssetAccount = () => ({
  isEmpty: true,
});

const createFrozenAssetAccount = (balance: string) => ({
  isEmpty: false,
  unwrap: () => ({
    status: {
      isLiquid: false,
    },
    balance: {
      toString: () => balance,
    },
  }),
});

const createAdapterHarness = (api: unknown): AdapterHarness => {
  const adapter = Object.create(SubAdapter.prototype) as AdapterHarness;

  Object.defineProperties(adapter, {
    api: {
      value: api,
    },
    chainSymbol: {
      value: 'LLD',
    },
    chainDecimals: {
      value: 12,
    },
  });

  adapter.withConnection = async (onSuccess) => await onSuccess();

  return adapter;
};

describe('SubAdapter', () => {
  it('queries batched non-native Sub bridge balances by external asset id', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('123000')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '42',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'liberland-account', asset }]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['42', 'liberland-account']]]);
    expect(balances).toEqual(['123000']);
  });

  it('returns zero for empty account slots without creating invalid storage queries', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('500')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: '', asset },
      { accountAddress: 'liberland-account', asset },
    ]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['7', 'liberland-account']]]);
    expect(balances).toEqual(['0', '500']);
  });

  it('treats whitespace-only account slots as empty and trims valid batch queries', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('500')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: '   ', asset },
      { accountAddress: '  liberland-account  ', asset },
    ]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['7', 'liberland-account']]]);
    expect(balances).toEqual(['0', '500']);
  });

  it('returns an empty result without querying when pair input is not an array', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });

    const balances = await adapter.getTokenBalancesBatch(null as any);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).not.toHaveBeenCalled();
    expect(balances).toEqual([]);
  });

  it('keeps malformed pair entries from becoming storage queries', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('500')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      null as any,
      { accountAddress: 123 as any, asset },
      { accountAddress: 'valid-account', asset },
    ]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['7', 'valid-account']]]);
    expect(balances).toEqual(['0', '0', '500']);
  });

  it('returns zeros without touching the RPC layer when every account slot is empty', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: '', asset },
      { accountAddress: '', asset },
    ]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).not.toHaveBeenCalled();
    expect(balances).toEqual(['0', '0']);
  });

  it('routes native assets through system.account even when asset metadata carries external ids', async () => {
    const systemAccount = vi.fn();
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [{}]);
    const adapter = createAdapterHarness({
      query: {
        system: {
          account: systemAccount,
        },
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-native-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'LLD',
      name: 'LLD',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'native-account', asset }]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).toHaveBeenCalledWith([[systemAccount, 'native-account']]);
    expect(balances).toEqual(['0']);
  });

  it('returns zero slots when queryMulti resolves to a non-array response', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => ({ 0: createLiquidAssetAccount('500') }));
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'asset-account', asset }]);

    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['7', 'asset-account']]]);
    expect(balances).toEqual(['0']);
  });

  it('does not surface locked or missing external asset accounts as spendable balance', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createFrozenAssetAccount('900'), createEmptyAssetAccount()]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: 'frozen-account', asset },
      { accountAddress: 'missing-account', asset },
    ]);

    expect(queryMulti).toHaveBeenCalledWith([
      [assetAccount, ['7', 'frozen-account']],
      [assetAccount, ['7', 'missing-account']],
    ]);
    expect(balances).toEqual(['0', '0']);
  });

  it('keeps result ordering when the node returns fewer batch responses than requested', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('111')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: 'first-account', asset },
      { accountAddress: '', asset },
      { accountAddress: 'third-account', asset },
    ]);

    expect(queryMulti).toHaveBeenCalledWith([
      [assetAccount, ['7', 'first-account']],
      [assetAccount, ['7', 'third-account']],
    ]);
    expect(balances).toEqual(['111', '0', '0']);
  });

  it('ignores extra RPC batch responses that do not map to requested accounts', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('111'), createLiquidAssetAccount('999')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'first-account', asset }]);

    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['7', 'first-account']]]);
    expect(balances).toEqual(['111']);
  });

  it('treats malformed external asset account responses as zero instead of throwing', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [
      {},
      {
        isEmpty: false,
        unwrap: () => ({
          status: {
            isLiquid: true,
          },
          balance: null,
        }),
      },
      {
        isEmpty: false,
        unwrap: () => {
          throw new Error('malformed account codec');
        },
      },
      createLiquidAssetAccount('444'),
    ]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: 'missing-unwrap-account', asset },
      { accountAddress: 'missing-balance-account', asset },
      { accountAddress: 'throwing-account', asset },
      { accountAddress: 'healthy-account', asset },
    ]);

    expect(queryMulti).toHaveBeenCalledWith([
      [assetAccount, ['7', 'missing-unwrap-account']],
      [assetAccount, ['7', 'missing-balance-account']],
      [assetAccount, ['7', 'throwing-account']],
      [assetAccount, ['7', 'healthy-account']],
    ]);
    expect(balances).toEqual(['0', '0', '0', '444']);
  });

  it('rejects liquid asset balances with non-codec string payloads', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [
      createMalformedLiquidAssetAccount(123),
      createMalformedLiquidAssetAccount(''),
      createMalformedLiquidAssetAccount('NaN'),
      createMalformedLiquidAssetAccount('-1'),
      createMalformedLiquidAssetAccount(' 444 '),
      createLiquidAssetAccount('555'),
    ]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: 'number-balance-account', asset },
      { accountAddress: 'blank-balance-account', asset },
      { accountAddress: 'nan-balance-account', asset },
      { accountAddress: 'negative-balance-account', asset },
      { accountAddress: 'padded-balance-account', asset },
      { accountAddress: 'healthy-account', asset },
    ]);

    expect(queryMulti).toHaveBeenCalledWith([
      [assetAccount, ['7', 'number-balance-account']],
      [assetAccount, ['7', 'blank-balance-account']],
      [assetAccount, ['7', 'nan-balance-account']],
      [assetAccount, ['7', 'negative-balance-account']],
      [assetAccount, ['7', 'padded-balance-account']],
      [assetAccount, ['7', 'healthy-account']],
    ]);
    expect(balances).toEqual(['0', '0', '0', '0', '0', '555']);
  });

  it('does not let malformed native account data block healthy asset balances', async () => {
    const systemAccount = vi.fn();
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [{}, createLiquidAssetAccount('444')]);
    const adapter = createAdapterHarness({
      query: {
        system: {
          account: systemAccount,
        },
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([
      { accountAddress: 'native-account' },
      { accountAddress: 'asset-account', asset },
    ]);

    expect(queryMulti).toHaveBeenCalledWith([
      [systemAccount, 'native-account'],
      [assetAccount, ['7', 'asset-account']],
    ]);
    expect(balances).toEqual(['0', '444']);
  });

  it('uses legacy asset identifiers only when bridge external metadata is unavailable', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('333')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      assetId: 'legacy-asset-id',
      externalAddress: '',
      externalDecimals: 12,
      symbol: 'LEGACY',
      name: 'Legacy Asset',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset & { assetId: string };

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'legacy-account', asset }]);

    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['legacy-asset-id', 'legacy-account']]]);
    expect(balances).toEqual(['333']);
  });

  it('trims blank external asset ids and falls back to the next usable metadata id', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn(async () => [createLiquidAssetAccount('333')]);
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '0xsora-asset-id',
      assetId: '  legacy-asset-id  ',
      externalAddress: '   ',
      externalDecimals: 12,
      symbol: 'LEGACY',
      name: 'Legacy Asset',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset & { assetId: string };

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'legacy-account', asset }]);

    expect(queryMulti).toHaveBeenCalledWith([[assetAccount, ['legacy-asset-id', 'legacy-account']]]);
    expect(balances).toEqual(['333']);
  });

  it('skips non-native asset slots with no usable asset identifier', async () => {
    const assetAccount = vi.fn();
    const queryMulti = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const asset = {
      address: '   ',
      assetId: {},
      externalAddress: '   ',
      externalDecimals: 12,
      id: null,
      symbol: 'BROKEN',
      name: 'Broken Asset',
      decimals: 18,
      isMintable: true,
    } as any as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'valid-account', asset }]);

    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).not.toHaveBeenCalled();
    expect(balances).toEqual(['0']);
  });

  it('falls back to zero balances when the connection guard refuses to query', async () => {
    const queryMulti = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: vi.fn(),
        },
      },
      queryMulti,
    });
    adapter.withConnection = async (_onSuccess, fallback) => fallback;
    const asset = {
      address: '0xsora-asset-id',
      externalAddress: '7',
      externalDecimals: 12,
      symbol: 'PSWAP',
      name: 'PSWAP',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balances = await adapter.getTokenBalancesBatch([{ accountAddress: 'liberland-account', asset }]);

    expect(queryMulti).not.toHaveBeenCalled();
    expect(balances).toEqual(['0']);
  });

  it('returns zero for direct token balance requests with blank accounts without touching RPC', async () => {
    const systemAccount = vi.fn();
    const assetAccount = vi.fn();
    const queryMulti = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        system: {
          account: systemAccount,
        },
        assets: {
          account: assetAccount,
        },
      },
      queryMulti,
    });
    const nativeAsset = {
      address: '0xsora-native-id',
      externalAddress: '',
      externalDecimals: 12,
      symbol: 'LLD',
      name: 'LLD',
      decimals: 18,
      isMintable: true,
    } as RegisteredAsset;

    const balance = await adapter.getTokenBalance('   ', nativeAsset);

    expect(systemAccount).not.toHaveBeenCalled();
    expect(assetAccount).not.toHaveBeenCalled();
    expect(queryMulti).not.toHaveBeenCalled();
    expect(balance).toBe('0');
  });

  it('normalizes malformed direct assets.account balances to zero', async () => {
    const assetAccount = vi.fn(async () => createMalformedLiquidAssetAccount('1e3'));
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account: assetAccount,
        },
      },
      queryMulti: vi.fn(),
    });

    const balance = await (adapter as any).assetsAccountRequest('  asset-account  ', '7');

    expect(assetAccount).toHaveBeenCalledWith('7', 'asset-account');
    expect(balance).toBe('0');
  });
});
