import {
  POLKASWAP_MCP_TOOLS,
  PolkaswapMcpInvocationError,
  invokePolkaswapMcpTool,
  listPolkaswapMcpTools,
} from '../../src/features/agent-trading/mcp/catalogue.mjs';

const SERVER_INFO = Object.freeze({ name: 'polkaswap-local-agent', version: '0.1.0' });
const DEFAULT_MAX_PENDING_TOOL_CALLS = 32;
const DEFAULT_MAX_RESULT_BYTES = 1_048_576;

/** Internal sentinel whose fixed fields are safe to serialize to an MCP client. */
class McpToolTimeoutError extends Error {
  constructor() {
    super('The Polkaswap tool invocation timed out.');
    this.name = 'McpToolTimeoutError';
    this.code = 'MCP_TOOL_TIMEOUT';
  }
}

/** Internal sentinel for a client-cancelled MCP request. */
class McpRequestCancelledError extends Error {
  constructor() {
    super('The Polkaswap tool invocation was cancelled.');
    this.name = 'McpRequestCancelledError';
    this.code = 'MCP_REQUEST_CANCELLED';
  }
}

/** Internal sentinel for a bounded serial queue refusing additional work. */
class McpQueueFullError extends Error {
  constructor() {
    super('The Polkaswap MCP request queue is full.');
    this.name = 'McpQueueFullError';
    this.code = 'MCP_QUEUE_FULL';
  }
}

/** Internal sentinel for a successful result too large to return safely. */
class McpResultTooLargeError extends Error {
  constructor() {
    super('The Polkaswap tool result exceeds the response size limit.');
    this.name = 'McpResultTooLargeError';
    this.code = 'MCP_RESULT_TOO_LARGE';
  }
}

/**
 * Create one official SDK `McpServer` backed by the local browser adapter.
 *
 * Every registered tool comes from the shared catalogue. Raw catalogue JSON
 * Schema is wrapped with the SDK's `fromJsonSchema`, so clients see the exact
 * descriptor and the SDK validates requests before the catalogue's own strict
 * validation runs.
 *
 * @param {{
 *   McpServer: new (...args: any[]) => object,
 *   bridge: {agent: object, close: () => Promise<void>},
 *   fromJsonSchema: (schema: object) => object,
 *   invoke?: (agent: object, toolName: string, input: unknown) => Promise<unknown>,
 *   maxPendingToolCalls?: number,
 *   maxResultBytes?: number,
 *   toolTimeoutMs: number,
 *   tools?: object[],
 * }} options Dependencies and validated runtime options.
 * @returns {object} Official SDK MCP server instance.
 */
export function createPolkaswapMcpServer({
  McpServer,
  bridge,
  fromJsonSchema,
  invoke = invokePolkaswapMcpTool,
  maxPendingToolCalls = DEFAULT_MAX_PENDING_TOOL_CALLS,
  maxResultBytes = DEFAULT_MAX_RESULT_BYTES,
  toolTimeoutMs,
  tools = listPolkaswapMcpTools(),
}) {
  if (typeof McpServer !== 'function') throw new TypeError('McpServer constructor is required.');
  if (!bridge?.agent || typeof bridge.close !== 'function') throw new TypeError('Browser bridge is required.');
  if (typeof fromJsonSchema !== 'function') throw new TypeError('fromJsonSchema is required.');
  if (!Number.isSafeInteger(toolTimeoutMs) || toolTimeoutMs <= 0) {
    throw new TypeError('A positive tool timeout is required.');
  }
  if (!Number.isSafeInteger(maxPendingToolCalls) || maxPendingToolCalls <= 0) {
    throw new TypeError('A positive maximum pending tool-call count is required.');
  }
  if (!Number.isSafeInteger(maxResultBytes) || maxResultBytes <= 0) {
    throw new TypeError('A positive maximum result byte count is required.');
  }

  const descriptors = validateCatalogue(tools);
  const server = new McpServer(SERVER_INFO);
  const enqueue = createSerialQueue(maxPendingToolCalls);

  for (const tool of descriptors) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        ...(tool.description ? { description: tool.description } : {}),
        inputSchema: fromJsonSchema(tool.inputSchema),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      },
      (input, context) => {
        const control = {
          deadlineAt: Date.now() + toolTimeoutMs,
          signal: context?.mcpReq?.signal,
        };
        return enqueue(() => Promise.resolve(invoke(bridge.agent, tool.name, input)), control).then((result) => {
          try {
            return successfulToolResult(result, maxResultBytes);
          } catch (error) {
            return failedToolResult(error);
          }
        }, failedToolResult);
      }
    );
  }

  attachBrowserCleanup(server, bridge);
  return server;
}

