import { h } from 'vue';

const noop = () => undefined;
const asyncNoop = async () => undefined;

type MockFn<T extends any[] = any[], R = any> = ((...args: T) => R) & {
  mock: { calls: T[] };
  mockImplementation: (impl: (...args: T) => R) => MockFn<T, R>;
  mockImplementationOnce: (impl: (...args: T) => R) => MockFn<T, R>;
  mockResolvedValue: (value: R) => MockFn<T, R>;
  mockResolvedValueOnce: (value: R) => MockFn<T, R>;
  mockRejectedValue: (value: unknown) => MockFn<T, R>;
  mockRejectedValueOnce: (value: unknown) => MockFn<T, R>;
  mockReturnValue: (value: R) => MockFn<T, R>;
  mockReturnValueOnce: (value: R) => MockFn<T, R>;
  mockClear: () => MockFn<T, R>;
};

function createMockFn<T extends any[] = any[], R = any>(implementation: (...args: T) => R = noop as (...args: T) => R) {
  const state = {
    implementation,
    calls: [] as T[],
  };
  const onceQueue: Array<(...args: T) => R> = [];

  const fn = function (this: unknown, ...args: T): R {
    state.calls.push(args);
    const impl = onceQueue.length ? onceQueue.shift()! : state.implementation;
    return impl.apply(this, args);
  } as MockFn<T, R>;

  fn.mock = { calls: state.calls };
  fn.mockImplementation = (impl: (...args: T) => R) => {
    state.implementation = impl;
    return fn;
  };
  fn.mockImplementationOnce = (impl: (...args: T) => R) => {
    onceQueue.push(impl);
    return fn;
  };
  fn.mockResolvedValue = (value: R) => fn.mockImplementation(() => Promise.resolve(value) as unknown as R);
  fn.mockResolvedValueOnce = (value: R) => fn.mockImplementationOnce(() => Promise.resolve(value) as unknown as R);
  fn.mockRejectedValue = (value: unknown) => fn.mockImplementation(() => Promise.reject(value) as unknown as R);
  fn.mockRejectedValueOnce = (value: unknown) => fn.mockImplementationOnce(() => Promise.reject(value) as unknown as R);
  fn.mockReturnValue = (value: R) => fn.mockImplementation(() => value);
  fn.mockReturnValueOnce = (value: R) => fn.mockImplementationOnce(() => value);
  fn.mockClear = () => {
    state.calls.length = 0;
    return fn;
  };

  return fn;
}

function createComponentStub(key: PropertyKey) {
  const baseName = typeof key === 'string' && key.length ? key : 'Component';
  const kebabName = baseName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  const tagName = kebabName.includes('-') ? kebabName : `soraneo-${kebabName || 'component'}`;
  return {
    name: `Soraneo${baseName}Stub`,
    render() {
      const slots = (this as any).$slots;
      const content = typeof slots?.default === 'function' ? slots.default() : [];
      return h(tagName, { class: 'soraneo-component-stub' }, content);
    },
  };
}

const proxyComponent = new Proxy(
  {},
  {
    get: (_target, key) => createComponentStub(key),
  }
);

export class Vue {}

const getAppStore = () => {
  return (globalThis as Record<string, unknown>).__PS_APP_STORE__ as
    | {
        state?: Record<string, any>;
      }
    | undefined;
};

const fallbackState = {
  settings: {
    rotatePhoneDialogVisibility: false,
    isRotatePhoneHideBalanceFeatureEnabled: false,
    isAccessAccelerometrEventDeclined: false,
    isAccessRotationListener: false,
    language: 'en',
  },
};

const mixinRegistry: Record<string, () => new () => Vue> = {};

const proxyMixin = new Proxy(
  {},
  {
    get: (_target, key: string | symbol) => {
      if (typeof key !== 'string') return Vue;
      const factory = mixinRegistry[key];
      return factory ? factory() : class extends Vue {};
    },
  }
);

export const connection = {
  ApiPromise: class {},
  WsProvider: class {},
  open: createMockFn(asyncNoop),
  close: createMockFn(asyncNoop),
  disconnect: createMockFn(asyncNoop),
  connect: createMockFn(asyncNoop),
};

