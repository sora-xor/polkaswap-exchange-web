#!/usr/bin/env node
import { chromium } from 'playwright';

const appUrl = process.env.POLKASWAP_AGENT_URL || 'https://polkaswap.io/#/swap';
const assetInSymbol = process.env.POLKASWAP_AGENT_ASSET_IN || 'XOR';
const assetOutSymbol = process.env.POLKASWAP_AGENT_ASSET_OUT || 'PSWAP';
const amount = process.env.POLKASWAP_AGENT_AMOUNT || '1';
const side = process.env.POLKASWAP_AGENT_SIDE || 'input';
const walletSource = process.env.POLKASWAP_AGENT_WALLET_SOURCE || '';
const walletAddress = process.env.POLKASWAP_AGENT_WALLET_ADDRESS || '';
const executeSwap = process.env.POLKASWAP_AGENT_EXECUTE_SWAP === '1';
const headless = process.env.POLKASWAP_AGENT_HEADLESS !== '0';
const readyTimeoutMs = Number(process.env.POLKASWAP_AGENT_READY_TIMEOUT_MS || 30_000);
const quoteTimeoutMs = Number(process.env.POLKASWAP_AGENT_QUOTE_TIMEOUT_MS || 15_000);

function toErrorShape(error) {
  return {
    name: error?.name,
    code: error?.code,
    message: error?.message || String(error),
    details: error?.details,
  };
}

const browser = await chromium.launch({ headless });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.addInitScript(() => {
    localStorage.setItem('dexSettings.disclaimerApprove', 'true');
  });

  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.PolkaswapAgent), { timeout: readyTimeoutMs });

  const result = await page.evaluate(
    async ({
      assetInSymbol,
      assetOutSymbol,
      amount,
      side,
      walletSource,
      walletAddress,
      executeSwap,
      readyTimeoutMs,
      quoteTimeoutMs,
    }) => {
      const manifestUrl = new URL(
        '.well-known/polkaswap-agent.json',
        `${location.origin}${location.pathname}`
      ).toString();
      const manifest = await fetch(manifestUrl).then((response) => response.json());
      const errorCatalog = manifest.errorCatalog
        ? await fetch(new URL(manifest.errorCatalog, manifestUrl).toString()).then((response) => response.json())
        : null;

      if (manifest.version !== 'v1') {
        throw new Error(`Unsupported PolkaswapAgent version: ${manifest.version}`);
      }

      const agent = window.PolkaswapAgent;
      const ready = await agent.ready({ requireNode: true, timeoutMs: readyTimeoutMs });
      const capabilities = agent.capabilities();

      let wallet = null;
      if (walletSource) {
        const providers = await agent.refreshWallets();
        const provider = providers.find((item) => item.source === walletSource);
        if (!provider?.available) {
          throw Object.assign(new Error(`Wallet provider is unavailable: ${walletSource}`), {
            code: 'WALLET_NOT_FOUND',
          });
        }

        const accounts = await agent.walletAccounts({ source: walletSource });
        const account = walletAddress ? accounts.find((item) => item.address === walletAddress) : accounts[0];
        if (!account) {
          throw Object.assign(new Error(`Wallet account is unavailable: ${walletAddress || walletSource}`), {
            code: 'WALLET_ACCOUNT_NOT_FOUND',
          });
        }

        wallet = await agent.connectWallet({ source: walletSource, address: account.address });
        await agent.ready({ requireWallet: true, timeoutMs: readyTimeoutMs });
      }

      const assetInResolved = await agent.resolveAsset({ asset: { symbol: assetInSymbol }, includeBalance: true });
      const assetOutResolved = await agent.resolveAsset({ asset: { symbol: assetOutSymbol }, includeBalance: true });
      const assetIn = { address: assetInResolved.address };
      const assetOut = { address: assetOutResolved.address };
      const request = { assetIn, assetOut, amount, side, quoteTimeoutMs };
      const quote = await agent.quoteSwap(request);
      const prepared = await agent.prepareSwap(request);
      const criticalWarnings = prepared.warnings.filter((warning) => warning.severity === 'critical');

      let execution = null;
      if (executeSwap) {
        if (!prepared.canExecute || criticalWarnings.length) {
          throw Object.assign(new Error('Prepared swap is not executable.'), {
            code: criticalWarnings[0]?.code || 'NOT_EXECUTABLE',
            prepared,
          });
        }

        execution = await agent.executeSwap({
          ...request,
          amount: side === 'output' ? prepared.quote.request.amount : prepared.quote.amountIn,
          slippageTolerance: prepared.quote.request.slippageTolerance,
          intentId: prepared.intentId,
          clientOrderId: `example-agent-runner-${Date.now()}`,
        });
      }

      return {
        manifest: {
          url: manifestUrl,
          version: manifest.version,
          docs: new URL(manifest.docs, manifestUrl).toString(),
          schema: new URL(manifest.schema, manifestUrl).toString(),
          examples: new URL(manifest.examples, manifestUrl).toString(),
          errorCatalog: manifest.errorCatalog ? new URL(manifest.errorCatalog, manifestUrl).toString() : null,
          methodMetadata: manifest.methodMetadata,
          knownErrorCount: errorCatalog ? Object.keys(errorCatalog.errors || {}).length : 0,
        },
        status: {
          node: ready.node,
          wallet: {
            connected: ready.wallet.connected,
            address: ready.wallet.address,
            source: ready.wallet.source,
          },
          slippageTolerance: ready.settings.slippageTolerance,
        },
        capabilities: {
          version: capabilities.version,
          methodCount: capabilities.methods.length,
          stateChangingMethods: manifest.methodMetadata?.stateChanging || [],
        },
        wallet,
        assets: {
          in: assetInResolved,
          out: assetOutResolved,
        },
        quote: {
          amountIn: quote.amountIn,
          amountOut: quote.amountOut,
          minAmountOut: quote.minAmountOut,
          maxAmountIn: quote.maxAmountIn,
          priceImpact: quote.priceImpact,
          dexId: quote.dexId,
        },
        prepared: {
          intentId: prepared.intentId,
          canExecute: prepared.canExecute,
          warnings: prepared.warnings,
          requiredBalances: prepared.requiredBalances,
          fees: prepared.fees,
          preview: prepared.preview,
        },
        execution,
      };
    },
    {
      assetInSymbol,
      assetOutSymbol,
      amount,
      side,
      walletSource,
      walletAddress,
      executeSwap,
      readyTimeoutMs,
      quoteTimeoutMs,
    }
  );

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: toErrorShape(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
