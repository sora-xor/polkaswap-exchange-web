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

  return {
    FPNumber: MockFPNumber,
    Storage: MockStorage,
    api: {
      setStorage: vi.fn(),
      shouldPairBeLocked: false,
      initKeyring: vi.fn(),
    },
    connection: {},
    Operation: {
      SwapAndSend: 'SwapAndSend',
      Transfer: 'Transfer',
      VestedTransfer: 'VestedTransfer',
      SwapTransferBatch: 'SwapTransferBatch',
      Mint: 'Mint',
    },
    TransactionStatus: {
      Finalized: 'Finalized',
      Pending: 'Pending',
      Failed: 'Failed',
    },
  };
});
vi.mock('@sora-substrate/sdk/build/assets', () => ({ isNativeAsset: () => false }));
vi.mock('@sora-substrate/sdk/build/assets/consts', () => ({
  XOR: { address: 'xor' },
  XSTUSD: { address: 'xstusd' },
  KUSD: { address: 'kusd' },
  KGOLD: { address: 'kgold' },
  KXOR: { address: 'kxor' },
  VXOR: { address: 'vxor' },
  KEN: { address: 'ken' },
  TBCD: { address: 'tbcd' },
  BalanceType: {
    Transferable: 'Transferable',
    Total: 'Total',
    Locked: 'Locked',
  },
}));
vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const walletStub = await createWalletMock({
    storage: {
      set: vi.fn(),
      get: vi.fn((key?: string) => {
        if (key === 'filters') {
          return JSON.stringify({ option: 'All', verifiedOnly: false, zeroBalance: false });
        }
        if (key === 'shouldBalanceBeHidden') {
          return 'false';
        }
        return null;
      }),
      remove: vi.fn(),
    },
    runtimeStorage: {
      set: vi.fn(),
      get: vi.fn(() => null),
      remove: vi.fn(),
    },
    settingsStorage: {
      set: vi.fn(),
      get: vi.fn(() => null),
      remove: vi.fn(),
    },
  });

  return {
    ...withWalletMock(walletStub, {
      WALLET_CONSTS: {
        ...walletStub.WALLET_CONSTS,
        ETH_BRIDGE_STATES: {
          INITIAL: 0,
        },
      },
      api: {
        ...(walletStub.api ?? {}),
        assets: {},
      },
    }),
  };
});

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    ...actual,
    getExplorerLinks: () => ({ account: () => '' }),
  };
});
vi.mock('@/lang', () => ({ default: { t: () => '', tc: () => '', locale: 'en' } }));
vi.mock('@/router', () => ({
  __esModule: true,
  default: { currentRoute: { name: '' }, push: () => Promise.resolve() },
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));
vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  storage: {
    set: () => {},
    get: (key?: string) => {
      if (key === 'filters') {
        return JSON.stringify({ option: 'All', verifiedOnly: false, zeroBalance: false });
      }
      if (key === 'shouldBalanceBeHidden') {
        return 'false';
      }
      return null;
    },
    remove: () => {},
  },
  runtimeStorage: {
    set: () => {},
    get: () => null,
    remove: () => {},
  },
  settingsStorage: {
    set: () => {},
    get: () => null,
    remove: () => {},
  },
}));
vi.mock('@/utils/storage', () => ({
  default: { set: () => {}, get: () => null, remove: () => {} },
  layoutsStorage: { set: () => {}, get: () => null },
  calculateStorageUsagePercentage: () => 0,
  clearLocalStorage: () => {},
}));
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  const defaultExport = (actual as { default?: unknown }).default ?? actual;

  return {
    __esModule: true,
    ...actual,
    default: defaultExport,
    reactive: (value: any) => value,
  };
});
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
let getSubstrateExplorerLinks: any;

beforeAll(async () => {
  const utils = await import('@/utils');
  getMaxBalance = utils.getMaxBalance;
  hasInsufficientBalance = utils.hasInsufficientBalance;
  hasInsufficientNativeTokenForFee = utils.hasInsufficientNativeTokenForFee;
  getSubstrateExplorerLinks = utils.getSubstrateExplorerLinks;
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

describe('substrate explorer links', () => {
  it('builds Sorametrics deep links for transaction hashes and accounts', () => {
    const baseLinks = [{ type: 'sorametrics', value: 'https://sorametrics.org' }];

    expect(getSubstrateExplorerLinks(baseLinks, false, '0xabc')).toEqual([
      {
        type: 'sorametrics',
        value: 'https://sorametrics.org/#tx=0xabc',
      },
    ]);

    expect(getSubstrateExplorerLinks(baseLinks, true, 'cnValidAddress')).toEqual([
      {
        type: 'sorametrics',
        value: 'https://sorametrics.org/#wallet=cnValidAddress',
      },
    ]);
  });

  it('falls back to Sorametrics block and extrinsic deep links when a tx hash is unavailable', () => {
    const baseLinks = [{ type: 'sorametrics', value: 'https://sorametrics.org/' }];

    expect(getSubstrateExplorerLinks(baseLinks, false, '25268814-1')).toEqual([
      {
        type: 'sorametrics',
        value: 'https://sorametrics.org/#extrinsic=25268814-1',
      },
    ]);

    expect(getSubstrateExplorerLinks(baseLinks, false, undefined, 25268814, 1)).toEqual([
      {
        type: 'sorametrics',
        value: 'https://sorametrics.org/#extrinsic=25268814-1',
      },
    ]);

    expect(getSubstrateExplorerLinks(baseLinks, false, undefined, 25268814)).toEqual([
      {
        type: 'sorametrics',
        value: 'https://sorametrics.org/#block=25268814',
      },
    ]);
  });
});
