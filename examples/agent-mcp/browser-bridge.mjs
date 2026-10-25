const AGENT_VERSION = 'v1';
const PLAYWRIGHT_DISCONNECT_PATTERN =
  /(?:browser (?:has )?disconnected|browser has been closed|connection closed|target (?:page, context or browser )?has been closed|target closed|target crashed)/i;

/** Error returned by the local browser adapter without leaking browser internals. */
export class BrowserBridgeError extends Error {
  /**
   * @param {string} code Stable machine-readable code.
   * @param {string} message Human-readable error.
   * @param {unknown} [details] Optional JSON-safe diagnostic details.
   */
  constructor(code, message, details) {
    super(message);
    this.name = 'BrowserBridgeError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/**
 * Create a lazy Playwright adapter for `window.PolkaswapAgent`.
 *
 * The adapter launches a dedicated persistent Chromium profile, or attaches to
 * an explicitly configured loopback CDP browser. Its `agent` proxy intentionally
 * exposes only method invocation; tool discovery remains owned by the shared MCP
 * catalogue.
 *
 * @param {{
 *   appUrl: string,
 *   cdpUrl: string | null,
 *   headless: boolean,
 *   mode: 'persistent' | 'cdp',
 *   navigationTimeoutMs: number,
 *   profileDir: string | null,
 *   readyTimeoutMs: number,
 *   toolTimeoutMs: number,
 * }} config Validated bridge configuration.
 * @param {{chromium: object}} dependencies Injectable Playwright dependency.
 * @returns {PolkaswapBrowserBridge}
 */
export function createBrowserAgentBridge(config, { chromium }) {
  if (!chromium) throw new TypeError('A Playwright chromium implementation is required.');
  return new PolkaswapBrowserBridge(config, chromium);
}

/** Lazy, serialized browser lifecycle used by the stdio MCP process. */
export class PolkaswapBrowserBridge {
  #browser = null;
  #chromium;
  #closed = false;
  #config;
  #context = null;
  #ownsContext = false;
  #ownsPage = false;
  #page = null;
  #startPromise = null;
  #targetLocation;
  #unusablePages = new WeakSet();

  /**
   * @param {object} config Validated configuration from `parseBridgeConfig`.
   * @param {object} chromium Playwright Chromium browser type.
   */
  constructor(config, chromium) {
    this.#config = config;
    this.#chromium = chromium;
    this.#targetLocation = normalizedLocation(config.appUrl);
    this.agent = createAgentProxy(this);
  }

  /**
   * A method-only proxy compatible with `invokePolkaswapMcpTool`.
   *
   * @type {Record<string, (input?: unknown) => Promise<unknown>>}
   */
  agent;

  /**
   * Start or attach to Chromium and wait for Polkaswap Agent v1.
   *
   * Concurrent callers share one startup promise.
   *
   * @returns {Promise<object>} Ready Playwright page.
   */
  async start() {
    if (this.#closed) {
      throw new BrowserBridgeError('BRIDGE_CLOSED', 'The Polkaswap browser bridge is closed.');
    }
    if (!this.#startPromise) this.#startPromise = this.#startBrowser();

    try {
      return await this.#startPromise;
    } catch (error) {
      this.#startPromise = null;
      await this.#closeOwnedResources();
      throw normalizeBrowserError(error, 'BROWSER_START_FAILED', 'Unable to start the Polkaswap browser bridge.');
    }
  }

  /**
   * Invoke exactly one public method on the in-page agent.
   *
   * @param {string} method Method name selected by the shared catalogue.
   * @param {unknown} input Optional method argument.
   * @param {boolean} [hasInput=true] Whether to pass the argument at all.
   * @returns {Promise<unknown>} Serializable method result.
   */
  async invokeAgentMethod(method, input, hasInput = true) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(method)) {
      throw new BrowserBridgeError('INVALID_AGENT_METHOD', 'The catalogue selected an invalid agent method.');
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const page = await this.start();
      if (page.isClosed?.() === true) {
        if (attempt === 0) {
          await this.#resetForReconnect(page);
          continue;
        }
        throw new BrowserBridgeError('BROWSER_DISCONNECTED', 'The local browser page is unavailable.');
      }

      assertPageAtTarget(page, this.#targetLocation);
      let response;
      try {
        response = await page.evaluate(
          async ({ expectedLocation, methodName, methodInput, passInput }) => {
            const locationMatches =
              window.location.origin === expectedLocation.origin &&
              window.location.pathname === expectedLocation.pathname &&
              window.location.search === expectedLocation.search &&
              window.location.hash === expectedLocation.hash;
            if (!locationMatches) {
              return { ok: false, error: { code: 'UNTRUSTED_APP_LOCATION' } };
            }

            const agent = window.PolkaswapAgent;
            const candidate = agent?.[methodName];
            if (typeof candidate !== 'function') {
              return {
                ok: false,
                error: {
                  code: 'AGENT_METHOD_UNAVAILABLE',
                  message: `PolkaswapAgent method is unavailable: ${methodName}`,
                },
              };
            }

            try {
              const value = passInput ? await candidate.call(agent, methodInput) : await candidate.call(agent);
              return { ok: true, value };
            } catch (error) {
              return {
                ok: false,
                error: {
                  code: typeof error?.code === 'string' ? error.code : 'AGENT_INVOCATION_FAILED',
                },
              };
            }
          },
          {
            expectedLocation: this.#targetLocation,
            methodName: method,
            methodInput: input,
            passInput: hasInput,
          }
        );
      } catch (error) {
        const disconnected = isReconnectableBrowserFailure(error, page, this.#browser);
        if (attempt === 0 && disconnected) {
          await this.#resetForReconnect(page);
          continue;
        }
        throw normalizeBrowserError(
          error,
          disconnected ? 'BROWSER_DISCONNECTED' : 'BROWSER_EVALUATION_FAILED',
          disconnected
            ? 'The local browser connection was interrupted.'
            : 'The local browser could not complete the agent request.'
        );
      }

      if (!response?.ok) {
        const error = response?.error;
        throw new BrowserBridgeError(
          typeof error?.code === 'string' ? error.code : 'AGENT_INVOCATION_FAILED',
          'The Polkaswap browser agent request failed.'
        );
      }
      return response.value;
    }

    throw new BrowserBridgeError('BROWSER_DISCONNECTED', 'The local browser connection was interrupted.');
  }

  /**
   * Forget a stale page/connection before one bounded restart attempt.
   *
   * In CDP mode an externally owned page is only excluded from rediscovery;
   * it is never closed. Persistent contexts and pages created by this bridge
   * are released through the normal ownership-aware cleanup path.
   *
   * @param {object} page Page whose transport failed.
   * @returns {Promise<void>}
   */
  async #resetForReconnect(page) {
    if (page && typeof page === 'object') this.#unusablePages.add(page);
    this.#startPromise = null;
    await this.#closeOwnedResources();
  }

  /**
   * Release resources owned by this bridge.
   *
   * CDP mode closes its Playwright connection after owned page/context cleanup;
   * with Playwright's CDP transport this disconnects automation without
   * terminating the externally launched Chromium process. Existing browser
   * contexts and pages are not closed. A page or context created solely by this
   * adapter is still cleaned up.
   *
   * @returns {Promise<void>}
   */
  async close() {
    if (this.#closed) return;
    this.#closed = true;

    if (this.#startPromise) {
      try {
        await this.#startPromise;
      } catch {
        // Startup cleanup is handled by start().
      }
    }
    await this.#closeOwnedResources();
  }

  /**
   * Perform the mode-specific Playwright connection and page discovery.
   *
   * @returns {Promise<object>}
   */
  async #startBrowser() {
    if (this.#config.mode === 'cdp') {
      this.#browser = await this.#chromium.connectOverCDP(this.#config.cdpUrl, {
        timeout: this.#config.navigationTimeoutMs,
      });
      const contexts = this.#browser.contexts();
      this.#context = contexts[0] ?? (await this.#browser.newContext());
      this.#ownsContext = contexts.length === 0;
    } else {
      this.#context = await this.#chromium.launchPersistentContext(this.#config.profileDir, {
        headless: this.#config.headless,
        viewport: { height: 1_000, width: 1_440 },
      });
      this.#browser = this.#context.browser?.() ?? null;
      this.#ownsContext = true;
    }

    const existingPage = this.#context
      .pages()
      .find(
        (candidate) =>
          !this.#unusablePages.has(candidate) &&
          candidate.isClosed?.() !== true &&
          isExactLocation(candidate.url(), this.#targetLocation)
      );
    this.#page = existingPage ?? (await this.#context.newPage());
    this.#ownsPage = !existingPage;

    if (!existingPage) {
      await this.#page.goto(this.#config.appUrl, {
        timeout: this.#config.navigationTimeoutMs,
        waitUntil: 'domcontentloaded',
      });
    }

    assertPageAtTarget(this.#page, this.#targetLocation);
    await this.#page.waitForFunction(() => Boolean(window.PolkaswapAgent), undefined, {
      timeout: this.#config.readyTimeoutMs,
    });
    assertPageAtTarget(this.#page, this.#targetLocation);
    const capabilityCheck = await this.#page.evaluate(
      ({ expectedLocation }) => {
        const locationMatches =
          window.location.origin === expectedLocation.origin &&
          window.location.pathname === expectedLocation.pathname &&
          window.location.search === expectedLocation.search &&
          window.location.hash === expectedLocation.hash;
        return {
          locationMatches,
          version: locationMatches ? window.PolkaswapAgent?.capabilities?.().version : undefined,
        };
      },
      { expectedLocation: this.#targetLocation }
    );
    if (!capabilityCheck?.locationMatches) {
      throw untrustedLocationError();
    }
    if (capabilityCheck.version !== AGENT_VERSION) {
      throw new BrowserBridgeError('UNSUPPORTED_AGENT_VERSION', `PolkaswapAgent ${AGENT_VERSION} is required.`);
    }

    return this.#page;
  }

  /**
   * Close only the resources this adapter owns.
   *
   * @returns {Promise<void>}
   */
  async #closeOwnedResources() {
    const browser = this.#browser;
    const page = this.#page;
    const context = this.#context;
    const shouldClosePage = this.#config.mode === 'cdp' && this.#ownsPage && !this.#ownsContext;
    const shouldCloseContext = this.#ownsContext;
    const shouldDisconnectBrowser = this.#config.mode === 'cdp' && browser;

    this.#browser = null;
    this.#page = null;
    this.#context = null;
    this.#ownsPage = false;
    this.#ownsContext = false;

    if (shouldClosePage && page?.isClosed?.() !== true) {
      await page.close().catch(() => undefined);
    }
    if (shouldCloseContext && context) {
      await context.close().catch(() => undefined);
    }
    if (shouldDisconnectBrowser) {
      await browser.close().catch(() => undefined);
    }
  }
}

