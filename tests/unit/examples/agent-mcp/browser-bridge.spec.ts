// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBrowserAgentBridge } from '../../../../examples/agent-mcp/browser-bridge.mjs';

const APP_URL = 'https://polkaswap.io/?polkaswap-agent=1#/swap';
const TARGET_LOCATION = {
  origin: 'https://polkaswap.io',
  pathname: '/',
  search: '?polkaswap-agent=1',
  hash: '#/swap',
};
const PROFILE_DIR = '/tmp/polkaswap-mcp-browser-test';

const persistentConfig = {
  appUrl: APP_URL,
  cdpUrl: null,
  headless: true,
  mode: 'persistent' as const,
  navigationTimeoutMs: 2_000,
  profileDir: PROFILE_DIR,
  readyTimeoutMs: 2_000,
  toolTimeoutMs: 2_000,
};

function createPage(url = 'about:blank') {
  let currentUrl = url;
  const page = {
    close: vi.fn(async () => undefined),
    evaluate: vi.fn(),
    goto: vi.fn(async (targetUrl: string) => {
      currentUrl = targetUrl;
    }),
    isClosed: vi.fn(() => false),
    setUrl: (targetUrl: string) => {
      currentUrl = targetUrl;
    },
    url: vi.fn(() => currentUrl),
    waitForFunction: vi.fn(async () => undefined),
  };
  return page;
}

function createContext(pages: ReturnType<typeof createPage>[] = []) {
  return {
    close: vi.fn(async () => undefined),
    newPage: vi.fn(),
    pages: vi.fn(() => pages),
  };
}

