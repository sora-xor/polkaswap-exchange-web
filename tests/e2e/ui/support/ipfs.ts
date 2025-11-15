import { expect, type Page } from '@playwright/test';

const allowedConsolePatterns = [
  /\[Telegram\.WebView]/i,
  /WebSocket connection/i,
  /@polkadot\//i,
  /tabsPanel/i,
  /reading 'TVL'/i,
];
const emptyJson = JSON.stringify({ data: null });

export const ipfsBasePath = (() => {
  const raw = process.env.PS_IPFS_TEST_PREFIX ?? '/ipfs/polkaswap-e2e';
  const trimmed = raw.trim();
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized.replace(/\/+$/, '');
})();

export const ipfsEntryUrl = `${ipfsBasePath}/?ipfs-check=1`;

export async function preparePage(page: Page): Promise<void> {
  await stubWebSocket(page);
  await stubNetwork(page);
}

async function stubNetwork(page: Page): Promise<void> {
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

export function trackConsole(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (allowedConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }
    errors.push(`[console.${message.type()}] ${text}`);
  });

  page.on('pageerror', (error) => {
    errors.push(`[pageerror] ${error.message}`);
  });

  return errors;
}

export async function ensureAppLoaded(page: Page): Promise<void> {
  const header = page.locator('.header');
  const menu = page.locator('.app-menu');

  await expect(header).toBeVisible({ timeout: 15_000 });
  await expect(menu).toBeVisible({ timeout: 15_000 });
}

export async function expectHash(page: Page, hash: string): Promise<void> {
  await expect.poll(async () => page.evaluate(() => window.location.hash)).resolves.toBe(hash);
}