/**
 * Build a Proxy without exposing arbitrary object properties as agent data.
 *
 * @param {PolkaswapBrowserBridge} bridge Browser bridge instance.
 * @returns {Record<string, Function>}
 */
function createAgentProxy(bridge) {
  return new Proxy(Object.create(null), {
    get(_target, property) {
      if (property === 'then' || typeof property !== 'string') return undefined;
      return (...args) => {
        if (args.length > 1) {
          throw new BrowserBridgeError('INVALID_AGENT_ARGUMENTS', 'Agent methods accept at most one input object.');
        }
        return bridge.invokeAgentMethod(property, args[0], args.length === 1);
      };
    },
  });
}

/**
 * Normalize URL components used by both Playwright and the in-page guard.
 *
 * @param {string} rawUrl Validated absolute URL.
 * @returns {{origin: string, pathname: string, search: string, hash: string}}
 */
function normalizedLocation(rawUrl) {
  const url = new URL(rawUrl);
  return Object.freeze({
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  });
}

/** Return whether a page URL exactly matches all configured URL components. */
function isExactLocation(candidateRaw, expected) {
  try {
    const candidate = normalizedLocation(candidateRaw);
    return (
      candidate.origin === expected.origin &&
      candidate.pathname === expected.pathname &&
      candidate.search === expected.search &&
      candidate.hash === expected.hash
    );
  } catch {
    return false;
  }
}

