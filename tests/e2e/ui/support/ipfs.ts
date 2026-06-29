import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

const STUBBED_ALLOWED_CONSOLE_PATTERNS = [
  /\[Telegram\.WebView]/i,
  /WebSocket connection/i,
  /@polkadot\//i,
  /tabsPanel/i,
  /reading 'TVL'/i,
  /Error:\s*Connection Timeout/i,
  /\[Exchange rate API\] Error while fetching rates\./i,
];

const LIVE_ALLOWED_CONSOLE_PATTERNS = [
  /Failed to load resource: net::ERR_CERT_COMMON_NAME_INVALID/i,
  /Failed to load resource: net::ERR_CONNECTION_RESET/i,
  /Failed to load resource: net::ERR_NAME_NOT_RESOLVED/i,
  /bridgeProxy_listApps/i,
  /ethBridge_getRegisteredAssets/i,
  /\[Exchange rate API\] Error while fetching rates\./i,
  /failed to instantiate a new WASM module instance: Limit of 32 concurrent instances has been reached/i,
  /Loading the image 'http:\/\/csi\.gstatic\.com\/csi\b.*violates the following Content Security Policy directive/i,
];

const KNOWN_WALLET_NOISE_PATTERNS = [/Unable to retrieve keypair/i, /You should connect wallet/i];

const emptyJson = JSON.stringify({ data: null });
const runtimeEnvRoutePattern = /\/env(?:\.dev)?\.json(?:\?.*)?$/i;

const stubbedRuntimeEnvJson = (() => {
  try {
    const source = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/env.json'), 'utf8'));
    return JSON.stringify({
      ...source,
      DEFAULT_NETWORKS: [],
      POLKASWAP_INDEXER_ENDPOINT: '',
    });
  } catch {
    return JSON.stringify({
      DEFAULT_NETWORKS: [],
      POLKASWAP_INDEXER_ENDPOINT: '',
      FEATURE_FLAGS: {},
    });
  }
})();

export type ConsoleTrackMode = 'stubbed' | 'live';

export type TrackConsoleOptions = {
  mode?: ConsoleTrackMode;
  extraAllowedPatterns?: RegExp[];
};

export type PreparePageOptions = {
  stubRuntimeEnv?: boolean;
};

export const ipfsBasePath = (() => {
  const raw = process.env.PS_IPFS_TEST_PREFIX ?? '/ipfs/polkaswap-e2e';
  const trimmed = raw.trim();
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized.replace(/\/+$/, '');
})();

export const ipfsEntryUrl = `${ipfsBasePath}/?ipfs-check=1`;

export async function preparePage(page: Page, options: PreparePageOptions = {}): Promise<void> {
  await page.addInitScript(() => {
    // Keep E2E viewport/layout checks deterministic by starting with disclaimer accepted.
    localStorage.setItem('dexSettings.disclaimerApprove', 'true');
  });
  await stubWebSocket(page);
  await stubNetwork(page, options);
}

