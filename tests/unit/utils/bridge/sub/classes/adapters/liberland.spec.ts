import { BridgeAccountType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { LiberlandAssetType, SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { describe, expect, it, vi } from 'vitest';

import { ZeroStringValue } from '@/consts';
import { LiberlandAdapter } from '@/utils/bridge/sub/classes/adapters/standalone/liberland';

import type { RegisteredAsset } from '@sora-substrate/sdk/build/assets/types';

type LiberlandAdapterHarness = LiberlandAdapter & {
  withConnection: <T>(onSuccess: () => T | Promise<T>, fallback: T) => Promise<T>;
  getAssetDeposit: (asset: RegisteredAsset) => Promise<string>;
  getAccountAssetBalance: (accountAddress: string, asset: RegisteredAsset) => Promise<string>;
};

const createAsset = (overrides: Partial<RegisteredAsset> = {}): RegisteredAsset =>
  ({
    address: '0xsora-asset-id',
    decimals: 18,
    externalAddress: '42',
    externalDecimals: 12,
    isMintable: true,
    name: 'PSWAP',
    symbol: 'PSWAP',
    ...overrides,
  }) as RegisteredAsset;

const createAdapterHarness = (api: unknown): LiberlandAdapterHarness => {
  const adapter = Object.create(LiberlandAdapter.prototype) as LiberlandAdapterHarness;

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

describe('LiberlandAdapter', () => {
  it('builds native LLD burn extrinsics from blank bridge metadata without coercing to asset zero', () => {
    const burn = vi.fn(() => ({ hash: '0xburn' }));
    const adapter = createAdapterHarness({
      tx: {
        soraBridgeApp: {
          burn,
        },
      },
    });

    const extrinsic = adapter.getTransferExtrinsic(
      createAsset({ externalAddress: '', symbol: 'LLD', name: 'Liberland Dollar' }),
      'sora-recipient',
      '1'
    );

    expect(extrinsic).toEqual({ hash: '0xburn' });
    expect(burn).toHaveBeenCalledWith(
      SubNetworkId.Mainnet,
      LiberlandAssetType.LLD,
      { [BridgeAccountType.Sora]: 'sora-recipient' },
      '1000000000000'
    );
  });

  it('normalizes numeric Liberland asset ids before building burn extrinsics', () => {
    const burn = vi.fn(() => ({ hash: '0xburn' }));
    const adapter = createAdapterHarness({
      tx: {
        soraBridgeApp: {
          burn,
        },
      },
    });

    adapter.getTransferExtrinsic(createAsset({ externalAddress: ' 42 ' }), 'sora-recipient', '2');

    expect(burn).toHaveBeenCalledWith(
      SubNetworkId.Mainnet,
      { [LiberlandAssetType.Asset]: 42 },
      { [BridgeAccountType.Sora]: 'sora-recipient' },
      '2000000000000'
    );
  });

  it('rejects malformed Liberland asset ids before creating burn extrinsics', () => {
    const burn = vi.fn();
    const adapter = createAdapterHarness({
      tx: {
        soraBridgeApp: {
          burn,
        },
      },
    });

    expect(() =>
      adapter.getTransferExtrinsic(createAsset({ externalAddress: 'not-a-number' }), 'recipient', '1')
    ).toThrow('Invalid Liberland asset id');
    expect(burn).not.toHaveBeenCalled();
  });

  it('uses existential deposit for native LLD minimums', async () => {
    const asset = vi.fn();
    const adapter = createAdapterHarness({
      consts: {
        balances: {
          existentialDeposit: {
            toString: () => '1000000000',
          },
        },
      },
      query: {
        assets: {
          asset,
        },
      },
    });

    const deposit = await adapter.getAssetDeposit(createAsset({ externalAddress: '', symbol: 'LLD' }));

    expect(deposit).toBe('1000000000');
    expect(asset).not.toHaveBeenCalled();
  });

  it('does not query asset storage for non-native Liberland assets without usable ids', async () => {
    const account = vi.fn();
    const adapter = createAdapterHarness({
      query: {
        assets: {
          account,
        },
      },
    });

    const balance = await adapter.getAccountAssetBalance('liberland-account', createAsset({ externalAddress: '   ' }));

    expect(balance).toBe(ZeroStringValue);
    expect(account).not.toHaveBeenCalled();
  });
});
