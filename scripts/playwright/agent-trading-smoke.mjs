import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

import { ensurePreviewServer } from './preview-server-helper.mjs';
import { resolveAppBaseUrl, resolveRouteUrl } from './url-helpers.mjs';

const RAW_BASE_URL = process.env.AGENT_SMOKE_BASE_URL || 'http://127.0.0.1:8896';
const BASE_URL = resolveAppBaseUrl(RAW_BASE_URL, process.env.AGENT_SMOKE_PREFIX);
const AGENT_SESSION_QUERY_PARAM = 'polkaswap-agent';
const APP_URL = withAgentSessionParam(resolveRouteUrl(RAW_BASE_URL, '#/swap', process.env.AGENT_SMOKE_PREFIX));
const PLAYGROUND_URL = new URL('agent-playground.html', BASE_URL).toString();
const QUOTE_IN_SYMBOL = process.env.AGENT_SMOKE_ASSET_IN || 'XOR';
const QUOTE_OUT_SYMBOL = process.env.AGENT_SMOKE_ASSET_OUT || 'VAL';
const QUOTE_AMOUNT = process.env.AGENT_SMOKE_AMOUNT || '100';
const EXTENSION_PATH = process.env.AGENT_SMOKE_EXTENSION_PATH || '';
const PROFILE_PATH = process.env.AGENT_SMOKE_PROFILE || '';
const BROWSER_CHANNEL = process.env.AGENT_SMOKE_CHANNEL || 'chrome';
const OUTPUT_PATH = process.env.AGENT_SMOKE_OUTPUT || 'output/playwright/agent-trading-smoke.json';
const EXTENSION_IGNORE_DEFAULT_ARGS = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];
const EXPECTED_AGENT_VERSION = 'v1';
const SHA_256_PATTERN = /^[0-9a-f]{64}$/;
const SWAP_INTENT_PATTERN = /^polkaswap:swap:sha256:[0-9a-f]{64}$/;
const EXPECTED_AGENT_METHODS = [
  'capabilities',
  'ready',
  'status',
  'refreshWallets',
  'walletAccounts',
  'connectWallet',
  'assets',
  'resolveAsset',
  'commonAssets',
  'quoteSwap',
  'planSwap',
  'prepareSwap',
  'assessSwap',
  'executeSwap',
  'prepareTransfer',
  'executeTransfer',
  'poolInfo',
  'liquidityPositions',
  'quoteAddLiquidity',
  'prepareAddLiquidity',
  'executeAddLiquidity',
  'quoteRemoveLiquidity',
  'prepareRemoveLiquidity',
  'executeRemoveLiquidity',
  'maxTransferAmount',
  'maxSwapInput',
  'maxAddLiquidity',
  'maxRemoveLiquidity',
  'transactionStatus',
  'lookupTransaction',
  'recoverTransaction',
  'waitForTransaction',
  'recentTransactions',
  'subscribeTransactions',
  'subscribeStatus',
  'exportState',
  'importState',
  'clearState',
];
const EXPECTED_PUBLIC_TOOLS = [
  'polkaswap_capabilities',
  'polkaswap_status',
  'polkaswap_ready',
  'polkaswap_assets',
  'polkaswap_resolve_asset',
  'polkaswap_common_assets',
  'polkaswap_quote_swap',
  'polkaswap_plan_swap',
  'polkaswap_pool_info',
];

/** Add the opt-in query parameter before an application's hash route. */
function withAgentSessionParam(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set(AGENT_SESSION_QUERY_PARAM, '1');
  return url.toString();
}

/** Return whether a JSON value matches one schema primitive. */
function typeMatches(expectedType, value) {
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expectedType === 'integer') return Number.isInteger(value);
  if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expectedType === 'null') return value === null;
  return typeof value === expectedType;
}

/** Resolve a local JSON Schema reference. */
function resolveSchemaRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported schema ref: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((schema, segment) => schema?.[segment], root);
}

