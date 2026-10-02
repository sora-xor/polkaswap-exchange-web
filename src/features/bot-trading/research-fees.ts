import { api } from '@/lib/soraneo-wallet/src/api';
import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec, fromCodec, percent, toCodec } from './amounts';
import { decimalRatio } from './engine';
import type { BotDefinition } from './types';

const FEE_TIMEOUT_MS = 25_000;
const FEE_VALIDITY_MS = 300_000;
// Public SDK estimation address. No account lookup, key, wallet connection, or real signature is used.
const ESTIMATION_ADDRESS = 'cnRuw2R6EVgQW3e4h8XeiFym2iU17fNsms15zRGcg9YEJndAs';

/** An actual fee returned by the selected route at the observed finalized block. */
export interface ResearchRouteFee {
  assetAddress: string;
  amountCodec: string;
  amount: string;
  decimals: number;
  /** Equivalent capital deduction from a verified two-leg route, not a separately executed conversion. */
  conversion?: {
    method: 'route-intermediate-ratio';
    capitalAssetAddress: string;
    convertedAmount: string;
    blockNumber: number;
    blockHash: string;
    grossIntermediateXorCodec: string;
    netIntermediateAfterFeesXorCodec: string;
    firstLegFeeCodec: string;
    secondLegFeeCodec: string;
  };
}

/** Current chain observations applied to historical candles, never claimed to be historical fee observations. */
export interface ResearchFeeSnapshot {
  networkFeeXor: string;
  networkFeeCodec: string;
  swapFeePercent: string;
  /** Nonnegative observed impact, rounded upward to 18 decimal places independently of route fees. */
  priceImpactPercent: string;
  sellNetworkFeeXor: string;
  sellNetworkFeeCodec: string;
  sellSwapFeePercent: string;
  sellPriceImpactPercent: string;
  queriedAt: number;
  /** Chain timestamp of the pinned finalized state; absent only in legacy observations. */
  finalizedAt?: number;
  expiresAt: number;
  blockNumber: number;
  blockHash: string;
  genesisHash: string;
  endpoint: string;
  denominator: string;
  amountIn: string;
  amountOut: string;
  sellAmountIn: string;
  sellAmountOut: string;
  assetInAddress: string;
  assetOutAddress: string;
  dexId: number;
  route: string[];
  routeFees: ResearchRouteFee[];
  sellDexId: number;
  sellRoute: string[];
  sellRouteFees: ResearchRouteFee[];
}

/** The fee request only needs the swap's slippage policy; its notional comes from the tested bot. */
export interface ResearchFeeSettings {
  slippagePercent: string;
}

/** Historical simulations may use explicitly dated finalized state; live setup remains strict by default. */
export interface ResearchFeeOptions {
  allowHistoricalFinalizedState?: boolean;
}

interface FeeQuote {
  dexId: number;
  amountOutCodec: string;
  amountWithoutImpactCodec: string;
  fees: Array<{ assetAddress: string; amountCodec: string }>;
  route: string[];
}

interface FeeContext {
  finalizedAt?: number;
  blockNumber: number;
  blockHash: string;
  genesisHash: string;
  endpoint: string;
  denominator: string;
  assertCurrent(): void;
  quote(bot: BotDefinition, amountCodec: string, dexId?: number): Promise<FeeQuote>;
  networkFee(bot: BotDefinition, quote: FeeQuote, amountCodec: string, minimumCodec: string): Promise<string>;
}

interface ResearchFeeDependencies {
  context(allowHistoricalFinalizedState?: boolean): Promise<FeeContext>;
  now(): number;
}

