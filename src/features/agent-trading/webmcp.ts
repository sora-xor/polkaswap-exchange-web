import { PolkaswapMcpInvocationError, invokePolkaswapMcpTool, listPolkaswapMcpTools } from './mcp/catalogue.mjs';

import type { PolkaswapAgentApi } from './types';

type WebMcpAnnotations = Readonly<Record<string, unknown>> & {
  readonly readOnlyHint?: boolean;
};

type PolkaswapMcpToolDescriptor = {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema: unknown;
  readonly annotations?: WebMcpAnnotations;
};

type WebMcpExecuteOptions = {
  readonly signal?: AbortSignal;
};

type WebMcpTool = PolkaswapMcpToolDescriptor & {
  readonly execute: (input?: unknown, options?: WebMcpExecuteOptions) => Promise<unknown>;
};

type WebMcpRegisterOptions = {
  readonly signal: AbortSignal;
};

type WebMcpModelContext = {
  registerTool(tool: WebMcpTool, options?: WebMcpRegisterOptions): void | Promise<void>;
  unregisterTool?(name: string): void | Promise<void>;
};

type WebMcpDocument = Document & {
  readonly modelContext?: Partial<WebMcpModelContext>;
};

type WebMcpCleanup = () => Promise<void>;

type Registration = {
  readonly ready: Promise<void>;
  readonly cleanup: WebMcpCleanup;
};

type NormalizedInvocationError = Error & {
  readonly code: string;
  readonly toolName?: string;
  readonly details?: unknown;
};

type CatalogueInvocationError = Error & {
  readonly code: unknown;
  readonly toolName?: unknown;
  readonly details?: unknown;
};

const FALLBACK_ERROR_CODE = 'MCP_INVOCATION_FAILED';
const FALLBACK_ERROR_MESSAGE = 'Polkaswap tool invocation failed.';
const CANCELLATION_ERROR_CODE = 'MCP_INVOCATION_CANCELLED';
const CANCELLATION_ERROR_MESSAGE = 'The Polkaswap tool invocation was cancelled.';
const NOOP_CLEANUP: WebMcpCleanup = async () => undefined;
const registrations = new WeakMap<WebMcpModelContext, Registration>();
const PUBLIC_WEBMCP_TOOL_NAMES = new Set([
  'polkaswap_capabilities',
  'polkaswap_status',
  'polkaswap_ready',
  'polkaswap_assets',
  'polkaswap_resolve_asset',
  'polkaswap_common_assets',
  'polkaswap_quote_swap',
  'polkaswap_plan_swap',
  'polkaswap_pool_info',
]);

/** Fixed abort error that never serializes the caller-provided abort reason. */
class WebMcpCancellationError extends Error {
  readonly code = CANCELLATION_ERROR_CODE;

  constructor() {
    super(CANCELLATION_ERROR_MESSAGE);
    this.name = 'PolkaswapWebMcpInvocationError';
  }
}

/** Narrows the JavaScript catalogue's structured invocation error. */
function isCatalogueInvocationError(error: unknown): error is CatalogueInvocationError {
  return error instanceof PolkaswapMcpInvocationError;
}

/**
 * Rejects catalogue entries that could sign, connect a wallet, execute a
 * transaction, or mutate portable agent state even if they are mislabeled.
 */
function isReadOnlyTool(tool: PolkaswapMcpToolDescriptor): boolean {
  if (!PUBLIC_WEBMCP_TOOL_NAMES.has(tool.name) || tool.annotations?.readOnlyHint !== true) return false;

  const words = tool.name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[._-]+/u);
  const mutatesState = words.includes('state') && (words.includes('clear') || words.includes('import'));

  return !words.some((word) => word === 'connect' || word === 'execute' || word === 'sign') && !mutatesState;
}

/** Returns whether a document is top-level when it belongs to a window. */
function isTopLevelDocument(targetDocument: Document): boolean {
  const view = targetDocument.defaultView;

  if (!view) return true;

  try {
    return view.top === view;
  } catch {
    return false;
  }
}

