import { describe, expect, it, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import path from 'path';
import { JSDOM } from 'jsdom';

const fsMock = vi.hoisted(() => {
  const existsSyncMock = vi.fn();
  const mkdirMock = vi.fn();
  const fsModule = {
    existsSync: existsSyncMock,
    promises: { mkdir: mkdirMock },
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
  return { existsSyncMock, mkdirMock, fsModule };
});

const { existsSyncMock, mkdirMock, fsModule } = fsMock;

vi.mock('playwright', () => ({ chromium: {}, webkit: {}, firefox: {} }));
vi.mock('child_process', () => ({ spawn: vi.fn() }));

let checkBrowser: any;

beforeAll(async () => {
  global.__IPFS_CHECK_FS__ = fsModule;
  const module = await import('../../../../scripts/ipfs/check-browser.js');
  checkBrowser = module.default;
});

beforeEach(() => {
  existsSyncMock.mockReset();
  mkdirMock.mockReset();
  mkdirMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  delete global.__IPFS_CHECK_FS__;
});

describe('check-browser helpers', () => {
  it('parses CLI arguments with key/value and flags', () => {
    const result = checkBrowser.parseArgs([
      '--cid',
      'QmHash',
      '--gateway=https://example.com',
      '--route',
      '#/bridge',
      '--headless',
    ]);

    expect(result).toMatchObject({
      cid: 'QmHash',
      gateway: 'https://example.com',
      route: '#/bridge',
      headless: true,
    });
  });

  it('builds IPFS target URLs with default query marker', () => {
    const url = checkBrowser.buildTargetUrl({ cid: 'QmHash' });
    expect(url).toMatch(/\/ipfs\/QmHash\/index.html\?ipfs-check=1#/);
  });

  it('supports explicit URL override', () => {
    const url = checkBrowser.buildTargetUrl({ url: 'https://example.com/app#/' });
    expect(url).toBe('https://example.com/app#/');
  });

  it('normalises browser selection list', () => {
    expect(checkBrowser.pickBrowsers('chromium,firefox,unknown')).toEqual(['chromium', 'firefox']);
  });

  it('converts multiaddr to HTTP gateway URL', () => {
    const url4 = checkBrowser.multiaddrToGatewayUrl('/ip4/192.168.0.1/tcp/5001');
    expect(url4).toBe('http://192.168.0.1:5001/ipfs');

    const url6 = checkBrowser.multiaddrToGatewayUrl('/ip6/::1/tcp/8080');
    expect(url6).toBe('http://[::1]:8080/ipfs');
  });

  it('filters informational console noise', () => {
    const messages = [
      { level: 'log', message: 'info' },
      { level: 'warning', message: 'just a warning' },
      { level: 'debug', message: '[telemetry] build_variant_selected' },
      { level: 'error', message: 'Cannot redefine property: $route' },
      { level: 'error', message: 'Critical failure' },
    ];
    const filtered = checkBrowser.filterConsoleMessages(messages);
    expect(filtered).toEqual([{ level: 'error', message: 'Critical failure' }]);
  });

  it('reports optional endpoint CORS/load console errors', () => {
    const messages = [
      {
        level: 'error',
        message:
          "Access to fetch at 'https://api.coingecko.com/api/v3/simple/price?ids=dai' has been blocked by CORS policy",
        location: { url: 'http://127.0.0.1:41733/ipfs/polkaswap-e2e/' },
      },
      {
        level: 'error',
        message: 'Failed to load resource: net::ERR_FAILED',
        location: { url: 'https://api.coingecko.com/api/v3/simple/price?ids=dai' },
      },
      {
        level: 'error',
        message: 'Unexpected application error',
        location: { url: 'http://127.0.0.1:41733/ipfs/polkaswap-e2e/' },
      },
    ];

    const filtered = checkBrowser.filterConsoleMessages(messages);

    expect(filtered).toEqual(messages);
  });

  it('waits for content by polling selector metrics', async () => {
    const page = {
      $eval: vi
        .fn()
        .mockRejectedValueOnce(new Error('missing root'))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ textLength: 10, htmlLength: 24 }),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    };

    const content = await checkBrowser.waitForContent(page, '#app');

    expect(content).toEqual({ textLength: 10, htmlLength: 24 });
    expect(page.$eval).toHaveBeenCalledTimes(3);
    expect(page.waitForTimeout).toHaveBeenCalledTimes(2);
  });

  it('requires the mounted Swap route rather than the static app loader', () => {
    const swap = checkBrowser.routeReadiness('https://polkaswap.io/#/swap');

    expect(swap).toEqual({
      name: 'swap',
      title: 'Swap - Polkaswap',
      selector: '.swap-container .swap-form',
    });
    expect(
      checkBrowser.hydrationIssue(
        { title: swap.title, hasAppContent: true, hasBootstrapLoader: true, hasRouteUi: false },
        swap
      )
    ).toContain('bootstrap loader');
    expect(
      checkBrowser.hydrationIssue(
        { title: 'Polkaswap', hasAppContent: true, hasBootstrapLoader: false, hasRouteUi: true },
        swap
      )
    ).toContain('Expected swap title');
    expect(
      checkBrowser.hydrationIssue(
        { title: swap.title, hasAppContent: true, hasBootstrapLoader: false, hasRouteUi: false },
        swap
      )
    ).toContain('swap UI did not render');
  });

  it('recognizes the mounted form through the current grid wrappers without widget ID attributes', async () => {
    const dom = new JSDOM(`
      <title>Swap - Polkaswap</title>
      <div id="app">
        <div class="vue-grid-layout widgets-grid swap-container">
          <div><div class="vue-grid-item">
            <div class="swap-widget"><div class="base-widget-content">
              <div class="swap-form"><input data-test-name="swapFrom"><button>Connect account</button></div>
            </div></div>
          </div></div>
        </div>
      </div>
    `);
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/swap');
    const page = {
      evaluate: async (callback: (args: unknown) => unknown, args: unknown) => callback(args),
    };
    vi.stubGlobal('document', dom.window.document);
    try {
      expect(document.querySelector('[data-widget-id="swapForm"]')).toBeNull();
      const mounted = await checkBrowser.inspectHydratedUi(page, '#app', readiness);
      expect(mounted).toEqual({
        title: 'Swap - Polkaswap',
        hasAppContent: true,
        hasBootstrapLoader: false,
        hasRouteUi: true,
      });
      expect(checkBrowser.hydrationIssue(mounted, readiness)).toBeNull();

      document.querySelector('.swap-form')?.remove();
      const emptyGrid = await checkBrowser.inspectHydratedUi(page, '#app', readiness);
      expect(emptyGrid.hasRouteUi).toBe(false);
      expect(checkBrowser.hydrationIssue(emptyGrid, readiness)).toContain('swap UI did not render');
    } finally {
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });

  it('polls until the mounted route appears and rejects a loader at the deadline', async () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/swap');
    const loader = { title: 'Polkaswap', hasAppContent: true, hasBootstrapLoader: true, hasRouteUi: false };
    const mounted = {
      title: 'Swap - Polkaswap',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };
    const page = {
      evaluate: vi.fn().mockResolvedValueOnce(loader).mockResolvedValueOnce(mounted),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    };

    expect(await checkBrowser.waitForHydratedUi(page, '#app', readiness, 1000)).toEqual(mounted);
    expect(page.waitForTimeout).toHaveBeenCalledTimes(1);
    expect(
      await checkBrowser.waitForHydratedUi({ evaluate: vi.fn().mockResolvedValue(loader) }, '#app', readiness, 0)
    ).toEqual(loader);
  });

  it('ensures screenshot directory is created recursively', async () => {
    mkdirMock.mockClear();
    await checkBrowser.ensureDirectory('/tmp/screenshots/output.png');
    expect(mkdirMock).toHaveBeenCalledWith('/tmp/screenshots', { recursive: true });
  });

  it('resolves IPFS path using cwd workspace fallback', () => {
    delete process.env.IPFS_PATH;
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    process.env.HOME = '/home/test';
    const workspaceConfig = path.join('/workspace', '.ipfs-workspace', 'config');
    existsSyncMock.mockImplementation((candidate: string) => candidate === workspaceConfig);

    const resolved = checkBrowser.resolveIpfsPath(undefined);
    expect(resolved).toBe('/workspace/.ipfs-workspace');
    cwdSpy.mockRestore();
  });

  it('resolves screenshot targets from args and env flags', () => {
    process.env.IPFS_CHECK_SCREENSHOT = '/tmp/default.png';

    expect(checkBrowser.resolveScreenshotPath({ screenshot: 'screens/out.png' })).toContain('screens/out.png');
    expect(checkBrowser.resolveScreenshotPath({ 'screenshot-base64': true })).toBeNull();
    expect(checkBrowser.resolveScreenshotPath({})).toBe('/tmp/default.png');

    delete process.env.IPFS_CHECK_SCREENSHOT;
  });

  it('derives content metrics from DOM snapshot fallback', () => {
    const metrics = checkBrowser.inferContentMetricsFromSnapshot(
      '<div id="app"><span>Hello</span><button>Connect</button></div>'
    );

    expect(metrics).toMatchObject({
      htmlLength: expect.any(Number),
      textLength: expect.any(Number),
    });
    expect(metrics.textLength).toBeGreaterThan(0);
  });

  it('returns null metrics for empty snapshots', () => {
    expect(checkBrowser.inferContentMetricsFromSnapshot('   ')).toBeNull();
    expect(checkBrowser.inferContentMetricsFromSnapshot(null)).toBeNull();
  });

  it('detects invalid [object Object] resource attributes in DOM snapshots', () => {
    const snapshot = '<div><img src="[object Object]" /><a href="#/ok"></a><img src="/x/[object Object]" /></div>';
    const invalid = checkBrowser.findInvalidResourceAttributes(snapshot);

    expect(invalid).toEqual(['src="[object Object]"', 'src="/x/[object Object]"']);
  });

  it('detects corrupted UI text patterns from runtime output', () => {
    const bodyText = "0.0 [object Promise] NaN Cannot read properties of undefined (reading '$refs')";
    const corrupted = checkBrowser.findCorruptedUiPatterns(bodyText);

    expect(corrupted).toEqual([
      '/\\[object Promise\\]/i',
      '/\\bNaN\\b/',
      "/Cannot read properties of undefined \\(reading '\\$refs'\\)/i",
    ]);
  });

  it('returns no corruption matches for normal content', () => {
    const corrupted = checkBrowser.findCorruptedUiPatterns('Swap page loaded. Connect account.');

    expect(corrupted).toEqual([]);
  });

  it('parses non-negative integers with safe fallback', () => {
    expect(checkBrowser.parseNonNegativeInteger('3000', 500)).toBe(3000);
    expect(checkBrowser.parseNonNegativeInteger(42.9, 500)).toBe(42);
    expect(checkBrowser.parseNonNegativeInteger('-1', 500)).toBe(500);
    expect(checkBrowser.parseNonNegativeInteger('invalid', 500)).toBe(500);
  });

  it('collects unique corruption patterns across body samples', () => {
    const samples = ['ok', '[object Promise] NaN', "Cannot read properties of undefined (reading '$refs')", 'NaN'];
    const collected = checkBrowser.collectCorruptedUiPatterns(samples);

    expect(collected).toEqual([
      '/\\[object Promise\\]/i',
      '/\\bNaN\\b/',
      "/Cannot read properties of undefined \\(reading '\\$refs'\\)/i",
    ]);
  });

  it('only treats path-based IPFS URLs as immutable content routes', () => {
    expect(checkBrowser.isIpfsPathUrl('https://gateway.example/ipfs/QmHash/index.html')).toBe(true);
    expect(checkBrowser.isIpfsPathUrl('https://gateway.example/ipns/polkaswap/index.html')).toBe(true);
    expect(checkBrowser.isIpfsPathUrl('https://polkaswap.io/')).toBe(false);
  });

  it('requires stable host HTML responses to be uncacheable', () => {
    expect(
      checkBrowser.findStableHostHtmlCacheIssue(
        { 'cache-control': 'public, max-age=29030400, immutable' },
        'https://polkaswap.io/'
      )
    ).toContain('must not be cached immutably');
    expect(
      checkBrowser.findStableHostHtmlCacheIssue({ 'cache-control': 'no-store' }, 'https://polkaswap.io/')
    ).toBeNull();
    expect(
      checkBrowser.findStableHostHtmlCacheIssue(
        { 'cache-control': 'public, max-age=31536000, immutable' },
        'https://gateway.example/ipfs/QmHash/index.html'
      )
    ).toBeNull();
  });

  it('reports optional endpoint failed requests', () => {
    const failedRequests = [
      { url: 'https://api.coingecko.com/api/v3/simple/price?ids=dai', errorText: 'net::ERR_FAILED' },
      { url: 'https://example.com/api/critical', status: 500 },
    ];

    const filtered = checkBrowser.filterFailedRequests(failedRequests);

    expect(filtered).toEqual(failedRequests);
  });

  it('accepts an empty failed-request collection', () => {
    expect(checkBrowser.filterFailedRequests([])).toEqual([]);
    expect(checkBrowser.filterFailedRequests(undefined)).toEqual([]);
  });
});

describe('check-browser deployment result', () => {
  it.each([{ failure: 'cors' }, { failure: 'network' }, { failure: 'none' }])(
    'fails on $failure errors while accepting a clean run',
    async ({ failure }) => {
      const originalArgv = process.argv;
      const originalExitCode = process.exitCode;
      const originalLauncher = checkBrowser.BROWSER_LAUNCHERS.webkit;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const endpoint = 'https://api.coingecko.com/api/v3/simple/price?ids=dai';
      const listeners: Record<string, (...args: unknown[]) => void> = {};
      const close = vi.fn().mockResolvedValue(undefined);
      const page = {
        on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
          listeners[event] = listener;
        }),
        goto: vi.fn(async () => {
          if (failure === 'cors') {
            listeners.console({
              type: () => 'error',
              text: () => `Access to fetch at '${endpoint}' has been blocked by CORS policy`,
              location: () => ({ url: 'https://polkaswap.io/' }),
            });
          } else if (failure === 'network') {
            listeners.requestfailed({
              failure: () => ({ errorText: 'net::ERR_FAILED' }),
              url: () => endpoint,
              method: () => 'GET',
            });
          }
          return {
            url: () => 'https://polkaswap.io/',
            status: () => 200,
            headers: () => ({ 'cache-control': 'no-store' }),
          };
        }),
        $eval: vi
          .fn()
          .mockResolvedValueOnce({ textLength: 15, htmlLength: 35 })
          .mockResolvedValueOnce('<div id="app">Connect account</div>'),
        evaluate: vi.fn().mockResolvedValue({
          title: 'Polkaswap',
          hasAppContent: true,
          hasBootstrapLoader: false,
          hasRouteUi: true,
        }),
        locator: vi.fn(() => ({ innerText: vi.fn().mockResolvedValue('Connect account') })),
        close,
      };
      const context = { addInitScript: vi.fn(), newPage: vi.fn().mockResolvedValue(page), close };
      checkBrowser.BROWSER_LAUNCHERS.webkit = vi.fn().mockResolvedValue({
        version: () => 'test',
        newContext: vi.fn().mockResolvedValue(context),
        close,
      });
      process.argv = [
        'node',
        'check-browser.js',
        '--url=https://polkaswap.io/',
        '--browser=webkit',
        '--no-spawn-gateway',
        '--settle-ms=0',
      ];
      process.exitCode = 0;
      try {
        await checkBrowser.run();
        if (failure === 'none') {
          expect(process.exitCode).toBe(0);
          expect(logSpy).toHaveBeenCalledWith('IPFS check passed.');
          expect(errorSpy).not.toHaveBeenCalled();
        } else {
          expect(process.exitCode).toBe(1);
          expect(errorSpy).toHaveBeenCalledWith(
            'IPFS check failed:',
            expect.stringContaining(failure === 'cors' ? '1 console error(s)' : '1 failed network request(s)')
          );
          expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(endpoint));
          expect(logSpy).not.toHaveBeenCalledWith('IPFS check passed.');
        }
      } finally {
        process.argv = originalArgv;
        process.exitCode = originalExitCode;
        checkBrowser.BROWSER_LAUNCHERS.webkit = originalLauncher;
        errorSpy.mockRestore();
        logSpy.mockRestore();
      }
    }
  );

  it('captures the final hydrated Swap DOM and fails if the route falls back to its loader', async () => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalLauncher = checkBrowser.BROWSER_LAUNCHERS.webkit;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const mounted = {
      title: 'Swap - Polkaswap',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };
    const loader = {
      title: 'Polkaswap',
      hasAppContent: true,
      hasBootstrapLoader: true,
      hasRouteUi: false,
    };
    const close = vi.fn().mockResolvedValue(undefined);
    const page = {
      on: vi.fn(),
      goto: vi.fn().mockResolvedValue({
        url: () => 'https://polkaswap.io/',
        status: () => 200,
        headers: () => ({ 'cache-control': 'no-store' }),
      }),
      evaluate: vi.fn().mockResolvedValueOnce(loader).mockResolvedValueOnce(mounted).mockResolvedValueOnce(mounted),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      $eval: vi
        .fn()
        .mockResolvedValueOnce({ textLength: 15, htmlLength: 65 })
        .mockResolvedValueOnce('<div id="app"><div class="swap-container">Connect account</div></div>'),
      locator: vi.fn(() => ({ innerText: vi.fn().mockResolvedValue('Connect account Network Fee') })),
      close,
    };
    const context = { addInitScript: vi.fn(), newPage: vi.fn().mockResolvedValue(page), close };
    checkBrowser.BROWSER_LAUNCHERS.webkit = vi.fn().mockResolvedValue({
      version: () => 'test',
      newContext: vi.fn().mockResolvedValue(context),
      close,
    });
    process.argv = [
      'node',
      'check-browser.js',
      '--url=https://polkaswap.io/#/swap',
      '--browser=webkit',
      '--no-spawn-gateway',
      '--settle-ms=0',
    ];
    process.exitCode = 0;

    try {
      await checkBrowser.run();
      expect(process.exitCode).toBe(0);
      expect(page.waitForTimeout).toHaveBeenCalledTimes(1);
      expect(page.$eval).toHaveBeenCalledTimes(2);
      const summary = JSON.parse(logSpy.mock.calls.find((call) => String(call[0]).startsWith('{'))?.[0] as string);
      expect(summary.hydration).toEqual(mounted);
      expect(summary.domSnapshot).toContain('swap-container');
      expect(summary.bodyTextSamples.at(-1)).toContain('Network Fee');

      page.evaluate.mockReset().mockResolvedValueOnce(mounted).mockResolvedValueOnce(loader);
      page.$eval
        .mockReset()
        .mockResolvedValueOnce({ textLength: 15, htmlLength: 35 })
        .mockResolvedValueOnce('<div id="app"><div class="app-bootstrap-loader"></div></div>');
      process.exitCode = 0;
      await checkBrowser.run();
      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('IPFS check failed:', expect.stringContaining('bootstrap loader'));
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      checkBrowser.BROWSER_LAUNCHERS.webkit = originalLauncher;
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