/** Fail closed when the browser document is not the configured application. */
function assertPageAtTarget(page, expected) {
  if (!isExactLocation(page.url(), expected)) throw untrustedLocationError();
}

/** Construct a fixed error without reflecting the unexpected URL. */
function untrustedLocationError() {
  return new BrowserBridgeError(
    'UNTRUSTED_APP_LOCATION',
    'The browser page is not at the configured Polkaswap application URL.'
  );
}

/**
 * Identify a Playwright transport failure without retrying ordinary evaluation
 * errors that may have occurred after the in-page method started.
 *
 * @param {unknown} error Evaluation failure.
 * @param {object} page Page used by the failed call.
 * @param {object | null} browser Connected browser, when Playwright exposes it.
 * @returns {boolean} Whether one reconnect attempt is safe and useful.
 */
function isReconnectableBrowserFailure(error, page, browser) {
  if (page?.isClosed?.() === true) return true;
  if (typeof browser?.isConnected === 'function' && browser.isConnected() === false) return true;
  return typeof error?.message === 'string' && PLAYWRIGHT_DISCONNECT_PATTERN.test(error.message);
}

/**
 * Convert an unknown Playwright/startup failure to a stable public bridge error.
 *
 * @param {unknown} error Caught value.
 * @param {string} fallbackCode Stable fallback code.
 * @param {string} fallbackMessage Stable fallback message.
 * @returns {BrowserBridgeError}
 */
function normalizeBrowserError(error, fallbackCode, fallbackMessage) {
  if (error instanceof BrowserBridgeError) return error;
  return new BrowserBridgeError(fallbackCode, fallbackMessage);
}