/** Validate the small JSON Schema subset used by the published agent contract. */
function validateSchemaValue(root, schema, value, pathName = '$') {
  if (schema === true || schema === undefined) return [];
  if (schema === false) return [`${pathName}: schema rejects all values`];
  if (schema.$ref) return validateSchemaValue(root, resolveSchemaRef(root, schema.$ref), value, pathName);

  const errors = [];
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${pathName}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${pathName}: expected one of ${schema.enum.join(', ')}`);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) {
      errors.push(`${pathName}: expected type ${types.join('|')}`);
      return errors;
    }
  }
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${pathName}: does not match pattern ${schema.pattern}`);
  }
  if (schema.minLength !== undefined && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${pathName}: shorter than minLength ${schema.minLength}`);
  }
  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${pathName}: below minimum ${schema.minimum}`);
  }
  if (schema.maximum !== undefined && typeof value === 'number' && value > schema.maximum) {
    errors.push(`${pathName}: above maximum ${schema.maximum}`);
  }

  for (const subSchema of schema.allOf ?? []) {
    errors.push(...validateSchemaValue(root, subSchema, value, pathName));
  }
  if (schema.anyOf) {
    const anyMatches = schema.anyOf.some(
      (subSchema) => validateSchemaValue(root, subSchema, value, pathName).length === 0
    );
    if (!anyMatches) errors.push(`${pathName}: did not match anyOf`);
  }
  if (schema.oneOf) {
    const matchCount = schema.oneOf.filter(
      (subSchema) => validateSchemaValue(root, subSchema, value, pathName).length === 0
    ).length;
    if (matchCount !== 1) errors.push(`${pathName}: matched ${matchCount} oneOf branches`);
  }

  if (typeMatches('object', value)) {
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) errors.push(`${pathName}.${key}: required property missing`);
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) {
        errors.push(...validateSchemaValue(root, propertySchema, value[key], `${pathName}.${key}`));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${pathName}.${key}: additional property not allowed`);
        }
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validateSchemaValue(root, schema.items, item, `${pathName}[${index}]`));
    });
  }

  return errors;
}

/** Validate representative live responses against their published definitions. */
function validateSchemaSamples(schema, samples) {
  const refs = {
    status: '#/$defs/status',
    quoteSwap: '#/$defs/swapQuote',
    planSwap: '#/$defs/swapPlan',
    prepareSwap: '#/$defs/preparedSwap',
    poolInfo: '#/$defs/poolInfo',
  };

  return Object.entries(refs).flatMap(([name, ref]) => {
    if (!samples[name]) return [`${name}: sample missing`];
    return validateSchemaValue(schema, { $ref: ref }, samples[name], name);
  });
}

/** Remove stale Chromium singleton files from an explicitly supplied test profile. */
async function cleanProfileLocks(profilePath) {
  for (const file of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
    await fs.rm(path.join(profilePath, file), { force: true }).catch(() => {});
  }
}

/** Create a browser context, optionally loading the caller's test extension profile. */
async function createBrowser() {
  if (EXTENSION_PATH && PROFILE_PATH) {
    await fs.mkdir(PROFILE_PATH, { recursive: true });
    await cleanProfileLocks(PROFILE_PATH);

    const context = await chromium.launchPersistentContext(PROFILE_PATH, {
      channel: BROWSER_CHANNEL,
      headless: false,
      viewport: { width: 1440, height: 1000 },
      ignoreDefaultArgs: EXTENSION_IGNORE_DEFAULT_ARGS,
      args: [
        '--disable-crashpad',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    return { context, close: () => context.close() };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  return {
    context,
    close: async () => {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/** Capture browser failures with a page label so both surfaces share one gate. */
function observePage(page, label, observations) {
  page.on('console', (message) => {
    if (message.type() === 'error') observations.consoleErrors.push({ label, text: message.text() });
  });
  page.on('pageerror', (error) => observations.consoleErrors.push({ label, text: String(error) }));
  page.on('requestfailed', (request) => {
    const matchingSuccessfulHead = observations.successfulHeadResponses.some(
      (response) => response.label === label && response.method === request.method() && response.url === request.url()
    );
    // Chromium reports a completed fetch HEAD as ERR_ABORTED when this local
    // static preview closes its bodyless response. A preceding 2xx response
    // proves the fetch itself completed; all unmatched aborts still fail.
    if (request.failure()?.errorText === 'net::ERR_ABORTED' && matchingSuccessfulHead) return;
    observations.requestFailures.push({
      label,
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      error: request.failure()?.errorText ?? 'unknown request failure',
    });
  });
  page.on('response', (response) => {
    if (response.request().method() === 'HEAD' && response.status() >= 200 && response.status() < 400) {
      observations.successfulHeadResponses.push({
        label,
        method: response.request().method(),
        status: response.status(),
        url: response.url(),
      });
    }
    if (response.status() < 400) return;
    observations.httpErrors.push({
      label,
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      status: response.status(),
      url: response.url(),
    });
  });
}

/** Inject a top-level WebMCP registrar before any playground script executes. */
async function installModelContextProbe(page) {
  await page.addInitScript(() => {
    if (window.top !== window) return;

    window.__polkaswapRegisteredTools = [];
    window.__polkaswapWebMcpStatusEvents = [];
    window.__polkaswapWebMcpInvocationEvents = [];
    window.addEventListener('polkaswap-webmcp-status', (event) => {
      window.__polkaswapWebMcpStatusEvents.push({ ...event.detail });
    });
    window.addEventListener('polkaswap-webmcp-invocation', (event) => {
      window.__polkaswapWebMcpInvocationEvents.push({ ...event.detail });
    });

    const modelContext = {
      async registerTool(tool) {
        window.__polkaswapRegisteredTools.push(tool);
      },
      async unregisterTool(name) {
        window.__polkaswapRegisteredTools = window.__polkaswapRegisteredTools.filter((tool) => tool.name !== name);
      },
    };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      enumerable: false,
      value: modelContext,
    });
  });
}

/** Read the full private browser API without ever invoking a signer or submit path. */
async function inspectAgentApi(page) {
  await page.addInitScript(() => {
    window.__polkaswapAgentReadyEvents = [];
    window.addEventListener('polkaswap-agent-ready', (event) => {
      window.__polkaswapAgentReadyEvents.push({
        version: event.detail?.version,
        hasApi: Boolean(event.detail?.api),
      });
    });
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.PolkaswapAgent), null, { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      try {
        return Boolean(window.PolkaswapAgent?.status?.().node.connected);
      } catch {
        return false;
      }
    },
    null,
    { timeout: 60_000 }
  );

  const install = await page.evaluate(
    (methodNames) => ({
      url: location.href,
      title: document.title,
      hasAgent: Boolean(window.PolkaswapAgent),
      version: window.PolkaswapAgent?.version,
      readyEvents: window.__polkaswapAgentReadyEvents,
      methods: methodNames.filter((name) => typeof window.PolkaswapAgent?.[name] === 'function'),
    }),
    EXPECTED_AGENT_METHODS
  );

  const discoveryRaw = await page.evaluate(async () => {
    const manifestUrl = new URL(
      '.well-known/polkaswap-agent.json',
      `${location.origin}${location.pathname}`
    ).toString();
    const manifestResponse = await fetch(manifestUrl);
    const manifest = await manifestResponse.json();
    const fetchRelative = (target) => fetch(new URL(target, manifestUrl));
    const [docsResponse, typesResponse, schemaResponse, examplesResponse, errorsResponse, toolsResponse] =
      await Promise.all([
        fetchRelative(manifest.docs),
        fetchRelative(manifest.types),
        fetchRelative(manifest.schema),
        fetchRelative(manifest.examples),
        fetchRelative(manifest.errorCatalog),
        fetchRelative(manifest.mcpTools),
      ]);
    const [docs, types, schema, examples, errorCatalog, tools] = await Promise.all([
      docsResponse.text(),
      typesResponse.text(),
      schemaResponse.json(),
      examplesResponse.json(),
      errorsResponse.json(),
      toolsResponse.json(),
    ]);
    const swapQuote = schema.$defs?.swapQuote;
    const preparedEnvelope = schema.$defs?.preparedEnvelope;
    const executeRequest = schema.$defs?.executePreparedRequest;

    return {
      manifestUrl,
      manifest,
      schema,
      summary: {
        status: manifestResponse.status,
        docsStatus: docsResponse.status,
        docsHasGlobal: docs.includes('window.PolkaswapAgent'),
        docsHasQuoteDigest: docs.includes('quoteDigest'),
        typesStatus: typesResponse.status,
        typesHasApi: types.includes('PolkaswapAgentApi'),
        typesHasEnvelope: types.includes('AgentPreparedEnvelope'),
        schemaStatus: schemaResponse.status,
        schemaHasQuoteDigest: Boolean(swapQuote?.properties?.quoteDigest),
        schemaQuoteHasNoIntent: !Object.hasOwn(swapQuote?.properties ?? {}, 'intentId'),
        schemaHasPreparedEnvelope: Boolean(preparedEnvelope),
        schemaEnvelopeBindsNetwork: Boolean(
          preparedEnvelope?.properties?.network &&
          preparedEnvelope?.properties?.preparedAtBlock &&
          preparedEnvelope?.properties?.expiresAtBlock &&
          preparedEnvelope?.properties?.callDigest
        ),
        executeInputFields: Object.keys(executeRequest?.properties ?? {}).sort(),
        executeInputStrict: executeRequest?.additionalProperties === false,
        examplesStatus: examplesResponse.status,
        examplesCount: examples.examples?.length ?? 0,
        errorsStatus: errorsResponse.status,
        errorsVersion: errorCatalog.version,
        errorsCount: Object.keys(errorCatalog.errors ?? {}).length,
        errorsHaveIntentGate: [
          'INTENT_REQUIRED',
          'INTENT_NOT_FOUND',
          'INTENT_INTEGRITY_FAILED',
          'INTENT_EXPIRED',
          'INTENT_ALREADY_USED',
        ].every((code) => Boolean(errorCatalog.errors?.[code])),
        toolsStatus: toolsResponse.status,
        toolNames: Array.isArray(tools) ? tools.map((tool) => tool.name) : [],
        toolsReadOnly:
          Array.isArray(tools) &&
          tools.every(
            (tool) =>
              tool.annotations?.readOnlyHint === true &&
              tool.annotations?.destructiveHint === false &&
              tool.annotations?.idempotentHint === true
          ),
      },
    };
  });
  const { manifest, manifestUrl, schema: discoverySchema, summary: discovery } = discoveryRaw;

  await page.addScriptTag({ url: new URL(manifest.client, manifestUrl).toString() });
  const clientResult = await page.evaluate(async () => {
    const client = await window.PolkaswapAgentClient.attach({ timeoutMs: 1_000 });
    return {
      hasClient: Boolean(window.PolkaswapAgentClient),
      hasAttach: typeof window.PolkaswapAgentClient.attach === 'function',
      hasSwapHelper: typeof client.prepareAndExecuteSwap === 'function',
      version: client.version,
      sameApi: client.api === window.PolkaswapAgent,
    };
  });

  const readyStatus = await page.evaluate(async () => {
    const status = await window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 30_000 });
    return {
      nodeConnected: status.node.connected,
      blockNumber: status.node.blockNumber,
      genesisHash: status.node.genesisHash,
      runtimeSpecVersion: status.node.runtimeSpecVersion,
    };
  });

  const capabilityResult = await page.evaluate(() => {
    const capabilities = window.PolkaswapAgent.capabilities();
    return {
      version: capabilities.version,
      methodCount: capabilities.methods.length,
      hasPrepareSwap: capabilities.methods.includes('prepareSwap'),
      hasPlanSwap: capabilities.methods.includes('planSwap'),
      hasExecuteSwap: capabilities.methods.includes('executeSwap'),
      quoteDigestIsExecutable: capabilities.intentProtection?.quoteDigestIsExecutable,
      executeInputFields: capabilities.intentProtection?.executeInputFields,
    };
  });

  const tradingSamples = await page.evaluate(
    async ({ assetInSymbol, assetOutSymbol, amount }) => {
      try {
        const assets = await window.PolkaswapAgent.assets({ includeBalances: false });
        const assetIn = assets.find((asset) => asset.symbol === assetInSymbol);
        const assetOut = assets.find((asset) => asset.symbol === assetOutSymbol);
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING', assetInSymbol, assetOutSymbol };

        const request = {
          assetIn: { address: assetIn.address },
          assetOut: { address: assetOut.address },
          amount,
          quoteTimeoutMs: 30_000,
        };
        const [quoteSwap, poolInfo] = await Promise.all([
          window.PolkaswapAgent.quoteSwap(request),
          window.PolkaswapAgent.poolInfo({
            assetA: { address: assetIn.address },
            assetB: { address: assetOut.address },
          }),
        ]);
        const planSwap = await window.PolkaswapAgent.planSwap(request);
        const prepareSwap = await window.PolkaswapAgent.prepareSwap(request);

        const captureError = async (input) => {
          try {
            await window.PolkaswapAgent.executeSwap(input);
            return { ok: true };
          } catch (error) {
            return { ok: false, name: error.name, code: error.code, message: error.message };
          }
        };
        const executionGate = {
          missingBoth: await captureError({}),
          missingClientOrderId: await captureError({
            intentId: `polkaswap:swap:sha256:${'0'.repeat(64)}`,
          }),
          quoteDigestAsIntent: await captureError({
            intentId: quoteSwap.quoteDigest,
            clientOrderId: 'agent-smoke-quote-digest',
          }),
        };

        return {
          ok: true,
          assetPair: {
            in: { address: assetIn.address, decimals: assetIn.decimals, symbol: assetIn.symbol },
            out: { address: assetOut.address, decimals: assetOut.decimals, symbol: assetOut.symbol },
          },
          executionGate,
          samples: { status: window.PolkaswapAgent.status(), quoteSwap, planSwap, prepareSwap, poolInfo },
        };
      } catch (error) {
        return { ok: false, name: error.name, code: error.code, message: error.message };
      }
    },
    { assetInSymbol: QUOTE_IN_SYMBOL, assetOutSymbol: QUOTE_OUT_SYMBOL, amount: QUOTE_AMOUNT }
  );

  const schemaValidationErrors = tradingSamples.ok
    ? validateSchemaSamples(discoverySchema, tradingSamples.samples)
    : [`live contract samples failed: ${tradingSamples.code ?? tradingSamples.message}`];
  const quote = tradingSamples.ok ? tradingSamples.samples.quoteSwap : null;
  const prepared = tradingSamples.ok ? tradingSamples.samples.prepareSwap : null;
  const plan = tradingSamples.ok ? tradingSamples.samples.planSwap : null;
  const envelope = prepared?.envelope;
  const quoteResult = quote
    ? {
        quoteDigest: quote.quoteDigest,
        hasExecutableIntentId: Object.hasOwn(quote, 'intentId'),
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        routeCount: Array.isArray(quote.route) ? quote.route.length : 0,
      }
    : null;
  const prepareResult = prepared
    ? {
        intentId: prepared.intentId,
        canExecute: prepared.canExecute,
        schemaVersion: envelope?.schemaVersion,
        action: envelope?.action,
        nonce: envelope?.nonce,
        network: envelope?.network,
        preparedAt: envelope?.preparedAt,
        expiresAt: envelope?.expiresAt,
        preparedAtBlock: envelope?.preparedAtBlock,
        expiresAtBlock: envelope?.expiresAtBlock,
        quoteDigest: envelope?.quoteDigest,
        quoteDigestMatches: envelope?.quoteDigest === prepared.quote?.quoteDigest,
        callDigest: envelope?.callDigest,
        call: {
          operation: envelope?.call?.operation,
          sdkCall: envelope?.call?.sdkCall,
          encoding: envelope?.call?.encoding,
          encodedCallIsHex: /^0x[0-9a-f]+$/.test(envelope?.call?.encodedCall ?? ''),
        },
        envelopeIntentMatches: envelope?.intentId === prepared.intentId,
        feeCeilingCount: Array.isArray(envelope?.feeCeilings) ? envelope.feeCeilings.length : -1,
        revalidationValid: prepared.revalidation?.valid,
      }
    : null;

  return {
    install,
    discovery,
    manifest: {
      version: manifest.version,
      global: manifest.global,
      profile: manifest.mcp?.profile,
      executionToolsEnabled: manifest.mcp?.executionToolsEnabled,
      preparationToolsEnabled: manifest.mcp?.preparationToolsEnabled,
      accountDataExposed: manifest.mcp?.accountDataExposed,
      tools: manifest.mcp?.tools,
      executeAcceptsEconomicFields: manifest.stateChangingPattern?.executeAcceptsEconomicFields,
      quoteDigestIsExecutable: manifest.stateChangingPattern?.quoteDigestIsExecutable,
    },
    clientResult,
    readyStatus,
    capabilityResult,
    assetPair: tradingSamples.ok ? tradingSamples.assetPair : null,
    quoteResult,
    planResult: plan
      ? {
          mode: plan.mode,
          canExecute: plan.canExecute,
          requiresWallet: plan.requiresWallet,
          hasExecutableIntentId: Object.hasOwn(plan, 'intentId'),
          hasEnvelope: Object.hasOwn(plan, 'envelope'),
          hasSigner: Object.hasOwn(plan, 'signer'),
          sdkCall: plan.preview?.sdkCall,
          quoteDigest: plan.quote?.quoteDigest,
          plannedAt: plan.plannedAt,
          expiresAt: plan.expiresAt,
          network: plan.network,
        }
      : null,
    prepareResult,
    executionGate: tradingSamples.ok ? tradingSamples.executionGate : null,
    schemaValidationErrors,
    liveError: tradingSamples.ok
      ? null
      : { name: tradingSamples.name, code: tradingSamples.code, message: tradingSamples.message },
  };
}

/** Inspect the top-level playground, its public WebMCP surface, and privacy projection. */
async function inspectPlayground(page) {
  await installModelContextProbe(page);
  const playgroundRootUrl = new URL('.', PLAYGROUND_URL).toString();
  const provenanceResponsePromise = page.waitForResponse(
    (response) => response.url() === playgroundRootUrl && response.request().method() === 'HEAD',
    { timeout: 30_000 }
  );
  await page.goto(PLAYGROUND_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(
    () => window.__polkaswapWebMcpStatusEvents?.some((event) => event.state === 'ready' || event.state === 'failed'),
    null,
    { timeout: 30_000 }
  );
  await page.waitForFunction(
    () => {
      try {
        const frame = document.getElementById('app-frame');
        frame?.contentWindow?.PolkaswapAgent?.status?.();
        return Boolean(frame?.contentWindow?.PolkaswapAgent);
      } catch {
        return false;
      }
    },
    null,
    { timeout: 60_000 }
  );

  const surface = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim(),
    lead: document.querySelector('.page-header__lead')?.textContent?.replace(/\s+/g, ' ').trim(),
    safety: document.querySelector('.safety-strip')?.textContent?.replace(/\s+/g, ' ').trim(),
    hasAppFrame: document.getElementById('app-frame')?.tagName === 'IFRAME',
  }));

  const webMcp = await page.evaluate(
    async ({ assetInSymbol, assetOutSymbol, amount }) => {
      const tools = window.__polkaswapRegisteredTools ?? [];
      const definitions = tools.map((tool) => ({
        name: tool.name,
        readOnlyHint: tool.annotations?.readOnlyHint,
        destructiveHint: tool.annotations?.destructiveHint,
        idempotentHint: tool.annotations?.idempotentHint,
        openWorldHint: tool.annotations?.openWorldHint,
        hasExecute: typeof tool.execute === 'function',
        inputStrict: tool.inputSchema?.additionalProperties === false,
      }));
      const statusTool = tools.find((tool) => tool.name === 'polkaswap_status');
      let publicStatus = null;
      let invocationError = null;
      let publicPlan = null;
      let planInvocationError = null;

      try {
        if (!statusTool) throw new Error('polkaswap_status was not registered.');
        publicStatus = await statusTool.execute({});
      } catch (error) {
        invocationError = { code: error?.code, message: error?.message, name: error?.name };
      }

      try {
        const planTool = tools.find((tool) => tool.name === 'polkaswap_plan_swap');
        if (!planTool) throw new Error('polkaswap_plan_swap was not registered.');
        publicPlan = await planTool.execute({
          assetIn: { symbol: assetInSymbol },
          assetOut: { symbol: assetOutSymbol },
          amount,
          quoteTimeoutMs: 30_000,
        });
      } catch (error) {
        planInvocationError = { code: error?.code, message: error?.message, name: error?.name };
      }

      const collectKeys = (value, result = []) => {
        if (!value || typeof value !== 'object') return result;
        if (Array.isArray(value)) {
          value.forEach((entry) => collectKeys(entry, result));
          return result;
        }
        for (const [key, entry] of Object.entries(value)) {
          result.push(key.toLowerCase());
          collectKeys(entry, result);
        }
        return result;
      };
      const containsValue = (value, candidate) => {
        if (typeof candidate !== 'string' || candidate.length === 0) return false;
        if (value === candidate) return true;
        if (!value || typeof value !== 'object') return false;
        return Object.values(value).some((entry) => containsValue(entry, candidate));
      };
      const frame = document.getElementById('app-frame');
      const rawStatus = frame?.contentWindow?.PolkaswapAgent?.status?.() ?? {};
      const publicKeys = collectKeys(publicStatus);
      const planKeys = collectKeys(publicPlan);
      const walletAddress = rawStatus.wallet?.address;
      const walletSource = rawStatus.wallet?.source;
      const nodeEndpoint = rawStatus.node?.endpoint;

      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        definitions,
        invocationError,
        planInvocationError,
        publicStatus,
        publicPlan,
        planPrivacy: {
          privateKeysAbsent: !planKeys.some((key) =>
            [
              'wallet',
              'signer',
              'balance',
              'available',
              'availablecodec',
              'requiredbalances',
              'intentid',
              'envelope',
              'clientorderid',
              'history',
              'endpoint',
            ].includes(key)
          ),
          walletAddressAbsent: !containsValue(publicPlan, walletAddress),
          walletSourceAbsent: !containsValue(publicPlan, walletSource),
          nodeEndpointAbsent: !containsValue(publicPlan, nodeEndpoint),
        },
        privacy: {
          walletShapeAbsent: !publicKeys.includes('wallet') && !publicKeys.includes('signer'),
          walletAddressAbsent: !publicKeys.includes('address') && !containsValue(publicStatus, walletAddress),
          walletSourceAbsent: !publicKeys.includes('source') && !containsValue(publicStatus, walletSource),
          nodeEndpointAbsent: !publicKeys.includes('endpoint') && !containsValue(publicStatus, nodeEndpoint),
        },
        statusEvents: window.__polkaswapWebMcpStatusEvents ?? [],
        invocationEvents: window.__polkaswapWebMcpInvocationEvents ?? [],
      };
    },
    { assetInSymbol: QUOTE_IN_SYMBOL, assetOutSymbol: QUOTE_OUT_SYMBOL, amount: QUOTE_AMOUNT }
  );

  await page.waitForFunction(
    () => {
      const latest = window.PolkaswapAgentPlayground?.getSnapshot?.().latest;
      return latest?.kind === 'plan' && !latest.error && Boolean(latest.response?.quote);
    },
    null,
    {
      timeout: 60_000,
    }
  );
  const autonomousPlanning = await page.evaluate(() => {
    const snapshot = window.PolkaswapAgentPlayground.getSnapshot();
    return {
      enabled: snapshot.automation?.enabled,
      latestKind: snapshot.latest?.kind,
      walletData: snapshot.privacy?.walletData,
      walletOptInChecked: document.getElementById('wallet-data-opt-in')?.checked,
      planAvailable: document.getElementById('plan')?.disabled === false,
      initialAmount: document.getElementById('amount')?.value,
      initialFormRevision: snapshot.formRevision,
      initialCompletedPlans: snapshot.history.filter((entry) => entry.kind === 'plan' && entry.status === 'complete')
        .length,
    };
  });

  // Exercise the actual form input event path, not the exposed controller or API.
  const editedAmount = autonomousPlanning.initialAmount === '2' ? '3' : '2';
  await page.locator('#amount').fill(editedAmount);
  let replanTimedOut = false;
  try {
    await page.waitForFunction(
      (expectedAmount) => {
        const snapshot = window.PolkaswapAgentPlayground?.getSnapshot?.();
        const latest = snapshot?.latest;
        return (
          latest?.kind === 'plan' &&
          !latest.error &&
          latest.request?.amount === expectedAmount &&
          latest.response?.mode === 'unsigned' &&
          Boolean(latest.response?.quote) &&
          snapshot.quoteFresh
        );
      },
      editedAmount,
      { timeout: 60_000 }
    );
  } catch (error) {
    if (error?.name !== 'TimeoutError') throw error;
    replanTimedOut = true;
  }
  autonomousPlanning.inputChange = await page.evaluate(
    ({ expectedAmount, timedOut }) => {
      const snapshot = window.PolkaswapAgentPlayground.getSnapshot();
      return {
        expectedAmount,
        timedOut,
        formRevision: snapshot.formRevision,
        latestKind: snapshot.latest?.kind,
        latestAmount: snapshot.latest?.request?.amount,
        quoteAmount: snapshot.latest?.response?.quote?.request?.amount,
        quoteFresh: snapshot.quoteFresh,
        errorCode: snapshot.latest?.error?.code ?? null,
        completedPlans: snapshot.history.filter((entry) => entry.kind === 'plan' && entry.status === 'complete').length,
        latestCompletedPlanAmount: snapshot.history.find(
          (entry) => entry.kind === 'plan' && entry.status === 'complete'
        )?.request?.amount,
        walletData: snapshot.privacy?.walletData,
        walletOptInChecked: document.getElementById('wallet-data-opt-in')?.checked,
        enabled: snapshot.automation?.enabled,
        planning: snapshot.automation?.planning,
        visible: !document.hidden,
        status: document.getElementById('autonomy-status')?.textContent,
      };
    },
    { expectedAmount: editedAmount, timedOut: replanTimedOut }
  );

  // The playground's provenance check includes a root HEAD request. Let that
  // request finish before closing the page so teardown cannot turn it into a
  // false-negative request failure.
  const provenanceResponse = await provenanceResponsePromise;
  surface.provenanceHeadStatus = provenanceResponse.status();

  return { surface, webMcp, autonomousPlanning };
}

/** Run the two-surface smoke and emit a machine-readable deployment report. */
async function run() {
  const stopPreviewServer = await ensurePreviewServer(RAW_BASE_URL, BASE_URL);
  const browser = await createBrowser();
  const observations = { consoleErrors: [], requestFailures: [], httpErrors: [], successfulHeadResponses: [] };
  const failures = [];

  try {
    const appPage = await browser.context.newPage();
    observePage(appPage, 'agent-api', observations);
    const agent = await inspectAgentApi(appPage);

    const playgroundPage = await browser.context.newPage();
    observePage(playgroundPage, 'playground', observations);
    const playground = await inspectPlayground(playgroundPage);

    if (!agent.install.hasAgent) failures.push('window.PolkaswapAgent missing');
    if (agent.install.version !== EXPECTED_AGENT_VERSION)
      failures.push(`unexpected API version: ${agent.install.version}`);
    if (agent.install.readyEvents.length !== 1 || !agent.install.readyEvents[0]?.hasApi) {
      failures.push(`expected one complete agent-ready event, got ${agent.install.readyEvents.length}`);
    }
    if (agent.install.methods.length !== EXPECTED_AGENT_METHODS.length) {
      failures.push(`expected ${EXPECTED_AGENT_METHODS.length} API methods, got ${agent.install.methods.length}`);
    }

    if (
      agent.discovery.status !== 200 ||
      agent.manifest.version !== EXPECTED_AGENT_VERSION ||
      agent.manifest.global !== 'window.PolkaswapAgent'
    )
      failures.push('discovery manifest invalid');
    if (
      agent.discovery.docsStatus !== 200 ||
      !agent.discovery.docsHasGlobal ||
      !agent.discovery.docsHasQuoteDigest ||
      agent.discovery.typesStatus !== 200 ||
      !agent.discovery.typesHasApi ||
      !agent.discovery.typesHasEnvelope
    )
      failures.push('discovery docs or types invalid');
    if (
      agent.discovery.schemaStatus !== 200 ||
      !agent.discovery.schemaHasQuoteDigest ||
      !agent.discovery.schemaQuoteHasNoIntent ||
      !agent.discovery.schemaHasPreparedEnvelope ||
      !agent.discovery.schemaEnvelopeBindsNetwork ||
      !agent.discovery.executeInputStrict ||
      agent.discovery.executeInputFields.join(',') !== 'clientOrderId,intentId'
    )
      failures.push('hardened discovery schema invalid');
    if (
      agent.discovery.examplesStatus !== 200 ||
      agent.discovery.examplesCount < 5 ||
      agent.discovery.errorsStatus !== 200 ||
      agent.discovery.errorsVersion !== EXPECTED_AGENT_VERSION ||
      agent.discovery.errorsCount < 20 ||
      !agent.discovery.errorsHaveIntentGate
    )
      failures.push('discovery examples or error catalogue invalid');
    if (
      agent.discovery.toolsStatus !== 200 ||
      agent.discovery.toolNames.join(',') !== EXPECTED_PUBLIC_TOOLS.join(',') ||
      !agent.discovery.toolsReadOnly
    )
      failures.push('published MCP tool catalogue invalid');
    if (
      agent.manifest.profile !== 'public-swap-readonly' ||
      agent.manifest.executionToolsEnabled !== false ||
      agent.manifest.preparationToolsEnabled !== false ||
      agent.manifest.accountDataExposed !== false ||
      agent.manifest.tools?.join(',') !== EXPECTED_PUBLIC_TOOLS.join(',') ||
      agent.manifest.executeAcceptsEconomicFields !== false ||
      agent.manifest.quoteDigestIsExecutable !== false
    )
      failures.push('public MCP boundary metadata invalid');
    if (
      !agent.clientResult.hasClient ||
      !agent.clientResult.hasAttach ||
      !agent.clientResult.hasSwapHelper ||
      !agent.clientResult.sameApi ||
      agent.clientResult.version !== EXPECTED_AGENT_VERSION
    )
      failures.push('discovery client invalid');
    if (
      agent.capabilityResult.version !== EXPECTED_AGENT_VERSION ||
      !agent.capabilityResult.hasPlanSwap ||
      !agent.capabilityResult.hasPrepareSwap ||
      !agent.capabilityResult.hasExecuteSwap
    )
      failures.push('private browser capabilities invalid');
    if (!agent.readyStatus.nodeConnected) failures.push('node did not become ready');
    if (!agent.assetPair) failures.push(`asset pair missing: ${QUOTE_IN_SYMBOL}/${QUOTE_OUT_SYMBOL}`);
    if (!agent.quoteResult) {
      failures.push(`quote failed: ${agent.liveError?.code ?? agent.liveError?.message}`);
    } else {
      if (!SHA_256_PATTERN.test(agent.quoteResult.quoteDigest)) failures.push('quoteDigest is not full SHA-256');
      if (agent.quoteResult.hasExecutableIntentId) failures.push('quote unexpectedly returned an executable intentId');
    }
    if (
      !agent.planResult ||
      agent.planResult.mode !== 'unsigned' ||
      agent.planResult.canExecute !== false ||
      agent.planResult.requiresWallet !== false ||
      agent.planResult.hasExecutableIntentId ||
      agent.planResult.hasEnvelope ||
      agent.planResult.hasSigner ||
      !agent.planResult.sdkCall ||
      !SHA_256_PATTERN.test(agent.planResult.quoteDigest) ||
      !(agent.planResult.expiresAt > agent.planResult.plannedAt) ||
      agent.planResult.network?.genesisHash !== agent.readyStatus.genesisHash ||
      agent.planResult.network?.runtimeSpecVersion !== agent.readyStatus.runtimeSpecVersion
    )
      failures.push('wallet-independent unsigned plan invalid');
    if (!agent.prepareResult) {
      failures.push(`prepare failed: ${agent.liveError?.code ?? agent.liveError?.message}`);
    } else {
      const prepared = agent.prepareResult;
      if (!SWAP_INTENT_PATTERN.test(prepared.intentId)) failures.push('prepared intentId is not full SHA-256');
      if (!prepared.envelopeIntentMatches) failures.push('prepared envelope intentId mismatch');
      if (prepared.schemaVersion !== 1 || prepared.action !== 'swap' || !/^[0-9a-f]{32}$/.test(prepared.nonce)) {
        failures.push('prepared envelope identity fields invalid');
      }
      if (
        !prepared.network?.genesisHash ||
        !Number.isInteger(prepared.network?.runtimeSpecVersion) ||
        prepared.network.runtimeSpecVersion <= 0 ||
        prepared.network.genesisHash !== agent.readyStatus.genesisHash ||
        prepared.network.runtimeSpecVersion !== agent.readyStatus.runtimeSpecVersion
      )
        failures.push('prepared envelope network/runtime binding invalid');
      if (
        !Number.isInteger(prepared.preparedAtBlock) ||
        !Number.isInteger(prepared.expiresAtBlock) ||
        prepared.expiresAtBlock <= prepared.preparedAtBlock ||
        !(prepared.expiresAt > prepared.preparedAt)
      )
        failures.push('prepared envelope block/time expiry invalid');
      if (
        !SHA_256_PATTERN.test(prepared.quoteDigest) ||
        !prepared.quoteDigestMatches ||
        !SHA_256_PATTERN.test(prepared.callDigest) ||
        !prepared.call.encodedCallIsHex ||
        prepared.call.encoding !== 'polkaswap-sdk-call-v1' ||
        !prepared.call.sdkCall
      )
        failures.push('prepared envelope quote/call binding invalid');
    }
    if (agent.executionGate) {
      if (agent.executionGate.missingBoth.code !== 'INTENT_REQUIRED') {
        failures.push(`missing intent reached the wrong path: ${agent.executionGate.missingBoth.code ?? 'success'}`);
      }
      if (agent.executionGate.missingClientOrderId.code !== 'INVALID_CLIENT_ORDER_ID') {
        failures.push(
          `missing clientOrderId reached the wrong path: ${agent.executionGate.missingClientOrderId.code ?? 'success'}`
        );
      }
      if (agent.executionGate.quoteDigestAsIntent.code !== 'INTENT_MISMATCH') {
        failures.push(
          `quoteDigest was not rejected as non-executable: ${agent.executionGate.quoteDigestAsIntent.code ?? 'success'}`
        );
      }
    } else {
      failures.push('execution identifier gates were not exercised');
    }
    if (agent.schemaValidationErrors.length) {
      failures.push(`schema response validation failed: ${agent.schemaValidationErrors.slice(0, 3).join('; ')}`);
    }

    if (!/Polkaswap Agent Swap Playground/i.test(playground.surface.title ?? '')) {
      failures.push(`playground title invalid: ${playground.surface.title ?? 'missing'}`);
    }
    if (
      !playground.surface.hasAppFrame ||
      playground.surface.provenanceHeadStatus !== 200 ||
      !/Agent Swap Playground/i.test(playground.surface.heading ?? '') ||
      !/without approval clicks/i.test(playground.surface.lead ?? '') ||
      !/Autonomous planning/i.test(playground.surface.safety ?? '') ||
      !/No wallet required/i.test(playground.surface.safety ?? '') ||
      !/No signing or submission/i.test(playground.surface.safety ?? '')
    )
      failures.push('playground safety copy or app frame invalid');
    if (
      playground.autonomousPlanning.enabled !== true ||
      playground.autonomousPlanning.latestKind !== 'plan' ||
      playground.autonomousPlanning.walletData !== false ||
      playground.autonomousPlanning.walletOptInChecked !== false
    )
      failures.push('playground did not autonomously plan with wallet access disabled');
    const replanned = playground.autonomousPlanning.inputChange;
    if (
      replanned.timedOut ||
      replanned.latestKind !== 'plan' ||
      replanned.errorCode ||
      !replanned.quoteFresh ||
      replanned.latestAmount !== replanned.expectedAmount ||
      replanned.quoteAmount !== replanned.expectedAmount ||
      replanned.formRevision <= playground.autonomousPlanning.initialFormRevision ||
      replanned.completedPlans <= playground.autonomousPlanning.initialCompletedPlans ||
      replanned.latestCompletedPlanAmount !== replanned.expectedAmount ||
      replanned.walletData !== false ||
      replanned.walletOptInChecked !== false ||
      replanned.enabled !== true
    )
      failures.push('editing the amount did not produce a fresh autonomous plan without wallet consent');
    const toolNames = playground.webMcp.definitions.map((tool) => tool.name);
    if (toolNames.join(',') !== EXPECTED_PUBLIC_TOOLS.join(',')) {
      failures.push(`expected exactly 9 public WebMCP tools, got ${toolNames.length}`);
    }
    if (toolNames.some((name) => /prepare|execute|account|history/i.test(name))) {
      failures.push('public WebMCP exposed a prepare, execute, account, or history tool');
    }
    if (
      playground.webMcp.definitions.some(
        (tool) =>
          !tool.hasExecute ||
          !tool.inputStrict ||
          tool.readOnlyHint !== true ||
          tool.destructiveHint !== false ||
          tool.idempotentHint !== true
      )
    )
      failures.push('public WebMCP tool annotations or schemas invalid');
    if (playground.webMcp.invocationError) {
      failures.push(
        `public status invocation failed: ${playground.webMcp.invocationError.code ?? playground.webMcp.invocationError.message}`
      );
    }
    if (!Object.values(playground.webMcp.privacy).every(Boolean)) {
      failures.push('public status exposed wallet address/source or node endpoint data');
    }
    if (playground.webMcp.planInvocationError) {
      failures.push(
        `public plan invocation failed: ${playground.webMcp.planInvocationError.code ?? playground.webMcp.planInvocationError.message}`
      );
    }
    if (
      playground.webMcp.publicPlan?.mode !== 'unsigned' ||
      playground.webMcp.publicPlan?.canExecute !== false ||
      playground.webMcp.publicPlan?.requiresWallet !== false ||
      !Object.values(playground.webMcp.planPrivacy).every(Boolean)
    )
      failures.push('public unsigned plan boundary invalid');
    const statusStates = playground.webMcp.statusEvents.map((event) => event.state);
    if (!statusStates.includes('registering') || !statusStates.includes('ready')) {
      failures.push(`WebMCP status events incomplete: ${statusStates.join(',')}`);
    }
    if (
      !playground.webMcp.invocationEvents.some(
        (event) =>
          event.source === 'webmcp' &&
          event.toolName === 'polkaswap_status' &&
          event.status === 'success' &&
          Number.isInteger(event.durationMs) &&
          event.durationMs >= 0
      )
    )
      failures.push('WebMCP invocation event missing or unsafe');

    if (observations.requestFailures.length)
      failures.push(`browser request failures: ${observations.requestFailures.length}`);
    if (observations.httpErrors.length) failures.push(`browser HTTP errors: ${observations.httpErrors.length}`);
    if (observations.consoleErrors.length)
      failures.push(`browser console errors: ${observations.consoleErrors.length}`);

    const report = {
      urls: { app: APP_URL, playground: PLAYGROUND_URL },
      timestamp: new Date().toISOString(),
      agent,
      playground,
      observations,
      failures,
      pass: failures.length === 0,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));

    if (failures.length > 0) process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    await stopPreviewServer();
  }
}

await run();