/** Read quotes, denomination, and transaction-payment information against one finalized chain state. */
async function readFeeContext(allowHistoricalFinalizedState = false): Promise<FeeContext> {
  const readinessDeadline = performance.now() + FEE_TIMEOUT_MS;
  while (!api.connection?.api?.isConnected) {
    if (performance.now() >= readinessDeadline) throw new Error('bots.errors.stale');
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }
  const connection = api.connection;
  const chain = connection?.api;
  const endpoint = connection?.endpoint;
  if (!connection || !chain || !endpoint) throw new Error('bots.errors.stale');
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      chain.isReady,
      new Promise<never>((_resolve, reject) => {
        readyTimer = setTimeout(
          () => reject(new Error('bots.errors.stale')),
          Math.max(0, readinessDeadline - performance.now())
        );
      }),
    ]);
  } finally {
    if (readyTimer !== undefined) clearTimeout(readyTimer);
  }
  if (
    api.connection !== connection ||
    connection.api !== chain ||
    connection.endpoint !== endpoint ||
    !chain.isConnected
  )
    throw new Error('bots.errors.stale');
  const genesisHash = chain?.genesisHash?.toString();
  if (!connection || !chain?.isConnected || !endpoint || !genesisHash) throw new Error('bots.errors.stale');
  const runtimeVersion = chain.runtimeVersion;
  const assertCurrent = () => {
    if (
      api.connection !== connection ||
      connection.api !== chain ||
      connection.endpoint !== endpoint ||
      !chain.isConnected ||
      chain.genesisHash.toString() !== genesisHash ||
      chain.runtimeVersion.specVersion.toString() !== runtimeVersion.specVersion.toString()
    )
      throw new Error('bots.errors.stale');
  };
  const hash = await chain.rpc.chain.getFinalizedHead();
  const [header, state] = await Promise.all([chain.rpc.chain.getHeader(hash), chain.at(hash)]);
  assertCurrent();
  const [denomination, timestamp] = await Promise.all([
    state.query.denomination.denominator(),
    state.query.timestamp.now(),
  ]);
  const denominator = denomination.toString();
  if (!/^[1-9]\d{0,119}$/.test(denominator)) throw new Error('bots.errors.denomination');
  const finalizedAt = Number(timestamp.toString());
  if (
    !Number.isSafeInteger(finalizedAt) ||
    finalizedAt <= 0 ||
    finalizedAt > Date.now() + 30_000 ||
    (!allowHistoricalFinalizedState && Date.now() - finalizedAt > FEE_VALIDITY_MS)
  )
    throw new Error('bots.errors.stale');
  const blockHash = hash.toString();
  const blockNumber = header.number.toNumber();
  if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) throw new Error('bots.errors.stale');
  const dexIds = [...new Set([0, ...(api.dex?.publicDexes ?? []).map((dex) => Number(dex.dexId))])].filter(
    (id) => Number.isSafeInteger(id) && id >= 0
  );
  return {
    finalizedAt,
    blockNumber,
    blockHash,
    genesisHash,
    endpoint: new URL(endpoint).origin,
    denominator,
    assertCurrent,
    async quote(bot, amountCodec, requiredDexId) {
      const selectedDexIds = requiredDexId === undefined ? dexIds : dexIds.filter((id) => id === requiredDexId);
      const results = await Promise.allSettled(
        selectedDexIds.map(async (dexId): Promise<FeeQuote> => {
          const result = await chain.rpc.liquidityProxy.quote(
            dexId,
            bot.assetIn.address,
            bot.assetOut.address,
            amountCodec,
            'WithDesiredInput',
            [],
            'Disabled',
            hash
          );
          if (result.isNone) throw new Error('bots.errors.quote');
          const value = result.unwrap();
          const fees: FeeQuote['fees'] = [];
          value.fee.forEach((amount, asset) =>
            fees.push({ assetAddress: asset.toString(), amountCodec: amount.toString() })
          );
          return {
            dexId,
            amountOutCodec: value.amount.toString(),
            amountWithoutImpactCodec: value.amountWithoutImpact.toString(),
            fees,
            route: value.route.map((asset) => asset.toString()),
          };
        })
      );
      assertCurrent();
      const quotes = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
      const best = quotes.reduce<FeeQuote | null>(
        (current, quote) => (!current || codec(quote.amountOutCodec) > codec(current.amountOutCodec) ? quote : current),
        null
      );
      if (!best || codec(best.amountOutCodec) === 0n) throw new Error('bots.errors.quote');
      return best;
    },
    async networkFee(bot, quote, amountCodec, minimumCodec) {
      const tx = chain.tx.liquidityProxy.swap(
        quote.dexId,
        bot.assetIn.address,
        bot.assetOut.address,
        { WithDesiredInput: { desiredAmountIn: amountCodec, minAmountOut: minimumCodec } },
        [],
        'Disabled'
      );
      // Match the SDK paymentInfo envelope with a dummy signature, then query the pinned runtime.
      // signFake performs no cryptography, contacts no wallet, and the bytes are never submitted.
      tx.signFake(ESTIMATION_ADDRESS, {
        nonce: 0,
        genesisHash: chain.genesisHash,
        blockHash: chain.genesisHash,
        runtimeVersion,
      });
      const bytes = tx.toU8a();
      const fee = await state.call.transactionPaymentApi.queryInfo(bytes, bytes.length);
      assertCurrent();
      return fee.partialFee.toString();
    },
  };
}