/**
 * Return the immutable catalogue imported by this transport layer.
 *
 * This is useful for smoke tests that need to prove the bridge does not add a
 * hidden execution tool beyond the shared descriptors.
 *
 * @returns {readonly object[]}
 */
export function importedPolkaswapMcpTools() {
  return POLKASWAP_MCP_TOOLS;
}

/**
 * Normalize catalogue/browser failures into a small, JSON-safe public shape.
 *
 * @param {unknown} error Caught value.
 * @returns {{code: string, message: string, toolName?: string, details?: unknown}}
 */
export function normalizeInvocationError(error) {
  if (error instanceof PolkaswapMcpInvocationError) {
    return toJsonSafe(error.toJSON());
  }
  if (error instanceof McpToolTimeoutError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof McpRequestCancelledError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof McpQueueFullError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof McpResultTooLargeError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: 'MCP_INVOCATION_FAILED',
    message: 'The Polkaswap tool invocation failed.',
  };
}

/**
 * Validate the shared catalogue at process construction time.
 *
 * @param {unknown} tools Candidate descriptors.
 * @returns {object[]}
 */
function validateCatalogue(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new TypeError('The Polkaswap MCP catalogue must contain at least one tool.');
  }

  const names = new Set();
  for (const tool of tools) {
    if (!tool || typeof tool.name !== 'string' || !tool.name) {
      throw new TypeError('Every Polkaswap MCP tool must have a name.');
    }
    if (names.has(tool.name)) throw new TypeError(`Duplicate Polkaswap MCP tool: ${tool.name}`);
    if (!tool.inputSchema || typeof tool.inputSchema !== 'object' || Array.isArray(tool.inputSchema)) {
      throw new TypeError(`Polkaswap MCP tool has no JSON input schema: ${tool.name}`);
    }
    names.add(tool.name);
  }
  return [...tools];
}

/**
 * Convert a successful catalogue value to MCP text and structured content.
 *
 * @param {unknown} result Catalogue result.
 * @param {number} maxResultBytes Maximum UTF-8 size of the complete MCP response.
 * @returns {{content: {type: 'text', text: string}[], structuredContent: object}}
 */
function successfulToolResult(result, maxResultBytes) {
  const safeResult = toJsonSafe(result);
  const structuredContent =
    safeResult && typeof safeResult === 'object' && !Array.isArray(safeResult)
      ? safeResult
      : { result: safeResult ?? null };
  const response = {
    content: [{ type: 'text', text: stringifyForMcp(safeResult) }],
    structuredContent,
  };
  if (Buffer.byteLength(JSON.stringify(response), 'utf8') > maxResultBytes) {
    throw new McpResultTooLargeError();
  }
  return response;
}

/**
 * Convert a caught failure to an MCP tool error without exposing its stack.
 *
 * @param {unknown} error Caught value.
 * @returns {{content: {type: 'text', text: string}[], isError: true}}
 */
function failedToolResult(error) {
  return {
    isError: true,
    content: [{ type: 'text', text: stringifyForMcp({ error: normalizeInvocationError(error) }) }],
  };
}

