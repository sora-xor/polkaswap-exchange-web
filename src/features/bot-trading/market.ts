import { FPNumber } from '@/lib/substrate/math';
import type { AgentNodeStatus, AgentSwapQuote, PolkaswapAgentApi } from '@/features/agent-trading/types';
import { codec, toCodec } from './amounts';
import { decimalRatio, parseBotPrice } from './engine';
import type { BotAsset, BotCandle, BotDefinition } from './types';

const TIMEOUT_MS = 5000;

/** Keep a read-only quote tied to one connected runtime and finalized-history identity. */
function assertNode(node: AgentNodeStatus, bot: BotDefinition, previous?: AgentNodeStatus): void {
  if (
    !node.connected ||
    !node.endpoint ||
    !node.genesisHash ||
    !Number.isSafeInteger(node.blockNumber) ||
    node.blockNumber < 1 ||
    !Number.isSafeInteger(node.runtimeSpecVersion) ||
    node.runtimeSpecVersion < 1 ||
    (bot.mode === 'live' && bot.network !== node.genesisHash) ||
    (previous &&
      (node.genesisHash !== previous.genesisHash ||
        node.endpoint !== previous.endpoint ||
        node.runtimeSpecVersion !== previous.runtimeSpecVersion ||
        node.blockNumber < previous.blockNumber))
  ) {
    throw new Error('bots.errors.stale');
  }
}

/** Verify exact request/response identities and positive precision-preserving amounts before deriving a price. */
function assertMarketQuote(quote: AgentSwapQuote, input: BotAsset, output: BotAsset, amount: string): void {
  const inputCodec = toCodec(amount, input.decimals);
  const sameAsset = (actual: BotAsset | undefined, expected: BotAsset): boolean =>
    actual?.address === expected.address && actual?.decimals === expected.decimals;
  if (
    !codec(inputCodec) ||
    !sameAsset(quote.assetIn, input) ||
    !sameAsset(quote.assetOut, output) ||
    quote.request?.side !== 'input' ||
    toCodec(quote.request.amount, input.decimals) !== inputCodec ||
    toCodec(quote.amountIn, input.decimals) !== inputCodec ||
    !Array.isArray(quote.route) ||
    quote.route.length < 2 ||
    quote.route[0] !== input.address ||
    quote.route[quote.route.length - 1] !== output.address ||
    !quote.route.every((asset) => typeof asset === 'string' && asset.length > 0)
  ) {
    throw new Error('bots.errors.quote');
  }
  const amounts = [
    { value: quote.amountIn, meta: quote.amountInMeta, asset: input },
    { value: quote.amountOut, meta: quote.amountOutMeta, asset: output },
    { value: quote.amountWithoutImpact, meta: quote.amountWithoutImpactMeta, asset: output },
  ];
  for (const { value, meta, asset } of amounts) {
    const expected = toCodec(value, asset.decimals);
    if (
      !codec(expected) ||
      !sameAsset(meta?.asset, asset) ||
      meta.decimals !== asset.decimals ||
      meta.codec !== expected ||
      toCodec(meta.value, asset.decimals) !== expected
    )
      throw new Error('bots.errors.quote');
  }
}

/**
 * Obtain a fresh unsigned market observation without history, account discovery,
 * intent preparation, or signing. Price is assetIn per assetOut; the optional
 * fee-token quote values a separate fee allocation in those same units.
 */
export async function fetchBotMarketSnapshot(
  agent: PolkaswapAgentApi,
  bot: BotDefinition,
  now = Date.now()
): Promise<BotCandle> {
  if (!Number.isSafeInteger(now) || now < 0 || bot.assetIn.address === bot.assetOut.address)
    throw new Error('bots.errors.quote');
  const startedAt = Date.now();
  const before = agent.status();
  const node = { ...before.node };
  const wallet = { ...before.wallet };
  assertNode(node, bot);
  if (bot.mode === 'live' && (!wallet.connected || wallet.address !== bot.account))
    throw new Error('bots.errors.session');
  const separateFee = ![bot.assetIn.address, bot.assetOut.address].includes(bot.policy.feeAsset.address);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const query = async (input: BotAsset, output: BotAsset, amount: string): Promise<AgentSwapQuote> => {
      if (!codec(toCodec(amount, input.decimals))) throw new Error('bots.errors.amount');
      const quote = await agent.quoteSwap({
        assetIn: { address: input.address },
        assetOut: { address: output.address },
        amount,
        side: 'input',
        slippageTolerance: bot.policy.slippagePercent,
        quoteTimeoutMs: TIMEOUT_MS,
      });
      assertMarketQuote(quote, input, output, amount);
      return quote;
    };
    const [pair, fee] = await Promise.race([
      Promise.all([
        query(bot.assetIn, bot.assetOut, bot.strategy.amount),
        separateFee ? query(bot.policy.feeAsset, bot.assetIn, '1') : Promise.resolve(null),
      ]),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('bots.errors.stale')), TIMEOUT_MS);
      }),
    ]);
    const after = agent.status();
    assertNode(after.node, bot, node);
    if (
      bot.mode === 'live' &&
      (!after.wallet.connected || after.wallet.address !== wallet.address || after.wallet.source !== wallet.source)
    ) {
      throw new Error('bots.errors.session');
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < 0 || elapsed >= TIMEOUT_MS) throw new Error('bots.errors.stale');
    const close = decimalRatio(parseBotPrice(pair.amountIn), parseBotPrice(pair.amountWithoutImpact));
    const feeClose = fee
      ? decimalRatio(parseBotPrice(fee.amountWithoutImpact), parseBotPrice(fee.amountIn))
      : bot.policy.feeAsset.address === bot.assetIn.address
        ? new FPNumber('1', 36)
        : close;
    if (close.isZero() || feeClose.isZero()) throw new Error('bots.errors.quote');
    return { timestamp: now + elapsed, close: close.toString(), feeClose: feeClose.toString() };
  } catch (error) {
    if (error instanceof Error && /^bots\.errors\.[A-Za-z]+$/.test(error.message)) throw error;
    throw new Error('bots.errors.quote');
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