/** Sum an observed XOR fee map, refusing other fee assets rather than inventing a conversion price. */
function xorFees(quote: FeeQuote): bigint {
  return quote.fees.reduce((total, fee) => {
    if (fee.assetAddress !== XOR.address) throw new Error('bots.errors.quote');
    return total + codec(fee.amountCodec);
  }, 0n);
}

/** Validate the exact route so independently selected liquidity cannot masquerade as the observed swap. */
function matchesRoute(quote: FeeQuote, dexId: number, assets: string[]): boolean {
  return (
    quote.dexId === dexId &&
    quote.route.length === assets.length &&
    quote.route.every((asset, i) => asset === assets[i])
  );
}

/**
 * Reproduce an A → XOR → B quote at the same finalized block and DEX. The runtime deducts the first
 * fee from XOR output and the second from that net XOR input. Their combined deduction is therefore
 * (first fee + second fee) / (first net output + first fee), without an extra conversion swap or its impact.
 */
async function normalizeIntermediateXorFees(
  bot: BotDefinition,
  quote: FeeQuote,
  amountIn: string,
  context: FeeContext
) {
  if (
    !matchesRoute(quote, quote.dexId, [bot.assetIn.address, XOR.address, bot.assetOut.address]) ||
    quote.fees.length !== 1
  )
    throw new Error('bots.errors.quote');
  const totalFee = xorFees(quote);
  const firstBot: BotDefinition = { ...bot, assetOut: { ...XOR } };
  const first = await context.quote(firstBot, toCodec(amountIn, bot.assetIn.decimals), quote.dexId);
  if (!matchesRoute(first, quote.dexId, [bot.assetIn.address, XOR.address])) throw new Error('bots.errors.quote');
  const intermediate = codec(first.amountOutCodec);
  if (intermediate === 0n) throw new Error('bots.errors.quote');
  const secondBot: BotDefinition = {
    ...bot,
    assetIn: { ...XOR },
    strategy: { ...bot.strategy, amount: fromCodec(first.amountOutCodec, XOR.decimals) },
  };
  const second = await context.quote(secondBot, first.amountOutCodec, quote.dexId);
  if (
    !matchesRoute(second, quote.dexId, [XOR.address, bot.assetOut.address]) ||
    codec(second.amountOutCodec) !== codec(quote.amountOutCodec)
  )
    throw new Error('bots.errors.quote');
  const firstFee = xorFees(first);
  const secondFee = xorFees(second);
  if (firstFee + secondFee !== totalFee || secondFee >= intermediate) throw new Error('bots.errors.quote');
  const gross = intermediate + firstFee;
  // Round the rational values once in integer units; an intermediate decimal ratio could erase tiny fees.
  const percentCodec = ((totalFee * 100n * 10n ** 18n + gross - 1n) / gross).toString();
  const swapFeePercent = new FPNumber(fromCodec(percentCodec, 18), 18).value.toFixed(18);
  const convertedCodec = ((codec(toCodec(amountIn, bot.assetIn.decimals)) * totalFee + gross - 1n) / gross).toString();
  percent(swapFeePercent);
  const routeFees: ResearchRouteFee[] = [
    {
      assetAddress: XOR.address,
      amountCodec: totalFee.toString(),
      amount: fromCodec(totalFee.toString(), XOR.decimals),
      decimals: XOR.decimals,
      conversion: {
        method: 'route-intermediate-ratio',
        capitalAssetAddress: bot.assetIn.address,
        convertedAmount: new FPNumber(
          fromCodec(convertedCodec, bot.assetIn.decimals),
          bot.assetIn.decimals
        ).value.toFixed(bot.assetIn.decimals),
        blockNumber: context.blockNumber,
        blockHash: context.blockHash,
        grossIntermediateXorCodec: gross.toString(),
        netIntermediateAfterFeesXorCodec: (intermediate - secondFee).toString(),
        firstLegFeeCodec: firstFee.toString(),
        secondLegFeeCodec: secondFee.toString(),
      },
    },
  ];
  return { routeFees, swapFeePercent };
}

