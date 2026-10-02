/**
 * Registers the shared Polkaswap MCP catalogue on the top-level playground
 * page and forwards calls to the same-origin application iframe.
 *
 * The browser does not discover WebMCP tools registered inside iframes. This
 * parent adapter exposes only the committed public read-only allowlist and
 * never connects a wallet, prepares an executable intent, signs, submits,
 * reads account state, transfers, or mutates liquidity/state.
 */
(function installPlaygroundWebMcp(global) {
  'use strict';

  const TOOL_CATALOGUE_PATH = './.well-known/polkaswap-mcp-tools.json';
  const TOOL_CATALOGUE_LOAD_ATTEMPTS = 3;
  const TOOL_CATALOGUE_RETRY_DELAY_MS = 250;
  const AGENT_READY_EVENT = 'polkaswap-agent-ready';
  const AGENT_FAILURE_EVENT = 'polkaswap-agent-install-failed';
  const AGENT_READY_TIMEOUT_MS = 30_000;
  const TOOL_METHODS = Object.freeze({
    polkaswap_capabilities: Object.freeze({
      method: 'capabilities',
      passInput: false,
      projectResult: projectPublicCapabilities,
    }),
    polkaswap_status: Object.freeze({ method: 'status', passInput: false, projectResult: projectPublicStatus }),
    polkaswap_ready: Object.freeze({
      method: 'ready',
      passInput: true,
      mapInput: (input) => ({ ...input, requireWallet: false }),
      projectResult: projectPublicStatus,
    }),
    polkaswap_assets: Object.freeze({
      method: 'assets',
      passInput: true,
      mapInput: (input) => ({ ...input, includeBalances: false }),
      projectResult: redactAccountData,
    }),
    polkaswap_resolve_asset: Object.freeze({
      method: 'resolveAsset',
      passInput: true,
      mapInput: (input) => ({ ...input, includeBalance: false }),
      projectResult: redactAccountData,
    }),
    polkaswap_common_assets: Object.freeze({
      method: 'commonAssets',
      passInput: true,
      mapInput: (input) => ({ ...input, includeBalances: false }),
      projectResult: redactAccountData,
    }),
    polkaswap_quote_swap: Object.freeze({
      method: 'quoteSwap',
      passInput: true,
      projectResult: redactAccountData,
    }),
    polkaswap_plan_swap: Object.freeze({
      method: 'planSwap',
      passInput: true,
      projectResult: projectPublicSwapPlan,
    }),
    polkaswap_pool_info: Object.freeze({
      method: 'poolInfo',
      passInput: true,
      projectResult: redactAccountData,
    }),
  });
  const PUBLIC_CAPABILITIES = new Set([
    'status',
    'asset-discovery',
    'asset-resolution',
    'swap-quote',
    'swap-plan',
    'pool-info',
  ]);
  const ACCOUNT_DATA_KEYS = new Set([
    'accountsCount',
    'available',
    'availableCodec',
    'balance',
    'clientOrderId',
    'envelope',
    'history',
    'idempotency',
    'intentId',
    'requiredBalances',
    'signer',
    'transaction',
    'wallet',
  ]);
  const SAFE_AGENT_ERROR_CODES = new Set([
    'AGENT_API_UNAVAILABLE',
    'ASSET_AMBIGUOUS',
    'ASSET_NOT_FOUND',
    'INVALID_AMOUNT',
    'INVALID_ASSET_REF',
    'INVALID_DEX_ID',
    'INVALID_LIQUIDITY_SOURCE',
    'INVALID_POOL_PAIR',
    'INVALID_PERCENT',
    'INVALID_SLIPPAGE',
    'INVALID_SWAP_SIDE',
    'INVALID_TRANSACTION_ID',
    'INVALID_ARGUMENT',
    'MCP_INVOCATION_CANCELLED',
    'MCP_RESULT_INVALID',
    'NETWORK_CONTEXT_UNAVAILABLE',
    'NODE_NOT_READY',
    'PATH_UNAVAILABLE',
    'POOL_UNAVAILABLE',
    'QUOTE_TIMEOUT',
    'WALLET_NOT_CONNECTED',
  ]);
  const registrations = new WeakMap();

  /** Internal sentinel used without reflecting rejected input values. */
  class SchemaValidationError extends Error {}

  /** Returns the embedded same-origin app frame or fails closed. */
  function getAppFrame(targetDocument) {
    const frame = targetDocument.getElementById('app-frame');
    if (!frame || frame.tagName !== 'IFRAME') {
      throw createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap application frame is unavailable.');
    }

    const frameUrl = new URL(frame.src, global.location.href);
    if (frameUrl.origin !== global.location.origin) {
      throw createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap application frame is not same-origin.');
    }
    return frame;
  }

  /** Waits for the iframe-owned PolkaswapAgent without exposing a command channel. */
  async function getFrameAgent(targetDocument, signal) {
    const frame = getAppFrame(targetDocument);
    const appWindow = frame.contentWindow;
    if (!appWindow) {
      throw createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap application frame is unavailable.');
    }
    if (signal?.aborted) throw createCancellationError();
    if (appWindow.PolkaswapAgent) return appWindow.PolkaswapAgent;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        global.clearTimeout(timeout);
        appWindow.removeEventListener(AGENT_READY_EVENT, onReady);
        appWindow.removeEventListener(AGENT_FAILURE_EVENT, onFailure);
        signal?.removeEventListener('abort', onAbort);
      };
      const settle = (callback, value) => {
        cleanup();
        callback(value);
      };
      const timeout = global.setTimeout(
        () => settle(reject, createSafeError('AGENT_API_UNAVAILABLE', 'Timed out waiting for the Polkaswap agent.')),
        AGENT_READY_TIMEOUT_MS
      );

      function onReady(event) {
        const api = event && event.detail && event.detail.api;
        if (!api || typeof api !== 'object') {
          settle(reject, createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap agent is unavailable.'));
          return;
        }
        settle(resolve, api);
      }

      function onAbort() {
        settle(reject, createCancellationError());
      }

      function onFailure() {
        settle(reject, createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap agent could not be installed.'));
      }

      appWindow.addEventListener(AGENT_READY_EVENT, onReady);
      appWindow.addEventListener(AGENT_FAILURE_EVENT, onFailure);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /** Fetches and validates the static mirror of the shared MCP catalogue. */
  async function loadToolCatalogue(signal) {
    const url = new URL(TOOL_CATALOGUE_PATH, global.location.href);
    let lastError;

    for (let attempt = 1; attempt <= TOOL_CATALOGUE_LOAD_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) throw createCancellationError();
      try {
        const response = await global.fetch(url, { credentials: 'same-origin', signal });
        if (!response.ok) throw new Error('Unable to load the Polkaswap MCP tool catalogue.');

        const tools = await response.json();
        if (!Array.isArray(tools) || tools.length !== Object.keys(TOOL_METHODS).length) {
          throw new Error('The Polkaswap MCP tool catalogue is incomplete.');
        }

        const names = new Set();
        for (const tool of tools) {
          if (
            !tool ||
            typeof tool.name !== 'string' ||
            !Object.hasOwn(TOOL_METHODS, tool.name) ||
            names.has(tool.name) ||
            typeof tool.description !== 'string' ||
            !tool.inputSchema ||
            typeof tool.inputSchema !== 'object' ||
            Array.isArray(tool.inputSchema) ||
            tool.annotations?.readOnlyHint !== true
          ) {
            throw new Error('The Polkaswap MCP tool catalogue contains an unsafe definition.');
          }
          names.add(tool.name);
        }
        return tools;
      } catch (error) {
        if (signal?.aborted) throw createCancellationError();
        lastError = error;
      }

      if (attempt < TOOL_CATALOGUE_LOAD_ATTEMPTS) {
        await waitForRetry(TOOL_CATALOGUE_RETRY_DELAY_MS, signal);
      }
    }

    throw lastError ?? new Error('Unable to load the Polkaswap MCP tool catalogue.');
  }

  /** Waits between bounded catalogue attempts and responds to cleanup. */
  function waitForRetry(delayMs, signal) {
    if (signal?.aborted) return Promise.reject(createCancellationError());

    return new Promise((resolve, reject) => {
      const timeout = global.setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, delayMs);
      function onAbort() {
        global.clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
        reject(createCancellationError());
      }
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /** Creates an Error whose enumerable surface is safe for an agent result. */
  function createSafeError(code, message) {
    const error = new Error(message);
    error.name = 'PolkaswapWebMcpInvocationError';
    Object.defineProperty(error, 'code', { enumerable: true, value: code });
    return error;
  }

  /** Creates the fixed cancellation error used by all abort paths. */
  function createCancellationError() {
    return createSafeError('MCP_INVOCATION_CANCELLED', 'The Polkaswap tool invocation was cancelled.');
  }

  /** Reads an error code defensively because provider objects may use throwing getters. */
  function getSafeErrorCode(error) {
    try {
      const code = error?.code;
      return SAFE_AGENT_ERROR_CODES.has(code) ? code : undefined;
    } catch {
      return undefined;
    }
  }

  /** Converts page/provider failures to a bounded error without details or stacks. */
  function normalizeInvocationError(error) {
    const code = getSafeErrorCode(error) ?? 'MCP_INVOCATION_FAILED';
    if (code === 'MCP_INVOCATION_CANCELLED') return createCancellationError();
    if (code === 'INVALID_ARGUMENT') {
      return createSafeError('INVALID_ARGUMENT', 'The Polkaswap tool input is invalid.');
    }
    const message =
      code === 'MCP_INVOCATION_FAILED'
        ? 'The Polkaswap tool invocation failed.'
        : `The Polkaswap agent rejected the request (${code}).`;
    return createSafeError(code, message);
  }

  /** Returns whether a value is a JSON-style object. */
  function isPlainRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  /** Removes fields that may contain wallet, balance, intent, or history data. */
  function redactAccountData(value) {
    if (Array.isArray(value)) return value.map(redactAccountData);
    if (!isPlainRecord(value)) return value;

    const result = Object.create(null);
    for (const [key, entry] of Object.entries(value)) {
      if (!ACCOUNT_DATA_KEYS.has(key)) result[key] = redactAccountData(entry);
    }
    return result;
  }

  /** Projects the full page status to public node/runtime readiness only. */
  function projectPublicStatus(value) {
    if (!isPlainRecord(value)) return {};
    const node = isPlainRecord(value.node) ? value.node : {};
    const agent = isPlainRecord(value.agent) ? value.agent : {};
    const settings = isPlainRecord(value.settings) ? value.settings : {};

    return {
      ...(typeof value.version === 'string' ? { version: value.version } : {}),
      agent: {
        ...(typeof agent.mode === 'boolean' ? { mode: agent.mode } : {}),
        ...(typeof agent.queryParam === 'string' ? { queryParam: agent.queryParam } : {}),
      },
      node: {
        ...(typeof node.connected === 'boolean' ? { connected: node.connected } : {}),
        ...(Number.isSafeInteger(node.blockNumber) ? { blockNumber: node.blockNumber } : {}),
        ...(typeof node.genesisHash === 'string' ? { genesisHash: node.genesisHash } : {}),
        ...(Number.isSafeInteger(node.runtimeSpecVersion) ? { runtimeSpecVersion: node.runtimeSpecVersion } : {}),
      },
      settings: {
        ...(typeof settings.slippageTolerance === 'string' ? { slippageTolerance: settings.slippageTolerance } : {}),
      },
    };
  }

  /** Restricts capability discovery to what this public adapter can invoke. */
  function projectPublicCapabilities(value) {
    if (!isPlainRecord(value)) return {};
    const publicMethods = new Set(Object.values(TOOL_METHODS).map(({ method }) => method));
    const status = projectPublicStatus(value.status);
    const projected = redactAccountData(value);

    return {
      ...projected,
      methods: Array.isArray(value.methods) ? value.methods.filter((method) => publicMethods.has(method)) : [],
      capabilities: Array.isArray(value.capabilities)
        ? value.capabilities.filter((capability) => PUBLIC_CAPABILITIES.has(capability))
        : [],
      status,
    };
  }

  /** Keeps unsigned planning public while rejecting any executable result. */
  function projectPublicSwapPlan(value) {
    if (
      !isPlainRecord(value) ||
      value.mode !== 'unsigned' ||
      value.canExecute !== false ||
      value.requiresWallet !== false
    ) {
      throw createSafeError('MCP_RESULT_INVALID', 'The Polkaswap unsigned plan is invalid.');
    }
    const network = isPlainRecord(value.network) ? value.network : {};
    const preview = isPlainRecord(value.preview) ? value.preview : {};
    return redactAccountData({
      mode: value.mode,
      canExecute: false,
      requiresWallet: false,
      quote: value.quote,
      preview: {
        operation: preview.operation,
        sdkCall: preview.sdkCall,
        stateChanging: preview.stateChanging,
        args: preview.args,
        summary: preview.summary,
      },
      fees: value.fees,
      warnings: value.warnings,
      plannedAt: value.plannedAt,
      expiresAt: value.expiresAt,
      network: {
        genesisHash: network.genesisHash,
        runtimeSpecVersion: network.runtimeSpecVersion,
        blockNumber: network.blockNumber,
      },
    });
  }

  /** Emits a bounded event for local diagnostics without arguments or results. */
  function dispatchSafeEvent(name, detail) {
    try {
      if (typeof global.dispatchEvent !== 'function' || typeof global.CustomEvent !== 'function') return;
      global.dispatchEvent(new global.CustomEvent(name, { detail: Object.freeze({ ...detail }) }));
    } catch {
      // Diagnostics must never affect tool registration or invocation.
    }
  }

  /** Returns a monotonic timestamp when available. */
  function invocationNow() {
    return typeof global.performance?.now === 'function' ? global.performance.now() : Date.now();
  }

  /** Clones an iframe result into this realm before applying privacy projections. */
  function cloneAgentResult(value) {
    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) return null;
      return JSON.parse(serialized);
    } catch {
      throw createSafeError('MCP_RESULT_INVALID', 'The Polkaswap tool returned an invalid result.');
    }
  }

  /** Checks the JSON Schema subset used by the published catalogue. */
  function validateSchema(value, schema) {
    if (Object.hasOwn(schema, 'const') && value !== schema.const) throw new SchemaValidationError();
    if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => candidate === value)) {
      throw new SchemaValidationError();
    }
    if (Array.isArray(schema.oneOf)) {
      const matches = schema.oneOf.filter((candidate) => schemaMatches(value, candidate)).length;
      if (matches !== 1) throw new SchemaValidationError();
    }
    if (Array.isArray(schema.anyOf) && !schema.anyOf.some((candidate) => schemaMatches(value, candidate))) {
      throw new SchemaValidationError();
    }
    if (Array.isArray(schema.required) && isPlainRecord(value)) {
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) throw new SchemaValidationError();
      }
    }

    switch (schema.type) {
      case undefined:
        break;
      case 'object': {
        if (!isPlainRecord(value)) throw new SchemaValidationError();
        const properties = isPlainRecord(schema.properties) ? schema.properties : {};
        if (schema.additionalProperties === false) {
          for (const key of Object.keys(value)) {
            if (!Object.hasOwn(properties, key)) throw new SchemaValidationError();
          }
        }
        if (isPlainRecord(schema.dependentRequired)) {
          for (const [key, dependencies] of Object.entries(schema.dependentRequired)) {
            if (!Object.hasOwn(value, key) || !Array.isArray(dependencies)) continue;
            for (const dependency of dependencies) {
              if (!Object.hasOwn(value, dependency)) throw new SchemaValidationError();
            }
          }
        }
        for (const [key, propertySchema] of Object.entries(properties)) {
          if (Object.hasOwn(value, key)) validateSchema(value[key], propertySchema);
        }
        break;
      }
      case 'string':
        if (typeof value !== 'string') throw new SchemaValidationError();
        if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
          throw new SchemaValidationError();
        }
        if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
          throw new SchemaValidationError();
        }
        if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
          throw new SchemaValidationError();
        }
        break;
      case 'integer':
        if (!Number.isSafeInteger(value)) throw new SchemaValidationError();
        if (typeof schema.minimum === 'number' && value < schema.minimum) throw new SchemaValidationError();
        if (typeof schema.maximum === 'number' && value > schema.maximum) throw new SchemaValidationError();
        break;
      case 'boolean':
        if (typeof value !== 'boolean') throw new SchemaValidationError();
        break;
      case 'array':
        if (!Array.isArray(value)) throw new SchemaValidationError();
        if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
          throw new SchemaValidationError();
        }
        if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
          throw new SchemaValidationError();
        }
        if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
          throw new SchemaValidationError();
        }
        if (isPlainRecord(schema.items)) {
          for (const item of value) validateSchema(item, schema.items);
        }
        break;
      default:
        throw new SchemaValidationError();
    }
  }

  /** Tests one anyOf/oneOf branch without surfacing internal validation errors. */
  function schemaMatches(value, schema) {
    try {
      validateSchema(value, schema);
      return true;
    } catch (error) {
      if (error instanceof SchemaValidationError) return false;
      throw error;
    }
  }

  /** Enforces the downloaded schema before invoking any iframe-owned method. */
  function validateToolInput(input, schema) {
    try {
      validateSchema(input, schema);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw createSafeError('INVALID_ARGUMENT', 'The Polkaswap tool input is invalid.');
      }
      throw error;
    }
  }

  /** Races a read-only invocation against caller cancellation without leaking its reason. */
  function awaitWithSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(createCancellationError());

    return new Promise((resolve, reject) => {
      const onAbort = () => reject(createCancellationError());
      signal.addEventListener('abort', onAbort, { once: true });
      Promise.resolve(promise)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  /** Builds one top-level WebMCP definition from the shared catalogue entry. */
  function createWebMcpTool(targetDocument, tool) {
    const mapping = TOOL_METHODS[tool.name];
    return {
      ...tool,
      execute: async (input = {}, options = {}) => {
        const startedAt = invocationNow();
        if (options.signal?.aborted) throw createCancellationError();

        try {
          validateToolInput(input, tool.inputSchema);
          const agent = await getFrameAgent(targetDocument, options.signal);
          const method = agent[mapping.method];
          if (typeof method !== 'function') {
            throw createSafeError('AGENT_API_UNAVAILABLE', 'The Polkaswap agent method is unavailable.');
          }
          const mappedInput = mapping.mapInput ? mapping.mapInput(input) : input;
          const invocation = mapping.passInput ? method.call(agent, mappedInput) : method.call(agent);
          const rawResult = await awaitWithSignal(invocation, options.signal);
          const localResult = cloneAgentResult(rawResult);
          const result = mapping.projectResult ? mapping.projectResult(localResult) : localResult;
          dispatchSafeEvent('polkaswap-webmcp-invocation', {
            source: 'webmcp',
            toolName: tool.name,
            status: 'success',
            durationMs: Math.max(0, Math.round(invocationNow() - startedAt)),
          });
          return result;
        } catch (error) {
          const normalized = normalizeInvocationError(error);
          dispatchSafeEvent('polkaswap-webmcp-invocation', {
            source: 'webmcp',
            toolName: tool.name,
            status: normalized.code === 'MCP_INVOCATION_CANCELLED' ? 'cancelled' : 'error',
            durationMs: Math.max(0, Math.round(invocationNow() - startedAt)),
            code: normalized.code,
          });
          throw normalized;
        }
      },
    };
  }

  /**
   * Registers the playground tools once per model context and returns an
   * idempotent cleanup function. Unsupported browsers degrade to a no-op.
   */
  async function registerPlaygroundWebMcpTools(targetDocument = global.document) {
    try {
      if (global.top !== global) return async () => undefined;
    } catch {
      return async () => undefined;
    }

    const modelContext = targetDocument?.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== 'function') {
      dispatchSafeEvent('polkaswap-webmcp-status', { state: 'unsupported', toolCount: 0 });
      return async () => undefined;
    }

    const existing = registrations.get(modelContext);
    if (existing) {
      await existing.ready;
      return existing.cleanup;
    }

    const controller = new AbortController();
    const registeredNames = [];
    let cleanupPromise;
    let registration;
    const cleanup = () => {
      cleanupPromise ??= (async () => {
        controller.abort();
        if (typeof modelContext.unregisterTool === 'function') {
          await Promise.allSettled(registeredNames.map((name) => modelContext.unregisterTool(name)));
        }
        if (registrations.get(modelContext) === registration) registrations.delete(modelContext);
      })();
      return cleanupPromise;
    };

    dispatchSafeEvent('polkaswap-webmcp-status', { state: 'registering', toolCount: 0 });
    const ready = (async () => {
      try {
        const tools = await loadToolCatalogue(controller.signal);
        for (const tool of tools) {
          await modelContext.registerTool(createWebMcpTool(targetDocument, tool), { signal: controller.signal });
          registeredNames.push(tool.name);
        }
        dispatchSafeEvent('polkaswap-webmcp-status', { state: 'ready', toolCount: registeredNames.length });
      } catch (error) {
        await cleanup();
        dispatchSafeEvent('polkaswap-webmcp-status', {
          state: 'failed',
          toolCount: registeredNames.length,
          code: 'WEBMCP_REGISTRATION_FAILED',
        });
        throw error;
      }
    })();
    registration = { ready, cleanup };
    registrations.set(modelContext, registration);

    await ready;
    return cleanup;
  }

  Object.defineProperty(global, 'PolkaswapPlaygroundWebMcp', {
    configurable: true,
    enumerable: false,
    value: Object.freeze({ register: registerPlaygroundWebMcpTools }),
    writable: false,
  });

  void registerPlaygroundWebMcpTools().catch(() => undefined);
})(window);
