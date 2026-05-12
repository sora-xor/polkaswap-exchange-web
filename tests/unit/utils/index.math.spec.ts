import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = { userAgent: 'vitest' };
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = { navigator: (globalThis as any).navigator };
} else if (!(globalThis as any).window.navigator) {
  (globalThis as any).window.navigator = (globalThis as any).navigator;
}

const { getExplorerLinksMock } = vi.hoisted(() => ({
  getExplorerLinksMock: vi.fn(),
}));

vi.mock('@sora-substrate/sdk', () => {
  class MockFPNumber {
    static DEFAULT_PRECISION = 18;
    static ZERO = new MockFPNumber(0);
    static HUNDRED = new MockFPNumber(100);
    static DELIMITERS_CONFIG = { thousand: ',', decimal: '.' };

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

    div(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value / other.value, this.precision);
    }

    mul(other: MockFPNumber): MockFPNumber {
      return new MockFPNumber(this.value * other.value, this.precision);
    }

    max(other: MockFPNumber): MockFPNumber {
      return this.value >= other.value ? this : other;
    }

    isZero(): boolean {
      return this.value === 0;
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

    static gt(a: MockFPNumber, b: MockFPNumber): boolean {
      return a.value > b.value;
    }

    static eq(a: MockFPNumber, b: MockFPNumber): boolean {
      return a.value === b.value;
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
vi.mock('@sora-substrate/math', async () => {
  const { FPNumber } = await import('@sora-substrate/sdk');

  return { FPNumber };
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
    getExplorerLinks: getExplorerLinksMock,
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
let getMaxValue: any;
let isMaxButtonAvailable: any;
let hasInsufficientBalance: any;
let hasInsufficientXorForFee: any;
let hasInsufficientNativeTokenForFee: any;
let getSubstrateExplorerLinks: any;
let waitUntil: any;
let copyToClipboard: any;
let capitalize: any;
let areEqual: any;
let isXorAccountAsset: any;
let showMostFittingValue: any;
let getCurrency: any;
let conditionalAwait: any;
let getLiquidityBalance: any;
let debouncedInputHandler: any;
let updateFpNumberLocale: any;
let getMobileCssClasses: any;
let toQueryString: any;
let getTextWidth: any;
let calcPriceChange: any;
let convertFPNumberToNumber: any;
let formatDecimalPlaces: any;
let soraExplorerLinks: any;
let updatePipTheme: any;
let FPNumber: any;

beforeAll(async () => {
  const utils = await import('@/utils');
  FPNumber = (await import('@sora-substrate/math')).FPNumber;
  getMaxBalance = utils.getMaxBalance;
  getMaxValue = utils.getMaxValue;
  isMaxButtonAvailable = utils.isMaxButtonAvailable;
  hasInsufficientBalance = utils.hasInsufficientBalance;
  hasInsufficientXorForFee = utils.hasInsufficientXorForFee;
  hasInsufficientNativeTokenForFee = utils.hasInsufficientNativeTokenForFee;
  getSubstrateExplorerLinks = utils.getSubstrateExplorerLinks;
  waitUntil = utils.waitUntil;
  copyToClipboard = utils.copyToClipboard;
  capitalize = utils.capitalize;
  areEqual = utils.areEqual;
  isXorAccountAsset = utils.isXorAccountAsset;
  showMostFittingValue = utils.showMostFittingValue;
  getCurrency = utils.getCurrency;
  conditionalAwait = utils.conditionalAwait;
  getLiquidityBalance = utils.getLiquidityBalance;
  debouncedInputHandler = utils.debouncedInputHandler;
  updateFpNumberLocale = utils.updateFpNumberLocale;
  getMobileCssClasses = utils.getMobileCssClasses;
  toQueryString = utils.toQueryString;
  getTextWidth = utils.getTextWidth;
  calcPriceChange = utils.calcPriceChange;
  convertFPNumberToNumber = utils.convertFPNumberToNumber;
  formatDecimalPlaces = utils.formatDecimalPlaces;
  soraExplorerLinks = utils.soraExplorerLinks;
  updatePipTheme = utils.updatePipTheme;
});

beforeEach(() => {
  getExplorerLinksMock.mockReset();
  getExplorerLinksMock.mockReturnValue([]);
  FPNumber.DELIMITERS_CONFIG.thousand = ',';
  FPNumber.DELIMITERS_CONFIG.decimal = '.';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const mockAsset = (options: {
  address: string;
  decimals: number;
  transferable?: string;
  externalBalance?: string;
  externalDecimals?: number;
  bonded?: string;
}) => ({
  address: options.address,
  decimals: options.decimals,
  balance: { transferable: options.transferable ?? '0', bonded: options.bonded ?? '0' },
  externalBalance: options.externalBalance ?? '0',
  externalDecimals: options.externalDecimals ?? options.decimals,
});

const overrideNavigator = (patch: Partial<Navigator>) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { ...(descriptor?.value as Navigator), ...patch },
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, 'navigator', descriptor);
    } else {
      delete (globalThis as any).navigator;
    }
  };
};

const overrideWindowProp = (name: string, value: unknown) => {
  const descriptor = Object.getOwnPropertyDescriptor(window, name);
  Object.defineProperty(window, name, {
    configurable: true,
    value,
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(window, name, descriptor);
    } else {
      delete (window as any)[name];
    }
  };
};

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

  it('getMaxValue supports external native and bonded balances', () => {
    const externalNative = mockAsset({
      address: '0xExternal',
      decimals: 18,
      externalBalance: '2000000000000000000',
      externalDecimals: 18,
    });

    expect(
      getMaxValue(externalNative as any, '500000000000000000', {
        isExternalBalance: true,
        isExternalNative: true,
      })
    ).toBe('1.5');

    const bondedAsset = mockAsset({
      address: 'xor',
      decimals: 18,
      transferable: '0',
      bonded: '3000000000000000000',
    });

    expect(getMaxValue(bondedAsset as any, '500000000000000000', { isBondedBalance: true })).toBe('3');
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

  it('hasInsufficientXorForFee handles missing asset, zero fee, and XOR output swaps', () => {
    const xorAsset = mockAsset({ address: 'xor', decimals: 18, transferable: '100000000000000000' });

    expect(hasInsufficientXorForFee(null, '100000000000000000')).toBe(true);
    expect(hasInsufficientXorForFee(xorAsset as any, '0')).toBe(false);
    expect(hasInsufficientXorForFee(xorAsset as any, '200000000000000000')).toBe(true);
    expect(hasInsufficientXorForFee(xorAsset as any, '200000000000000000', true)).toBe(false);
  });

  it('checks MAX button availability without revealing empty or exact balances', () => {
    const xorAsset = mockAsset({ address: 'xor', decimals: 18, transferable: '1000000000000000000' });

    expect(isMaxButtonAvailable(null, '0.1', '0', xorAsset as any)).toBe(false);
    expect(isMaxButtonAvailable(xorAsset as any, '1', '0', xorAsset as any)).toBe(false);
    expect(isMaxButtonAvailable(xorAsset as any, '0.5', '0', xorAsset as any)).toBe(true);
  });
});

describe('general utility helpers', () => {
  it('waitUntil retries until the condition becomes true', async () => {
    vi.useFakeTimers();
    let attempts = 0;

    const pending = waitUntil(() => {
      attempts += 1;
      return attempts >= 3;
    });

    await vi.advanceTimersByTimeAsync(500);
    await pending;

    expect(attempts).toBe(3);
  });

  it('copies text to the clipboard and logs synchronous clipboard failures', async () => {
    const writeText = vi.fn();
    const restore = overrideNavigator({ clipboard: { writeText } as unknown as Clipboard });

    try {
      await copyToClipboard('cnAddress');
      expect(writeText).toHaveBeenCalledWith('cnAddress');

      const error = new Error('clipboard denied');
      writeText.mockImplementationOnce(() => {
        throw error;
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(copyToClipboard('next')).resolves.toBeUndefined();
      expect(consoleError).toHaveBeenCalledWith('Could not copy text: ', error);
    } finally {
      restore();
    }
  });

  it('handles simple string and object helpers', () => {
    expect(capitalize('polkaswap')).toBe('Polkaswap');
    expect(areEqual({ a: 1, b: ['2'] }, { a: 1, b: ['2'] })).toBe(true);
    expect(areEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isXorAccountAsset({ address: 'xor' })).toBe(true);
    expect(isXorAccountAsset(null)).toBe(false);
    expect(getCurrency('USD', [{ key: 'EUR' }, { key: 'USD', symbol: '$' }])).toEqual({ key: 'USD', symbol: '$' });
    expect(getLiquidityBalance({ balance: '123' })).toBe('123');
    expect(getLiquidityBalance(null)).toBeUndefined();
  });

  it('runs conditional awaits in blocking and fire-and-forget modes', async () => {
    const events: string[] = [];
    let resolveWaiting!: () => void;

    const waitingFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push('waiting:start');
          resolveWaiting = () => {
            events.push('waiting:done');
            resolve();
          };
        })
    );

    const pending = conditionalAwait(waitingFn, true);
    expect(events).toEqual(['waiting:start']);
    resolveWaiting();
    await pending;
    expect(events).toEqual(['waiting:start', 'waiting:done']);

    const fireAndForget = vi.fn(() => {
      events.push('fire-and-forget');
      return Promise.resolve();
    });

    await conditionalAwait(fireAndForget, false);
    expect(fireAndForget).toHaveBeenCalledTimes(1);
    expect(events).toContain('fire-and-forget');
  });

  it('uses the debounced input wrapper with the configured lodash mock', () => {
    const handler = vi.fn();

    const wrapped = debouncedInputHandler(handler, 250, { leading: false });
    wrapped('value');

    expect(handler).toHaveBeenCalledWith('value');
  });

  it('updates FPNumber locale delimiters from browser number formatting', () => {
    updateFpNumberLocale('en-US');

    expect(FPNumber.DELIMITERS_CONFIG).toEqual({ thousand: ',', decimal: '.' });
  });

  it('detects mobile CSS classes from user agents', () => {
    let restore = overrideNavigator({ userAgent: 'Mozilla/5.0 Windows Phone Android', maxTouchPoints: 0 } as any);
    try {
      expect(getMobileCssClasses()).toEqual(['mobile', 'windows']);
    } finally {
      restore();
    }

    restore = overrideNavigator({ userAgent: 'Mozilla/5.0 Android', maxTouchPoints: 0 } as any);
    try {
      expect(getMobileCssClasses()).toEqual(['mobile', 'android']);
    } finally {
      restore();
    }

    restore = overrideNavigator({ userAgent: 'Mozilla/5.0 iPhone', maxTouchPoints: 0 } as any);
    try {
      expect(getMobileCssClasses()).toEqual(['mobile', 'ios']);
    } finally {
      restore();
    }

    restore = overrideNavigator({ userAgent: 'Mozilla/5.0 Macintosh', maxTouchPoints: 5 } as any);
    try {
      expect(getMobileCssClasses()).toEqual(['mobile', 'ios']);
    } finally {
      restore();
    }

    restore = overrideNavigator({ userAgent: 'Mozilla/5.0 Linux x86_64', maxTouchPoints: 0 } as any);
    try {
      expect(getMobileCssClasses()).toBeUndefined();
    } finally {
      restore();
    }
  });

  it('formats query strings and measures text width with a canvas context', () => {
    expect(toQueryString({ search: 'xor token', address: 'cn/abc' })).toBe('search=xor%20token&address=cn%2Fabc');

    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({
            font: '',
            measureText: () => ({ width: 12.2 }),
          }),
        } as any;
      }

      return createElement(tagName);
    });

    expect(getTextWidth('XOR', 'Inter', 12)).toBe(13);
  });

  it('returns zero text width when canvas context is unavailable', () => {
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return { getContext: () => null } as any;
      }

      return createElement(tagName);
    });

    expect(getTextWidth('XOR')).toBe(0);
  });

  it('calculates percentage and formatting helpers using FPNumber', () => {
    expect(calcPriceChange(new FPNumber(5), FPNumber.ZERO).toString()).toBe('100');
    expect(calcPriceChange(FPNumber.ZERO, FPNumber.ZERO).toString()).toBe('0');
    expect(calcPriceChange(new FPNumber(150), new FPNumber(100)).toString()).toBe('50');
    expect(convertFPNumberToNumber(new FPNumber('1.239'), 2)).toBe(1.24);
    expect(convertFPNumberToNumber(null, 2)).toBe(0);
    expect(formatDecimalPlaces(1.236, true)).toBe('1.24%');
  });

  it('shows the most fitting precision for large and low-cost values', () => {
    expect(showMostFittingValue(new FPNumber('12.3456'))).toBe('12.35');
    expect(showMostFittingValue(new FPNumber('0.00004321'), 8)).toBe('0.000043');
  });

  it('syncs document picture-in-picture theme when a PiP window exists', () => {
    document.documentElement.setAttribute('design-system-theme', 'dark');
    const setAttribute = vi.fn();
    const restore = overrideWindowProp('documentPictureInPicture', {
      window: {
        document: {
          documentElement: { setAttribute },
        },
      },
    });

    try {
      updatePipTheme();
      expect(setAttribute).toHaveBeenCalledWith('design-system-theme', 'dark');
    } finally {
      restore();
    }
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

  it('builds Subscan and Polkadot transaction links with optional event anchors', () => {
    const baseLinks = [
      { type: 'subscan', value: 'https://sora.subscan.io' },
      { type: 'polkadot', value: 'https://polkadot.js.org/apps/?rpc=wss#/explorer/query' },
    ];

    expect(getSubstrateExplorerLinks(baseLinks, false, '0xabc', 42, 7)).toEqual([
      {
        type: 'subscan',
        value: 'https://sora.subscan.io/extrinsic/0xabc?event=42-7',
      },
      {
        type: 'polkadot',
        value: 'https://polkadot.js.org/apps/?rpc=wss#/explorer/query/42',
      },
    ]);

    expect(getSubstrateExplorerLinks(baseLinks, false, undefined, 42, 7)).toEqual([
      {
        type: 'subscan',
        value: 'https://sora.subscan.io/block/42?event=42-7&tab=event',
      },
      {
        type: 'polkadot',
        value: 'https://polkadot.js.org/apps/?rpc=wss#/explorer/query/42',
      },
    ]);
  });

  it('filters unsupported account links and empty transaction links', () => {
    const baseLinks = [
      { type: 'subscan', value: 'https://sora.subscan.io' },
      { type: 'polkadot', value: 'https://polkadot.js.org/apps/?rpc=wss#/explorer/query' },
    ];

    expect(getSubstrateExplorerLinks(baseLinks, true, 'cnAddress')).toEqual([
      {
        type: 'subscan',
        value: 'https://sora.subscan.io/account/cnAddress',
      },
    ]);

    expect(getSubstrateExplorerLinks(baseLinks)).toEqual([]);
    expect(getSubstrateExplorerLinks([])).toEqual([]);
  });

  it('uses network explorer links when SORA network is available', () => {
    getExplorerLinksMock.mockReturnValue([{ type: 'subscan', value: 'https://sora.subscan.io' }]);

    expect(soraExplorerLinks(null)).toEqual([]);
    expect(soraExplorerLinks('Prod', '0xabc')).toEqual([
      {
        type: 'subscan',
        value: 'https://sora.subscan.io/extrinsic/0xabc',
      },
    ]);
    expect(getExplorerLinksMock).toHaveBeenCalledWith('Prod');
  });
});