/** Preserve tiny positive impacts by rounding the exact integer ratio upward only once. */
function observedPriceImpact(quote: FeeQuote): string {
  let output: bigint;
  let withoutImpact: bigint;
  try {
    output = codec(quote.amountOutCodec);
    withoutImpact = codec(quote.amountWithoutImpactCodec);
  } catch {
    throw new Error('bots.errors.quote');
  }
  if (output === 0n || withoutImpact === 0n) throw new Error('bots.errors.quote');
  const deduction = withoutImpact > output ? withoutImpact - output : 0n;
  const percentCodec = ((deduction * 100n * 10n ** 18n + withoutImpact - 1n) / withoutImpact).toString();
  return new FPNumber(fromCodec(percentCodec, 18), 36).value.toFixed(18);
}

/** Normalize observed input/output fees, or verify an XOR intermediary before expressing its equivalent deduction. */
async function normalizeRouteFees(bot: BotDefinition, quote: FeeQuote, amountIn: string, context: FeeContext) {
  if (
    bot.assetIn.address !== XOR.address &&
    bot.assetOut.address !== XOR.address &&
    quote.fees.some((fee) => fee.assetAddress === XOR.address)
  )
    return normalizeIntermediateXorFees(bot, quote, amountIn, context);
  let inputFees = new FPNumber('0', 36);
  let outputFees = new FPNumber('0', 36);
  const routeFees = quote.fees.map(({ assetAddress, amountCodec }): ResearchRouteFee => {
    const asset = [bot.assetIn, bot.assetOut].find((candidate) => candidate.address === assetAddress);
    if (!asset) throw new Error('bots.errors.quote');
    const amount = fromCodec(amountCodec, asset.decimals);
    if (asset.address === bot.assetIn.address) inputFees = inputFees.add(new FPNumber(amount, 36));
    else outputFees = outputFees.add(new FPNumber(amount, 36));
    return { assetAddress, amountCodec, amount, decimals: asset.decimals };
  });
  const input = new FPNumber(amountIn, 36);
  const output = new FPNumber(fromCodec(quote.amountOutCodec, bot.assetOut.decimals), 36);
  if (inputFees.gte(input) || output.isZero()) throw new Error('bots.errors.quote');
  const inputRetained = new FPNumber('1', 36).sub(decimalRatio(inputFees, input));
  const outputRetained = decimalRatio(output, output.add(outputFees));
  const swapFeePercent = new FPNumber('1', 36)
    .sub(inputRetained.mul(outputRetained))
    .mul(new FPNumber('100', 36))
    .value.toFixed(18, 0);
  percent(swapFeePercent);
  return { routeFees, swapFeePercent };
}

