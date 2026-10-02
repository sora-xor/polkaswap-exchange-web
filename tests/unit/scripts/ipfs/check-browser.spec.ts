import { describe, expect, it, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import path from 'path';

const fsMock = vi.hoisted(() => {
  const existsSyncMock = vi.fn();
  const mkdirMock = vi.fn();
  const fsModule = {
    existsSync: existsSyncMock,
    promises: { mkdir: mkdirMock },
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    realpathSync: vi.fn(),
    statSync: vi.fn(),
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

  it('requires mounted Swap, Bots, and Store features rather than the static app loader', () => {
    const swap = checkBrowser.routeReadiness('https://polkaswap.io/#/swap');
    const bots = checkBrowser.routeReadiness('https://polkaswap.io/#/bots');
    const advancedBots = checkBrowser.routeReadiness('https://polkaswap.io/#/bots/lab');

    expect(swap).toEqual({
      name: 'swap',
      path: '/swap',
      title: 'Swap - Polkaswap',
      selector: '.swap-container [data-widget-id="swapForm"]',
    });
    expect(bots).toEqual({
      name: 'bots',
      path: '/bots',
      title: 'Bots - Polkaswap',
      selector: 'main.bots-page [data-testid="autopilot"]',
    });
    expect(checkBrowser.routeReadiness('https://polkaswap.io/#/store')).toEqual({
      name: 'store',
      path: '/store',
      title: 'Store - Polkaswap',
      selector: 'main.community-store [data-testid="store-checkout"]',
    });
    expect(advancedBots.selector).toBe('main.bots-page .bots-view-tabs');
    expect(
      checkBrowser.hydrationIssue(
        { title: swap.title, hasAppContent: true, hasBootstrapLoader: true, hasRouteUi: false },
        swap
      )
    ).toContain('bootstrap loader');
    expect(
      checkBrowser.hydrationIssue(
        { title: 'Polkaswap', routePath: '/swap', hasAppContent: true, hasBootstrapLoader: false, hasRouteUi: true },
        swap
      )
    ).toContain('Expected swap title');
    expect(
      checkBrowser.hydrationIssue(
        { title: swap.title, routePath: '/swap', hasAppContent: true, hasBootstrapLoader: false, hasRouteUi: false },
        swap
      )
    ).toContain('swap UI did not render');
  });

  it('rejects a redirect to Swap even when stale Bots title and DOM still match', () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/bots');
    const redirected = {
      title: 'Bots - Polkaswap',
      routePath: '/swap',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };

    expect(checkBrowser.hydrationIssue(redirected, readiness)).toBe('Expected route "#/bots"; received "#/swap".');
    expect(checkBrowser.hydrationIssue({ ...redirected, routePath: '/bots' }, readiness)).toBeNull();
  });

  it('captures the actual browser hash independently of matching feature content', async () => {
    const app = {
      children: [{}],
      querySelector: vi.fn((selector: string) => (selector === '.app-bootstrap-loader' ? null : {})),
    };
    vi.stubGlobal('document', { title: 'Bots - Polkaswap', querySelector: vi.fn(() => app) });
    vi.stubGlobal('window', { location: { hash: '#/swap?input=XOR' } });
    const page = { evaluate: vi.fn(async (callback, args) => callback(args)) };
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/bots');

    try {
      const state = await checkBrowser.inspectHydratedUi(page, '#app', readiness);
      expect(state).toMatchObject({ routePath: '/swap', hasRouteUi: true, title: 'Bots - Polkaswap' });
      expect(checkBrowser.hydrationIssue(state, readiness)).toBe('Expected route "#/bots"; received "#/swap".');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('preserves the exact requested hash path including Bots sections while allowing query updates', () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/ipfs/release/#/bots/lab?tab=research');
    const mounted = {
      title: 'Bots - Polkaswap',
      routePath: '/bots',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };

    expect(readiness.path).toBe('/bots/lab');
    expect(checkBrowser.hydrationIssue(mounted, readiness)).toContain('Expected route "#/bots/lab"');
    expect(checkBrowser.hydrationIssue({ ...mounted, routePath: '/bots/lab' }, readiness)).toBeNull();
  });

  it('requires Store title and product controls on its own route', () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/store');
    const mounted = {
      title: 'Store - Polkaswap',
      routePath: '/store',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };

    expect(checkBrowser.hydrationIssue(mounted, readiness)).toBeNull();
    expect(checkBrowser.hydrationIssue({ ...mounted, hasRouteUi: false }, readiness)).toContain(
      'store UI did not render'
    );
    expect(checkBrowser.hydrationIssue({ ...mounted, title: 'Swap - Polkaswap' }, readiness)).toContain(
      'Expected store title'
    );
  });

  it('requires the general Buy XOR workspace and title rather than the Get TS campaign', () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/buy-xor?source=card');
    expect(readiness).toEqual({
      name: 'buy-xor',
      path: '/buy-xor',
      title: 'Buy XOR - Polkaswap',
      selector: 'main.get-ts[data-test-name="buyXorPage"] .get-ts__workspace',
    });
    const mounted = {
      title: 'Buy XOR - Polkaswap',
      routePath: '/buy-xor',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };

    expect(checkBrowser.hydrationIssue(mounted, readiness)).toBeNull();
    expect(checkBrowser.hydrationIssue({ ...mounted, hasRouteUi: false }, readiness)).toContain(
      'buy-xor UI did not render'
    );
    expect(checkBrowser.hydrationIssue({ ...mounted, title: 'Get TS - Polkaswap' }, readiness)).toContain(
      'Expected buy-xor title'
    );
    expect(checkBrowser.hydrationIssue({ ...mounted, routePath: '/swap' }, readiness)).toContain(
      'Expected route "#/buy-xor"; received "#/swap".'
    );
  });

  it('rejects an empty Get TS route, Buy XOR checkout, and Swap fallback', () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/get-ts');
    const mounted = {
      title: 'Get TS - Polkaswap',
      routePath: '/get-ts',
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };

    expect(readiness.selector).toBe('main.get-ts[data-test-name="getTsPage"] .get-ts__workspace');
    expect(checkBrowser.hydrationIssue(mounted, readiness)).toBeNull();
    expect(checkBrowser.hydrationIssue({ ...mounted, hasRouteUi: false }, readiness)).toContain(
      'get-ts UI did not render'
    );
    expect(checkBrowser.hydrationIssue({ ...mounted, title: 'Buy XOR - Polkaswap' }, readiness)).toContain(
      'Expected get-ts title'
    );
    expect(checkBrowser.hydrationIssue({ ...mounted, routePath: '/swap' }, readiness)).toContain(
      'Expected route "#/get-ts"; received "#/swap".'
    );
  });

  it('polls until the mounted route appears and rejects a loader at the deadline', async () => {
    const readiness = checkBrowser.routeReadiness('https://polkaswap.io/#/swap');
    const loader = { title: 'Polkaswap', hasAppContent: true, hasBootstrapLoader: true, hasRouteUi: false };
    const mounted = {
      title: 'Swap - Polkaswap',
      routePath: '/swap',
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

describe('check-browser static candidate preview', () => {
  const preview = { root: '/candidate/dist', origin: 'https://polkaswap.io' };
  const fileFs = () => ({
    realpathSync: vi.fn((filename: string) => filename),
    statSync: vi.fn(() => ({ isDirectory: () => true, isFile: () => true })),
    readFileSync: vi.fn(() => Buffer.from('candidate bytes')),
  });

  it('requires an explicit absolute directory and an HTTP(S) origin without credentials', () => {
    const fs = fileFs();
    expect(checkBrowser.resolvePreviewConfig('/candidate/dist', 'https://polkaswap.io/#/store', fs)).toEqual(preview);
    expect(() => checkBrowser.resolvePreviewConfig('dist', 'https://polkaswap.io/', fs)).toThrow('absolute');
    expect(() => checkBrowser.resolvePreviewConfig('/candidate/dist', 'file:///tmp/index.html', fs)).toThrow('HTTP(S)');
    expect(() => checkBrowser.resolvePreviewConfig('/candidate/dist', 'https://user:pass@polkaswap.io/', fs)).toThrow(
      'without credentials'
    );
    fs.statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true });
    expect(() => checkBrowser.resolvePreviewConfig('/candidate/dist', 'https://polkaswap.io/', fs)).toThrow(
      'directory'
    );
  });

  it.each([
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/assets/app.js?v=1', 'assets/app.js', 'text/javascript; charset=utf-8'],
    ['/assets/app.css', 'assets/app.css', 'text/css; charset=utf-8'],
    ['/env.json', 'env.json', 'application/json; charset=utf-8'],
    ['/assets/core.wasm', 'assets/core.wasm', 'application/wasm'],
  ])('serves only the corresponding candidate file for %s', (urlPath, filename, contentType) => {
    const fs = fileFs();
    const result = checkBrowser.readPreviewAsset(preview, preview.origin + urlPath, 'GET', fs);
    expect(fs.readFileSync).toHaveBeenCalledWith(`/candidate/dist/${filename}`);
    expect(result).toMatchObject({ status: 200, headers: { 'content-type': contentType } });
    expect(result.body.equals(Buffer.from('candidate bytes'))).toBe(true);
    if (filename === 'index.html') expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it.each([
    ['https://mof.sora.org/sora-pay/v1/catalog', 'GET'],
    ['https://polkaswap.io.evil.example/asset.js', 'GET'],
    ['http://polkaswap.io/asset.js', 'GET'],
    ['https://polkaswap.io:444/asset.js', 'GET'],
    ['https://polkaswap.io/order', 'POST'],
    ['https://polkaswap.io/index.html', 'HEAD'],
  ])('does not read or replace %s (%s)', (url, method) => {
    const fs = fileFs();
    expect(checkBrowser.readPreviewAsset(preview, url, method, fs)).toBeNull();
    expect(fs.realpathSync).not.toHaveBeenCalled();
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it.each(['/assets/..%2f..%2fsecret', '/assets/%5c..%5csecret', '/assets/%00secret', '/assets/%FF'])(
    'rejects malformed or escaping asset paths: %s',
    (urlPath) => {
      const fs = fileFs();
      expect(checkBrowser.readPreviewAsset(preview, preview.origin + urlPath, 'GET', fs).status).toBeGreaterThanOrEqual(
        400
      );
      expect(fs.readFileSync).not.toHaveBeenCalled();
    }
  );

  it('rejects symlinks outside the build, directories, and missing files without falling back to index.html', () => {
    const fs = fileFs();
    fs.realpathSync.mockReturnValue('/candidate/dist-elsewhere/secret');
    expect(checkBrowser.readPreviewAsset(preview, `${preview.origin}/assets/link.js`, 'GET', fs).status).toBe(403);
    expect(fs.readFileSync).not.toHaveBeenCalled();
    fs.realpathSync.mockImplementation((filename: string) => filename);
    fs.statSync.mockReturnValue({ isDirectory: () => true, isFile: () => false });
    expect(checkBrowser.readPreviewAsset(preview, `${preview.origin}/assets/`, 'GET', fs).status).toBe(404);
    fs.realpathSync.mockImplementation(() => {
      throw Object.assign(new Error('file missing'), { code: 'ENOENT' });
    });
    expect(checkBrowser.readPreviewAsset(preview, `${preview.origin}/assets/missing.js`, 'GET', fs).status).toBe(404);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('routes only the exact origin, continues POSTs, and fulfills missing static files with a failure', async () => {
    const fs = fileFs();
    const context = { route: vi.fn() };
    await checkBrowser.installStaticPreview(context, preview, fs);
    const [matches, handle] = context.route.mock.calls[0];
    expect(matches(new URL('https://mof.sora.org/sora-pay/v1/catalog'))).toBe(false);
    expect(matches(new URL('https://polkaswap.io/assets/app.js'))).toBe(true);
    const request = { url: () => 'https://polkaswap.io/order', method: () => 'POST' };
    const route = { request: () => request, continue: vi.fn(), fulfill: vi.fn() };
    await handle(route);
    expect(route.continue).toHaveBeenCalledTimes(1);
    expect(route.fulfill).not.toHaveBeenCalled();
    request.method = () => 'GET';
    fs.realpathSync.mockImplementation(() => {
      throw Object.assign(new Error('file missing'), { code: 'ENOENT' });
    });
    await handle(route);
    expect(route.fulfill).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
    expect(route.continue).toHaveBeenCalledTimes(1);
  });
});

const LIVE_RPC_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';

/** Supply observable socket events to the actual checker handlers; no transport is started. */
function createLiveRpcSocket(url = 'wss://ws.mof.sora.org') {
  const handlers: Record<string, (...args: any[]) => void> = {};
  return {
    url: () => url,
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handler;
    }),
    emit: (event: string, value?: unknown) => handlers[event]?.(value),
    succeed: (id: number | string = 1) => {
      handlers.framesent?.({
        payload: JSON.stringify({ jsonrpc: '2.0', id, method: 'chain_getBlockHash', params: [0] }),
      });
      handlers.framereceived?.({ payload: JSON.stringify({ jsonrpc: '2.0', id, result: LIVE_RPC_GENESIS }) });
    },
  };
}

type LiveRpcUiFixture = {
  title: string;
  routePath: string;
  hasAppContent: boolean;
  hasBootstrapLoader: boolean;
  hasRouteUi: boolean;
};

/** Model the app's exact unaccepted legal notice without assigning to its controls. */
function createDisclaimerRoot(scenario = 'unaccepted') {
  const visibleElement = () => ({ getClientRects: () => [{}] });
  const dialog = {
    ...visibleElement(),
    classList: { contains: (value: string) => scenario !== 'foreign-dialog' && value === 'disclaimer-modal__dialog' },
  };
  const checkbox = { checked: scenario === 'checked', disabled: false };
  const accept = { disabled: scenario !== 'enabled-accept' };
  const overlay = { getClientRects: () => (scenario === 'hidden-overlay' ? [] : [{}]) };
  const root = {
    getClientRects: () => (scenario === 'hidden' ? [] : [{}]),
    ownerDocument: {
      defaultView: { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) },
      querySelectorAll: () => (scenario === 'extra-dialog' ? [dialog, dialog] : [dialog]),
    },
    contains: (element: unknown) => element === dialog,
    querySelector: (selector: string) => {
      if (selector === '.disclaimer__acknowledgement input[type="checkbox"]') return checkbox;
      if (selector === 'button.disclaimer__accept-btn') return accept;
      if (selector === '.s-modal__overlay') return scenario === 'missing-overlay' ? null : overlay;
      if (selector === '.disclaimer__header-close-btn') return scenario === 'accepted-close' ? visibleElement() : null;
      if (selector.includes('/terms')) return scenario === 'missing-terms' ? null : visibleElement();
      if (selector.includes('/privacy')) return scenario === 'missing-privacy' ? null : visibleElement();
      return null;
    },
  };
  return { root, checkbox, accept };
}

/** Keep old hydration queues/counters while evaluating the actual final DOM callback against a separate fixture. */
function createLiveRpcLocator(
  bodyText: string,
  options: {
    connected?: boolean;
    address?: string | null;
    visible?: boolean;
    count?: number;
    preexistingTooltip?: boolean;
    popupCount?: number;
    onClick?: () => void;
    onPresentation?: () => void;
    clickDelayMs?: number;
    presentationDelayMs?: number;
    ui?: LiveRpcUiFixture | (() => LiveRpcUiFixture);
    featureSelector?: string | null | (() => string | null);
    disclaimer?: ReturnType<typeof createDisclaimerRoot>;
    disclaimerCount?: number;
    checkout?: boolean;
    checkoutVisible?: boolean;
  } = {}
) {
  const readUi = () =>
    typeof options.ui === 'function'
      ? options.ui()
      : (options.ui ?? {
          title: 'Polkaswap',
          routePath: '',
          hasAppContent: true,
          hasBootstrapLoader: false,
          hasRouteUi: true,
        });
  const initialFeatureSelector = checkBrowser.routeReadiness(`https://polkaswap.io/#${readUi().routePath}`).selector;
  const readFeatureSelector = () =>
    typeof options.featureSelector === 'function'
      ? options.featureSelector()
      : options.featureSelector === undefined
        ? initialFeatureSelector
        : options.featureSelector;
  const document: any = {
    get title() {
      return readUi().title;
    },
    defaultView: {
      getComputedStyle: () => ({ visibility: 'visible', display: 'block' }),
      location: {
        get hash() {
          return `#${readUi().routePath}`;
        },
      },
    },
  };
  const app = {
    ownerDocument: document,
    get children() {
      return readUi().hasAppContent ? [{}] : [];
    },
    querySelector: (selector: string) =>
      selector === '.app-bootstrap-loader'
        ? readUi().hasBootstrapLoader
          ? {}
          : null
        : readUi().hasRouteUi && selector === readFeatureSelector()
          ? {}
          : null,
    querySelectorAll: () => (options.checkout ? [checkoutShell] : []),
  };
  const checkoutShell = {
    getClientRects: () => (options.checkoutVisible === false ? [] : [{}]),
    querySelector: (selector: string) =>
      readUi().hasRouteUi && selector === readFeatureSelector() ? { getClientRects: () => [{}] } : null,
  };
  document.querySelector = (selector: string) => (selector === '#app' ? app : null);
  const element = {
    ownerDocument: document,
    classList: { contains: (value: string) => value === 'success' && options.connected !== false },
    getClientRects: () => (options.visible === false ? [] : [{}]),
  };
  const span = {
    ownerDocument: document,
    textContent: options.address ?? 'wss://ws.mof.sora.org',
    getClientRects: () => [{}],
  };
  const panel = {
    ownerDocument: document,
    getClientRects: () => [{}],
    classList: { contains: (value: string) => value === 'success' },
    querySelectorAll: () => (options.address === null ? [] : [span]),
  };
  document.querySelectorAll = (selector: string) =>
    selector === '.app-status .app-status__item.node'
      ? options.count === 0
        ? []
        : [element]
      : selector === '.app-status'
        ? options.count === 0
          ? []
          : [element]
        : Array.from({ length: options.popupCount ?? 1 }, () => panel);
  const node = {
    isVisible: vi.fn().mockResolvedValue(options.visible !== false),
    getAttribute: vi
      .fn()
      .mockResolvedValue(`app-status__item node ${options.connected === false ? 'error' : 'success'}`),
    click: vi.fn(async ({ timeout }: { timeout: number }) => {
      if ((options.clickDelayMs ?? 0) > timeout) throw new Error('synthetic footer click deadline exceeded');
      options.onClick?.();
    }),
    dispatchEvent: vi.fn(async (_event: string, _init: unknown, { timeout }: { timeout: number }) => {
      if ((options.clickDelayMs ?? 0) > timeout) throw new Error('synthetic node event deadline exceeded');
      options.onClick?.();
    }),
    evaluate: vi.fn(async (callback: (value: typeof element, args: unknown) => unknown, args: unknown) =>
      callback(element, args)
    ),
  };
  const addresses: any = {
    first: () => addresses,
    waitFor: vi.fn(async ({ timeout }: { timeout: number }) => {
      // Model presentation's required delay against the supplied deadline without real browser/timer work.
      if ((options.presentationDelayMs ?? 0) > timeout)
        throw new Error('synthetic footer presentation deadline exceeded');
      await Promise.resolve();
      options.onPresentation?.();
    }),
    evaluateAll: vi
      .fn()
      .mockResolvedValue(options.address === null ? [] : [options.address ?? 'wss://ws.mof.sora.org']),
  };
  addresses.filter = () => addresses;
  const locator = vi.fn((selector: string) => {
    if (selector.startsWith('.disclaimer-modal[data-open="true"]')) {
      const notice = {
        evaluate: vi.fn(async (callback: (value: unknown) => unknown) => callback(options.disclaimer?.root)),
      };
      return {
        count: vi.fn().mockResolvedValue(options.disclaimerCount ?? (options.disclaimer ? 1 : 0)),
        first: () => notice,
      };
    }
    if (selector === '#app')
      return {
        evaluate: vi.fn(async (callback: (value: typeof app, args: unknown) => unknown, args: unknown) =>
          callback(app, args)
        ),
      };
    if (selector === '.app-status .app-status__item.node')
      return { count: vi.fn().mockResolvedValue(options.count ?? 1), first: () => node };
    if (selector === '.app-status__tooltip')
      return {
        evaluateAll: vi.fn(async (callback: (values: (typeof panel)[]) => unknown) =>
          callback(options.preexistingTooltip ? [panel] : [])
        ),
      };
    if (selector === '.app-status__tooltip.success .item__desc > span') return addresses;
    return { innerText: vi.fn().mockResolvedValue(bodyText) };
  });
  return Object.assign(locator, { controls: { node, addresses } });
}

describe('check-browser deployment result', () => {
  it.each([
    { failure: 'cors', preview: false },
    { failure: 'network', preview: false },
    { failure: 'none', preview: false },
    { failure: 'none', preview: true },
  ])('fails on $failure errors while accepting a clean run (preview=$preview)', async ({ failure, preview }) => {
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
        const socket = createLiveRpcSocket();
        listeners.websocket(socket);
        socket.succeed();
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
      locator: createLiveRpcLocator('Connect account'),
      close,
    };
    const context = { route: vi.fn(), addInitScript: vi.fn(), newPage: vi.fn().mockResolvedValue(page), close };
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
    if (preview) {
      process.argv.push('--preview-dist=/candidate/dist');
      fsModule.realpathSync.mockReturnValue('/candidate/dist');
      fsModule.statSync.mockReturnValue({ isDirectory: () => true });
    }
    try {
      await checkBrowser.run();
      if (failure === 'none') {
        expect(process.exitCode).toBe(0);
        expect(logSpy).toHaveBeenCalledWith('IPFS check passed.');
        expect(errorSpy).not.toHaveBeenCalled();
        const summary = JSON.parse(logSpy.mock.calls.find((call) => String(call[0]).startsWith('{'))?.[0] as string);
        expect(summary.officialMainnetRpcVerified).toBe(true);
        expect(summary.mode).toBe(preview ? 'static-preview' : 'live');
        expect(summary.previewDist).toBe(preview ? '/candidate/dist' : null);
        expect(summary.previewOrigin).toBe(preview ? 'https://polkaswap.io' : null);
        expect(context.route).toHaveBeenCalledTimes(preview ? 1 : 0);
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
  });

  it.each([
    { operationFailure: 'cancelled', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'net::ERR_ABORTED', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'http-400', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'http-500', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'cors', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'pageerror', cleanupFailure: 'none', cleanupTarget: 'page' },
    { operationFailure: 'none', cleanupFailure: 'cancelled', cleanupTarget: 'page' },
    { operationFailure: 'none', cleanupFailure: 'net::ERR_ABORTED', cleanupTarget: 'context' },
    { operationFailure: 'none', cleanupFailure: 'http-400', cleanupTarget: 'browser' },
    { operationFailure: 'none', cleanupFailure: 'net::ERR_FAILED', cleanupTarget: 'context' },
    { operationFailure: 'none', cleanupFailure: 'cors', cleanupTarget: 'page' },
    { operationFailure: 'none', cleanupFailure: 'pageerror', cleanupTarget: 'context' },
    { operationFailure: 'cancelled', cleanupFailure: 'cancelled', cleanupTarget: 'page' },
    { operationFailure: 'exception', cleanupFailure: 'cancelled', cleanupTarget: 'page' },
  ] as const)(
    'keeps $operationFailure during capture separate from $cleanupFailure during $cleanupTarget cleanup',
    async ({ operationFailure, cleanupFailure, cleanupTarget }) => {
      const originalArgv = process.argv;
      const originalExitCode = process.exitCode;
      const originalLauncher = checkBrowser.BROWSER_LAUNCHERS.webkit;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const endpoint = 'https://ws.mof.sora.org/';
      const listeners: Record<string, (...args: unknown[]) => void> = {};
      const closeOrder: string[] = [];
      const emitFailure = (failure: typeof operationFailure | typeof cleanupFailure) => {
        if (failure === 'none') return;
        if (failure === 'exception') throw new Error('final capture failed');
        if (failure === 'cors') {
          listeners.console({
            type: () => 'error',
            text: () => `Access to fetch at '${endpoint}' has been blocked by CORS policy`,
            location: () => ({ url: endpoint }),
          });
        } else if (failure === 'pageerror') {
          listeners.pageerror(new Error('test page error'));
        } else if (failure === 'http-400' || failure === 'http-500') {
          listeners.response({
            url: () => endpoint,
            status: () => (failure === 'http-400' ? 400 : 500),
            request: () => ({ method: () => 'POST' }),
          });
        } else {
          listeners.requestfailed({
            failure: () => ({ errorText: failure }),
            url: () => endpoint,
            method: () => 'POST',
          });
        }
      };
      const closeDuringCleanup = (target: 'page' | 'context' | 'browser') =>
        vi.fn(async () => {
          await Promise.resolve();
          closeOrder.push(target);
          if (target === cleanupTarget) emitFailure(cleanupFailure);
        });
      const page = {
        on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
          listeners[event] = listener;
        }),
        goto: vi.fn(async () => {
          const socket = createLiveRpcSocket();
          listeners.websocket(socket);
          socket.succeed();
          return {
            url: () => 'https://polkaswap.io/',
            status: () => 200,
            headers: () => ({ 'cache-control': 'no-store' }),
          };
        }),
        evaluate: vi.fn().mockResolvedValue({
          title: 'Swap - Polkaswap',
          routePath: '/swap',
          hasAppContent: true,
          hasBootstrapLoader: false,
          hasRouteUi: true,
        }),
        $eval: vi
          .fn()
          .mockResolvedValueOnce({ textLength: 15, htmlLength: 65 })
          .mockResolvedValueOnce('<div id="app"><div class="swap-container">Connect account</div></div>'),
        locator: createLiveRpcLocator('Connect account Network Fee', {
          ui: {
            title: 'Swap - Polkaswap',
            routePath: '/swap',
            hasAppContent: true,
            hasBootstrapLoader: false,
            hasRouteUi: true,
          },
        }),
        screenshot: vi.fn(async () => {
          // The final awaited capture is still inside the observation window.
          await Promise.resolve();
          emitFailure(operationFailure);
          return 'test-image';
        }),
        close: closeDuringCleanup('page'),
      };
      const context = {
        addInitScript: vi.fn(),
        newPage: vi.fn().mockResolvedValue(page),
        close: closeDuringCleanup('context'),
      };
      checkBrowser.BROWSER_LAUNCHERS.webkit = vi.fn().mockResolvedValue({
        version: () => 'test',
        newContext: vi.fn().mockResolvedValue(context),
        close: closeDuringCleanup('browser'),
      });
      process.argv = [
        'node',
        'check-browser.js',
        '--url=https://polkaswap.io/#/swap',
        '--browser=webkit',
        '--no-spawn-gateway',
        '--settle-ms=0',
        '--screenshot-base64',
      ];
      process.exitCode = 0;
      try {
        await checkBrowser.run();
        const operationConsole = operationFailure === 'cors' || operationFailure === 'pageerror';
        const cleanupConsole = cleanupFailure === 'cors' || cleanupFailure === 'pageerror';
        const cleanupCancellation = cleanupFailure === 'cancelled' || cleanupFailure === 'net::ERR_ABORTED';
        const operationRequest = operationFailure !== 'none' && operationFailure !== 'exception' && !operationConsole;
        const cleanupRequest = cleanupFailure !== 'none' && !cleanupConsole && !cleanupCancellation;
        const expectedFailure = operationFailure !== 'none' || (cleanupFailure !== 'none' && !cleanupCancellation);
        const summarySpy = expectedFailure ? errorSpy : logSpy;
        const summary = JSON.parse(
          summarySpy.mock.calls.find((call) => String(call[0]).startsWith('{'))?.[0] as string
        );
        expect(process.exitCode).toBe(expectedFailure ? 1 : 0);
        expect(summary.failedRequests).toHaveLength(Number(operationRequest) + Number(cleanupRequest));
        expect(summary.consoleErrors).toHaveLength(Number(operationConsole) + Number(cleanupConsole));
        expect(summary.observationSnapshot.failedRequests).toHaveLength(Number(operationRequest));
        expect(summary.observationSnapshot.console).toHaveLength(Number(operationConsole));
        expect(summary.observationSnapshot.error).toBe(
          operationFailure === 'exception' ? 'final capture failed' : null
        );
        expect(summary.cleanupEvents.failedRequests).toHaveLength(cleanupFailure === 'none' || cleanupConsole ? 0 : 1);
        expect(summary.cleanupEvents.console).toHaveLength(cleanupConsole ? 1 : 0);
        expect(summary.observationBoundary).toEqual({
          kind: 'end-of-observation-before-cleanup',
          monotonicNs: expect.stringMatching(/^\d+$/),
        });
        expect(closeOrder).toEqual(['page', 'context', 'browser']);
        if (operationFailure === 'cancelled' || operationFailure === 'net::ERR_ABORTED') {
          expect(summary.failedRequests).toEqual([{ url: endpoint, method: 'POST', errorText: operationFailure }]);
        } else if (operationFailure === 'http-400' || operationFailure === 'http-500') {
          expect(summary.failedRequests).toEqual([
            { url: endpoint, method: 'POST', status: operationFailure === 'http-400' ? 400 : 500 },
          ]);
        }
        if (cleanupFailure === 'cancelled' || cleanupFailure === 'net::ERR_ABORTED') {
          expect(summary.cleanupEvents.failedRequests).toEqual([
            { url: endpoint, method: 'POST', errorText: cleanupFailure },
          ]);
        }
        if (cleanupFailure === 'http-400') {
          expect(summary.failedRequests).toEqual([{ url: endpoint, method: 'POST', status: 400 }]);
          expect(summary.cleanupEvents.failedRequests).toEqual(summary.failedRequests);
        } else if (cleanupFailure === 'net::ERR_FAILED') {
          expect(summary.failedRequests).toEqual([{ url: endpoint, method: 'POST', errorText: 'net::ERR_FAILED' }]);
          expect(summary.cleanupEvents.failedRequests).toEqual(summary.failedRequests);
        }
        if (!expectedFailure) {
          expect(summary.officialMainnetRpcVerified).toBe(true);
          expect(logSpy).toHaveBeenCalledWith('IPFS check passed.');
          expect(errorSpy).not.toHaveBeenCalled();
        } else {
          expect(errorSpy).toHaveBeenCalledWith(
            'IPFS check failed:',
            expect.stringContaining(
              operationFailure === 'exception'
                ? 'final capture failed'
                : operationConsole || cleanupConsole
                  ? '1 console error(s)'
                  : '1 failed network request(s)'
            )
          );
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
      routePath: '/swap',
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
    let footerUi: LiveRpcUiFixture = mounted;
    let footerFeatureSelector = checkBrowser.routeReadiness('https://polkaswap.io/#/swap').selector;
    const close = vi.fn().mockResolvedValue(undefined);
    const listeners: Record<string, (...args: any[]) => void> = {};
    const page = {
      on: vi.fn((event: string, listener: (...args: any[]) => void) => {
        listeners[event] = listener;
      }),
      goto: vi.fn(async () => {
        const socket = createLiveRpcSocket();
        listeners.websocket(socket);
        socket.succeed();
        return {
          url: () => 'https://polkaswap.io/',
          status: () => 200,
          headers: () => ({ 'cache-control': 'no-store' }),
        };
      }),
      evaluate: vi.fn().mockResolvedValueOnce(loader).mockResolvedValueOnce(mounted).mockResolvedValueOnce(mounted),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      $eval: vi
        .fn()
        .mockResolvedValueOnce({ textLength: 15, htmlLength: 65 })
        .mockResolvedValueOnce('<div id="app"><div class="swap-container">Connect account</div></div>'),
      locator: createLiveRpcLocator('Connect account Network Fee', {
        ui: () => footerUi,
        featureSelector: () => footerFeatureSelector,
      }),
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
      expect(summary.officialMainnetRpcVerified).toBe(true);
      expect(summary.hydration).toEqual(mounted);
      expect(summary.domSnapshot).toContain('swap-container');
      expect(summary.bodyTextSamples.at(-1)).toContain('Network Fee');

      footerUi = { ...mounted, ...loader };
      page.evaluate.mockReset().mockResolvedValueOnce(mounted).mockResolvedValueOnce(loader);
      page.$eval
        .mockReset()
        .mockResolvedValueOnce({ textLength: 15, htmlLength: 35 })
        .mockResolvedValueOnce('<div id="app"><div class="app-bootstrap-loader"></div></div>');
      process.exitCode = 0;
      await checkBrowser.run();
      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith('IPFS check failed:', expect.stringContaining('bootstrap loader'));

      // A later route redirect must fail even if the old title and feature DOM remain mounted.
      process.argv[2] = '--url=https://polkaswap.io/#/bots';
      const mountedBots = { ...mounted, title: 'Bots - Polkaswap', routePath: '/bots' };
      footerUi = { ...mountedBots, routePath: '/swap' };
      footerFeatureSelector = checkBrowser.routeReadiness('https://polkaswap.io/#/bots').selector;
      page.evaluate
        .mockReset()
        .mockResolvedValueOnce(mountedBots)
        .mockResolvedValueOnce({ ...mountedBots, routePath: '/swap' });
      page.$eval
        .mockReset()
        .mockResolvedValueOnce({ textLength: 15, htmlLength: 35 })
        .mockResolvedValueOnce('<div id="app"><main class="bots-page">GO</main></div>');
      process.exitCode = 0;
      await checkBrowser.run();
      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        'IPFS check failed:',
        expect.stringContaining('Expected route "#/bots"; received "#/swap".')
      );
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      checkBrowser.BROWSER_LAUNCHERS.webkit = originalLauncher;
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe('check-browser approved live RPC contract', () => {
  it.each([
    ['unaccepted', true],
    ['hidden', false],
    ['hidden-overlay', false],
    ['missing-overlay', false],
    ['extra-dialog', false],
    ['foreign-dialog', false],
    ['checked', false],
    ['enabled-accept', false],
    ['accepted-close', false],
    ['missing-terms', false],
    ['missing-privacy', false],
  ])('recognizes only the unchanged app notice (%s)', async (scenario, expected) => {
    const disclaimer = createDisclaimerRoot(String(scenario));
    const before = { checkbox: { ...disclaimer.checkbox }, accept: { ...disclaimer.accept } };
    const locator = createLiveRpcLocator('Connect account', { disclaimer });
    expect(await checkBrowser.hasUnacceptedAppDisclaimer({ locator })).toBe(expected);
    expect(disclaimer.checkbox).toEqual(before.checkbox);
    expect(disclaimer.accept).toEqual(before.accept);
  });

  it.each([0, 2])('rejects an absent or ambiguous legal notice (%i)', async (disclaimerCount) => {
    const locator = createLiveRpcLocator('Connect account', { disclaimerCount });
    expect(await checkBrowser.hasUnacceptedAppDisclaimer({ locator })).toBe(false);
  });

  it('presents only the read-only footer while leaving first-visit terms unaccepted', async () => {
    const disclaimer = createDisclaimerRoot();
    const locator = createLiveRpcLocator('Connect account', {
      disclaimer,
      ui: {
        title: 'Swap - Polkaswap',
        routePath: '/swap',
        hasAppContent: true,
        hasBootstrapLoader: false,
        hasRouteUi: true,
      },
    });
    const footer = await checkBrowser.inspectLiveRpcFooter(
      { locator },
      '#app',
      checkBrowser.routeReadiness('https://polkaswap.io/#/swap')
    );
    expect(locator.controls.node.click).not.toHaveBeenCalled();
    expect(locator.controls.node.dispatchEvent).toHaveBeenCalledWith(
      'keypress',
      { key: 'Enter', code: 'Enter' },
      { timeout: 2500 }
    );
    expect(footer).toMatchObject({
      connected: true,
      address: 'wss://ws.mof.sora.org/',
      binding: 'fresh-node-popover',
      presentation: 'node-event-with-unaccepted-disclaimer',
    });
    expect(disclaimer.checkbox).toEqual({ checked: false, disabled: false });
    expect(disclaimer.accept).toEqual({ disabled: true });
  });

  it.each(['/buy-xor', '/get-ts'])(
    'requires exact mounted checkout evidence and active approved RPC on %s',
    async (routePath) => {
      const readiness = checkBrowser.routeReadiness(`https://polkaswap.io/#${routePath}`);
      const locator = createLiveRpcLocator('Choose source', {
        count: 0,
        checkout: true,
        ui: {
          title: readiness.title,
          routePath,
          hasAppContent: true,
          hasBootstrapLoader: false,
          hasRouteUi: true,
        },
      });
      const evidence = await checkBrowser.inspectCheckoutLiveRpcLayout({ locator }, '#app', readiness);
      expect(evidence).toMatchObject({
        connected: null,
        address: null,
        binding: 'intentional-checkout-no-footer',
        checkout: { layout: 'app-main--checkout', footerAbsent: true, hasVisibleFeature: true },
      });
      const snapshot = {
        sockets: [
          { endpoint: 'wss://ws.mof.sora.org/', closed: false, successfulGenesisReads: 1, sentGenesisReads: 1 },
        ],
      };
      expect(checkBrowser.liveRpcIssue('wss://ws.mof.sora.org/', evidence, snapshot, [], readiness)).toBeNull();
      expect(checkBrowser.liveRpcIssue('wss://ws.mof.sora.org/', evidence, { sockets: [] }, [], readiness)).toMatch(
        /active/
      );
      expect(checkBrowser.liveRpcIssue('wss://ws.mof.sora.org/', evidence, snapshot, [{}], readiness)).toMatch(
        /failure/
      );
      expect(checkBrowser.liveRpcIssue('wss://ws.mof.sora.org/', evidence, snapshot, [])).toMatch(/footer/);
      expect(
        checkBrowser.liveRpcIssue('wss://ws.mof.sora.org/', evidence, snapshot, [], {
          ...readiness,
          selector: '.arbitrary-content',
        })
      ).toMatch(/footer/);
    }
  );

  it.each(['/swap', '/bots', '/store', '/buy-xor/extra', '/get-ts/extra', '/arbitrary'])(
    'cannot bypass the footer requirement on %s',
    async (routePath) => {
      const locator = createLiveRpcLocator('Choose source', { count: 0, checkout: true });
      expect(
        await checkBrowser.inspectCheckoutLiveRpcLayout(
          { locator },
          '#app',
          checkBrowser.routeReadiness(`https://polkaswap.io/#${routePath}`)
        )
      ).toEqual({ connected: false, address: null });
    }
  );

  it.each([
    'https://polkaswap.io/',
    'https://polkaswap.io/#/bots',
    'https://polkaswap.io:443/?ipfs-sw-unregister=true#/swap',
  ])('automatically enforces approved live RPC for %s', (url) => {
    expect(checkBrowser.resolveLiveRpcExpectation(url)).toBe('wss://ws.mof.sora.org/');
  });

  it.each([false, true, '', 'false', 'none', 'wss://mof2.sora.org', 'wss://ws.mof.sora.org?disable=1'])(
    'cannot disable or override the production gate with %s',
    (value) => {
      expect(() => checkBrowser.resolveLiveRpcExpectation('https://polkaswap.io/', value)).toThrow(/only be/);
    }
  );

  it('accepts only the same approved explicit gate for a local candidate and marks other checks untargeted', () => {
    expect(checkBrowser.resolveLiveRpcExpectation('http://127.0.0.1:41829/#/bots')).toBeNull();
    expect(checkBrowser.resolveLiveRpcExpectation('http://127.0.0.1:41829/#/bots', 'wss://ws.mof.sora.org')).toBe(
      'wss://ws.mof.sora.org/'
    );
    expect(checkBrowser.resolveLiveRpcExpectation('https://polkaswap.io.example/#/bots')).toBeNull();
    expect(() => checkBrowser.resolveLiveRpcExpectation('https://user@polkaswap.io/')).toThrow(/without credentials/);
  });

  it.each([
    'wss://user:secret@ws.mof.sora.org',
    'wss://ws.mof.sora.org/rpc',
    'wss://ws.mof.sora.org?token=secret',
    'wss://ws.mof.sora.org#other',
    'ws://ws.mof.sora.org',
  ])('does not treat %s as an approved root endpoint', (url) => {
    expect(checkBrowser.normalizeLiveRpcEndpoint(url)).toBeNull();
  });

  it('keeps popup presentation within the remaining separate action budget after the click', async () => {
    const locator = createLiveRpcLocator('GO Bots', {
      presentationDelayMs: 600,
      ui: {
        title: 'Bots - Polkaswap',
        routePath: '/bots',
        hasAppContent: true,
        hasBootstrapLoader: false,
        hasRouteUi: true,
      },
    });
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3000);
    try {
      const footer = await checkBrowser.inspectLiveRpcFooter(
        { locator },
        '#app',
        checkBrowser.routeReadiness('https://polkaswap.io/#/bots')
      );
      expect(locator.controls.node.click).toHaveBeenCalledWith({ timeout: 2500 });
      expect(locator.controls.addresses.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 500 });
      expect(footer.connected).toBe(false);
      expect(locator.controls.node.evaluate).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('seals immutable pre-cleanup evidence and retains cleanup closes separately without payloads', () => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    const observer = checkBrowser.observeLiveRpcSockets({
      on: (event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      },
    });
    const socket = createLiveRpcSocket();
    handlers.websocket(socket);
    socket.succeed();
    socket.emit('framereceived', { payload: JSON.stringify({ result: 'PRIVATE_SENTINEL' }) });
    const snapshot = observer.seal();
    socket.emit('close');
    socket.emit('socketerror', 'cancelled');
    expect(snapshot.sockets[0]).toMatchObject({ closed: false, successfulGenesisReads: 1 });
    expect(observer.cleanupEvents().map((entry: { kind: string }) => entry.kind)).toEqual(['closed', 'socketerror']);
    expect(observer.failures()).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain('PRIVATE_SENTINEL');
    expect(
      checkBrowser.liveRpcIssue(
        'wss://ws.mof.sora.org/',
        { connected: true, address: 'wss://ws.mof.sora.org', binding: 'fresh-node-popover' },
        snapshot,
        observer.failures()
      )
    ).toBeNull();
  });
});

describe('check-browser final live RPC result', () => {
  it.each([
    { scenario: 'success', pass: true },
    { scenario: 'http-probe-only', pass: false },
    { scenario: 'disable-flag', pass: false },
    { scenario: 'wrong-endpoint', pass: false },
    { scenario: 'wrong-id', pass: false },
    { scenario: 'response-only', pass: false },
    { scenario: 'rpc-error', pass: false },
    { scenario: 'non-mainnet', pass: false },
    { scenario: 'new-socket-without-proof', pass: false },
    { scenario: 'footer-missing', pass: false },
    { scenario: 'footer-preexisting-tooltip', pass: false },
    { scenario: 'footer-ambiguous-popup', pass: false },
    { scenario: 'footer-no-address', pass: false },
    { scenario: 'footer-custom', pass: false },
    { scenario: 'footer-disconnected', pass: false },
    { scenario: 'footer-hidden', pass: false },
    { scenario: 'footer-close', pass: false },
    { scenario: 'footer-delayed-success', pass: true },
    { scenario: 'footer-presentation-timeout', pass: false },
    { scenario: 'footer-click-timeout', pass: false },
    { scenario: 'footer-disconnected-during-presentation', pass: false },
    { scenario: 'late-ui-route', pass: false },
    { scenario: 'late-ui-title', pass: false },
    { scenario: 'late-ui-loader', pass: false },
    { scenario: 'late-ui-feature', pass: false },
    { scenario: 'late-ui-app-empty', pass: false },
    { scenario: 'screenshot-close', pass: false },
    { scenario: 'cleanup-close', pass: true },
    { scenario: 'cleanup-late-response', pass: false },
    { scenario: 'active-aborted-socket', pass: false },
    { scenario: 'cleanup-noncancellation-socket-error', pass: false },
    { scenario: 'http400', pass: false },
    { scenario: 'http500-screenshot', pass: false },
    { scenario: 'console-error', pass: false },
    { scenario: 'page-error', pass: false },
    { scenario: 'active-cancelled-request', pass: false },
    { scenario: 'local-explicit', pass: true },
    { scenario: 'untargeted', pass: true },
    { scenario: 'checkout-buy-xor', pass: true },
    { scenario: 'checkout-get-ts', pass: true },
    { scenario: 'checkout-missing-layout', pass: false },
    { scenario: 'checkout-hidden-layout', pass: false },
    { scenario: 'checkout-missing-feature', pass: false },
    { scenario: 'checkout-wrong-route', pass: false },
    { scenario: 'checkout-wrong-title', pass: false },
    { scenario: 'checkout-no-genesis', pass: false },
    { scenario: 'checkout-wrong-endpoint', pass: false },
  ])('requires final UI and socket evidence while preserving old errors ($scenario)', async ({ scenario, pass }) => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalLauncher = checkBrowser.BROWSER_LAUNCHERS.webkit;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const handlers: Record<string, (...args: any[]) => void> = {};
    let socket!: ReturnType<typeof createLiveRpcSocket>;
    const checkoutScenario = scenario.startsWith('checkout-');
    const target = checkoutScenario
      ? `https://polkaswap.io/#/${scenario === 'checkout-get-ts' ? 'get-ts' : 'buy-xor'}`
      : scenario === 'local-explicit' || scenario === 'untargeted'
        ? 'http://127.0.0.1:41829/#/bots'
        : 'https://polkaswap.io/#/bots';
    const readiness = checkBrowser.routeReadiness(target);
    const initialUi: LiveRpcUiFixture = {
      title: readiness.title,
      routePath: readiness.path,
      hasAppContent: true,
      hasBootstrapLoader: false,
      hasRouteUi: true,
    };
    const finalUi = { ...initialUi };
    let finalConnected = scenario !== 'footer-disconnected';
    const footer = {
      ui: finalUi,
      clickDelayMs: scenario === 'footer-click-timeout' ? 2700 : 0,
      presentationDelayMs:
        scenario === 'footer-delayed-success' ? 600 : scenario === 'footer-presentation-timeout' ? 2700 : 0,
      onPresentation: () => {
        if (scenario === 'late-ui-route') finalUi.routePath = '/swap';
        if (scenario === 'late-ui-title') finalUi.title = 'Swap - Polkaswap';
        if (scenario === 'late-ui-loader') finalUi.hasBootstrapLoader = true;
        if (scenario === 'late-ui-feature') finalUi.hasRouteUi = false;
        if (scenario === 'late-ui-app-empty') finalUi.hasAppContent = false;
        if (scenario === 'footer-disconnected-during-presentation') finalConnected = false;
      },
      count: scenario === 'footer-missing' || checkoutScenario ? 0 : 1,
      checkout: checkoutScenario && scenario !== 'checkout-missing-layout',
      checkoutVisible: scenario !== 'checkout-hidden-layout',
      address:
        scenario === 'footer-no-address'
          ? null
          : scenario === 'footer-custom'
            ? 'wss://mof2.sora.org'
            : 'wss://ws.mof.sora.org',
      preexistingTooltip: scenario === 'footer-preexisting-tooltip',
      popupCount: scenario === 'footer-ambiguous-popup' ? 2 : 1,
      get connected() {
        return finalConnected;
      },
      visible: scenario !== 'footer-hidden',
      onClick: () => {
        if (scenario === 'footer-close') socket.emit('close');
      },
    };
    const emitHttp = (status: number) =>
      handlers.response({
        url: () => 'https://ws.mof.sora.org/',
        status: () => status,
        request: () => ({ method: () => 'POST' }),
      });
    const finalLocator = createLiveRpcLocator('GO Bots', footer);
    const page = {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler;
      }),
      goto: vi.fn(async () => {
        if (!['http-probe-only', 'disable-flag', 'untargeted'].includes(scenario)) {
          socket = createLiveRpcSocket(
            ['wrong-endpoint', 'checkout-wrong-endpoint'].includes(scenario) ? 'wss://mof2.sora.org' : undefined
          );
          handlers.websocket(socket);
          if (['wrong-id', 'rpc-error', 'non-mainnet', 'cleanup-late-response'].includes(scenario)) {
            socket.emit('framesent', {
              payload: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0] }),
            });
            if (scenario !== 'cleanup-late-response')
              socket.emit('framereceived', {
                payload: JSON.stringify({
                  jsonrpc: '2.0',
                  id: scenario === 'wrong-id' ? 2 : 1,
                  ...(scenario === 'rpc-error'
                    ? { error: { code: -1 } }
                    : { result: scenario === 'non-mainnet' ? `0x${'0'.repeat(64)}` : LIVE_RPC_GENESIS }),
                }),
              });
          } else if (scenario === 'response-only') {
            socket.emit('framereceived', {
              payload: JSON.stringify({ jsonrpc: '2.0', id: 1, result: LIVE_RPC_GENESIS }),
            });
          } else if (scenario !== 'checkout-no-genesis') {
            socket.succeed();
          }
          if (scenario === 'new-socket-without-proof') handlers.websocket(createLiveRpcSocket());
          if (scenario === 'active-aborted-socket') socket.emit('socketerror', 'net::ERR_ABORTED');
        }
        if (scenario === 'http-probe-only') emitHttp(200);
        if (scenario === 'http400') emitHttp(400);
        if (scenario === 'console-error')
          handlers.console({ type: () => 'error', text: () => 'CORS failure', location: () => ({}) });
        if (scenario === 'page-error') handlers.pageerror(new Error('render failed'));
        if (scenario === 'active-cancelled-request')
          handlers.requestfailed({
            failure: () => ({ errorText: 'cancelled' }),
            url: () => 'https://ws.mof.sora.org/',
            method: () => 'POST',
          });
        return { url: () => target, status: () => 200, headers: () => ({ 'cache-control': 'no-store' }) };
      }),
      evaluate: vi.fn().mockResolvedValue(initialUi),
      $eval: vi
        .fn()
        .mockResolvedValueOnce({ textLength: 12, htmlLength: 50 })
        .mockResolvedValueOnce('<div id="app"><main class="bots-page">GO</main></div>'),
      locator: finalLocator,
      screenshot: vi.fn(async () => {
        if (scenario === 'checkout-missing-feature') finalUi.hasRouteUi = false;
        if (scenario === 'checkout-wrong-route') finalUi.routePath = '/swap';
        if (scenario === 'checkout-wrong-title') finalUi.title = 'Swap - Polkaswap';
        if (scenario === 'screenshot-close') socket.emit('close');
        if (scenario === 'http500-screenshot') emitHttp(500);
        return 'synthetic screenshot';
      }),
      close: vi.fn(async () => {
        if (scenario === 'cleanup-close') socket.emit('close');
        if (scenario === 'cleanup-noncancellation-socket-error')
          socket.emit('socketerror', 'unexpected transport error');
        if (scenario === 'cleanup-late-response')
          socket.emit('framereceived', {
            payload: JSON.stringify({ jsonrpc: '2.0', id: 1, result: LIVE_RPC_GENESIS }),
          });
      }),
    };
    const context = {
      addInitScript: vi.fn(),
      newPage: vi.fn().mockResolvedValue(page),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const newContext = vi.fn().mockResolvedValue(context);
    checkBrowser.BROWSER_LAUNCHERS.webkit = vi.fn().mockResolvedValue({
      version: () => 'test',
      newContext,
      close: vi.fn().mockResolvedValue(undefined),
    });
    process.argv = [
      'node',
      'check-browser.js',
      `--url=${target}`,
      '--browser=webkit',
      '--no-spawn-gateway',
      '--settle-ms=0',
      '--screenshot-base64',
    ];
    if (scenario === 'local-explicit') process.argv.push('--expected-live-rpc=wss://ws.mof.sora.org');
    if (scenario === 'disable-flag') process.argv.push('--no-expected-live-rpc');
    process.exitCode = 0;
    try {
      await checkBrowser.run();
      expect(process.exitCode).toBe(pass ? 0 : 1);
      const calls = pass ? logSpy.mock.calls : errorSpy.mock.calls;
      const summary = JSON.parse(calls.find((call) => String(call[0]).startsWith('{'))?.[0] as string);
      if (pass) {
        expect(logSpy).toHaveBeenCalledWith('IPFS check passed.');
        expect(summary.officialMainnetRpcVerified).toBe(scenario !== 'untargeted');
      } else {
        expect(logSpy).not.toHaveBeenCalledWith('IPFS check passed.');
      }
      expect(newContext).toHaveBeenCalledWith(undefined);
      if (scenario === 'cleanup-close') {
        expect(summary.liveRpc.observation.sockets[0].closed).toBe(false);
        expect(summary.liveRpc.cleanupEvents).toEqual([expect.objectContaining({ kind: 'closed' })]);
      }
      if (scenario === 'cleanup-late-response') {
        expect(summary.liveRpc.observation.sockets[0].successfulGenesisReads).toBe(0);
        expect(summary.liveRpc.cleanupEvents).toEqual([
          expect.objectContaining({ kind: 'mainnet-genesis-read-succeeded' }),
        ]);
      }
      if (scenario === 'http400' || scenario === 'http500-screenshot') {
        expect(summary.failedRequests).toHaveLength(1);
      }
      if (scenario === 'active-cancelled-request') expect(summary.failedRequests[0].errorText).toBe('cancelled');
      if (scenario === 'footer-delayed-success' || scenario === 'footer-presentation-timeout') {
        expect(finalLocator.controls.node.click).toHaveBeenCalledWith({ timeout: 2500 });
        const presentationTimeout = finalLocator.controls.addresses.waitFor.mock.calls[0][0].timeout;
        expect(presentationTimeout).toBeGreaterThan(200);
        expect(presentationTimeout).toBeLessThanOrEqual(2500);
      }
      if (scenario === 'footer-click-timeout') {
        expect(finalLocator.controls.node.click).toHaveBeenCalledWith({ timeout: 2500 });
        expect(finalLocator.controls.addresses.waitFor).not.toHaveBeenCalled();
      }
      if (scenario.startsWith('late-ui-')) {
        expect(summary.hydrationBeforeFooter).toEqual({
          title: 'Bots - Polkaswap',
          routePath: '/bots',
          hasAppContent: true,
          hasBootstrapLoader: false,
          hasRouteUi: true,
        });
        expect(summary.hydration).toEqual(finalUi);
        expect(summary.officialMainnetRpcVerified).toBe(false);
        expect(summary.liveRpc.issue).toBeNull();
        expect(summary.liveRpc.footer).toMatchObject({ connected: true, address: 'wss://ws.mof.sora.org/' });
        expect(summary.liveRpc.observation.sockets[0]).toMatchObject({ closed: false, successfulGenesisReads: 1 });
        expect(finalLocator.controls.node.evaluate).toHaveBeenCalledWith(expect.any(Function), {
          appSelector: '#app',
          routeSelector: 'main.bots-page [data-testid="autopilot"]',
        });
        const expectedIssue =
          scenario === 'late-ui-route'
            ? 'Expected route "#/bots"; received "#/swap".'
            : scenario === 'late-ui-title'
              ? 'Expected bots title'
              : scenario === 'late-ui-loader'
                ? 'bootstrap loader'
                : scenario === 'late-ui-feature'
                  ? 'bots UI did not render'
                  : 'App content did not render anything';
        expect(errorSpy).toHaveBeenCalledWith('IPFS check failed:', expect.stringContaining(expectedIssue));
      }
      if (scenario === 'footer-disconnected-during-presentation') {
        expect(summary.liveRpc.footer.connected).toBe(false);
        expect(summary.liveRpc.observation.sockets[0].successfulGenesisReads).toBe(1);
      }
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      checkBrowser.BROWSER_LAUNCHERS.webkit = originalLauncher;
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
