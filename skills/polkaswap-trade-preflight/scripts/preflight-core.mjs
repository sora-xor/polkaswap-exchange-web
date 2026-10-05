/** Wallet-independent validation and reporting for the Polkaswap preflight CLI. */
export const APP_URL = 'https://polkaswap.io/?polkaswap-agent=1#/swap';
export const SORA_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const DECIMAL = /^(?:0|[1-9][0-9]{0,59})(?:\.[0-9]{1,30})?$/;
const ADDRESS = /^0x[0-9a-f]{64}$/;
const SAFE_CODES = new Set([
  'ASSET_AMBIGUOUS',
  'ASSET_NOT_FOUND',
  'NODE_NOT_READY',
  'NETWORK_CONTEXT_UNAVAILABLE',
  'PATH_UNAVAILABLE',
  'QUOTE_TIMEOUT',
  'AGENT_API_UNAVAILABLE',
  'UNTRUSTED_APP_LOCATION',
  'UNSUPPORTED_AGENT_VERSION',
  'PREFLIGHT_TIMEOUT',
  'INVALID_INPUT',
  'INVALID_PLAN',
  'RUNTIME_UNAVAILABLE',
]);
const WARNING_MESSAGES = {
  FEE_UNAVAILABLE: 'The network fee estimate is unavailable; execution readiness is unknown.',
  HIGH_PRICE_IMPACT: 'The quote reports high price impact. Review the exact percentage.',
  LOW_LIQUIDITY: 'The route reports low liquidity.',
  NON_CANONICAL_ASSET: 'Verify the explicit asset address before making a decision.',
  PATH_UNAVAILABLE: 'The requested route is unavailable.',
};

/** Fixed diagnostics exclude upstream provider, browser and credential-bearing messages. */
export class PreflightError extends Error {
  constructor(code) {
    super(SAFE_CODES.has(code) ? code : 'PREFLIGHT_FAILED');
    this.code = SAFE_CODES.has(code) ? code : 'PREFLIGHT_FAILED';
  }
}

const requireValue = (condition, code = 'INVALID_PLAN') => {
  if (!condition) throw new PreflightError(code);
};
const positive = (value) => typeof value === 'string' && DECIMAL.test(value) && /[1-9]/.test(value);
const decimal = (value) => typeof value === 'string' && DECIMAL.test(value);

/** Parse a symbol or canonical-length SORA asset ID without accepting URLs or control bytes. */
export function assetReference(value) {
  if (typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)) return { address: value.toLowerCase() };
  requireValue(typeof value === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(value), 'INVALID_INPUT');
  return { symbol: value };
}

/** Validate decimal strings exactly; the CLI accepts no wallet or execution options. */
export function parseArguments(argv, env = {}) {
  const allowed = new Set(['--asset-in', '--asset-out', '--amount', '--side', '--slippage', '--runtime-dir']);
  const values = {};
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    requireValue(
      allowed.has(key) && !Object.hasOwn(values, key) && typeof argv[index + 1] === 'string',
      'INVALID_INPUT'
    );
    values[key] = argv[index + 1];
  }
  const amount = values['--amount'];
  const side = values['--side'] ?? 'input';
  const slippageTolerance = values['--slippage'] ?? '0.5';
  requireValue(positive(amount) && ['input', 'output'].includes(side), 'INVALID_INPUT');
  requireValue(decimal(slippageTolerance), 'INVALID_INPUT');
  const [whole, fraction = ''] = slippageTolerance.split('.');
  const scaled = BigInt(whole + fraction.padEnd(30, '0'));
  requireValue(scaled >= 10n ** 28n && scaled <= 10n ** 31n, 'INVALID_INPUT');
  return {
    assetIn: assetReference(values['--asset-in']),
    assetOut: assetReference(values['--asset-out']),
    amount,
    side,
    slippageTolerance,
    runtimeDir: values['--runtime-dir'] ?? env.POLKASWAP_PREFLIGHT_RUNTIME_DIR,
    dexId: 'best',
    quoteTimeoutMs: 30_000,
  };
}

/** Explicit public metadata projection: balances and arbitrary extra fields never cross this boundary. */
export function publicAsset(asset, includeCanonical = false) {
  requireValue(
    asset &&
      ADDRESS.test(asset.address) &&
      typeof asset.symbol === 'string' &&
      /^[^\u0000-\u001f\u007f]{1,64}$/.test(asset.symbol)
  );
  requireValue(Number.isSafeInteger(asset.decimals) && asset.decimals >= 0 && asset.decimals <= 30);
  if (includeCanonical) requireValue(typeof asset.canonical === 'boolean');
  return {
    address: asset.address,
    symbol: asset.symbol,
    decimals: asset.decimals,
    ...(includeCanonical ? { canonical: asset.canonical } : {}),
  };
}

