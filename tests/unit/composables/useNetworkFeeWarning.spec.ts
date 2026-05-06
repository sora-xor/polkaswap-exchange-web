import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk', () => {
  class MockFPNumber {
    value: number;

    constructor(value: string | number = 0) {
      this.value = Number(value || 0);
    }

    static ZERO = new MockFPNumber(0);

    static fromCodecValue(value: string | number = 0) {
      return new MockFPNumber(value);
    }

    static fromNatural(value: string | number = 0) {
      return new MockFPNumber(value);
    }

    static gte(left: MockFPNumber, right: MockFPNumber) {
      return left.value >= right.value;
    }

    get codec() {
      return String(this.value);
    }

    add(other: MockFPNumber) {
      return new MockFPNumber(this.value + other.value);
    }

    sub(other: MockFPNumber) {
      return new MockFPNumber(this.value - other.value);
    }

    isZero() {
      return this.value === 0;
    }

    isFinity() {
      return Number.isFinite(this.value);
    }

    toString() {
      return String(this.value);
    }
  }

  return {
    FPNumber: MockFPNumber,
    Operation: {
      Transfer: 'Transfer',
      EthBridgeOutgoing: 'EthBridgeOutgoing',
      EthBridgeIncoming: 'EthBridgeIncoming',
      RegisterAsset: 'RegisterAsset',
      CreatePair: 'CreatePair',
      AddLiquidity: 'AddLiquidity',
      RemoveLiquidity: 'RemoveLiquidity',
      Swap: 'Swap',
    },
  };
});

vi.mock('@sora-substrate/sdk/build/assets/consts', () => ({
  XOR: {
    address: 'xor-address',
    symbol: 'XOR',
  },
}));

const settingsStoreState = {
  networkFees: {} as Record<string, string>,
  allowFeePopup: true,
};

const walletStoreState = {
  accountAssetsAddressTable: {} as Record<string, { balance?: { transferable?: string } }>,
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreState,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    Zero: new FPNumber(0),
    getFPNumberFromCodec: (value?: string | number) => {
      if (value === 'not-finite') {
        return {
          isFinity: () => false,
        } as FPNumber;
      }

      return FPNumber.fromCodecValue(String(value || 0));
    },
  }),
}));

const createXorAsset = (transferable?: string) => ({
  balance: transferable == null ? {} : { transferable },
});

const codec = (value: number) => FPNumber.fromNatural(value).codec;

describe('useNetworkFeeWarning', () => {
  beforeEach(() => {
    settingsStoreState.networkFees = {
      [Operation.Transfer]: codec(1),
      [Operation.EthBridgeOutgoing]: codec(1),
      [Operation.RegisterAsset]: codec(1),
      [Operation.CreatePair]: codec(1),
      [Operation.AddLiquidity]: codec(99),
      [Operation.RemoveLiquidity]: codec(2),
      [Operation.Swap]: codec(2),
      RemoveLiquidity: codec(3),
    } as Record<string, string>;
    settingsStoreState.allowFeePopup = true;
    walletStoreState.accountAssetsAddressTable = {};
  });

  it('exposes popup and store-backed computed state while defaulting the XOR balance to zero', async () => {
    settingsStoreState.allowFeePopup = false;
    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset(),
    };

    const { useNetworkFeeWarning } = await import('@/composables/useNetworkFeeWarning');
    const warning = useNetworkFeeWarning();

    expect(warning.allowFeePopup.value).toBe(false);
    expect(warning.networkFees.value[Operation.Transfer]).toBe(codec(1));
    expect(warning.accountAssetsAddressTable.value).toBe(walletStoreState.accountAssetsAddressTable);
    expect(warning.xorBalance.value.isZero()).toBe(true);
  });

  it('treats incoming bridge operations and non-finite XOR balances as safe', async () => {
    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset('not-finite'),
    };

    const { useNetworkFeeWarning } = await import('@/composables/useNetworkFeeWarning');
    const warning = useNetworkFeeWarning();

    expect(warning.isXorSufficientForNextTx({ type: Operation.EthBridgeIncoming })).toBe(true);
    expect(warning.isXorSufficientForNextTx({ type: Operation.Transfer })).toBe(true);
  });

  it('checks predefined operations against the remaining XOR balance after amount and fee deductions', async () => {
    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset(codec(10)),
    };

    const { useNetworkFeeWarning } = await import('@/composables/useNetworkFeeWarning');
    const warning = useNetworkFeeWarning();

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.Transfer,
        isXor: true,
        amount: FPNumber.fromNatural(8),
      })
    ).toBe(true);

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.Transfer,
        isXor: true,
        amount: FPNumber.fromNatural(9),
      })
    ).toBe(false);

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.RegisterAsset,
        isXor: false,
      })
    ).toBe(true);
  });

  it('uses the remove-liquidity fee key for add-liquidity checks', async () => {
    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset(codec(6)),
    };

    const { useNetworkFeeWarning } = await import('@/composables/useNetworkFeeWarning');
    const warning = useNetworkFeeWarning();

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.AddLiquidity,
        isXor: false,
      })
    ).toBe(true);
  });

  it('handles remove-liquidity and default operations with the correct fee comparison', async () => {
    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset(codec(1)),
    };

    const { useNetworkFeeWarning } = await import('@/composables/useNetworkFeeWarning');
    const warning = useNetworkFeeWarning();

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.RemoveLiquidity,
        isXor: true,
        amount: FPNumber.fromNatural(5),
      })
    ).toBe(true);

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.RemoveLiquidity,
        isXor: false,
      })
    ).toBe(false);

    expect(
      warning.isXorSufficientForNextTx({
        type: Operation.Swap,
      })
    ).toBe(false);

    walletStoreState.accountAssetsAddressTable = {
      [XOR.address]: createXorAsset(codec(3)),
    };

    const nextWarning = useNetworkFeeWarning();

    expect(
      nextWarning.isXorSufficientForNextTx({
        type: Operation.Swap,
      })
    ).toBe(true);
  });
});
