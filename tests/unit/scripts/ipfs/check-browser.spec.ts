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

  it('ignores optional endpoint CORS/load console errors', () => {
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

    expect(filtered).toEqual([
      {
        level: 'error',
        message: 'Unexpected application error',
        location: { url: 'http://127.0.0.1:41733/ipfs/polkaswap-e2e/' },
      },
    ]);
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

  it('ignores optional endpoint failed requests', () => {
    const failedRequests = [
      { url: 'https://api.coingecko.com/api/v3/simple/price?ids=dai', errorText: 'net::ERR_FAILED' },
      { url: 'https://example.com/api/critical', status: 500 },
    ];

    const filtered = checkBrowser.filterFailedRequests(failedRequests);

    expect(filtered).toEqual([{ url: 'https://example.com/api/critical', status: 500 }]);
  });
});
