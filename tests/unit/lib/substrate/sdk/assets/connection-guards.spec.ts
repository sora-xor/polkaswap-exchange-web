import { describe, expect, it, vi } from 'vitest';

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

const positiveBalance = {
  ...zeroBalance,
  free: '1000000000000000000',
  total: '1000000000000000000',
  transferable: '1000000000000000000',
};

const lockedOnlyBalance = {
  ...zeroBalance,
  reserved: '3000000000000000000',
  locked: '3000000000000000000',
  total: '3000000000000000000',
};

const malformedBalance = {
  ...positiveBalance,
  transferable: 'not-a-codec-value',
};

const emptyStringBalance = {
  free: '',
  reserved: '',
  frozen: '',
  bonded: '',
  locked: '',
  total: '',
  transferable: '',
};

const hugeBalance = {
  ...zeroBalance,
  free: '1234567890123456789012345678901234567890',
  total: '1234567890123456789012345678901234567890',
  transferable: '1234567890123456789012345678901234567890',
};

const leadingZeroBalance = createFlatBalance('000');

function createFlatBalance(value: string) {
  return {
    free: value,
    reserved: value,
    frozen: value,
    bonded: value,
    locked: value,
    total: value,
    transferable: value,
  };
}

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

class MultiBalanceEmissionAssetsModule extends AssetsModule<void> {
  public accountDefaultAssetsAddresses = ['asset-a', 'asset-b'];
  public emitBalanceUpdates: Record<string, (balance: typeof zeroBalance) => void> = {};
  public unsubscribeCounts: Record<string, number> = {};
  public requestedAddresses: string[] = [];
  public directBalances: Record<string, typeof zeroBalance> = {
    'asset-a': { ...positiveBalance },
    'asset-b': { ...positiveBalance },
  };
  public firstEmissions: Record<string, typeof zeroBalance | null> = {
    'asset-a': { ...zeroBalance },
    'asset-b': { ...hugeBalance },
  };

  public override async getAccountTokensAddressesList(): Promise<string[]> {
    return [];
  }

  public override async getAccountAsset(address: string) {
    this.requestedAddresses.push(address);

    return {
      address,
      symbol: address,
      name: address,
      decimals: 18,
      balance: { ...(this.directBalances[address] ?? zeroBalance) },
    } as never;
  }

  public override getAssetBalanceObservable(asset: { address: string }) {
    return {
      subscribe: (next: (balance: typeof zeroBalance) => void) => {
        this.emitBalanceUpdates[asset.address] = next;
        const firstEmission = this.firstEmissions[asset.address];

        if (firstEmission) {
          next({ ...firstEmission });
        }

        return {
          unsubscribe: () => {
            this.unsubscribeCounts[asset.address] = (this.unsubscribeCounts[asset.address] ?? 0) + 1;
          },
        };
      },
    } as never;
  }
}

class BalanceEmissionAssetsModule extends TestAssetsModule {
  public accountDefaultAssetsAddresses = ['custom-asset'];
  public emitBalanceUpdate: ((balance: typeof zeroBalance) => void) | null = null;
  public directBalance = { ...positiveBalance };
  public firstEmission: typeof zeroBalance | null = { ...zeroBalance };
  public assetDecimals = 18;

  public override async getAccountTokensAddressesList(): Promise<string[]> {
    return [];
  }

  public override async getAccountAsset(address: string) {
    this.requestedAddresses.push(address);

    return {
      address,
      symbol: address,
      name: address,
      decimals: this.assetDecimals,
      balance: { ...this.directBalance },
    } as never;
  }

  public override getAssetBalanceObservable() {
    return {
      subscribe: (next: (balance: typeof zeroBalance) => void) => {
        this.emitBalanceUpdate = next;
        if (this.firstEmission) {
          next({ ...this.firstEmission });
        }

        return { unsubscribe: () => undefined };
      },
    } as never;
  }
}

class SequenceBalanceEmissionAssetsModule extends BalanceEmissionAssetsModule {
  public bootstrapEmissions: Array<typeof zeroBalance> = [{ ...zeroBalance }];
  public subscribeCount = 0;
  public unsubscribeCount = 0;

