import { config } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { vi } from 'vitest';

if (typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(0);
}

process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error) {
    if (
      reason.message.includes('[vitest] There was an error when mocking a module') ||
      reason.message === '[object Object]'
    ) {
      return;
    }
  }

  console.error('UNHANDLED REJECTION', reason);
});

vi.mock('@vue/devtools-kit', () => ({
  setupDevtoolsPlugin: () => undefined,
  getDevtoolsGlobalHook: () => ({}),
  setDevtoolsGlobalHook: () => undefined,
}));

// Additional polyfills for unit tests running in jsdom.

const g = globalThis as typeof globalThis & {
  window?: any;
  navigator?: Navigator;
  Notification?: typeof Notification;
  localStorage?: Storage;
  sessionStorage?: Storage;
};

// Prevent Lit from printing dev-mode warnings during tests.
(g as Record<string, unknown>).litIssuedDevModeWarning = true;
(globalThis as Record<string, unknown>).litIssuedDevModeWarning = true;
(g as Record<string, unknown>).litDisableDevModeWarning = true;
(globalThis as Record<string, unknown>).litDisableDevModeWarning = true;

g.window = g.window ?? ({} as any);

const eventTarget = new EventTarget();
g.window.dispatchEvent = g.window.dispatchEvent ?? eventTarget.dispatchEvent.bind(eventTarget);
g.window.addEventListener = g.window.addEventListener ?? eventTarget.addEventListener.bind(eventTarget);
g.window.removeEventListener = g.window.removeEventListener ?? eventTarget.removeEventListener.bind(eventTarget);

const intervalMock = vi.fn(
  (handler: TimerHandler, _timeout?: number, ...args: unknown[]): ReturnType<typeof setInterval> => {
    if (typeof handler === 'function') {
      handler(...args);
    }
    return 1 as unknown as ReturnType<typeof setInterval>;
  }
);
const clearIntervalMock = vi.fn();

g.window.setInterval = intervalMock;
g.window.clearInterval = clearIntervalMock;
g.setInterval = intervalMock;
g.clearInterval = clearIntervalMock;

function installEventFactory(name: string, domEventType: string): void {
  const factory = function (type: string, params: EventInit = {}): Event {
    if (typeof g.window.Event === 'function') {
      try {
        const native = new g.window.Event(type, params);
        Object.assign(native, params);
        return native;
      } catch {
        // fall through to createEvent-based fallback
      }
    }

    if (typeof g.window.document?.createEvent === 'function') {
      try {
        const event = g.window.document.createEvent(domEventType);
        const bubbles = params.bubbles ?? true;
        const cancelable = params.cancelable ?? true;
        event.initEvent(type, bubbles, cancelable);
        Object.assign(event, params);
        return event as Event;
      } catch {
        // ignore and use plain object fallback
      }
    }

    const fallback: Event = {
      type,
      bubbles: params.bubbles ?? false,
      cancelable: params.cancelable ?? false,
      composed: params.composed ?? false,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {},
    } as Event;
    Object.assign(fallback, params);
    return fallback;
  } as unknown as EventConstructor;

  (g.window as Record<string, unknown>)[name] = factory;
  if (typeof (g as Record<string, unknown>)[name] !== 'function') {
    (g as Record<string, unknown>)[name] = factory;
  }
}

if (typeof g.window.Event !== 'function') {
  installEventFactory('Event', 'Event');
} else if (typeof g.Event !== 'function') {
  g.Event = g.window.Event;
}

const eventDomTypes: Record<string, string> = {
  MouseEvent: 'MouseEvents',
  KeyboardEvent: 'KeyboardEvent',
  FocusEvent: 'Event',
  PointerEvent: 'Event',
};

Object.entries(eventDomTypes).forEach(([name, domType]) => {
  if (typeof (g.window as Record<string, unknown>)[name] !== 'function') {
    installEventFactory(name, domType);
  } else if (typeof (g as Record<string, unknown>)[name] !== 'function') {
    (g as Record<string, unknown>)[name] = (g.window as Record<string, unknown>)[name];
  }
});

g.Notification = g.Notification ?? (function () {} as any);

// Suppress noisy polkadot duplicate-version warnings that do not affect test results.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('@polkadot/') && first.includes('has multiple versions')) {
    return;
  }
  originalWarn(...args);
};

if (!g.navigator) {
  Object.defineProperty(g, 'navigator', { value: { userAgent: 'vitest' }, configurable: true });
}

const IconStub = defineComponent({
  name: 'SIconStub',
  setup(_, { attrs }) {
    return () => h('i', { class: ['s-icon-stub', attrs?.class].filter(Boolean).join(' ') });
  },
});

const TooltipStub = defineComponent({
  name: 'STooltipStub',
  setup(_, { slots }) {
    return () => h('div', { class: 's-tooltip-stub' }, [slots.default?.(), slots.content?.()]);
  },
});