export class AlertsApiService {
  static baseRoute = '';

  alerts: Array<Record<string, unknown>> = [];

  pushNotification = createMockFn(asyncNoop);

  removeAlert = createMockFn();

  setAlertAsNotified = createMockFn();

  createPriceAlertSubscription = createMockFn(() => ({
    subscribe: createMockFn(),
    next: createMockFn(),
  }));
}

export const api = {
  NetworkFee: {},
  initKeyring: createMockFn(asyncNoop),
  tx: {},
  query: {},
  account: { assets: [] },
  system: {
    getDenominator: createMockFn(),
    getExtrinsicsFromBlock: createMockFn(),
    getBlockEvents: createMockFn(),
  },
  kensetsu: {
    serializeKey: createMockFn((locked: string, debt: string) => `${locked}-${debt}`),
  },
  bridgeProxy: {
    eth: {},
    evm: {},
    sub: {},
  },
  divideAssets: createMockFn(() => '0'),
  swap: {
    isALT: false,
    getDexesSwapQuoteObservable: createMockFn(),
    getPriceImpact: createMockFn(),
    getMinMaxValue: createMockFn(),
  },
  createType: createMockFn(() => ({
    toU8a: () => new Uint8Array([0, 0, 0, 0, 0]),
  })),
};

export const components = proxyComponent;
export const mixins = proxyMixin as Record<string, new () => Vue>;
export const Mixins = (...mixinsList: Array<new () => Vue>) => {
  class Mixed extends Vue {
    constructor(...args: any[]) {
      super(...args);
      for (const Ctor of mixinsList) {
        Object.assign(this, new Ctor());
      }
    }
  }

  for (const Ctor of mixinsList) {
    const descriptors = Object.getOwnPropertyDescriptors(Ctor.prototype);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (key === 'constructor') continue;
      Object.defineProperty(Mixed.prototype, key, descriptor);
    }
  }

  return Mixed;
};

export const WALLET_CONSTS = {
  HiddenValue: '***',
  TranslationConsts: {
    Max: 'Max.',
    Min: 'Min.',
    NetworkFee: 'Network Fee',
    Transactions: 'Transactions',
    Polkaswap: 'Polkaswap',
  },
  KnownAssets: {},
  KnownTokens: {},
  KnownSymbols: {},
  Networks: {
    eth: { name: 'Ethereum' },
  },
  IndexerType: {
    SUBQUERY: 'subquery',
    SUBSQUID: 'subsquid',
  },
  RouteNames: {
    WalletConnection: 'WalletConnection',
    WalletSend: 'WalletSend',
    Wallet: 'Wallet',
    WalletAssetDetails: 'WalletAssetDetails',
    CreateToken: 'CreateToken',
    ReceiveToken: 'ReceiveToken',
    AddAsset: 'AddAsset',
    SelectAsset: 'SelectAsset',
  },
  PaginationButton: {
    Prev: 'prev',
    Next: 'next',
    First: 'first',
    Last: 'last',
  },
  FontWeightRate: {
    SMALL: 'small',
    MEDIUM: 'medium',
    NORMAL: 'normal',
  },
  LogoSize: {
    MINI: 'mini',
    SMALL: 'small',
    MEDIUM: 'medium',
    BIG: 'big',
    BIGGER: 'bigger',
    LARGE: 'large',
  },
  ETH_BRIDGE_STATES: {
    INITIAL: 'INITIAL',
    SORA_COMMITED: 'SORA_COMMITED',
    SORA_REJECTED: 'SORA_REJECTED',
    EVM_REJECTED: 'EVM_REJECTED',
  },
  SoraNetwork: {
    Dev: 'Dev',
    Test: 'Test',
    Prod: 'Prod',
    Stage: 'Stage',
  },
  WalletFilteringOptions: {
    All: 'All',
    Currencies: 'Currencies',
    NFT: 'NFT',
  },
  AddAssetTabs: {
    Token: 'AddAssetToken',
    NFT: 'AddAssetNFT',
  },
  AccountActionTypes: {
    Rename: 'rename',
    Export: 'export',
    Logout: 'logout',
    Delete: 'delete',
    BookSend: 'bookSend',
    BookEdit: 'bookEdit',
    BookDelete: 'bookDelete',
  },
  HashType: {
    ID: 'id',
    Block: 'block',
    Account: 'account',
    EthAccount: 'ethAccount',
    EthTransaction: 'ethTransaction',
  },
  ExplorerType: {
    Sorascan: 'sorascan',
    Subscan: 'subscan',
    Polkadot: 'polkadot',
  },
};