describe('local Playwright Polkaswap agent bridge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('launches a dedicated persistent context and forwards one method call', async () => {
    const page = createPage();
    page.evaluate.mockResolvedValueOnce({ locationMatches: true, version: 'v1' }).mockResolvedValueOnce({
      ok: true,
      value: { quoteId: 'quote-1' },
    });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const chromium = {
      launchPersistentContext: vi.fn(async () => context),
    };
    const bridge = createBrowserAgentBridge(persistentConfig, { chromium });
    const input = { amount: '1' };

    await expect(bridge.agent.quoteSwap(input)).resolves.toEqual({ quoteId: 'quote-1' });

    expect(chromium.launchPersistentContext).toHaveBeenCalledWith(PROFILE_DIR, {
      headless: true,
      viewport: { height: 1_000, width: 1_440 },
    });
    expect(page.goto).toHaveBeenCalledWith(APP_URL, {
      timeout: 2_000,
      waitUntil: 'domcontentloaded',
    });
    expect(page.waitForFunction).toHaveBeenCalledWith(expect.any(Function), undefined, { timeout: 2_000 });
    expect(page.evaluate.mock.calls[1][1]).toEqual({
      expectedLocation: TARGET_LOCATION,
      methodName: 'quoteSwap',
      methodInput: input,
      passInput: true,
    });

    await bridge.close();
    await bridge.close();
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it('does not pass a synthetic input to no-argument agent calls', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { version: 'v1' } });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    await bridge.agent.capabilities();

    expect(page.evaluate.mock.calls[1][1]).toEqual({
      expectedLocation: TARGET_LOCATION,
      methodName: 'capabilities',
      methodInput: undefined,
      passInput: false,
    });
  });

  it('does not surface raw in-page error messages or details', async () => {
    const page = createPage();
    page.evaluate.mockResolvedValueOnce({ locationMatches: true, version: 'v1' }).mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'WALLET_NOT_CONNECTED',
        message: 'seed phrase: raw browser secret',
        details: { authorization: 'private browser token' },
      },
    });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    const error = await bridge.agent.status().catch((caught) => caught);

    expect(error).toMatchObject({
      code: 'WALLET_NOT_CONNECTED',
      message: 'The Polkaswap browser agent request failed.',
    });
    expect(JSON.stringify(error)).not.toContain('raw browser secret');
    expect(JSON.stringify(error)).not.toContain('private browser token');
  });

  it('fails closed when navigation redirects away from the exact configured URL', async () => {
    const page = createPage();
    page.goto.mockImplementation(async () => {
      page.setUrl('https://redirected.example/?polkaswap-agent=1#/swap');
    });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    const error = await bridge.agent.status().catch((caught) => caught);

    expect(error).toMatchObject({
      code: 'UNTRUSTED_APP_LOCATION',
      message: 'The browser page is not at the configured Polkaswap application URL.',
    });
    expect(page.waitForFunction).not.toHaveBeenCalled();
    expect(page.evaluate).not.toHaveBeenCalled();
    expect(JSON.stringify(error)).not.toContain('redirected.example');
  });

  it('checks the exact origin, path, query, and hash before every invocation', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { ready: true } });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    await expect(bridge.agent.status()).resolves.toEqual({ ready: true });
    page.setUrl('https://polkaswap.io/?polkaswap-agent=1#/pool');
    const error = await bridge.agent.status().catch((caught) => caught);

    expect(error).toMatchObject({ code: 'UNTRUSTED_APP_LOCATION' });
    expect(page.evaluate).toHaveBeenCalledTimes(2);
  });

  it('rechecks the location inside the invocation evaluation', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: false, error: { code: 'UNTRUSTED_APP_LOCATION' } });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    const error = await bridge.agent.status().catch((caught) => caught);

    expect(error).toMatchObject({
      code: 'UNTRUSTED_APP_LOCATION',
      message: 'The Polkaswap browser agent request failed.',
    });
    expect(page.evaluate.mock.calls[1][1]).toMatchObject({ expectedLocation: TARGET_LOCATION });
  });

  it('does not reuse a page whose path, query, or hash differs', async () => {
    const wrongPage = createPage('https://polkaswap.io/?polkaswap-agent=1#/pool');
    const replacementPage = createPage();
    replacementPage.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { ready: true } });
    const context = createContext([wrongPage]);
    context.newPage.mockResolvedValue(replacementPage);
    const browser = { close: vi.fn(async () => undefined), contexts: vi.fn(() => [context]) };
    const bridge = createBrowserAgentBridge(
      { ...persistentConfig, cdpUrl: 'http://127.0.0.1:9222/', mode: 'cdp', profileDir: null },
      { chromium: { connectOverCDP: vi.fn(async () => browser) } }
    );

    await expect(bridge.agent.status()).resolves.toEqual({ ready: true });

    expect(wrongPage.evaluate).not.toHaveBeenCalled();
    expect(context.newPage).toHaveBeenCalledTimes(1);
    expect(replacementPage.goto).toHaveBeenCalledWith(APP_URL, expect.any(Object));
    await bridge.close();
  });

  it('relaunches once when a cached persistent page has closed', async () => {
    let firstPageClosed = false;
    const firstPage = createPage();
    firstPage.isClosed.mockImplementation(() => firstPageClosed);
    firstPage.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { node: 'first' } });
    const secondPage = createPage();
    secondPage.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { node: 'second' } });
    const firstContext = createContext();
    firstContext.newPage.mockResolvedValue(firstPage);
    const secondContext = createContext();
    secondContext.newPage.mockResolvedValue(secondPage);
    const chromium = {
      launchPersistentContext: vi.fn().mockResolvedValueOnce(firstContext).mockResolvedValueOnce(secondContext),
    };
    const bridge = createBrowserAgentBridge(persistentConfig, { chromium });

    await expect(bridge.agent.status()).resolves.toEqual({ node: 'first' });
    firstPageClosed = true;
    await expect(bridge.agent.status()).resolves.toEqual({ node: 'second' });

    expect(chromium.launchPersistentContext).toHaveBeenCalledTimes(2);
    expect(firstContext.close).toHaveBeenCalledTimes(1);
    expect(firstPage.evaluate).toHaveBeenCalledTimes(2);
    expect(secondPage.evaluate).toHaveBeenCalledTimes(2);
  });

  it('reattaches once after an evaluation disconnect without closing external CDP state', async () => {
    const firstPage = createPage(APP_URL);
    firstPage.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockRejectedValueOnce(
        new Error('page.evaluate: Target page, context or browser has been closed; browser transport secret')
      );
    const replacementPage = createPage();
    replacementPage.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { connected: true } });
    const context = createContext([firstPage]);
    context.newPage.mockResolvedValue(replacementPage);
    const firstBrowser = {
      close: vi.fn(async () => undefined),
      contexts: vi.fn(() => [context]),
    };
    const secondBrowser = {
      close: vi.fn(async () => undefined),
      contexts: vi.fn(() => [context]),
    };
    const chromium = {
      connectOverCDP: vi.fn().mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser),
    };
    const bridge = createBrowserAgentBridge(
      {
        ...persistentConfig,
        cdpUrl: 'http://127.0.0.1:9222/',
        mode: 'cdp',
        profileDir: null,
      },
      { chromium }
    );

    await expect(bridge.agent.status()).resolves.toEqual({ connected: true });

    expect(chromium.connectOverCDP).toHaveBeenCalledTimes(2);
    expect(firstPage.close).not.toHaveBeenCalled();
    expect(context.close).not.toHaveBeenCalled();
    expect(firstBrowser.close).toHaveBeenCalledTimes(1);
    expect(secondBrowser.close).not.toHaveBeenCalled();
    expect(replacementPage.goto).toHaveBeenCalledWith(APP_URL, expect.any(Object));

    await bridge.close();
    expect(replacementPage.close).toHaveBeenCalledTimes(1);
    expect(context.close).not.toHaveBeenCalled();
    expect(secondBrowser.close).toHaveBeenCalledTimes(1);
    expect(replacementPage.close.mock.invocationCallOrder[0]).toBeLessThan(
      secondBrowser.close.mock.invocationCallOrder[0]
    );
  });

  it('does not replay an ordinary evaluation failure', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockRejectedValueOnce(new Error('serialization failed with private diagnostic'));
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const chromium = { launchPersistentContext: vi.fn(async () => context) };
    const bridge = createBrowserAgentBridge(persistentConfig, { chromium });

    const error = await bridge.agent.status().catch((caught) => caught);

    expect(error).toMatchObject({
      code: 'BROWSER_EVALUATION_FAILED',
      message: 'The local browser could not complete the agent request.',
    });
    expect(chromium.launchPersistentContext).toHaveBeenCalledTimes(1);
    expect(page.evaluate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error)).not.toContain('private diagnostic');
  });

  it('disconnects CDP while preserving a healthy external context and unrelated pages', async () => {
    const unrelatedPage = createPage('https://example.com/unrelated');
    const page = createPage(APP_URL);
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: { ready: true } });
    const context = createContext([unrelatedPage, page]);
    const browser = {
      close: vi.fn(async () => undefined),
      contexts: vi.fn(() => [context]),
    };
    const chromium = { connectOverCDP: vi.fn(async () => browser) };
    const bridge = createBrowserAgentBridge(
      {
        ...persistentConfig,
        cdpUrl: 'ws://127.0.0.1:9222/devtools/browser/id',
        mode: 'cdp',
        profileDir: null,
      },
      { chromium }
    );

    await bridge.agent.ready({ requireNode: true });
    await bridge.close();

    expect(context.newPage).not.toHaveBeenCalled();
    expect(page.goto).not.toHaveBeenCalled();
    expect(page.close).not.toHaveBeenCalled();
    expect(unrelatedPage.close).not.toHaveBeenCalled();
    expect(context.close).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('owns and closes a CDP context only when the browser had none', async () => {
    const page = createPage();
    page.evaluate
      .mockResolvedValueOnce({ locationMatches: true, version: 'v1' })
      .mockResolvedValueOnce({ ok: true, value: {} });
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const browser = {
      close: vi.fn(async () => undefined),
      contexts: vi.fn(() => []),
      newContext: vi.fn(async () => context),
    };
    const bridge = createBrowserAgentBridge(
      {
        ...persistentConfig,
        cdpUrl: 'http://localhost:9222/',
        mode: 'cdp',
        profileDir: null,
      },
      { chromium: { connectOverCDP: vi.fn(async () => browser) } }
    );

    await bridge.agent.status();
    await bridge.close();

    expect(browser.newContext).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(context.close.mock.invocationCallOrder[0]).toBeLessThan(browser.close.mock.invocationCallOrder[0]);
  });

  it('leaves the MCP server as the only deadline around page evaluation', async () => {
    vi.useFakeTimers();
    let resolveEvaluation!: (value: unknown) => void;
    const evaluation = new Promise((resolve) => {
      resolveEvaluation = resolve;
    });
    const page = createPage();
    page.evaluate.mockResolvedValueOnce({ locationMatches: true, version: 'v1' }).mockReturnValueOnce(evaluation);
    const context = createContext();
    context.newPage.mockResolvedValue(page);
    const chromium = { launchPersistentContext: vi.fn(async () => context) };
    const bridge = createBrowserAgentBridge({ ...persistentConfig, toolTimeoutMs: 10 }, { chromium });
    let settled = false;

    const invocation = bridge.agent.status().finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(settled).toBe(false);
    expect(chromium.launchPersistentContext).toHaveBeenCalledTimes(1);
    expect(page.evaluate).toHaveBeenCalledTimes(2);

    resolveEvaluation({ ok: true, value: { ready: true } });
    await expect(invocation).resolves.toEqual({ ready: true });
  });

  it('rejects invalid proxy methods and multiple arguments locally', async () => {
    const context = createContext();
    const bridge = createBrowserAgentBridge(persistentConfig, {
      chromium: { launchPersistentContext: vi.fn(async () => context) },
    });

    await expect(bridge.invokeAgentMethod('__proto__', {})).rejects.toMatchObject({
      code: 'INVALID_AGENT_METHOD',
    });
    expect(() => bridge.agent.status({}, {})).toThrow(/at most one input object/);
  });
});
