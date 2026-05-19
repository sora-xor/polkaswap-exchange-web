import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

import { ensurePreviewServer } from './preview-server-helper.mjs';
import { resolveAppBaseUrl, resolveRouteUrl } from './url-helpers.mjs';

const RAW_BASE_URL = process.env.AGENT_SMOKE_BASE_URL || 'http://127.0.0.1:8896';
const BASE_URL = resolveAppBaseUrl(RAW_BASE_URL, process.env.AGENT_SMOKE_PREFIX);
const APP_URL = resolveRouteUrl(RAW_BASE_URL, '#/swap', process.env.AGENT_SMOKE_PREFIX);
const QUOTE_IN_SYMBOL = process.env.AGENT_SMOKE_ASSET_IN || 'XOR';
const QUOTE_OUT_SYMBOL = process.env.AGENT_SMOKE_ASSET_OUT || 'VAL';
const QUOTE_AMOUNT = process.env.AGENT_SMOKE_AMOUNT || '100';
const LP_ASSET_A_SYMBOL = process.env.AGENT_SMOKE_LP_ASSET_A || 'XOR';
const LP_ASSET_B_SYMBOL = process.env.AGENT_SMOKE_LP_ASSET_B || 'PSWAP';
const LP_AMOUNT_A = process.env.AGENT_SMOKE_LP_AMOUNT_A || '0.1';
const LP_REMOVE_AMOUNT = process.env.AGENT_SMOKE_LP_REMOVE_AMOUNT || '0.001';
const TRANSFER_TO =
  process.env.AGENT_SMOKE_TRANSFER_TO ||
  process.env.AGENT_SMOKE_WALLET_ADDRESS ||
  'cnUUhPow6sCRiDueyWigdtRVT1urUXpAE4pEVSQaBf6u3yppg';
const WALLET_SOURCE = process.env.AGENT_SMOKE_WALLET_SOURCE || '';
const WALLET_ADDRESS = process.env.AGENT_SMOKE_WALLET_ADDRESS || '';
const EXECUTE_SWAP = process.env.AGENT_SMOKE_EXECUTE_SWAP === '1';
const EXTENSION_PATH = process.env.AGENT_SMOKE_EXTENSION_PATH || '';
const PROFILE_PATH = process.env.AGENT_SMOKE_PROFILE || '';
const BROWSER_CHANNEL = process.env.AGENT_SMOKE_CHANNEL || 'chrome';
const OUTPUT_PATH = process.env.AGENT_SMOKE_OUTPUT || 'output/playwright/agent-trading-smoke.json';
const EXTENSION_IGNORE_DEFAULT_ARGS = ['--disable-extensions', '--disable-component-extensions-with-background-pages'];
const EXPECTED_AGENT_VERSION = 'v1';
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const typeMatches = (expectedType, value) => {
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expectedType === 'integer') return Number.isInteger(value);
  if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expectedType === 'null') return value === null;
  return typeof value === expectedType;
};

const resolveSchemaRef = (root, ref) => {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported schema ref: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce((schema, segment) => schema?.[segment], root);
};

