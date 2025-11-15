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
      { level: 'error', message: 'Cannot redefine property: $route' },
      { level: 'error', message: 'Critical failure' },
    ];
    const filtered = checkBrowser.filterConsoleMessages(messages);
    expect(filtered).toEqual([{ level: 'error', message: 'Critical failure' }]);
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
});