/** Fresh, bounded, account-independent fee observation. No synthetic values or cached fee fallback. */
export function createResearchFeeLoader(deps: ResearchFeeDependencies = { context: readFeeContext, now: Date.now }) {
  let generation = 0;
  return {
    /** Load the selected pair and tested notional, discarding late results after cancellation. */
    async load(
      bot: BotDefinition,
      settings: ResearchFeeSettings,
      options: ResearchFeeOptions = {}
    ): Promise<ResearchFeeSnapshot> {
      const version = generation;
      const startedAt = deps.now();
      const monotonicStart = performance.now();
      const amountCodec = toCodec(bot.strategy.amount, bot.assetIn.decimals);
      if (codec(amountCodec) === 0n || bot.assetIn.address === bot.assetOut.address)
        throw new Error('bots.errors.amount');
      if (bot.policy.feeAsset.address !== XOR.address || bot.policy.feeAsset.decimals !== XOR.decimals)
        throw new Error('bots.errors.quote');
      const slippage = percent(settings.slippagePercent, '50');
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          (async () => {
            const context = await deps.context(options.allowHistoricalFinalizedState === true);
            if (version !== generation) throw new Error('bots.errors.stale');
            const quote = await context.quote(bot, amountCodec);
            const priceImpactPercent = observedPriceImpact(quote);
            const minimum = new FPNumber(fromCodec(quote.amountOutCodec, bot.assetOut.decimals), 36)
              .mul(new FPNumber('1', 36).sub(decimalRatio(slippage, new FPNumber('100', 36))))
              .value.toFixed(bot.assetOut.decimals, 1);
            const feeCodec = await context.networkFee(bot, quote, amountCodec, toCodec(minimum, bot.assetOut.decimals));
            if (codec(feeCodec) === 0n) throw new Error('bots.errors.quote');
            const { routeFees, swapFeePercent } = await normalizeRouteFees(bot, quote, bot.strategy.amount, context);
            const sellAmountIn = fromCodec(quote.amountOutCodec, bot.assetOut.decimals);
            const reverseBot: BotDefinition = {
              ...bot,
              assetIn: bot.assetOut,
              assetOut: bot.assetIn,
              strategy: { ...bot.strategy, amount: sellAmountIn },
            };
            const sellQuote = await context.quote(reverseBot, quote.amountOutCodec);
            const sellPriceImpactPercent = observedPriceImpact(sellQuote);
            const sellMinimum = new FPNumber(fromCodec(sellQuote.amountOutCodec, bot.assetIn.decimals), 36)
              .mul(new FPNumber('1', 36).sub(decimalRatio(slippage, new FPNumber('100', 36))))
              .value.toFixed(bot.assetIn.decimals, 1);
            const sellFeeCodec = await context.networkFee(
              reverseBot,
              sellQuote,
              quote.amountOutCodec,
              toCodec(sellMinimum, bot.assetIn.decimals)
            );
            if (codec(sellFeeCodec) === 0n) throw new Error('bots.errors.quote');
            const sellFees = await normalizeRouteFees(reverseBot, sellQuote, sellAmountIn, context);
            context.assertCurrent();
            const queriedAt = deps.now();
            if (version !== generation || queriedAt < startedAt || performance.now() - monotonicStart > FEE_TIMEOUT_MS)
              throw new Error('bots.errors.stale');
            return {
              networkFeeXor: fromCodec(feeCodec, XOR.decimals),
              networkFeeCodec: feeCodec,
              swapFeePercent,
              priceImpactPercent,
              sellNetworkFeeXor: fromCodec(sellFeeCodec, XOR.decimals),
              sellNetworkFeeCodec: sellFeeCodec,
              sellSwapFeePercent: sellFees.swapFeePercent,
              sellPriceImpactPercent,
              queriedAt,
              ...(context.finalizedAt !== undefined ? { finalizedAt: context.finalizedAt } : {}),
              expiresAt: queriedAt + FEE_VALIDITY_MS,
              blockNumber: context.blockNumber,
              blockHash: context.blockHash,
              genesisHash: context.genesisHash,
              endpoint: context.endpoint,
              denominator: context.denominator,
              amountIn: bot.strategy.amount,
              amountOut: fromCodec(quote.amountOutCodec, bot.assetOut.decimals),
              sellAmountIn,
              sellAmountOut: fromCodec(sellQuote.amountOutCodec, bot.assetIn.decimals),
              assetInAddress: bot.assetIn.address,
              assetOutAddress: bot.assetOut.address,
              dexId: quote.dexId,
              route: [...quote.route],
              routeFees,
              sellDexId: sellQuote.dexId,
              sellRoute: [...sellQuote.route],
              sellRouteFees: sellFees.routeFees,
            };
          })(),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('bots.errors.quote')), FEE_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
    /** Prevent pending results from reaching a disposed or reset workspace. */
    clear(): void {
      generation += 1;
    },
  };
}