/** Converts thrown values into a safe, stable browser-visible Error. */
function normalizeInvocationError(error: unknown): NormalizedInvocationError {
  if (isCatalogueInvocationError(error)) {
    const code = typeof error.code === 'string' && error.code ? error.code : FALLBACK_ERROR_CODE;
    const message = typeof error.message === 'string' && error.message ? error.message : FALLBACK_ERROR_MESSAGE;
    const normalized = Object.assign(new Error(message), { code }) as NormalizedInvocationError;

    normalized.name = 'PolkaswapWebMcpInvocationError';
    if (error.toolName !== undefined) {
      Object.defineProperty(normalized, 'toolName', {
        configurable: true,
        enumerable: true,
        value: error.toolName,
      });
    }
    if (error.details !== undefined) {
      Object.defineProperty(normalized, 'details', {
        configurable: true,
        enumerable: true,
        value: error.details,
      });
    }

    return normalized;
  }

  const normalized = Object.assign(new Error(FALLBACK_ERROR_MESSAGE), {
    code: FALLBACK_ERROR_CODE,
  }) as NormalizedInvocationError;
  normalized.name = 'PolkaswapWebMcpInvocationError';

  return normalized;
}

/** Races read/planning work against WebMCP cancellation without leaking its reason. */
function awaitWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new WebMcpCancellationError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new WebMcpCancellationError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Builds the imperative WebMCP definition for one read-only catalogue tool. */
function toWebMcpTool(agent: PolkaswapAgentApi, tool: PolkaswapMcpToolDescriptor): WebMcpTool {
  const definition: WebMcpTool = {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    execute: async (input = {}, options = {}) => {
      if (options.signal?.aborted) throw new WebMcpCancellationError();

      try {
        // WebMCP serializes this raw structured value for the invoking agent.
        return await awaitWithSignal(invokePolkaswapMcpTool(agent, tool.name, input), options.signal);
      } catch (error) {
        if (error instanceof WebMcpCancellationError) throw error;
        throw normalizeInvocationError(error);
      }
    },
  };

  if (tool.title !== undefined) {
    Object.defineProperty(definition, 'title', {
      configurable: true,
      enumerable: true,
      value: tool.title,
    });
  }

  return definition;
}

/**
 * Registers Polkaswap's safe, read-only catalogue with WebMCP when the current
 * top-level document supports it. Repeated and concurrent calls are idempotent.
 * The returned cleanup aborts the spec registration and also uses the legacy
 * `unregisterTool` hook when a browser exposes it.
 */
export async function registerPolkaswapWebMcpTools(
  agent: PolkaswapAgentApi,
  targetDocument?: Document
): Promise<WebMcpCleanup> {
  const resolvedDocument = (targetDocument ?? (typeof document === 'undefined' ? undefined : document)) as
    | WebMcpDocument
    | undefined;

  if (!resolvedDocument || !isTopLevelDocument(resolvedDocument)) return NOOP_CLEANUP;

  const modelContext = resolvedDocument.modelContext;

  if (!modelContext || typeof modelContext.registerTool !== 'function') return NOOP_CLEANUP;

  const context = modelContext as WebMcpModelContext;
  const existing = registrations.get(context);

  if (existing) {
    await existing.ready;
    return existing.cleanup;
  }

  const controller = new AbortController();
  const registeredNames: string[] = [];
  let cleanupPromise: Promise<void> | undefined;
  let registration: Registration;

  const cleanup: WebMcpCleanup = () => {
    if (cleanupPromise) return cleanupPromise;

    cleanupPromise = (async () => {
      controller.abort();

      if (typeof context.unregisterTool === 'function') {
        await Promise.allSettled(registeredNames.map((name) => context.unregisterTool?.(name)));
      }

      if (registrations.get(context) === registration) registrations.delete(context);
    })();

    return cleanupPromise;
  };

  const ready = (async () => {
    const tools = (listPolkaswapMcpTools() as PolkaswapMcpToolDescriptor[]).filter(isReadOnlyTool);

    try {
      for (const tool of tools) {
        await context.registerTool(toWebMcpTool(agent, tool), { signal: controller.signal });
        registeredNames.push(tool.name);
      }
    } catch (error) {
      await cleanup();
      throw error;
    }
  })();

  registration = { ready, cleanup };
  registrations.set(context, registration);

  try {
    await ready;
  } catch (error) {
    if (registrations.get(context) === registration) registrations.delete(context);
    throw error;
  }

  return cleanup;
}
