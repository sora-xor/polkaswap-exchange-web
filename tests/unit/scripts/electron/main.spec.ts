import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BrowserWindowConstructorOptions } from 'electron';

type NavigationEvent = { preventDefault: () => void; url: string; isMainFrame: boolean };
type WindowOpenHandler = (details: { url: string }) => { action: string };

const mocks = vi.hoisted(() => {
  const navigation = new Map<string, (event: NavigationEvent) => void>();
  const window = {
    on: vi.fn(),
    show: vi.fn(),
    loadURL: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
    loadFile: vi.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined),
    webContents: {
      setWindowOpenHandler: vi.fn<(handler: WindowOpenHandler) => void>(),
      on: vi.fn((event: string, handler: (event: NavigationEvent) => void) => {
        navigation.set(event, handler);
      }),
    },
  };
  return {
    navigation,
    window,
    BrowserWindow: vi.fn(function (_options: BrowserWindowConstructorOptions) {
      return window;
    }),
    openExternal: vi.fn(async () => undefined),
    app: { whenReady: vi.fn(async () => undefined), on: vi.fn(), quit: vi.fn() },
  };
});

vi.mock('electron', () => ({
  app: mocks.app,
  BrowserWindow: mocks.BrowserWindow,
  shell: { openExternal: mocks.openExternal },
}));
vi.mock('@electron-toolkit/utils', () => ({
  electronApp: { setAppUserModelId: vi.fn() },
  optimizer: { watchWindowShortcuts: vi.fn() },
  is: { dev: false },
}));

beforeAll(async () => {
  await import('../../../../electron/main/index');
});

describe('Electron main process security', () => {
  it('starts the application without renderer Node access or a preload bridge', () => {
    const options = mocks.BrowserWindow.mock.calls[0]![0];
    expect(options).toMatchObject({
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    expect(options.webPreferences).not.toHaveProperty('preload');
    expect(mocks.window.loadFile).toHaveBeenCalledOnce();
    expect(mocks.window.loadFile.mock.calls[0][0]).toMatch(/[/\\]renderer[/\\]index\.html$/);
    expect(mocks.window.loadURL).not.toHaveBeenCalled();
  });

  it('denies child windows and never sends unsafe URLs to the OS', async () => {
    const handler = mocks.window.webContents.setWindowOpenHandler.mock.calls[0][0];
    expect(handler({ url: 'file:///tmp/untrusted.app' })).toEqual({ action: 'deny' });
    expect(mocks.openExternal).not.toHaveBeenCalled();
    expect(handler({ url: 'https://polkaswap.io/' })).toEqual({ action: 'deny' });
    expect(mocks.openExternal).toHaveBeenCalledWith('https://polkaswap.io/');
    mocks.openExternal.mockRejectedValueOnce(new Error('No browser configured'));
    expect(handler({ url: 'https://polkaswap.io/' })).toEqual({ action: 'deny' });
    await Promise.resolve();
  });

  it.each(['will-navigate', 'will-redirect'])('blocks document replacement through %s', (eventName) => {
    const event = { preventDefault: vi.fn(), url: 'https://evil.example/', isMainFrame: true };
    mocks.navigation.get(eventName)?.(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it('preserves redirects within embedded payment and wallet frames', () => {
    const event = { preventDefault: vi.fn(), url: 'https://secure.walletconnect.org/', isMainFrame: false };
    mocks.navigation.get('will-redirect')?.(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