/** Compare arbitrary nonnegative decimal strings without floating-point token math. */
function compareDecimal(left, right) {
  const [a, af = ''] = left.split('.');
  const [b, bf = ''] = right.split('.');
  const places = Math.max(af.length, bf.length);
  const x = BigInt(a + af.padEnd(places, '0'));
  const y = BigInt(b + bf.padEnd(places, '0'));
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Preserve chain codec evidence without inventing a denomination or recomputing units. */
function publicAmount(meta, asset, value) {
  requireValue(
    meta &&
      meta.asset?.address === asset.address &&
      meta.decimals === asset.decimals &&
      decimal(meta.value) &&
      compareDecimal(meta.value, value) === 0 &&
      typeof meta.codec === 'string' &&
      /^(?:0|[1-9][0-9]{0,119})$/.test(meta.codec)
  );
  return { value: meta.value, codec: meta.codec, decimals: meta.decimals };
}

/** Bind a public unsigned plan to the requested assets, amount, side, bounds and SORA network. */
export function publicReport(data, options, now = Date.now()) {
  const input = publicAsset(data.assetIn, true);
  const output = publicAsset(data.assetOut, true);
  const plan = data.plan;
  requireValue(plan?.mode === 'unsigned' && plan.canExecute === false && plan.requiresWallet === false);
  const quote = plan.quote;
  requireValue(
    quote &&
      quote.assetIn?.address === input.address &&
      quote.assetOut?.address === output.address &&
      input.address !== output.address
  );
  requireValue(
    decimal(quote.request?.amount) &&
      compareDecimal(quote.request.amount, options.amount) === 0 &&
      quote.request.side === options.side &&
      decimal(quote.request.slippageTolerance) &&
      compareDecimal(quote.request.slippageTolerance, options.slippageTolerance) === 0 &&
      quote.request.dexId === options.dexId
  );
  requireValue(positive(quote.amountIn) && positive(quote.amountOut));
  requireValue(compareDecimal(options.side === 'input' ? quote.amountIn : quote.amountOut, options.amount) === 0);
  requireValue(typeof quote.quoteDigest === 'string' && /^[0-9a-f]{64}$/.test(quote.quoteDigest));
  requireValue(
    typeof quote.priceImpact === 'string' && /^-?(?:0|[1-9][0-9]{0,59})(?:\.[0-9]{1,30})?$/.test(quote.priceImpact)
  );
  requireValue(Number.isSafeInteger(quote.dexId) && quote.dexId >= 0 && quote.dexId <= 65535);
  requireValue(
    Array.isArray(quote.route) &&
      quote.route.length >= 2 &&
      quote.route.length <= 16 &&
      quote.route.every((address) => ADDRESS.test(address))
  );
  requireValue(quote.route[0] === input.address && quote.route.at(-1) === output.address);
  const sources = new Set(['XYKPool', 'XSTPool', 'MulticollateralBondingCurvePool', 'OrderBook']);
  requireValue(
    Array.isArray(quote.liquiditySources) &&
      quote.liquiditySources.length <= 16 &&
      quote.liquiditySources.every((source) => sources.has(source))
  );
  const distribution = (quote.distribution ?? []).map((path) => {
    requireValue(Array.isArray(path) && path.length > 0 && path.length <= 16);
    return path.map((leg) => {
      requireValue(
        sources.has(leg.market) &&
          ADDRESS.test(leg.input) &&
          ADDRESS.test(leg.output) &&
          decimal(leg.income) &&
          decimal(leg.outcome) &&
          decimal(leg.fee)
      );
      return {
        market: leg.market,
        input: leg.input,
        output: leg.output,
        income: leg.income,
        outcome: leg.outcome,
        fee: leg.fee,
      };
    });
  });
  requireValue(distribution.length <= 16);
  const bound = options.side === 'input' ? quote.minAmountOut : quote.maxAmountIn;
  requireValue(positive(bound));
  requireValue(
    options.side === 'input' ? compareDecimal(bound, quote.amountOut) <= 0 : compareDecimal(bound, quote.amountIn) >= 0
  );
  requireValue(
    Number.isSafeInteger(plan.plannedAt) &&
      Number.isSafeInteger(plan.expiresAt) &&
      plan.plannedAt <= now + 30_000 &&
      plan.expiresAt > now &&
      plan.expiresAt > plan.plannedAt &&
      plan.expiresAt - plan.plannedAt <= 300_000
  );
  requireValue(
    plan.network?.genesisHash === SORA_GENESIS &&
      Number.isSafeInteger(plan.network.runtimeSpecVersion) &&
      plan.network.runtimeSpecVersion > 0 &&
      Number.isSafeInteger(plan.network.blockNumber) &&
      plan.network.blockNumber >= 0
  );
  requireValue(Array.isArray(plan.fees) && plan.fees.length > 0 && plan.fees.length <= 8);
  const fees = plan.fees.map((fee) => {
    requireValue(
      ['static', 'finalized-runtime', 'unavailable'].includes(fee.source) &&
        decimal(fee.amount) &&
        typeof fee.amountCodec === 'string' &&
        /^(?:0|[1-9][0-9]{0,119})$/.test(fee.amountCodec)
    );
    return { asset: publicAsset(fee.asset), amount: fee.amount, amountCodec: fee.amountCodec, source: fee.source };
  });
  requireValue(Array.isArray(plan.warnings) && plan.warnings.length <= 32);
  const warnings = plan.warnings.map((warning) => {
    requireValue(
      Object.hasOwn(WARNING_MESSAGES, warning.code) && ['info', 'warning', 'critical'].includes(warning.severity)
    );
    return { code: warning.code, severity: warning.severity, message: WARNING_MESSAGES[warning.code] };
  });
  if (!input.canonical || !output.canonical)
    warnings.push({ code: 'NON_CANONICAL_ASSET', severity: 'warning', message: WARNING_MESSAGES.NON_CANONICAL_ASSET });
  return {
    schemaVersion: 1,
    observedAt: now,
    appUrl: APP_URL,
    handoffUrl: 'https://polkaswap.io/#/swap',
    mode: 'unsigned',
    canExecute: false,
    requiresWallet: false,
    assessment: warnings.some((warning) => warning.severity === 'critical')
      ? 'quoted-with-critical-constraints'
      : 'quoted',
    assets: { input, output },
    request: {
      amount: options.amount,
      side: options.side,
      slippageTolerance: options.slippageTolerance,
      dexId: options.dexId,
    },
    quote: {
      quoteDigest: quote.quoteDigest,
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      ...(options.side === 'input' ? { minAmountOut: bound } : { maxAmountIn: bound }),
      amountInMeta: publicAmount(quote.amountInMeta, input, quote.amountIn),
      amountOutMeta: publicAmount(quote.amountOutMeta, output, quote.amountOut),
      boundMeta: publicAmount(
        options.side === 'input' ? quote.minAmountOutMeta : quote.maxAmountInMeta,
        options.side === 'input' ? output : input,
        bound
      ),
      priceImpact: quote.priceImpact,
      dexId: quote.dexId,
      route: [...quote.route],
      liquiditySources: [...quote.liquiditySources],
      distribution,
      selectedSources: [...new Set(distribution.flat().map((leg) => leg.market))],
      distributionFeeAsset: 'unspecified-by-public-api',
    },
    fees,
    warnings,
    plannedAt: plan.plannedAt,
    expiresAt: plan.expiresAt,
    network: {
      genesisHash: plan.network.genesisHash,
      runtimeSpecVersion: plan.network.runtimeSpecVersion,
      blockNumber: plan.network.blockNumber,
    },
    constraints: {
      balancesChecked: false,
      signerFeeChecked: false,
      fillGuaranteed: false,
      supportedRoutesOnly: true,
      refreshBeforeWalletReview: true,
      unitSystem: 'current-sora-native',
    },
  };
}

/** Invoke only public discovery/readiness/planning in a pinned empty browser page. */
export async function readPublicPlan(page, options) {
  requireValue(page.url() === APP_URL, 'UNTRUSTED_APP_LOCATION');
  const result = await page.evaluate(
    async ({ appUrl, request }) => {
      const assertLocation = () => {
        if (window.location.href !== appUrl) throw { code: 'UNTRUSTED_APP_LOCATION' };
      };
      try {
        assertLocation();
        const agent = window.PolkaswapAgent;
        if (!agent) throw { code: 'AGENT_API_UNAVAILABLE' };
        if (agent.capabilities().version !== 'v1') throw { code: 'UNSUPPORTED_AGENT_VERSION' };
        await agent.ready({ requireNode: true, requireWallet: false, timeoutMs: 60_000 });
        assertLocation();
        const assetIn = await agent.resolveAsset({ asset: request.assetIn, includeBalance: false });
        assertLocation();
        const assetOut = await agent.resolveAsset({ asset: request.assetOut, includeBalance: false });
        assertLocation();
        const plan = await agent.planSwap({
          ...request,
          assetIn: { address: assetIn.address },
          assetOut: { address: assetOut.address },
        });
        assertLocation();
        return { ok: true, assetIn, assetOut, plan };
      } catch (error) {
        return { ok: false, code: error?.code };
      }
    },
    {
      appUrl: APP_URL,
      request: {
        assetIn: options.assetIn,
        assetOut: options.assetOut,
        amount: options.amount,
        side: options.side,
        slippageTolerance: options.slippageTolerance,
        dexId: options.dexId,
        quoteTimeoutMs: options.quoteTimeoutMs,
      },
    }
  );
  if (!result?.ok) throw new PreflightError(result?.code);
  return result;
}

/** Empty, nonpersistent Chromium session with bounded lifecycle and guaranteed owned-browser cleanup. */
export async function runPreflight(chromium, options, { now = Date.now, timeoutMs = 150_000 } = {}) {
  let browser;
  let expired = false;
  let timer;
  const work = async () => {
    browser = await chromium.launch({ headless: true, timeout: 30_000 });
    if (expired) {
      await browser.close();
      throw new PreflightError('PREFLIGHT_TIMEOUT');
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => Boolean(window.PolkaswapAgent), undefined, { timeout: 60_000 });
    return publicReport(await readPublicPlan(page, options), options, now());
  };
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new PreflightError('PREFLIGHT_TIMEOUT'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (browser) await browser.close();
  }
}
