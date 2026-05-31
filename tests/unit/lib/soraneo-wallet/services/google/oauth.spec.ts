import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const waitForDocumentReadyMock = vi.hoisted(() => vi.fn());
const scriptLoadMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  waitForDocumentReady: waitForDocumentReadyMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util/scriptLoader', () => ({
  ScriptLoader: {
    load: scriptLoadMock,
  },
}));

import { GoogleOauth } from '@/lib/soraneo-wallet/src/services/google/oauth';

describe('GoogleOauth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    waitForDocumentReadyMock.mockResolvedValue(undefined);
    scriptLoadMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('requires options and a client id before initialization', async () => {
    const oauth = new GoogleOauth();

    expect(oauth.hasKey).toBe(false);
    await expect(oauth.init()).rejects.toThrow('[GoogleOauth]: Options should be set before inintialization');

    oauth.setOptions({ clientId: '', scope: 'scope' });

    await expect(oauth.init()).rejects.toThrow('[GoogleOauth]: Client ID is required');
  });

  it('loads the GSI client and initializes the token client once', async () => {
    const initTokenClientMock = vi.fn().mockReturnValue({
      requestAccessToken: vi.fn(),
    });

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: initTokenClientMock,
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });

    expect(oauth.hasKey).toBe(true);

    await oauth.init();
    await oauth.init();

    expect(scriptLoadMock).toHaveBeenCalledTimes(1);
    expect(scriptLoadMock).toHaveBeenCalledWith('https://accounts.google.com/gsi/client');
    expect(waitForDocumentReadyMock).toHaveBeenCalledTimes(1);
    expect(initTokenClientMock).toHaveBeenCalledTimes(1);
    expect(initTokenClientMock).toHaveBeenCalledWith({
      client_id: 'client-id',
      scope: 'drive-scope',
      callback: expect.any(Function),
      error_callback: expect.any(Function),
    });
    expect(oauth.ready).toBe(true);
  });

  it('requests an access token and stores an absolute expiry on success', async () => {
    const requestAccessTokenMock = vi.fn();
    let config: Record<string, Fn | string> = {};
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((input) => {
            config = input;
            return {
              requestAccessToken: requestAccessTokenMock.mockImplementation(() => {
                (config.callback as Fn)({
                  access_token: 'token',
                  expires_in: '60',
                });
              }),
            };
          }),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();
    await oauth.getToken();

    expect(requestAccessTokenMock).toHaveBeenCalledWith({ prompt: 'select_account' });
    expect((oauth as any).token).toEqual({
      access_token: 'token',
      expires_in: '1700000060000',
    });
    expect((oauth as any).isAuthProcess).toBe(false);

    nowSpy.mockRestore();
  });

  it('refreshes missing or nearly expired tokens but keeps valid tokens', async () => {
    const oauth = new GoogleOauth();
    const getTokenSpy = vi.spyOn(oauth, 'getToken').mockResolvedValue(undefined);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await oauth.checkToken();
    expect(getTokenSpy).toHaveBeenCalledTimes(1);

    (oauth as any).token = { expires_in: '1700000100000' };
    await oauth.checkToken();
    expect(getTokenSpy).toHaveBeenCalledTimes(2);

    (oauth as any).token = { expires_in: '1700000600000' };
    await oauth.checkToken();
    expect(getTokenSpy).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('rejects token requests on OAuth errors and clears auth state', async () => {
    const error = new Error('denied');
    let config: Record<string, Fn> = {};

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((input) => {
            config = input;
            return {
              requestAccessToken: vi.fn(() => {
                (config.error_callback as Fn)(error);
              }),
            };
          }),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();

    await expect(oauth.getToken()).rejects.toBe(error);
    expect((oauth as any).token).toBeNull();
    expect((oauth as any).isAuthProcess).toBe(false);
  });

  it('rejects token callback errors and clears auth state', async () => {
    let config: Record<string, Fn> = {};

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((input) => {
            config = input;
            return {
              requestAccessToken: vi.fn(() => {
                (config.callback as Fn)({
                  error: 'access_denied',
                  error_description: 'User denied access',
                });
              }),
            };
          }),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();

    await expect(oauth.getToken()).rejects.toThrow('access_denied: User denied access');
    expect((oauth as any).token).toBeNull();
    expect((oauth as any).isAuthProcess).toBe(false);
  });

  it('reuses the in-flight token prompt while auth is already running', async () => {
    const requestAccessTokenMock = vi.fn();
    let config: Record<string, Fn> = {};

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((input) => {
            config = input;
            return {
              requestAccessToken: requestAccessTokenMock,
            };
          }),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();

    const firstPrompt = oauth.getToken();
    const secondPrompt = oauth.getToken();

    await Promise.resolve();

    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
    expect((oauth as any).isAuthProcess).toBe(true);

    (config.callback as Fn)({
      access_token: 'token',
      expires_in: '60',
    });

    await expect(firstPrompt).resolves.toBeUndefined();
    await expect(secondPrompt).resolves.toBeUndefined();
    expect((oauth as any).isAuthProcess).toBe(false);
  });

  it('times out unresolved Google prompts and clears auth state', async () => {
    vi.useFakeTimers();

    const requestAccessTokenMock = vi.fn();

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: requestAccessTokenMock,
          })),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();

    const tokenRequest = oauth.getToken();

    await Promise.resolve();

    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
    expect((oauth as any).isAuthProcess).toBe(true);

    const rejection = expect(tokenRequest).rejects.toThrow('Google OAuth token request timed out');

    await vi.advanceTimersByTimeAsync(90_000);

    await rejection;
    expect((oauth as any).token).toBeNull();
    expect((oauth as any).isAuthProcess).toBe(false);
    expect((oauth as any).authPromise).toBeNull();
  });

  it('clears auth state when the token prompt throws synchronously', async () => {
    const requestError = new Error('popup failed');

    vi.stubGlobal('google', {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => ({
            requestAccessToken: vi.fn(() => {
              throw requestError;
            }),
          })),
        },
      },
    });

    const oauth = new GoogleOauth();
    oauth.setOptions({ clientId: 'client-id', scope: 'drive-scope' });
    await oauth.init();

    await expect(oauth.getToken()).rejects.toBe(requestError);
    expect((oauth as any).token).toBeNull();
    expect((oauth as any).isAuthProcess).toBe(false);
    expect((oauth as any).authPromise).toBeNull();
  });
});