async function stubNetwork(page: Page, options: PreparePageOptions = {}): Promise<void> {
  await page.route('https://telegram.org/js/telegram-web-app.js', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => {
        const noop = () => {};
        const listeners = new Map();
        const webApp = {
          isExpanded: false,
          colorScheme: 'light',
          onEvent: (event, handler) => listeners.set(event, handler),
          offEvent: (event) => listeners.delete(event),
          sendData: noop,
          ready: noop,
          expand: noop,
          close: noop,
          requestTheme: noop,
          setHeaderColor: noop,
          setBackgroundColor: noop,
          disableClosingConfirmation: noop,
          enableClosingConfirmation: noop,
          MainButton: {
            show: noop,
            hide: noop,
            onClick: noop,
            offClick: noop,
            setParams: noop,
          },
          BackButton: {
            show: noop,
            hide: noop,
            onClick: noop,
            offClick: noop,
          },
        };
        window.Telegram = { WebApp: webApp };
      })();`,
    });
  });

  if (options.stubRuntimeEnv) {
    await page.route(runtimeEnvRoutePattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: stubbedRuntimeEnvJson,
      });
    });
  }

  const remoteRequestMatcher = (url: string): boolean => {
    try {
      const target = new URL(url, 'http://localhost');
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
      if (target.hostname === '127.0.0.1' || target.hostname === 'localhost') return false;
      return true;
    } catch {
      return false;
    }
  };

  await page.route(remoteRequestMatcher, async (route) => {
    const type = route.request().resourceType();

    if (type === 'xhr' || type === 'fetch') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: emptyJson });
      return;
    }

    if (type === 'image' || type === 'media' || type === 'font') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (type === 'script') {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' });
      return;
    }

    if (type === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* stub */' });
      return;
    }

    await route.fulfill({ status: 200, body: '' });
  });
}

async function stubWebSocket(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Record<string, unknown>).__PS_FORCE_ONLINE__ = true;

    class MockWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readyState = MockWebSocket.OPEN;
      onopen: ((event: Event) => void) | null = null;
      onclose: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: Event) => void) | null = null;

      constructor(public readonly url: string) {
        setTimeout(() => {
          this.onopen?.(new Event('open'));
        }, 0);
      }

      send(): void {}

      close(): void {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new Event('close'));
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        const handlerKey = `on${type}` as keyof MockWebSocket;
        if (typeof listener === 'function') {
          (this as any)[handlerKey] = listener.bind(this);
        } else if (listener && typeof listener === 'object' && 'handleEvent' in listener) {
          (this as any)[handlerKey] = (listener as EventListenerObject).handleEvent.bind(listener);
        }
      }

      removeEventListener(type: string): void {
        const handlerKey = `on${type}` as keyof MockWebSocket;
        (this as any)[handlerKey] = null;
      }

      dispatchEvent(event: Event): boolean {
        const handlerKey = `on${event.type}` as keyof MockWebSocket;
        const handler = (this as any)[handlerKey];
        if (typeof handler === 'function') {
          handler.call(this, event);
        }
        return true;
      }
    }

    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      writable: false,
      value: MockWebSocket,
    });
  });
}

const isCoinGeckoCorsError = (message: string): boolean => {
  return message.includes('api.coingecko.com') && message.includes('CORS policy');
};

const isKnownLiveCorsError = (message: string): boolean => {
  return (
    message.includes('CORS policy') &&
    (message.includes('pi.soramitsu.io/graphql') ||
      message.includes('https://ws.mof.sora.org/') ||
      message.includes('https://mof2.sora.org/'))
  );
};

const isWebSocketConnectionFailure = (message: string): boolean => {
  return message.includes('WebSocket connection to') && message.includes('failed');
};

const isIgnorableLiveRuntimeError = (
  entry: string,
  sawCoinGeckoCors: boolean,
  sawKnownLiveCors: boolean,
  sawWebSocketConnectionFailure: boolean
): boolean => {
  if (LIVE_ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(entry))) return true;
  if (isCoinGeckoCorsError(entry)) return true;
  if (isKnownLiveCorsError(entry)) return true;
  if (isWebSocketConnectionFailure(entry)) return true;
  if (sawCoinGeckoCors && entry.includes('Failed to load resource: net::ERR_FAILED')) return true;
  if (sawKnownLiveCors && entry.includes('Failed to load resource: net::ERR_FAILED')) return true;
  if (sawWebSocketConnectionFailure && entry === '[console.error] Event') return true;

  return false;
};

export const filterKnownWalletConsoleNoise = (entries: string[]): string[] => {
  return entries.filter((entry) => !KNOWN_WALLET_NOISE_PATTERNS.some((pattern) => pattern.test(entry)));
};

export function trackConsole(page: Page, options: TrackConsoleOptions = {}): string[] {
  const errors: string[] = [];
  const mode = options.mode ?? 'stubbed';
  const allowPatterns = [
    ...(mode === 'live' ? LIVE_ALLOWED_CONSOLE_PATTERNS : STUBBED_ALLOWED_CONSOLE_PATTERNS),
    ...(options.extraAllowedPatterns ?? []),
  ];

  let sawCoinGeckoCors = false;
  let sawKnownLiveCors = false;
  let sawWebSocketConnectionFailure = false;

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const entry = `[console.${message.type()}] ${message.text()}`;
    const text = message.text();

    if (isCoinGeckoCorsError(text) || isCoinGeckoCorsError(entry)) {
      sawCoinGeckoCors = true;
    }

    if (isKnownLiveCorsError(text) || isKnownLiveCorsError(entry)) {
      sawKnownLiveCors = true;
    }

    if (isWebSocketConnectionFailure(text) || isWebSocketConnectionFailure(entry)) {
      sawWebSocketConnectionFailure = true;
    }

    if (allowPatterns.some((pattern) => pattern.test(text) || pattern.test(entry))) return;

    if (
      mode === 'live' &&
      isIgnorableLiveRuntimeError(entry, sawCoinGeckoCors, sawKnownLiveCors, sawWebSocketConnectionFailure)
    ) {
      return;
    }

    errors.push(entry);
  });

  page.on('pageerror', (error) => {
    const entry = `[pageerror] ${error.message}`;

    if (
      mode === 'live' &&
      isIgnorableLiveRuntimeError(entry, sawCoinGeckoCors, sawKnownLiveCors, sawWebSocketConnectionFailure)
    ) {
      return;
    }

    errors.push(entry);
  });

  return errors;
}

export async function ensureAppLoaded(page: Page): Promise<void> {
  const header = page.locator('header.header').first();
  const menu = page.locator('.app-menu');

  await expect.poll(() => page.evaluate(() => document.querySelectorAll('#app').length)).resolves.toBe(1);
  await expect(header).toBeVisible({ timeout: 15_000 });
  await expect(menu).toHaveCount(1);
}

export async function expectHash(page: Page, hash: string): Promise<void> {
  await expect.poll(async () => page.evaluate(() => window.location.hash)).resolves.toBe(hash);
}