/**
 * Ensure browser calls execute one at a time against the stateful page.
 *
 * A request's response races its original deadline and cancellation signal,
 * but `tail` always follows the real invocation promise. Consequently a timed
 * out active request can respond promptly without allowing a later browser
 * call to overlap work that is still running. A queued request is checked
 * again at the head of the queue and is never invoked if its deadline or
 * signal has already fired.
 *
 * @param {number} maxPending Maximum active-plus-queued invocations.
 * @returns {<T>(
 *   task: () => Promise<T>,
 *   control: {deadlineAt: number, signal?: AbortSignal},
 * ) => Promise<T>}
 */
function createSerialQueue(maxPending) {
  let tail = Promise.resolve();
  let pending = 0;
  return (task, control) => {
    if (pending >= maxPending) return Promise.reject(new McpQueueFullError());
    pending += 1;

    const execution = tail.then(() => {
      const interruption = requestInterruption(control);
      if (interruption) throw interruption;
      return task();
    });
    const trackedExecution = execution.finally(() => {
      pending -= 1;
    });
    tail = trackedExecution.then(
      () => undefined,
      () => undefined
    );
    return awaitRequestOutcome(trackedExecution, control);
  };
}

/**
 * Return a fixed error when a request can no longer start or continue waiting.
 *
 * @param {{deadlineAt: number, signal?: AbortSignal}} control Request controls.
 * @returns {McpToolTimeoutError | McpRequestCancelledError | null}
 */
function requestInterruption(control) {
  if (control.signal?.aborted) return new McpRequestCancelledError();
  if (Date.now() >= control.deadlineAt) return new McpToolTimeoutError();
  return null;
}

/**
 * Race the caller-visible result against the one request deadline and signal.
 *
 * This never cancels or replaces `execution`; the serial queue retains that
 * promise as its tail until the underlying browser work actually settles.
 *
 * @template T
 * @param {Promise<T>} execution Actual queued invocation.
 * @param {{deadlineAt: number, signal?: AbortSignal}} control Request controls.
 * @returns {Promise<T>}
 */
async function awaitRequestOutcome(execution, control) {
  const immediate = requestInterruption(control);
  if (immediate) throw immediate;

  let timer;
  let abortHandler;
  try {
    const interrupted = new Promise((_, reject) => {
      abortHandler = () => reject(new McpRequestCancelledError());
      if (control.signal) {
        control.signal.addEventListener('abort', abortHandler, { once: true });
        if (control.signal.aborted) abortHandler();
      }

      const remainingMs = Math.max(0, control.deadlineAt - Date.now());
      timer = setTimeout(() => reject(new McpToolTimeoutError()), remainingMs);
      timer.unref?.();
    });

    return await Promise.race([execution, interrupted]);
  } finally {
    clearTimeout(timer);
    if (abortHandler && control.signal) {
      control.signal.removeEventListener('abort', abortHandler);
    }
  }
}

/**
 * Extend the SDK close lifecycle so its owned browser resources are released.
 *
 * @param {object} server SDK server instance.
 * @param {{close: () => Promise<void>}} bridge Browser bridge.
 */
function attachBrowserCleanup(server, bridge) {
  if (typeof server.close !== 'function') return;
  const closeSdkServer = server.close.bind(server);
  let closePromise;

  server.close = () => {
    if (!closePromise) {
      closePromise = (async () => {
        try {
          await closeSdkServer();
        } finally {
          await bridge.close();
        }
      })();
    }
    return closePromise;
  };
}

/**
 * Clone JSON-compatible values and drop unserializable error detail.
 *
 * @param {unknown} value Candidate value.
 * @returns {unknown}
 */
function toJsonSafe(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item)));
  } catch {
    return undefined;
  }
}

/**
 * Serialize one text content item with a stable null fallback.
 *
 * @param {unknown} value JSON-safe value.
 * @returns {string}
 */
function stringifyForMcp(value) {
  return JSON.stringify(value ?? null, null, 2);
}