const createTranslationMixin = () => {
  let cached: new () => Vue | null = null;

  return () => {
    if (!cached) {
      cached = class TranslationMixin extends Vue {
        get language(): string {
          return getAppStore()?.state?.settings?.language ?? 'en';
        }

        TranslationConsts = WALLET_CONSTS.TranslationConsts;

        t(key: string): string {
          return key;
        }

        tc(key: string): string {
          return key;
        }

        te(): boolean {
          return true;
        }

        get dayjsLocale(): string {
          return this.language;
        }

        formatDate(value?: number): string {
          if (typeof value !== 'number') return '';
          try {
            return new Date(value).toISOString();
          } catch {
            return String(value);
          }
        }
      };
    }

    return cached;
  };
};

mixinRegistry.TranslationMixin = createTranslationMixin();

const createStateDecorator = (segments: string[]) =>
  new Proxy(() => {}, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return () => undefined;
      return createStateDecorator([...segments, prop]);
    },
    apply(_target, _thisArg, args: unknown[]) {
      const [prototype, key] = args as [Record<string, unknown>, string];
      if (!prototype || !key) return;
      if (typeof console !== 'undefined') {
        console.debug?.('[wallet-stub] register state decorator', segments.join('.'));
      }
      Object.defineProperty(prototype, key, {
        configurable: true,
        enumerable: true,
        get() {
          let value: any = getAppStore()?.state;
          let fallback: any = fallbackState;
          for (const segment of segments) {
            value = value?.[segment];
            fallback = fallback?.[segment];
          }
          return value ?? fallback;
        },
      });
    },
  });

const createMutationDecorator = (segments: string[]) =>
  new Proxy(() => {}, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return () => undefined;
      return createMutationDecorator([...segments, prop]);
    },
    apply(_target, _thisArg, args: unknown[]) {
      const [prototype, key, descriptor] = args as [Record<string, unknown>, string, PropertyDescriptor];
      const original = descriptor?.value;
      descriptor.value = function (...methodArgs: unknown[]) {
        let branch: any = getAppStore()?.commit;
        for (const segment of segments) {
          branch = branch?.[segment];
        }
        if (typeof branch === 'function') {
          return branch(...methodArgs);
        }
        if (typeof original === 'function') {
          return original.apply(this, methodArgs);
        }
        return undefined;
      };
      return descriptor;
    },
  });

export const state = new Proxy(
  {},
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return () => undefined;
      return createStateDecorator([prop]);
    },
  }
) as Record<string, unknown>;

export const mutation = new Proxy(
  {},
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return () => undefined;
      return createMutationDecorator([prop]);
    },
  }
) as Record<string, unknown>;

export const TranslationConsts = WALLET_CONSTS.TranslationConsts;
export const IndexerType = WALLET_CONSTS.IndexerType;
export const LogoSize = {
  MINI: 'mini',
  SMALL: 'small',
  MEDIUM: 'medium',
  BIG: 'big',
  BIGGER: 'bigger',
  LARGE: 'large',
} as const;
export const HiddenValue = WALLET_CONSTS.HiddenValue;
export const accountIdBasedOperations: string[] = [];
export const FontSizeRate = {
  SMALL: 'small',
  MEDIUM: 'medium',
  NORMAL: 'normal',
} as const;
export const FontWeightRate = WALLET_CONSTS.FontWeightRate;
export const FilterOptions = {
  All: 'All',
  Native: 'Native',
  Kensetsu: 'Kensetsu',
  Synthetics: 'Synthetics',
  Ceres: 'Ceres',
} as const;
export const AddAssetTabs = WALLET_CONSTS.AddAssetTabs;
export const AccountActionTypes = WALLET_CONSTS.AccountActionTypes;
export const WalletFilteringOptions = WALLET_CONSTS.WalletFilteringOptions;
export const RouteNames = WALLET_CONSTS.RouteNames;
export const SoraNetwork = WALLET_CONSTS.SoraNetwork;
export const HashType = WALLET_CONSTS.HashType;
export const ExplorerType = WALLET_CONSTS.ExplorerType;
export const PaginationButton = WALLET_CONSTS.PaginationButton;

