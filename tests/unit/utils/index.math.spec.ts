import { beforeAll, describe, expect, it, vi } from 'vitest';

if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = { userAgent: 'vitest' };
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = { navigator: (globalThis as any).navigator };
} else if (!(globalThis as any).window.navigator) {
  (globalThis as any).window.navigator = (globalThis as any).navigator;
}

vi.mock('@sora-substrate/sdk', () => {
  class MockFPNumber {
    static DEFAULT_PRECISION = 18;
    static ZERO = new MockFPNumber(0);
    static HUNDRED = new MockFPNumber(100);

    value: number;
    precision: number;

    constructor(value: number | string, precision = MockFPNumber.DEFAULT_PRECISION) {
      this.value = Number(value);
      this.precision = precision;
    }

    static fromCodecValue(value: string, decimals = MockFPNumber.DEFAULT_PRECISION) {
      const divisor = 10 ** decimals;
      return new MockFPNumber(Number(value) / divisor, decimals);
    }

    toString(): string {
      if (!Number.isFinite(this.value)) return '0';
      const str = this.value.toString();
      return str.replace(/\.0+$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
    }

    sub(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value - other.value, this.precision);
    }

    max(other: MockFPNumber): MockFPNumber {
      return this.value >= other.value ? this : other;
    }

    toFixed(precision: number): string {
      return this.value.toFixed(precision);
    }

    toLocaleString(): string {
      return this.value.toLocaleString(undefined, { maximumFractionDigits: this.precision });
    }

    static lt(a: MockFPNumber, b: MockFPNumber): boolean {
      return a.value < b.value;
    }
  }

  class MockStorage {
    constructor(_: string) {}
    set() {}
    get() {
      return null;
    }
    remove() {}
  }

  return { FPNumber: MockFPNumber, Storage: MockStorage };
});
vi.mock('@sora-substrate/sdk/build/assets', () => ({ isNativeAsset: () => false }));
vi.mock('@sora-substrate/sdk/build/assets/consts', () => ({ XOR: { address: 'xor' } }));
vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  api: { account: { assets: [] }, system: {} },
  WALLET_CONSTS: { HiddenValue: '***' },
  getExplorerLinks: () => ({ account: () => '' }),
  storage: { set: () => {}, get: () => null, remove: () => {} },
  settingsStorage: { set: () => {}, get: () => null, remove: () => {} },
  vuex: { WalletModules: [] },
}));
vi.mock('@/store', () => ({
  default: {
    state: {
      wallet: {
        settings: { shouldBalanceBeHidden: false, soraNetwork: null },
        account: { assets: [], address: 'addr' },
      },
      web3: { denominator: { toCodecString: () => '1' } },
    },
    getters: {
      wallet: { account: { isLoggedIn: false } },
      assets: { assetDataByAddress: () => null },
      bridge: { autoselectedAssetAddress: null },
    },
    commit: () => {},
    dispatch: () => {},
    original: { watch: () => () => {} },
  },
}));
vi.mock('@/lang', () => ({ default: { t: () => '', tc: () => '', locale: 'en' } }));
vi.mock('@/router', () => ({ default: { currentRoute: { name: '' }, push: () => Promise.resolve() } }));
vi.mock('@/consts', () => ({ app: { name: 'Polkaswap' }, TranslationConsts: {}, ZeroStringValue: '0' }));
vi.mock('@/utils/storage', () => ({
  default: { set: () => {}, get: () => null, remove: () => {} },
  layoutsStorage: { set: () => {}, get: () => null },
  calculateStorageUsagePercentage: () => 0,
  clearLocalStorage: () => {},
}));
vi.mock('vue', () => ({
  default: {
    use: () => {},
  },
  reactive: (value: any) => value,
}));
vi.mock('vue-i18n', () => ({
  default: class MockVueI18n {
    constructor(_: any) {}
  },
}));
vi.mock('element-ui/src/utils/scrollbar-width', () => ({ default: () => 0 }));
vi.mock('lodash/debounce', () => ({ default: (fn: any) => fn }));

let getMaxBalance: any;
let hasInsufficientBalance: any;
let hasInsufficientNativeTokenForFee: any;

beforeAll(async () => {
  const utils = await import('@/utils');
  getMaxBalance = utils.getMaxBalance;
  hasInsufficientBalance = utils.hasInsufficientBalance;
  hasInsufficientNativeTokenForFee = utils.hasInsufficientNativeTokenForFee;
});

const mockAsset = (options: {
  address: string;
  decimals: number;
  transferable?: string;
  externalBalance?: string;
}) => ({
  address: options.address,
  decimals: options.decimals,
  balance: { transferable: options.transferable ?? '0' },
  externalBalance: options.externalBalance ?? '0',
});

describe('utils amount math edge cases', () => {
  it('getMaxBalance never underflows when fee > balance', () => {
    const asset = mockAsset({ address: 'xor', decimals: 18, transferable: '500000000000000000' });
    const fee = '600000000000000000';

    const result = getMaxBalance(asset as any, fee);

    expect(result.toString()).toBe('0');
  });

  it('getMaxBalance subtracts fee only for native balances', () => {
    const asset = mockAsset({ address: 'xor', decimals: 18, transferable: '1000000000000000000' });
    const fee = '100000000000000000';

    const result = getMaxBalance(asset as any, fee);

    expect(result.toString()).toBe('0.9');

    const externalAsset = mockAsset({
      address: '0xExternal',
      decimals: 18,
      transferable: '0',
      externalBalance: '1000000000000000000',
    });

    const externalResult = getMaxBalance(externalAsset as any, fee, { isExternalBalance: true });

    expect(externalResult.toString()).toBe('1');
  });

  it('hasInsufficientBalance respects provided options', () => {
    const asset = mockAsset({ address: 'xor', decimals: 18, transferable: '100000000000000000' });

    expect(hasInsufficientBalance(asset as any, '0.09', '10000000000000000')).toBe(false);
    expect(hasInsufficientBalance(asset as any, '0.09', '90000000000000000')).toBe(true);
  });

  it('hasInsufficientNativeTokenForFee handles zero fee and balance', () => {
    expect(hasInsufficientNativeTokenForFee('0', '0')).toBe(false);
    expect(hasInsufficientNativeTokenForFee('0', '1000')).toBe(true);
  });
});