const ButtonStub = defineComponent({
  name: 'SButtonStub',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    const handleClick = (event: MouseEvent) => {
      if (props.loading || props.disabled) return;
      emit('click', event);
    };

    return () =>
      h(
        'button',
        {
          class: ['s-button-stub', props.type && `s-button-stub--${props.type}`].filter(Boolean),
          disabled: props.disabled || props.loading,
          'data-loading': String(Boolean(props.loading)),
          onClick: handleClick,
        },
        slots.default?.()
      );
  },
});

config.global.stubs = {
  ...(config.global.stubs ?? {}),
  's-icon': IconStub,
  's-tooltip': TooltipStub,
  's-button': ButtonStub,
  's-row': { name: 'SRowStub', template: '<div class="s-row-stub"><slot /></div>' },
  's-col': { name: 'SColStub', template: '<div class="s-col-stub"><slot /></div>' },
  's-divider': { name: 'SDividerStub', template: '<div class="s-divider-stub"><slot /></div>' },
  's-switch': {
    name: 'SSwitchStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<label class="s-switch-stub"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
  },
  'el-popover': {
    name: 'ElPopoverStub',
    template: '<div class="el-popover-stub"><slot name="reference" /><slot /></div>',
  },
};

const noopDirectiveHook = () => {
  /* no-op */
};

config.global.directives = {
  ...(config.global.directives ?? {}),
  button: {
    created: noopDirectiveHook,
    beforeMount: noopDirectiveHook,
    mounted: noopDirectiveHook,
    updated: noopDirectiveHook,
  },
  loading: {
    created: noopDirectiveHook,
    beforeMount: noopDirectiveHook,
    mounted(el, binding) {
      el.setAttribute('data-loading', String(Boolean(binding?.value)));
    },
    updated(el, binding) {
      el.setAttribute('data-loading', String(Boolean(binding?.value)));
    },
  },
};

const originalConsoleWarn = console.warn;
vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('[@vue/compiler-sfc] `withDefaults`') || message.includes('Lit is in dev mode'))
  ) {
    return;
  }

  originalConsoleWarn.apply(console, args as Parameters<typeof console.warn>);
});

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function ensureStorage<T extends { [key: string]: unknown }>(target: T, key: 'localStorage' | 'sessionStorage') {
  let current: Storage | undefined;
  try {
    current = (target as { [key: string]: Storage | undefined })[key];
  } catch {
    current = undefined;
  }

  if (!current || typeof current.getItem !== 'function') {
    const storage = createStorage();
    Object.defineProperty(target, key, {
      configurable: true,
      get: () => storage,
    });
    return storage;
  }

  return current;
}

const localStorage = ensureStorage(g.window as any, 'localStorage');
const sessionStorage = ensureStorage(g.window as any, 'sessionStorage');
if (!('localStorage' in g) || typeof (g as any).localStorage?.getItem !== 'function') {
  Object.defineProperty(g, 'localStorage', {
    configurable: true,
    get: () => localStorage,
  });
}
if (!('sessionStorage' in g) || typeof (g as any).sessionStorage?.getItem !== 'function') {
  Object.defineProperty(g, 'sessionStorage', {
    configurable: true,
    get: () => sessionStorage,
  });
}

if (!g.window.location) {
  g.window.location = {
    origin: 'http://localhost',
    href: 'http://localhost/',
    pathname: '/',
  } as Location;
}
if (!('location' in g)) {
  Object.defineProperty(g, 'location', {
    configurable: true,
    get() {
      return g.window.location;
    },
    set(value) {
      g.window.location = value;
    },
  });
}

if (!('Telegram' in g)) {
  Object.defineProperty(g, 'Telegram', { value: undefined, writable: true, configurable: true });
}
if (!Object.prototype.hasOwnProperty.call(g.window, 'Telegram')) {
  Object.defineProperty(g.window, 'Telegram', {
    configurable: true,
    get() {
      return g.Telegram;
    },
    set(value) {
      g.Telegram = value;
    },
  });
}

