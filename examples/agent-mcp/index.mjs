#!/usr/bin/env node

import { createBrowserAgentBridge } from './browser-bridge.mjs';
import { McpBridgeConfigError, bridgeHelp, parseBridgeConfig } from './config.mjs';
import { createPolkaswapMcpServer } from './server.mjs';

const MAX_DIAGNOSTIC_CHARACTERS = 239;

/**
 * Load runtime packages lazily so configuration tests do not require the MCP
 * package and no browser is launched merely by importing this module.
 *
 * @returns {Promise<{
 *   McpServer: Function,
 *   chromium: object,
 *   fromJsonSchema: Function,
 *   serveStdio: Function,
 * }>}
 */
export async function loadRuntimeDependencies() {
  const [{ McpServer, fromJsonSchema }, { serveStdio }, { chromium }] = await Promise.all([
    import('@modelcontextprotocol/server'),
    import('@modelcontextprotocol/server/stdio'),
    import('playwright'),
  ]);
  return { McpServer, chromium, fromJsonSchema, serveStdio };
}

/**
 * Start a real MCP stdio server with injectable SDK and browser dependencies.
 *
 * @param {object} config Validated bridge configuration.
 * @param {{
 *   McpServer: Function,
 *   chromium: object,
 *   fromJsonSchema: Function,
 *   serveStdio: Function,
 *   bridgeFactory?: Function,
 *   onerror?: (error: Error) => void,
 * }} dependencies Runtime dependencies.
 * Each SDK factory product owns a distinct browser bridge. `serveStdio` may
 * construct more than one server while negotiating a modern/legacy protocol
 * opening, and closing a discarded product must not close the selected one.
 *
 * @returns {{readonly bridge: object | null, handle: {close: () => Promise<void>}}}
 */
export function startPolkaswapMcpStdio(
  config,
  {
    McpServer,
    chromium,
    fromJsonSchema,
    serveStdio,
    bridgeFactory = createBrowserAgentBridge,
    onerror = () => undefined,
  }
) {
  if (typeof serveStdio !== 'function') throw new TypeError('serveStdio is required.');

  let latestBridge = null;
  const handle = serveStdio(
    () => {
      const bridge = bridgeFactory(config, { chromium });
      latestBridge = bridge;
      return createPolkaswapMcpServer({
        McpServer,
        bridge,
        fromJsonSchema,
        toolTimeoutMs: config.toolTimeoutMs,
      });
    },
    { onerror }
  );
  return {
    get bridge() {
      return latestBridge;
    },
    handle,
  };
}

/**
 * CLI entry point. All diagnostics go to stderr because stdout is exclusively
 * reserved for newline-delimited MCP JSON-RPC messages.
 *
 * @param {{
 *   argv?: string[],
 *   env?: Record<string, string | undefined>,
 *   runtime?: NodeJS.Process,
 *   stderr?: {write: (text: string) => unknown},
 *   loadDependencies?: typeof loadRuntimeDependencies,
 *   startServer?: typeof startPolkaswapMcpStdio,
 * }} [options]
 * @returns {Promise<object | null>}
 */
export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  runtime = process,
  stderr = process.stderr,
  loadDependencies = loadRuntimeDependencies,
  startServer = startPolkaswapMcpStdio,
} = {}) {
  const config = parseBridgeConfig({ argv, env });
  if (config.help) {
    stderr.write(bridgeHelp());
    return null;
  }

  const dependencies = await loadDependencies();
  const session = startServer(config, {
    ...dependencies,
    onerror: () => writeDiagnostic(stderr, 'MCP runtime error.'),
  });

  installShutdownHandlers(session, { runtime, stderr });

  return session;
}

/**
 * Route signals and stdio closure through one idempotent shutdown promise.
 *
 * Ending stdin is normal for a stdio MCP client disconnect and must release the
 * same browser resources as SIGINT/SIGTERM.
 *
 * @param {{handle: {close: () => Promise<void>}}} session Active stdio session.
 * @param {{runtime?: NodeJS.Process, stderr?: {write: (text: string) => unknown}}} [options]
 * @returns {() => Promise<void>} Idempotent shutdown function.
 */
export function installShutdownHandlers(session, { runtime = process, stderr = process.stderr } = {}) {
  let shutdownPromise;
  const shutdown = () => {
    if (!shutdownPromise) {
      shutdownPromise = Promise.resolve()
        .then(() => session.handle.close())
        .catch(() => {
          writeDiagnostic(stderr, 'Shutdown failed.');
          runtime.exitCode = 1;
        });
    }
    return shutdownPromise;
  };

  runtime.once('SIGINT', shutdown);
  runtime.once('SIGTERM', shutdown);
  runtime.stdin?.once?.('end', shutdown);
  runtime.stdin?.once?.('close', shutdown);
  if (runtime.stdin?.readableEnded === true || runtime.stdin?.destroyed === true) void shutdown();
  return shutdown;
}

/**
 * Return a bounded startup diagnostic. Only validated configuration messages
 * may cross the process boundary; arbitrary dependency errors are denied.
 *
 * @param {unknown} error Caught startup value.
 * @returns {string}
 */
export function formatStartupDiagnostic(error) {
  const message = error instanceof McpBridgeConfigError ? error.message : 'Unable to start the Polkaswap MCP bridge.';
  return sanitizeDiagnostic(message);
}

/** Write one bounded, single-line diagnostic without reflecting runtime data. */
function writeDiagnostic(stderr, message) {
  stderr.write(`[polkaswap-mcp] ${sanitizeDiagnostic(message)}\n`);
}

/** Drop terminal control bytes and cap diagnostic size. */
function sanitizeDiagnostic(message) {
  const normalized = String(message)
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= MAX_DIAGNOSTIC_CHARACTERS) return normalized;
  return `${normalized.slice(0, MAX_DIAGNOSTIC_CHARACTERS - 1)}…`;
}

const isMainModule = process.argv[1] === import.meta.filename;
if (isMainModule) {
  main().catch((error) => {
    writeDiagnostic(process.stderr, formatStartupDiagnostic(error));
    process.exitCode = 1;
  });
}
