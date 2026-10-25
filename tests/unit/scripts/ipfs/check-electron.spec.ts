import { EventEmitter } from 'node:events';
import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest';

const appMock = {
  disableHardwareAcceleration: vi.fn(),
  commandLine: { appendSwitch: vi.fn() },
  on: vi.fn(),
  exit: vi.fn(),
  whenReady: vi.fn(() => Promise.resolve()),
};

const BrowserWindow = vi.fn();

beforeAll(() => {
  global.__IPFS_CHECK_ELECTRON__ = {
    app: appMock,
    BrowserWindow,
  };
});

let electronModule: any;

beforeAll(async () => {
  const mod = await import('../../../../scripts/ipfs/check-electron.js');
  electronModule = mod.default;
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  delete global.__IPFS_CHECK_ELECTRON__;
});

describe('check-electron helpers', () => {
  it('parses CLI arguments', () => {
    const result = electronModule.parseArgs(['--cid', 'QmHash', '--gateway', 'https://gw']);
    expect(result).toMatchObject({ cid: 'QmHash', gateway: 'https://gw' });
  });

  it('builds target URL with ipfs-check marker', () => {
    const url = electronModule.buildTargetUrl({ cid: 'QmHash', route: '#/bridge' });
    expect(url).toBe('http://127.0.0.1:8080/ipfs/QmHash/index.html?ipfs-check=1#/bridge');
  });

  it('collects console messages via watchConsole', () => {
    const emitter = new EventEmitter();
    emitter.on = emitter.addListener.bind(emitter);
    const messages = electronModule.watchConsole(emitter as any);

    emitter.emit('console-message', 0, 2, 'Something happened', 10, 'file.js');

    expect(messages).toEqual([{ level: 2, message: 'Something happened', line: 10, sourceId: 'file.js' }]);
  });

  it('records failing requests via watchResponses', () => {
    const completed: Array<(details: any) => void> = [];
    const errors: Array<(details: any) => void> = [];
    const failLoad: Array<(event: any, code: number, desc: string, url: string) => void> = [];

    const webContents = {
      session: {
        webRequest: {
          onCompleted: (cb: (details: any) => void) => completed.push(cb),
          onErrorOccurred: (cb: (details: any) => void) => errors.push(cb),
        },
      },
      on: (event: string, cb: any) => {
        if (event === 'did-fail-load') failLoad.push(cb);
      },
    } as any;

    const failures = electronModule.watchResponses(webContents);

    completed[0]!({ statusCode: 500, url: 'https://gw', method: 'GET' });
    completed[0]!({ statusCode: 200, url: 'https://ok', method: 'GET' });
    errors[0]!({ errorCode: -3, url: 'ignored', method: 'GET' });
    errors[0]!({ errorCode: -1, url: 'https://err', method: 'POST', error: 'ERR_CONNECTION_REFUSED' });
    failLoad[0]!(null, -3, 'Aborted', 'hash');
    failLoad[0]!(null, -1, 'Crashed', 'https://fail');

    expect(failures).toEqual([
      { url: 'https://gw', status: 500, method: 'GET' },
      { url: 'https://err', status: 'ERR_CONNECTION_REFUSED', method: 'POST' },
      { url: 'https://fail', status: '-1 Crashed', method: 'GET' },
    ]);
  });

  it('waitForContent resolves evaluated metrics', async () => {
    const metrics = { textLength: 10, htmlLength: 20 };
    const executeJavaScript = vi.fn().mockResolvedValue(metrics);
    const result = await electronModule.waitForContent({ executeJavaScript } as any, '#app');

    expect(executeJavaScript).toHaveBeenCalled();
    expect(result).toEqual(metrics);
  });

  it('captureOfflineShell returns null when evaluation throws', async () => {
    const executeJavaScript = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await electronModule.captureOfflineShell({ executeJavaScript } as any, '#app');
    expect(result).toBeNull();
  });
});