if (!g.document) {
  const createElement = () => ({ style: {}, appendChild: () => undefined, setAttribute: () => undefined });
  const createElementNS = () => ({ style: {}, appendChild: () => undefined, setAttribute: () => undefined });
  const body = { appendChild: () => undefined, removeChild: () => undefined };
  const head = { appendChild: () => undefined, removeChild: () => undefined };
  g.document = {
    createElement,
    createTextNode: () => ({}),
    createElementNS,
    body,
    head,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Document;
  g.window.document = g.document;
}

if (typeof g.window.matchMedia !== 'function') {
  g.window.matchMedia = () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
}

if (!('HTMLElement' in g)) {
  (g as any).HTMLElement = function () {};
}

vi.mock('vue-property-decorator', () => {
  class Vue {}
  const classDecorator = () => (target: any) => target;
  const memberDecorator = () => (_target: any, _key?: string, descriptor?: PropertyDescriptor) =>
    descriptor ?? undefined;
  const Mixins = (...mixins: any[]) => {
    class Mixed extends Vue {}
    mixins.forEach((mixin) => {
      if (mixin?.prototype) {
        Object.getOwnPropertyNames(mixin.prototype).forEach((name) => {
          if (name === 'constructor') return;
          Object.defineProperty(
            Mixed.prototype,
            name,
            Object.getOwnPropertyDescriptor(mixin.prototype, name) ?? Object.create(null)
          );
        });
      }
    });
    return Mixed;
  };

  const componentDecorator = classDecorator as typeof classDecorator & { registerHooks?: (...hooks: string[]) => void };
  componentDecorator.registerHooks = () => undefined;

  return {
    __esModule: true,
    default: Vue,
    Vue,
    Options: classDecorator,
    Component: componentDecorator,
    Mixins,
    mixins: Mixins,
    Prop: memberDecorator,
    PropSync: memberDecorator,
    Model: memberDecorator,
    Emit: memberDecorator,
    Watch: memberDecorator,
    Provide: memberDecorator,
    Inject: memberDecorator,
    Ref: memberDecorator,
  };
});

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    currentRoute: { name: undefined, params: {}, query: {} },
    push: vi.fn(async () => undefined),
    replace: vi.fn(async () => undefined),
    go: vi.fn(),
    back: vi.fn(),
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
  },
  lazyComponent: () => ({ template: '<div><slot /></div>' }),
}));
const fallbackWalletConsts = {
  TranslationConsts: {},
  IndexerType: {
    SUBQUERY: 'subquery',
    SUBSQUID: 'subsquid',
  },
} as const;

const ensureWalletModule = <T extends Record<string, unknown>>(module: T): T => {
  if (!('en' in module) || module.en == null) {
    return {
      en: {},
      ...module,
    } as T;
  }

  if (!('WALLET_CONSTS' in module) || module.WALLET_CONSTS == null) {
    return {
      ...module,
      WALLET_CONSTS: fallbackWalletConsts,
    } as T;
  }

  return module;
};

const gScope = globalThis as Record<string, unknown>;
if (typeof gScope.__WALLET_MODULE_OVERRIDE !== 'function') {
  gScope.__WALLET_MODULE_OVERRIDE = async () => {
    const { createWalletMock } = await import('@tests/stubs/createWalletMock');
    return createWalletMock();
  };
}

async function resolveWalletModule() {
  const override = (globalThis as Record<string, any>).__WALLET_MODULE_OVERRIDE;
  if (typeof override === 'function') {
    const overridden = await override();
    return ensureWalletModule(overridden);
  }

  const module = await import('@wallet');
  return ensureWalletModule(module);
}

const resolveWalletModuleFactory = vi.hoisted(() => () => resolveWalletModule());

vi.mock('@wallet', resolveWalletModuleFactory);
vi.mock('@wallet/core', resolveWalletModuleFactory);
vi.mock('@wallet/src/lang/en', () => ({}));
vi.mock('@polkadot/api', () => ({
  ApiPromise: class {},
  WsProvider: class {},
}));
vi.mock('@polkadot/util-crypto', () => ({
  decodeAddress: () => new Uint8Array(),
  cryptoWaitReady: async () => true,
}));
vi.mock('@sora-substrate/sdk', () => import('@stubs/sora-sdk'));
vi.mock('@sora-substrate/sdk/build/assets/consts', () => import('@stubs/sdk-assets-consts'));
vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: (...args: unknown[]) => {
      const override = (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE;
      if (override?.assetDataByAddress) {
        return override.assetDataByAddress(...(args as [string | undefined]));
      }

      const [address] = args as [string | undefined];
      return address
        ? {
            address,
            symbol: address.toUpperCase(),
            decimals: 18,
          }
        : null;
    },
    registeredAssets: (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE?.registeredAssets ?? {},
    registeredAssetsFetching:
      (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE?.registeredAssetsFetching ?? false,
  }),
}));
vi.mock('@/utils/walletCore', () => {
  let cachedModule: Record<string, unknown> | null = null;

  const loadWalletCore = async () => {
    if (cachedModule) return cachedModule;

    const override = (globalThis as Record<string, any>).__WALLET_CORE_OVERRIDE;
    const module = typeof override === 'function' ? await override() : await resolveWalletModule();
    cachedModule = module;
    return module;
  };

  const getWalletCore = () => {
    if (!cachedModule) {
      throw new Error('Wallet core not loaded yet. Call loadWalletCore() before accessing it.');
    }

    return cachedModule;
  };

  return {
    loadWalletCore,
    getWalletCore,
  };
});
vi.mock('tabbable', () => ({
  __esModule: true,
  default: () => [],
  tabbable: () => [],
  focusable: () => [],
  isFocusable: () => false,
  isTabbable: () => false,
  getTabIndex: () => 0,
}));
vi.mock('focus-trap', () => {
  const trap = () => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    updateContainerElements: vi.fn(),
  });
  return {
    __esModule: true,
    default: trap,
    createFocusTrap: trap,
  };
});
vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {},
    getters: {},
    commit: () => undefined,
    dispatch: () => Promise.resolve(),
  },
}));
