import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBotMarketSnapshot } from '@/features/bot-trading/market';
import { toCodec } from '@/features/bot-trading/amounts';
import type { AgentStatus, AgentSwapQuote, AgentSwapRequest, PolkaswapAgentApi } from '@/features/agent-trading/types';
import type { BotAsset, BotDefinition } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

const quoteFor = (
  input: BotAsset,
  output: BotAsset,
  amount = '1',
  withoutImpact = '2',
  outputAmount = withoutImpact
): AgentSwapQuote => {
  const meta = (asset: BotAsset, value: string) => ({
    asset,
    value,
    codec: toCodec(value, asset.decimals),
    decimals: asset.decimals,
  });
  return {
    assetIn: input,
    assetOut: output,
    request: { side: 'input', amount, slippageTolerance: '0.5' },
    amountIn: amount,
    amountOut: outputAmount,
    amountWithoutImpact: withoutImpact,
    amountInMeta: meta(input, amount),
    amountOutMeta: meta(output, outputAmount),
    amountWithoutImpactMeta: meta(output, withoutImpact),
    route: [input.address, output.address],
  } as AgentSwapQuote;
};
const harness = (bot: BotDefinition = botFixture()) => {
  const status = {
    node: {
      connected: true,
      endpoint: 'wss://node.example',
      blockNumber: 100,
      genesisHash: 'genesis',
      runtimeSpecVersion: 1,
    },
    wallet: { connected: true, address: 'account', source: 'internal' },
  } as AgentStatus;
  const quoteSwap = vi.fn(async (_request: AgentSwapRequest) =>
    quoteFor(bot.assetIn, bot.assetOut, bot.strategy.amount)
  );
  const forbidden = vi.fn(() => {
    throw new Error('Signing method called');
  });
  const agent = {
    status: () => status,
    quoteSwap,
    prepareSwap: forbidden,
    executeSwap: forbidden,
    connectWallet: forbidden,
    ready: forbidden,
  } as unknown as PolkaswapAgentApi;
  return { bot, status, quoteSwap, agent, forbidden };
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('unsigned bot market snapshots', () => {
  it('uses the exact requested size and no-impact price without requiring a wallet or creating an intent', async () => {
    const h = harness();
    h.status.wallet.connected = false;
    h.quoteSwap.mockResolvedValue(quoteFor(h.bot.assetIn, h.bot.assetOut, '1', '2', '1.5'));
    const result = await fetchBotMarketSnapshot(h.agent, h.bot, 1000);
    expect(result.close).toBe('0.5');
    expect(result.feeClose).toBe('1');
    expect(h.quoteSwap).toHaveBeenCalledWith({
      assetIn: { address: 'in' },
      assetOut: { address: 'out' },
      amount: '1',
      side: 'input',
      slippageTolerance: '0.5',
      quoteTimeoutMs: 5000,
    });
    expect(h.forbidden).not.toHaveBeenCalled();
  });
  it('preserves a market price at the thirty-sixth decimal place', async () => {
    const bot = botFixture();
    bot.assetIn.decimals = 36;
    bot.strategy.amount = '0.000000000000000000000000000000000001';
    bot.policy.feeAsset = { ...bot.assetIn };
    const h = harness(bot);
    h.quoteSwap.mockResolvedValue(quoteFor(bot.assetIn, bot.assetOut, bot.strategy.amount, '1'));
    expect((await fetchBotMarketSnapshot(h.agent, bot)).close).toBe('0.000000000000000000000000000000000001');
  });
  it('values a traded output fee token using the same pair price', async () => {
    const h = harness();
    h.bot.policy.feeAsset = { ...h.bot.assetOut };
    const result = await fetchBotMarketSnapshot(h.agent, h.bot);
    expect(result.feeClose).toBe('0.5');
    expect(h.quoteSwap).toHaveBeenCalledTimes(1);
  });
  it('obtains an independent quote for a separate fee asset', async () => {
    const h = harness();
    h.bot.policy.feeAsset = { address: 'fee', decimals: 18, symbol: 'FEE' };
    h.quoteSwap
      .mockResolvedValueOnce(quoteFor(h.bot.assetIn, h.bot.assetOut))
      .mockResolvedValueOnce(quoteFor(h.bot.policy.feeAsset, h.bot.assetIn, '1', '3'));
    expect((await fetchBotMarketSnapshot(h.agent, h.bot)).feeClose).toBe('3');
    expect(h.quoteSwap.mock.calls[1][0]).toMatchObject({
      assetIn: { address: 'fee' },
      assetOut: { address: 'in' },
      amount: '1',
    });
  });
  it('rejects an unexpected asset, precision or response size', async () => {
    const h = harness();
    for (const bad of [
      { ...quoteFor(h.bot.assetIn, h.bot.assetOut), assetOut: { ...h.bot.assetOut, address: 'different' } },
      { ...quoteFor(h.bot.assetIn, h.bot.assetOut), assetIn: { ...h.bot.assetIn, decimals: 18 } },
      quoteFor(h.bot.assetIn, h.bot.assetOut, '2'),
      { ...quoteFor(h.bot.assetIn, h.bot.assetOut), amountWithoutImpactMeta: { codec: '1' } },
    ]) {
      h.quoteSwap.mockResolvedValueOnce(bad as AgentSwapQuote);
      await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.quote');
    }
  });
  it('rejects missing routes and unusable no-impact amounts', async () => {
    const h = harness();
    h.quoteSwap.mockResolvedValueOnce({ ...quoteFor(h.bot.assetIn, h.bot.assetOut), route: [] });
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.quote');
    h.quoteSwap.mockResolvedValueOnce(quoteFor(h.bot.assetIn, h.bot.assetOut, '1', '0'));
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.quote');
  });
  it('rejects a disconnected node before initiating any quote', async () => {
    const h = harness();
    h.status.node.connected = false;
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.stale');
    expect(h.quoteSwap).not.toHaveBeenCalled();
  });
  it('detects an in-place network, endpoint, runtime or block regression during a quote', async () => {
    for (const change of [
      { genesisHash: 'different' },
      { endpoint: 'wss://other.example' },
      { runtimeSpecVersion: 2 },
      { blockNumber: 99 },
      { connected: false },
    ]) {
      const h = harness();
      h.quoteSwap.mockImplementationOnce(async () => {
        Object.assign(h.status.node, change);
        return quoteFor(h.bot.assetIn, h.bot.assetOut);
      });
      await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.stale');
    }
  });
  it('validates the live account and rejects wallet changes during a quote', async () => {
    const h = harness();
    h.bot.mode = 'live';
    h.bot.network = 'wrong';
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.stale');
    h.bot.network = 'genesis';
    h.status.wallet.connected = false;
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.session');
    h.status.wallet.connected = true;
    h.quoteSwap.mockImplementationOnce(async () => {
      h.status.wallet.source = 'other';
      return quoteFor(h.bot.assetIn, h.bot.assetOut);
    });
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.session');
  });
  it('timestamps observations at completion and bounds the entire request by five seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    const h = harness();
    h.quoteSwap.mockImplementationOnce(async () => {
      vi.setSystemTime(10040);
      return quoteFor(h.bot.assetIn, h.bot.assetOut);
    });
    expect((await fetchBotMarketSnapshot(h.agent, h.bot, 1000)).timestamp).toBe(1040);
    h.quoteSwap.mockImplementationOnce(() => new Promise(() => undefined));
    const pending = fetchBotMarketSnapshot(h.agent, h.bot);
    const rejected = expect(pending).rejects.toThrow('bots.errors.stale');
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(h.forbidden).not.toHaveBeenCalled();
  });
  it('rejects clock rollback and sanitizes transport failures', async () => {
    const h = harness();
    h.quoteSwap.mockImplementationOnce(async () => {
      throw new Error('transport details must not escape');
    });
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.quote');
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    h.quoteSwap.mockImplementationOnce(async () => {
      vi.setSystemTime(9000);
      return quoteFor(h.bot.assetIn, h.bot.assetOut);
    });
    await expect(fetchBotMarketSnapshot(h.agent, h.bot)).rejects.toThrow('bots.errors.stale');
  });
});