const validateSchemaValue = (root, schema, value, pathName = '$') => {
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
  if (schema.exclusiveMinimum !== undefined && typeof value === 'number' && value <= schema.exclusiveMinimum) {
    errors.push(`${pathName}: not above exclusiveMinimum ${schema.exclusiveMinimum}`);
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
};

const validateSchemaSamples = (schema, samples) => {
  const refs = {
    status: '#/$defs/status',
    quoteSwap: '#/$defs/swapQuote',
    prepareSwap: '#/$defs/preparedSwap',
    assessSwap: '#/$defs/policyAssessment',
    prepareTransfer: '#/$defs/preparedTransfer',
    poolInfo: '#/$defs/poolInfo',
    transactionStatus: '#/$defs/transactionStatus',
    exportState: '#/$defs/stateExport',
  };

  return Object.entries(refs).flatMap(([name, ref]) => {
    if (!samples[name]) return [`${name}: sample missing`];
    return validateSchemaValue(schema, { $ref: ref }, samples[name], name);
  });
};

const cleanProfileLocks = async (profilePath) => {
  for (const file of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
    await fs.rm(path.join(profilePath, file), { force: true }).catch(() => {});
  }
};

const createBrowser = async () => {
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

    return {
      context,
      close: () => context.close(),
    };
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
};

const run = async () => {
  const stopPreviewServer = await ensurePreviewServer(RAW_BASE_URL, BASE_URL);
  const browser = await createBrowser();
  const page = await browser.context.newPage();
  const consoleMessages = [];
  const failures = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      const text = message.text();
      if (/frame-ancestors.*meta/i.test(text)) return;
      consoleMessages.push({ type: message.type(), text });
    }
  });

  page.on('pageerror', (error) => {
    consoleMessages.push({ type: 'pageerror', text: String(error) });
  });

  try {
    await page.addInitScript(() => {
      localStorage.setItem('dexSettings.disclaimerApprove', 'true');
      window.__polkaswapAgentReadyEvents = [];
      window.addEventListener('polkaswap-agent-ready', (event) => {
        window.__polkaswapAgentReadyEvents.push({
          version: event.detail?.version,
          hasApi: Boolean(event.detail?.api),
        });
      });
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: 20_000 });

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
      const docsResponse = await fetch(new URL(manifest.docs, manifestUrl).toString());
      const typesResponse = await fetch(new URL(manifest.types, manifestUrl).toString());
      const schemaResponse = await fetch(new URL(manifest.schema, manifestUrl).toString());
      const examplesResponse = await fetch(new URL(manifest.examples, manifestUrl).toString());
      const errorsResponse = await fetch(new URL(manifest.errorCatalog, manifestUrl).toString());
      const clientResponse = await fetch(new URL(manifest.client, manifestUrl).toString());
      const schema = await schemaResponse.json();
      const examples = await examplesResponse.json();
      const errorCatalog = await errorsResponse.json();

      return {
        manifestUrl,
        status: manifestResponse.status,
        manifest,
        docsStatus: docsResponse.status,
        docsHasGlobal: (await docsResponse.text()).includes('window.PolkaswapAgent'),
        typesStatus: typesResponse.status,
        typesHasApi: (await typesResponse.text()).includes('PolkaswapAgentApi'),
        schemaStatus: schemaResponse.status,
        schemaHasPrepareSwap: Boolean(schema.methods?.prepareSwap),
        schemaHasPrepareSwapResponse: Boolean(schema.methods?.prepareSwap?.response),
        schemaHasSwapQuote: Boolean(schema.$defs?.swapQuote),
        schemaHasSubscriptionSource: Boolean(schema.$defs?.transactionSubscriptionRequest?.properties?.source),
        schemaHasExportRedaction: Boolean(schema.$defs?.exportStateRequest?.properties?.redacted),
        schema,
        examplesStatus: examplesResponse.status,
        examplesCount: examples.examples?.length ?? 0,
        errorsStatus: errorsResponse.status,
        errorsVersion: errorCatalog.version,
        errorsCount: Object.keys(errorCatalog.errors ?? {}).length,
        errorsHasSigningCancelled: Boolean(errorCatalog.errors?.SIGNING_CANCELLED),
        manifestHasMethodMetadata: Boolean(manifest.methodMetadata?.stateChanging?.includes('executeSwap')),
        clientStatus: clientResponse.status,
      };
    });
    const { schema: discoverySchema, ...discovery } = discoveryRaw;

    await page.addScriptTag({ url: new URL(discovery.manifest.client, discovery.manifestUrl).toString() });
    const clientResult = await page.evaluate(async () => {
      const client = await window.PolkaswapAgentClient.attach({ timeoutMs: 1_000 });
      return {
        hasClient: Boolean(window.PolkaswapAgentClient),
        hasAttach: typeof window.PolkaswapAgentClient.attach === 'function',
        hasSwapHelper: typeof client.prepareAndExecuteSwap === 'function',
        hasTransferHelper: typeof client.prepareAndExecuteTransfer === 'function',
        hasAddLiquidityHelper: typeof client.prepareAndExecuteAddLiquidity === 'function',
        hasRemoveLiquidityHelper: typeof client.prepareAndExecuteRemoveLiquidity === 'function',
        version: client.version,
        sameApi: client.api === window.PolkaswapAgent,
      };
    });

    const readyStatus = await page.evaluate(async () => {
      const status = await window.PolkaswapAgent.ready({ requireNode: true, timeoutMs: 20_000 });
      return {
        nodeConnected: status.node.connected,
        endpoint: status.node.endpoint,
        blockNumber: status.node.blockNumber,
        walletConnected: status.wallet.connected,
        slippageTolerance: status.settings.slippageTolerance,
      };
    });

    const capabilityResult = await page.evaluate(() => {
      const capabilities = window.PolkaswapAgent.capabilities();
      return {
        version: capabilities.version,
        methodCount: capabilities.methods.length,
        hasPrepareSwap: capabilities.methods.includes('prepareSwap'),
        hasRecoverTransaction: capabilities.methods.includes('recoverTransaction'),
        hasPortableState: capabilities.capabilities.includes('portable-agent-state'),
        hasMaxAmounts: capabilities.capabilities.includes('max-amounts'),
        statusVersion: capabilities.status.version,
        defaultDexId: capabilities.defaults.dexId,
      };
    });

    const walletProviders = await page.evaluate(async () => window.PolkaswapAgent.refreshWallets());
    let walletConnect = null;

    if (WALLET_SOURCE) {
      walletConnect = await page.evaluate(
        async ({ source, address }) => {
          try {
            const status = await window.PolkaswapAgent.connectWallet({ source, address: address || undefined });
            await window.PolkaswapAgent.ready({ requireWallet: true, timeoutMs: 10_000 });
            return { ok: true, status };
          } catch (error) {
            return { ok: false, name: error.name, code: error.code, message: error.message, details: error.details };
          }
        },
        { source: WALLET_SOURCE, address: WALLET_ADDRESS }
      );
    }

    const walletRequired = await page.evaluate(async () => {
      try {
        await window.PolkaswapAgent.ready({ requireWallet: true, timeoutMs: 250 });
        return { ok: true };
      } catch (error) {
        return { ok: false, name: error.name, code: error.code, message: error.message };
      }
    });

    const assetLookup = await page.evaluate(
      async ({ assetInSymbol, assetOutSymbol }) => {
        const assets = await window.PolkaswapAgent.assets();
        const assetIn = assets.find((asset) => asset.symbol === assetInSymbol);
        const assetOut = assets.find((asset) => asset.symbol === assetOutSymbol);
        const resolvedIn = assetIn
          ? await window.PolkaswapAgent.resolveAsset({ asset: { address: assetIn.address }, includeBalance: true })
          : null;
        const common = await window.PolkaswapAgent.commonAssets({ includeBalances: true });
        return {
          count: assets.length,
          assetIn,
          assetOut,
          resolvedIn,
          common: common.slice(0, 8),
          query: await window.PolkaswapAgent.assets({ query: assetInSymbol }),
        };
      },
      { assetInSymbol: QUOTE_IN_SYMBOL, assetOutSymbol: QUOTE_OUT_SYMBOL }
    );

    const quoteResult = await page.evaluate(
      async ({ assetIn, assetOut, amount }) => {
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING' };

        try {
          const quote = await window.PolkaswapAgent.quoteSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
          });
          return {
            ok: true,
            pair: `${assetIn.symbol}/${assetOut.symbol}`,
            dexId: quote.dexId,
            amountIn: quote.amountIn,
            amountOut: quote.amountOut,
            minAmountOut: quote.minAmountOut,
            maxAmountIn: quote.maxAmountIn,
            priceImpact: quote.priceImpact,
            liquiditySources: quote.liquiditySources,
            intentId: quote.intentId,
            amountInMeta: quote.amountInMeta,
            amountOutMeta: quote.amountOutMeta,
          };
        } catch (error) {
          return { ok: false, name: error.name, code: error.code, message: error.message, details: error.details };
        }
      },
      { assetIn: assetLookup.assetIn, assetOut: assetLookup.assetOut, amount: QUOTE_AMOUNT }
    );

    const prepareResult = await page.evaluate(
      async ({ assetIn, assetOut, amount, transferTo }) => {
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING' };

        try {
          const swap = await window.PolkaswapAgent.prepareSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
          });
          const transfer = await window.PolkaswapAgent.prepareTransfer({
            asset: { address: assetIn.address },
            to: transferTo,
            amount: '0.001',
          });

          return {
            ok: true,
            swap: {
              intentId: swap.intentId,
              canExecute: swap.canExecute,
              warnings: swap.warnings.map((warning) => warning.code),
              requiredBalances: swap.requiredBalances.length,
              fees: swap.fees.length,
              preview: swap.preview,
            },
            transfer: {
              intentId: transfer.intentId,
              canExecute: transfer.canExecute,
              warnings: transfer.warnings.map((warning) => warning.code),
              amount: transfer.amount,
              preview: transfer.preview,
            },
          };
        } catch (error) {
          return { ok: false, name: error.name, code: error.code, message: error.message, details: error.details };
        }
      },
      { assetIn: assetLookup.assetIn, assetOut: assetLookup.assetOut, amount: QUOTE_AMOUNT, transferTo: TRANSFER_TO }
    );

    const schemaSampleResult = await page.evaluate(
      async ({ assetIn, assetOut, amount, transferTo }) => {
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING', samples: {} };

        try {
          const status = window.PolkaswapAgent.status();
          const quoteSwap = await window.PolkaswapAgent.quoteSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
          });
          const prepareSwap = await window.PolkaswapAgent.prepareSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
          });
          const assessSwap = await window.PolkaswapAgent.assessSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            maxPriceImpact: '100',
            quoteTimeoutMs: 20_000,
          });
          const prepareTransfer = await window.PolkaswapAgent.prepareTransfer({
            asset: { address: assetIn.address },
            to: transferTo,
            amount: '0.001',
          });
          const poolInfo = await window.PolkaswapAgent.poolInfo({
            assetA: { address: assetIn.address },
            assetB: { address: assetOut.address },
          });
          const transactionStatus = window.PolkaswapAgent.transactionStatus({ id: 'schema-missing-transaction' });
          const exportState = window.PolkaswapAgent.exportState();

          return {
            ok: true,
            samples: {
              status,
              quoteSwap,
              prepareSwap,
              assessSwap,
              prepareTransfer,
              poolInfo,
              transactionStatus,
              exportState,
            },
          };
        } catch (error) {
          return {
            ok: false,
            name: error.name,
            code: error.code,
            message: error.message,
            details: error.details,
            samples: {},
          };
        }
      },
      { assetIn: assetLookup.assetIn, assetOut: assetLookup.assetOut, amount: QUOTE_AMOUNT, transferTo: TRANSFER_TO }
    );
    const schemaValidationErrors = schemaSampleResult.ok
      ? validateSchemaSamples(discoverySchema, schemaSampleResult.samples)
      : [`schema samples failed: ${schemaSampleResult.code ?? schemaSampleResult.message}`];

    const recoveryResult = await page.evaluate(async () => {
      const local = window.PolkaswapAgent.transactionStatus({ id: 'missing-client-order' });
      const indexed = await window.PolkaswapAgent.lookupTransaction({
        txId: 'missing-transaction',
        lookup: 'local',
      });
      const recovered = await window.PolkaswapAgent.recoverTransaction({
        clientOrderId: 'missing-client-order',
        lookup: 'local',
      });
      const state = window.PolkaswapAgent.exportState();
      const redactedState = window.PolkaswapAgent.exportState({ redacted: true });
      const unsubscribeStatus = window.PolkaswapAgent.subscribeStatus({ emitImmediately: true }, () => undefined);
      unsubscribeStatus();
      const unsubscribeTransactions = await window.PolkaswapAgent.subscribeTransactions({}, () => undefined);
      unsubscribeTransactions();

      return {
        localSource: local.source,
        indexedSource: indexed.source,
        recoveredSource: recovered.source,
        stateVersion: state.version,
        redactedStateVersion: redactedState.version,
        hasLookupMethod: typeof window.PolkaswapAgent.lookupTransaction === 'function',
        hasRecoverMethod: typeof window.PolkaswapAgent.recoverTransaction === 'function',
        hasStateMethods:
          typeof window.PolkaswapAgent.exportState === 'function' &&
          typeof window.PolkaswapAgent.importState === 'function' &&
          typeof window.PolkaswapAgent.clearState === 'function',
        hasSubscriptionMethods:
          typeof window.PolkaswapAgent.subscribeTransactions === 'function' &&
          typeof window.PolkaswapAgent.subscribeStatus === 'function',
      };
    });

    const maxResult = await page.evaluate(
      async ({ assetIn, assetOut }) => {
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING' };

        try {
          const max = await window.PolkaswapAgent.maxSwapInput({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
          });

          return { ok: true, amount: max.amount, hasQuote: Boolean(max.quote), warnings: max.warnings };
        } catch (error) {
          return { ok: false, name: error.name, code: error.code, message: error.message };
        }
      },
      { assetIn: assetLookup.assetIn, assetOut: assetLookup.assetOut }
    );

    const liquidityResult = await page.evaluate(
      async ({ assetASymbol, assetBSymbol, amountA, removeAmount }) => {
        const allAssets = await window.PolkaswapAgent.assets();
        const preferredAddresses = {
          XOR: '0x0200000000000000000000000000000000000000000000000000000000000000',
          PSWAP: '0x0200050000000000000000000000000000000000000000000000000000000000',
        };
        const findAsset = (symbol) =>
          allAssets.find((asset) => asset.symbol === symbol && asset.address === preferredAddresses[symbol]) ??
          allAssets.find((asset) => asset.symbol === symbol && asset.name === 'SORA') ??
          allAssets.find((asset) => asset.symbol === symbol && asset.address.startsWith('0x0200')) ??
          allAssets.find((asset) => asset.symbol === symbol);
        const assetA = findAsset(assetASymbol);
        const assetB = findAsset(assetBSymbol);

        if (!(assetA && assetB)) return { ok: false, code: 'ASSET_MISSING', assetASymbol, assetBSymbol };

        try {
          const pool = await window.PolkaswapAgent.poolInfo({
            assetA: { address: assetA.address },
            assetB: { address: assetB.address },
          });
          const addQuote = await window.PolkaswapAgent.quoteAddLiquidity({
            assetA: { address: assetA.address },
            assetB: { address: assetB.address },
            amountA,
          });
          const addPrepare = await window.PolkaswapAgent.prepareAddLiquidity({
            assetA: { address: assetA.address },
            assetB: { address: assetB.address },
            amountA,
          });
          const removeQuote = await window.PolkaswapAgent.quoteRemoveLiquidity({
            assetA: { address: assetA.address },
            assetB: { address: assetB.address },
            liquidityAmount: removeAmount,
          });
          const removePrepare = await window.PolkaswapAgent.prepareRemoveLiquidity({
            assetA: { address: assetA.address },
            assetB: { address: assetB.address },
            liquidityAmount: removeAmount,
          });

          return {
            ok: true,
            pair: `${assetA.symbol}/${assetB.symbol}`,
            poolExists: pool.exists,
            reserveA: pool.reserveA,
            reserveB: pool.reserveB,
            addAmountA: addQuote.amountA,
            addAmountB: addQuote.amountB,
            addMintedLiquidity: addQuote.mintedLiquidity,
            addIntentId: addQuote.intentId,
            addCanExecute: addPrepare.canExecute,
            addWarnings: addPrepare.warnings.map((warning) => warning.code),
            removeAmountA: removeQuote.amountA,
            removeAmountB: removeQuote.amountB,
            removeIntentId: removeQuote.intentId,
            removeCanExecute: removePrepare.canExecute,
            removeWarnings: removePrepare.warnings.map((warning) => warning.code),
          };
        } catch (error) {
          return { ok: false, name: error.name, code: error.code, message: error.message, details: error.details };
        }
      },
      {
        assetASymbol: LP_ASSET_A_SYMBOL,
        assetBSymbol: LP_ASSET_B_SYMBOL,
        amountA: LP_AMOUNT_A,
        removeAmount: LP_REMOVE_AMOUNT,
      }
    );

    const executionResult = await page.evaluate(
      async ({ assetIn, assetOut, amount, executeSwap, walletSource }) => {
        if (!(assetIn && assetOut)) return { ok: false, code: 'ASSET_MISSING' };
        if (walletSource && !executeSwap) {
          return { ok: true, skipped: true, reason: 'Set AGENT_SMOKE_EXECUTE_SWAP=1 to submit a signed swap.' };
        }

        if (!executeSwap) {
          try {
            await window.PolkaswapAgent.executeSwap({
              assetIn: { address: assetIn.address },
              assetOut: { address: assetOut.address },
              amount,
              quoteTimeoutMs: 20_000,
            });
            return { ok: true, skipped: false };
          } catch (error) {
            return { ok: false, skipped: false, name: error.name, code: error.code, message: error.message };
          }
        }

        try {
          const prepared = await window.PolkaswapAgent.prepareSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
          });
          if (!prepared.canExecute) {
            return { ok: false, skipped: false, code: 'PREPARE_BLOCKED', prepared };
          }
          const execution = await window.PolkaswapAgent.executeSwap({
            assetIn: { address: assetIn.address },
            assetOut: { address: assetOut.address },
            amount,
            quoteTimeoutMs: 20_000,
            intentId: prepared.intentId,
            clientOrderId: `agent-smoke-${Date.now()}`,
          });
          return { ok: true, skipped: false, execution };
        } catch (error) {
          return { ok: false, skipped: false, name: error.name, code: error.code, message: error.message };
        }
      },
      {
        assetIn: assetLookup.assetIn,
        assetOut: assetLookup.assetOut,
        amount: QUOTE_AMOUNT,
        executeSwap: EXECUTE_SWAP,
        walletSource: WALLET_SOURCE,
      }
    );

    if (!install.hasAgent) failures.push('window.PolkaswapAgent missing');
    if (install.version !== EXPECTED_AGENT_VERSION) failures.push(`unexpected API version: ${install.version}`);
    if (install.readyEvents.length !== 1) failures.push(`expected one ready event, got ${install.readyEvents.length}`);
    if (install.methods.length !== EXPECTED_AGENT_METHODS.length)
      failures.push(`expected ${EXPECTED_AGENT_METHODS.length} API methods, got ${install.methods.length}`);
    if (discovery.status !== 200 || discovery.manifest.global !== 'window.PolkaswapAgent')
      failures.push('discovery manifest invalid');
    if (discovery.manifest.version !== EXPECTED_AGENT_VERSION) failures.push('discovery manifest version invalid');
    if (discovery.docsStatus !== 200 || !discovery.docsHasGlobal) failures.push('discovery docs invalid');
    if (discovery.typesStatus !== 200 || !discovery.typesHasApi) failures.push('discovery types invalid');
    if (
      discovery.schemaStatus !== 200 ||
      !discovery.schemaHasPrepareSwap ||
      !discovery.schemaHasPrepareSwapResponse ||
      !discovery.schemaHasSwapQuote ||
      !discovery.schemaHasSubscriptionSource ||
      !discovery.schemaHasExportRedaction
    )
      failures.push('discovery schema invalid');
    if (discovery.examplesStatus !== 200 || discovery.examplesCount < 5) failures.push('discovery examples invalid');
    if (
      discovery.errorsStatus !== 200 ||
      discovery.errorsVersion !== EXPECTED_AGENT_VERSION ||
      discovery.errorsCount < 20 ||
      !discovery.errorsHasSigningCancelled ||
      !discovery.manifestHasMethodMetadata
    )
      failures.push('discovery error catalog or method metadata invalid');
    if (
      discovery.clientStatus !== 200 ||
      !clientResult.hasClient ||
      !clientResult.hasAttach ||
      !clientResult.hasSwapHelper ||
      !clientResult.hasTransferHelper ||
      !clientResult.hasAddLiquidityHelper ||
      !clientResult.hasRemoveLiquidityHelper ||
      !clientResult.sameApi
    )
      failures.push('discovery client invalid');
    if (schemaValidationErrors.length)
      failures.push(`schema response validation failed: ${schemaValidationErrors.slice(0, 3).join('; ')}`);
    if (
      capabilityResult.version !== EXPECTED_AGENT_VERSION ||
      !capabilityResult.hasPrepareSwap ||
      !capabilityResult.hasRecoverTransaction ||
      !capabilityResult.hasPortableState
    )
      failures.push('capabilities result invalid');
    if (!readyStatus.nodeConnected) failures.push('node did not become ready');
    if (!assetLookup.assetIn || !assetLookup.assetOut)
      failures.push(`asset pair missing: ${QUOTE_IN_SYMBOL}/${QUOTE_OUT_SYMBOL}`);
    if (!assetLookup.resolvedIn) failures.push('asset resolution failed');
    if (!assetLookup.common.some((asset) => asset.symbol === 'XOR')) failures.push('common assets missing XOR');
    if (!quoteResult.ok) failures.push(`quote failed: ${quoteResult.code ?? quoteResult.message}`);
    if (quoteResult.ok && !quoteResult.intentId) failures.push('quote did not return intentId');
    if (!prepareResult.ok) failures.push(`prepare failed: ${prepareResult.code ?? prepareResult.message}`);
    if (prepareResult.ok && !(prepareResult.swap.preview?.sdkCall && prepareResult.transfer.preview?.sdkCall))
      failures.push('prepare preview missing');
    if (
      !(
        recoveryResult.hasLookupMethod &&
        recoveryResult.hasRecoverMethod &&
        recoveryResult.hasStateMethods &&
        recoveryResult.hasSubscriptionMethods &&
        recoveryResult.stateVersion === EXPECTED_AGENT_VERSION &&
        recoveryResult.redactedStateVersion === EXPECTED_AGENT_VERSION &&
        recoveryResult.localSource === 'none' &&
        recoveryResult.indexedSource === 'none' &&
        recoveryResult.recoveredSource === 'none'
      )
    )
      failures.push('transaction recovery helpers invalid');
    if (!(maxResult.ok || maxResult.code === 'WALLET_NOT_CONNECTED'))
      failures.push(`max helper failed unexpectedly: ${maxResult.code ?? maxResult.message}`);
    if (!liquidityResult.ok)
      failures.push(`liquidity quote failed: ${liquidityResult.code ?? liquidityResult.message}`);
    if (liquidityResult.ok && !(liquidityResult.addIntentId && liquidityResult.removeIntentId))
      failures.push('liquidity quotes did not return intentIds');

    if (WALLET_SOURCE) {
      if (!walletConnect?.ok) failures.push(`wallet connect failed: ${walletConnect?.code ?? walletConnect?.message}`);
      if (EXECUTE_SWAP && !executionResult.ok)
        failures.push(`signed execution failed: ${executionResult.code ?? executionResult.message}`);
    } else if (executionResult.code !== 'WALLET_NOT_CONNECTED') {
      failures.push(
        `no-wallet execution returned ${executionResult.code ?? 'success'} instead of WALLET_NOT_CONNECTED`
      );
    }

    const report = {
      url: APP_URL,
      timestamp: new Date().toISOString(),
      install,
      discovery,
      clientResult,
      capabilityResult,
      readyStatus,
      walletProviders,
      walletRequired,
      walletConnect,
      assetLookup: {
        count: assetLookup.count,
        assetIn: assetLookup.assetIn,
        assetOut: assetLookup.assetOut,
        resolvedIn: assetLookup.resolvedIn,
        common: assetLookup.common,
        query: assetLookup.query.slice(0, 5),
      },
      quoteResult,
      prepareResult,
      schemaSampleResult: {
        ok: schemaSampleResult.ok,
        code: schemaSampleResult.code,
        sampleNames: Object.keys(schemaSampleResult.samples ?? {}),
      },
      schemaValidationErrors,
      recoveryResult,
      maxResult,
      liquidityResult,
      executionResult,
      consoleMessages,
      failures,
      pass: failures.length === 0,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));

    if (failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close().catch(() => {});
    await stopPreviewServer();
  }
};

await run();
