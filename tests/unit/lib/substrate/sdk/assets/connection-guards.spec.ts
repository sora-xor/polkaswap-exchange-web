import { describe, expect, it } from 'vitest';

import { AssetsModule, getAssets } from '@/lib/substrate/sdk/assets';
import { XOR } from '@/lib/substrate/sdk/assets/consts';

const zeroBalance = {
  free: '0',
  reserved: '0',
  frozen: '0',
  bonded: '0',
  locked: '0',
  total: '0',
  transferable: '0',
};

class TestAssetsModule extends AssetsModule<void> {
  public accountDefaultAssetsAddresses = [XOR.address, 'native-asset'];
  public requestedAddresses: string[] = [];

  public override async getAccountTokensAddressesList(): Promise<string[]> {
    return ['chain-asset'];
  }

  public override async getAccountAsset(address: string) {
    this.requestedAddresses.push(address);

    return {
      address,
      symbol: address,
      name: address,
      decimals: 18,
      balance: { ...zeroBalance },
    } as never;
  }

  public override getAssetBalanceObservable(asset: { balance: typeof zeroBalance }) {
    return {
      subscribe: (next: (balance: typeof zeroBalance) => void) => {
        next(asset.balance);

        return { unsubscribe: () => undefined };
      },
    } as never;
  }
}

describe('AssetsModule connection guards', () => {
  it('returns empty asset lists when substrate api is unavailable', async () => {
    const assetsModule = new AssetsModule({
      connection: { api: null },
    } as any);

    await expect(getAssets(null as any)).resolves.toEqual([]);
    await expect(assetsModule.getAssets()).resolves.toEqual([]);
    await expect(assetsModule.getAssets(true)).resolves.toEqual([]);
    await expect(assetsModule.getAssetsIds()).resolves.toEqual([]);
  });

  it('keeps native account assets tracked when saved addresses omit XOR', async () => {
    const storage: Record<string, string> = {
      assetsAddresses: JSON.stringify(['custom-asset']),
    };
    const assetsModule = new TestAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: (key: string) => storage[key],
        set: (key: string, value: string) => {
          storage[key] = value;
        },
      },
      poolXyk: { accountLiquidity: [] },
    } as never);

    await assetsModule.updateAccountAssets();

    expect(JSON.parse(storage.assetsAddresses)).toEqual(['custom-asset', XOR.address, 'native-asset']);
    expect(assetsModule.requestedAddresses).toEqual(['custom-asset', XOR.address, 'native-asset']);
    expect(assetsModule.accountAssets.map((asset) => asset.address)).toEqual([
      'custom-asset',
      XOR.address,
      'native-asset',
    ]);
  });
});