export const PassphraseTimeout = {
  FIFTEEN_MINUTES: '15m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1D',
  ONE_WEEK: '1W',
} as const;

export const PassphraseTimeoutDuration = {
  [PassphraseTimeout.FIFTEEN_MINUTES]: 15 * 60 * 1000,
  [PassphraseTimeout.ONE_HOUR]: 60 * 60 * 1000,
  [PassphraseTimeout.FOUR_HOURS]: 4 * 60 * 60 * 1000,
  [PassphraseTimeout.ONE_DAY]: 24 * 60 * 60 * 1000,
  [PassphraseTimeout.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
} as const;

export const DefaultPassphraseTimeout = PassphraseTimeoutDuration[PassphraseTimeout.FIFTEEN_MINUTES];

export const Links = {
  connection: {
    wiki: 'https://wiki.sora.org/polkaswap-connect-wallet.html',
  },
};

export const BalanceType = {
  Transferable: 'Transferable',
  Total: 'Total',
  Locked: 'Locked',
} as const;

export const TransactionStatus = {
  Finalized: 'Finalized',
  Pending: 'Pending',
  Failed: 'Failed',
} as const;

export const WALLET_TYPES = {
  ConnectionStatus: {
    Loading: 'loading',
    Unavailable: 'unavailable',
    Available: 'available',
  },
  FilterOptions: FilterOptions,
};
export const SUBQUERY_TYPES = {
  status: {
    IDLE: 'IDLE',
    READY: 'READY',
  },
};
export const SUBSQUID_TYPES = {
  status: {
    IDLE: 'IDLE',
    READY: 'READY',
  },
};
export const INDEXER_TYPES = {
  Status: {
    IDLE: 'IDLE',
    READY: 'READY',
  },
  IndexerType: {
    SUBQUERY: 'subquery',
    SUBSQUID: 'subsquid',
  },
  OrderStatus: {
    Filled: 'Filled',
    PartialFill: 'PartialFill',
    Cancelled: 'Cancelled',
    Unknown: 'Unknown',
  },
};
const createModule = () => ({
  namespaced: true,
  state: () => ({}),
  getters: {},
  actions: {},
  mutations: {},
});

const VuexOperation = {
  State: 'state',
  Getter: 'getter',
  Mutation: 'mutation',
  Action: 'action',
} as const;

const createDecoratorsObject = () => undefined;
const attachDecorator = () => noop;

export const vuex = {
  WalletModules: [],
  walletModules: {
    wallet: {
      namespaced: true,
      modules: {
        account: createModule(),
        router: createModule(),
        settings: createModule(),
        subscriptions: createModule(),
        transactions: createModule(),
      },
      state: () => ({}),
      getters: {},
      actions: {},
      mutations: {},
    },
  },
  VuexOperation,
  createDecoratorsObject,
  attachDecorator,
};

export const getCurrentIndexer = () => ({ fetch: asyncNoop });
export const historyElementsFilter = noop;

export const initializeWallets = asyncNoop;
export const addSoraWalletLocally = asyncNoop;
export const addGDriveWalletLocally = asyncNoop;
export const addWcSubWalletLocally = asyncNoop;
export const loadWalletCore = async () => ({
  api,
  connection,
  WALLET_CONSTS,
  WALLET_TYPES,
  storage,
  settingsStorage,
});
export const initWallet = createMockFn(asyncNoop);
export const waitForCore = createMockFn(asyncNoop);
export const en = {};
export const validateAddress = () => true;
export const formatAccountAddress = (value: string) => value;
export const formatAddress = formatAccountAddress;
export const groupRewardsByAssetsList = () => ({ transactions: [] });
export const getExplorerLinks = () => ({
  account: () => '',
  extrinsic: () => '',
});
export const beforeTransactionSign = asyncNoop;
export const getAssetsSubset = () => [];
export const delay = async () => undefined;
export const WALLET_ERRORS = {};
export const WC = {
  WcProvider: {
    projectId: 'test-project-id',
  },
};
export const accountUtils = {
  loginApi: asyncNoop,
  logoutApi: asyncNoop,
  isAppStorageSource: () => false,
};
export const checkDevicesAvailability = async () => ({
  camera: true,
  microphone: true,
});
export const checkCameraPermission = async () => ({
  state: 'granted',
});
export const API_ENDPOINT = 'https://localhost';
export const getCurrency = (currency?: string) => ({
  symbol: currency ?? 'USD',
  name: currency ?? 'US Dollar',
});
export const getTextWidth = (value: string) => value.length * 8;
export const getCssVariableValue = (name: string) => `var(${name})`;
export const getScrollbarWidth = () => 0;
export const getAccountIdentity = async () => null;
export const translationUtils = {
  t: (key: string) => key,
  tc: (key: string) => key,
  te: () => true,
  formatDate: (value: unknown) => String(value ?? ''),
  TranslationConsts,
};
export function useTranslation() {
  return {
    t: (key: string) => key,
    tc: (key: string) => key,
    te: () => true,
    formatDate: (value: unknown) => String(value ?? ''),
    TranslationConsts,
  };
}

export class AppError extends Error {
  constructor(public payload: Record<string, unknown> = {}) {
    super(payload.key ?? 'AppError');
    this.name = 'AppError';
  }
}

export const storage = {
  set: createMockFn(),
  get: createMockFn(() => null),
  remove: createMockFn(),
};

export const runtimeStorage = {
  set: createMockFn(),
  get: createMockFn(() => null),
  remove: createMockFn(),
};

export const settingsStorage = {
  set: createMockFn(),
  get: createMockFn(() => null),
  remove: createMockFn(),
};

export const ScriptLoader = class {
  constructor() {
    this.loaded = new Set<string>();
  }

  loaded: Set<string>;

  load = asyncNoop;
};

export const wallet = {
  account: {
    checkConnectedAccountSource: noop,
    updateAvailableWallets: noop,
  },
};

const walletPlugin = {
  install: createMockFn(),
  connection,
  api,
  components,
  WALLET_CONSTS,
  BalanceType,
  TransactionStatus,
  WALLET_TYPES,
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  INDEXER_TYPES,
  vuex,
  getCurrentIndexer,
  historyElementsFilter,
  initializeWallets,
  addSoraWalletLocally,
  addGDriveWalletLocally,
  addWcSubWalletLocally,
  initWallet,
  waitForCore,
  validateAddress,
  formatAccountAddress,
  groupRewardsByAssetsList,
  getExplorerLinks,
  beforeTransactionSign,
  getAssetsSubset,
  delay,
  storage,
  runtimeStorage,
  settingsStorage,
  ScriptLoader,
  wallet,
  WC,
  WALLET_ERRORS,
  AppError,
  AlertsApiService,
  translationUtils,
  useTranslation,
  accountUtils,
  FontSizeRate,
  FontWeightRate,
  checkDevicesAvailability,
  checkCameraPermission,
  API_ENDPOINT,
  getCurrency,
  getTextWidth,
  getCssVariableValue,
  getScrollbarWidth,
  FilterOptions,
  getAccountIdentity,
  AddAssetTabs,
  AccountActionTypes,
  WalletFilteringOptions,
  RouteNames,
  SoraNetwork,
  HashType,
  ExplorerType,
  PaginationButton,
  PassphraseTimeout,
  PassphraseTimeoutDuration,
  DefaultPassphraseTimeout,
  Links,
};

export default walletPlugin;