  public override getAssetBalanceObservable() {
    return {
      subscribe: (next: (balance: typeof zeroBalance) => void) => {
        this.subscribeCount += 1;
        this.emitBalanceUpdate = next;

        for (const balance of this.bootstrapEmissions) {
          next({ ...balance });
        }

        return {
          unsubscribe: () => {
            this.unsubscribeCount += 1;
          },
        };
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

  it('keeps a direct non-zero balance when the first live subscription emits a transient zero snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
    expect(balanceUpdateCount).toBe(0);

    const nextBalance = {
      ...zeroBalance,
      free: '2000000000000000000',
      total: '2000000000000000000',
      transferable: '2000000000000000000',
    };
    assetsModule.emitBalanceUpdate?.(nextBalance);
    subscription.unsubscribe();

    expect(assetsModule.accountAssets[0].balance).toEqual(nextBalance);
    expect(balanceUpdateCount).toBe(1);
  });

  it('keeps locked-only direct balances when the first live subscription emits a transient zero snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.directBalance = { ...lockedOnlyBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(lockedOnlyBalance);
  });

  it('publishes an initial zero update when the direct balance is already zero', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.directBalance = { ...zeroBalance };
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
    expect(balanceUpdateCount).toBe(1);
  });

  it('publishes an initial non-zero live update immediately, including values beyond JS safe integers', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...hugeBalance };
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(hugeBalance);
    expect(balanceUpdateCount).toBe(1);
  });

  it('keeps a huge direct balance when the first live subscription emits a transient zero snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.directBalance = { ...hugeBalance };
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(hugeBalance);
    expect(balanceUpdateCount).toBe(0);
  });

  it('applies the transient zero guard to zero-decimal assets without decimal scaling assumptions', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    const indivisibleBalance = {
      ...zeroBalance,
      free: '1',
      total: '1',
      transferable: '1',
    };
    assetsModule.assetDecimals = 0;
    assetsModule.directBalance = { ...indivisibleBalance };
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].decimals).toBe(0);
    expect(assetsModule.accountAssets[0].balance).toEqual(indivisibleBalance);
    expect(balanceUpdateCount).toBe(0);
  });

  it('suppresses every synchronous startup zero before the first usable live balance', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.bootstrapEmissions = [
      { ...zeroBalance },
      { ...leadingZeroBalance },
      { ...zeroBalance },
      { ...hugeBalance },
    ];
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(hugeBalance);
    expect(balanceUpdateCount).toBe(1);
  });

  it('publishes a malformed synchronous bootstrap emission after suppressing earlier startup zeros', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.bootstrapEmissions = [{ ...zeroBalance }, { ...leadingZeroBalance }, { ...malformedBalance }];
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(malformedBalance);
    expect(balanceUpdateCount).toBe(1);
  });

  it('suppresses all synchronous startup zeros and still accepts a later real zero update', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.bootstrapEmissions = [{ ...zeroBalance }, { ...leadingZeroBalance }, { ...zeroBalance }];
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
    expect(balanceUpdateCount).toBe(0);

    assetsModule.directBalance = { ...zeroBalance };
    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
    });

    subscription.unsubscribe();
    expect(balanceUpdateCount).toBe(1);
  });

  it('does not duplicate subscriptions or re-bootstrap an existing account asset on repeated hydration', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.requestedAddresses).toEqual(['custom-asset']);
    expect(assetsModule.subscribeCount).toBe(1);
    expect(balanceUpdateCount).toBe(0);

    assetsModule.directBalance = { ...zeroBalance };
    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
    });

    subscription.unsubscribe();
    expect(balanceUpdateCount).toBe(1);
  });

  it('reapplies the startup zero guard after account assets are cleared and resubscribed', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
    expect(balanceUpdateCount).toBe(0);

    assetsModule.clearAccountAssets();
    assetsModule.directBalance = { ...lockedOnlyBalance };
    assetsModule.bootstrapEmissions = [{ ...zeroBalance }, { ...zeroBalance }];

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(lockedOnlyBalance);
    expect(balanceUpdateCount).toBe(0);
    expect(assetsModule.unsubscribeCount).toBe(1);
  });

  it('unsubscribes only the removed asset balance subscription', async () => {
    const assetsModule = new MultiBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets.map((asset) => asset.address)).toEqual(['asset-a', 'asset-b']);
    expect(assetsModule.unsubscribeCounts).toEqual({});
    expect(balanceUpdateCount).toBe(1);

    assetsModule.removeAccountAsset('asset-a');
    subscription.unsubscribe();

    expect(assetsModule.accountAssets.map((asset) => asset.address)).toEqual(['asset-b']);
    expect(assetsModule.unsubscribeCounts).toEqual({ 'asset-a': 1 });
    expect(balanceUpdateCount).toBe(2);
  });

  it('unsubscribes the live balance subscription when account assets are cleared', async () => {
    const assetsModule = new SequenceBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.unsubscribeCount).toBe(0);

    assetsModule.clearAccountAssets();

    expect(assetsModule.accountAssets).toEqual([]);
    expect(assetsModule.unsubscribeCount).toBe(1);
  });

  it('treats leading-zero codec strings as valid zero snapshots', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...leadingZeroBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
  });

  it('keeps the startup zero guard isolated per account asset subscription', async () => {
    const assetsModule = new MultiBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.requestedAddresses).toEqual(['asset-a', 'asset-b']);
    expect(assetsModule.accountAssets.map((asset) => [asset.address, asset.balance])).toEqual([
      ['asset-a', positiveBalance],
      ['asset-b', hugeBalance],
    ]);
    expect(balanceUpdateCount).toBe(1);
  });

  it('accepts later real zero updates independently for assets with different first emissions', async () => {
    const assetsModule = new MultiBalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    assetsModule.directBalances['asset-a'] = { ...zeroBalance };
    assetsModule.directBalances['asset-b'] = { ...zeroBalance };
    assetsModule.emitBalanceUpdates['asset-a']?.({ ...zeroBalance });
    assetsModule.emitBalanceUpdates['asset-b']?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.accountAssets.map((asset) => [asset.address, asset.balance])).toEqual([
        ['asset-a', zeroBalance],
        ['asset-b', zeroBalance],
      ]);
    });

    subscription.unsubscribe();
    expect(balanceUpdateCount).toBe(3);
  });

  it('keeps a later live zero hidden when a direct balance read still reports funds', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);

    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.requestedAddresses).toEqual(['custom-asset', 'custom-asset']);
    });

    subscription.unsubscribe();

    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
    expect(balanceUpdateCount).toBe(0);
  });

  it('only suppresses the first all-zero startup emission and accepts a later confirmed zero update', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);

    assetsModule.directBalance = { ...zeroBalance };
    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
    });
  });

  it('accepts a later confirmed zero update after an initial non-zero live emission disables the startup guard', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...hugeBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets[0].balance).toEqual(hugeBalance);

    assetsModule.directBalance = { ...zeroBalance };
    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    await vi.waitFor(() => {
      expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
    });
  });

  it('retains the direct balance and emits nothing when the live subscription has no initial value', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = null;
    let balanceUpdateCount = 0;
    const subscription = assetsModule.balanceUpdated.subscribe(() => {
      balanceUpdateCount += 1;
    });

    await assetsModule.updateAccountAssets();
    subscription.unsubscribe();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(positiveBalance);
    expect(balanceUpdateCount).toBe(0);
  });

  it('does not suppress zero updates after a malformed direct balance snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.directBalance = { ...malformedBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
  });

  it('does not treat a malformed first live emission as a transient zero snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...malformedBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(malformedBalance);
  });

  it('accepts a later zero update after a malformed first live emission disables the startup guard', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...malformedBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets[0].balance).toEqual(malformedBalance);

    assetsModule.emitBalanceUpdate?.({ ...zeroBalance });

    expect(assetsModule.accountAssets[0].balance).toEqual(zeroBalance);
  });

  it('does not suppress partial runtime balance objects that only look zero in known fields', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    const partialZeroBalance = {
      total: '0',
      transferable: '0',
    };
    assetsModule.firstEmission = partialZeroBalance as never;

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(partialZeroBalance);
  });

  it('does not treat empty codec fields as a valid zero snapshot', async () => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...emptyStringBalance };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(emptyStringBalance);
  });

  it.each([
    ['comma-formatted zeros', createFlatBalance('0,000')],
    ['space-padded zeros', createFlatBalance(' 0 ')],
    ['decimal zeros', createFlatBalance('0.0')],
    ['negative zeros', createFlatBalance('-0')],
  ])('does not treat %s as a valid zero snapshot', async (_label, invalidZeroSnapshot) => {
    const assetsModule = new BalanceEmissionAssetsModule({
      account: { pair: { address: 'account-address' } },
      accountStorage: {
        get: () => '',
        set: () => undefined,
      },
      poolXyk: { accountLiquidity: [] },
    } as never);
    assetsModule.firstEmission = { ...invalidZeroSnapshot };

    await assetsModule.updateAccountAssets();

    expect(assetsModule.accountAssets).toHaveLength(1);
    expect(assetsModule.accountAssets[0].balance).toEqual(invalidZeroSnapshot);
  });
});
