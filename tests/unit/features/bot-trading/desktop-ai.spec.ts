import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDesktopAiClient,
  isDesktopAiSupported,
  type DesktopAiContext,
  type DesktopAiOptions,
  type DesktopAiProgress,
  type DesktopAiStatus,
} from '@/features/bot-trading/desktop-ai';
import type { BotAiClient, BotAiResearchConstraints } from '@/features/bot-trading/ai';
import type { OpeningResearchFeeScenario } from '@/features/bot-trading/autopilot-feasibility';
import type { BotCandle, StrategyConfig } from '@/features/bot-trading/types';
import { ruleRecipe } from '@/features/bot-trading/rule-recipes';
import { botFixture, researchConstraintsFixture } from './fixtures';

const NOW = Date.UTC(2026, 8, 19);
const HOUR = 3_600_000;
const CONNECTION_ID = '1b365168-62c5-421d-ade0-10e61f141abc';
type Tool = {
  name: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
};
type PublicContext = {
  requestId: string;
  expiresAt: number;
  candles: BotCandle[];
  constraints: { maxTradeCodec: Record<string, string>; maxPriceImpactPercent: string };
  assets: { symbol: string }[];
  trainingCutoff: number;
};
const clients: BotAiClient[] = [];

/** Synthetic training-only descriptor; reaching a limit does not authorize or reject a draft. */
function openingFeeScenario(): OpeningResearchFeeScenario {
  return {
    protocol: 'opening-fee-scenario-v1',
    valuationAsset: 'output',
    lossMetric: 'drawdown',
    maxLossPercent: '5',
    opening: { timestamp: 500, feeOnlyLossPercent: '6', feeOnlyReachesLossLimit: true },
    firstPossibleTrade: { timestamp: 600, feeOnlyLossPercent: '4.5', feeOnlyReachesLossLimit: false },
    laterOpportunity: 'not-assessed',
  };
}

/** Isolated public inputs model the already-verified training-only boundary supplied by autopilot. */
function inputs() {
  const bot = botFixture();
  Object.assign(bot, { account: 'paper', network: 'paper' });
  bot.strategy.prompt = 'Grow my capital within the chosen loss limit.';
  const candles = Array.from({ length: 202 }, (_, index) => ({
    timestamp: NOW - (900 - index) * HOUR,
    close: '2',
    feeClose: '1',
  }));
  const strategy: StrategyConfig = { ...bot.strategy, intervalMs: HOUR, prompt: '' };
  return { bot, candles, strategy };
}

/** A standalone document registrar needs no actual browser, network, OAuth or provider. */
function harness() {
  const tools: Tool[] = [];
  const signals: AbortSignal[] = [];
  const context = {
    registerTool: vi.fn(async (tool: Tool, options: { signal: AbortSignal }) => {
      tools.push(tool);
      signals.push(options.signal);
    }),
    unregisterTool: vi.fn(async (_name: string) => {}),
  };
  const target = { modelContext: context } as unknown as Document;
  const onPending = vi.fn();
  const onAgentConnected = vi.fn();
  const tool = (suffix: 'connect' | 'status' | 'context' | 'draft') =>
    tools.filter((item) => item.name === `polkaswap_autopilot_${suffix}`).at(-1)!;
  const connect = async (handshake = true, options: DesktopAiOptions = {}) => {
    const client = await createDesktopAiClient({ onPending, onAgentConnected, ...options }, target);
    clients.push(client);
    if (handshake) await tool('connect').execute({ connectionId: client.connectionId });
    return client;
  };
  return { tools, signals, context, target, onPending, onAgentConnected, tool, connect };
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(async () => {
  clients.splice(0).forEach((client) => client.disconnect());
  await Promise.resolve();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('public desktop research progress', () => {
  it.each(['native', 'portable'] as const)(
    'projects all local lifecycle states through the %s status transport',
    async (transport) => {
      const h = harness();
      let progress: DesktopAiProgress = { state: 'researching' };
      const readProgress = vi.fn(() => progress);
      const client =
        transport === 'native'
          ? await h.connect(true, { readProgress })
          : await createDesktopAiClient({ portable: true, readProgress }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const read = () => (transport === 'native' ? h.tool('status').execute() : Promise.resolve(client.getStatus()));
      const fetch = vi.spyOn(globalThis, 'fetch');
      for (const state of [
        'awaiting_budget',
        'researching',
        'awaiting_review',
        'research_failed',
        'watching',
        'bot_available',
        'unavailable',
      ] as const) {
        progress = { state };
        await expect(read()).resolves.toEqual({ connectionId: client.connectionId, connected: true, state });
      }
      expect(fetch).not.toHaveBeenCalled();
      expect(h.onPending).not.toHaveBeenCalled();
      if (transport === 'native') expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['native', 'portable'] as const)(
    'returns detached failure categories, never private data, through %s status',
    async (transport) => {
      const h = harness();
      const progress = {
        state: 'research_failed' as const,
        errorKey: 'bots.autopilot.errors.trainingRejected',
        walletAddress: 'PRIVATE-WALLET',
        balances: { XOR: 'PRIVATE-BALANCE' },
        credentials: 'PRIVATE-CREDENTIALS',
        requestId: 'OBSOLETE-DRAFT-ID',
        diagnostics: {
          stage: 'training' as const,
          failures: [
            {
              candidate: 1,
              reasons: ['goalTradeCost', 'netLoss', 'priceImpact', 'insufficientTrades', 'feeBudget'] as const,
              returnPercent: 'PRIVATE-RETURN',
            },
          ],
          screening: {
            submitted: 2,
            dropped: [
              {
                candidate: 2,
                reasons: ['noSmallerExactSample', 'quoteUnavailable'] as const,
                rawQuote: 'PRIVATE-QUOTE',
              },
            ],
            rawDraft: 'PRIVATE-DRAFT',
          },
          opening: { lossPercent: 'PRIVATE-OPENING-PRICE', openedAt: NOW },
          observations: ['PRIVATE-VALIDATION-PRICE'],
        },
      };
      const client =
        transport === 'native'
          ? await h.connect(true, { readProgress: () => progress })
          : await createDesktopAiClient({ portable: true, readProgress: () => progress }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const read = async (): Promise<DesktopAiStatus> =>
        transport === 'native' ? ((await h.tool('status').execute()) as DesktopAiStatus) : client.getStatus();
      const first = await read();
      const expected = {
        connectionId: client.connectionId,
        connected: true,
        state: 'research_failed',
        errorKey: 'bots.autopilot.errors.trainingRejected',
        diagnostics: {
          stage: 'training',
          failures: [
            { candidate: 1, reasons: ['insufficientTrades', 'netLoss', 'priceImpact', 'goalTradeCost', 'feeBudget'] },
          ],
          screening: {
            submitted: 2,
            dropped: [{ candidate: 2, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
          },
        },
      };
      expect(first).toEqual(expected);
      expect(JSON.stringify(first)).not.toMatch(/PRIVATE|OBSOLETE/);
      const mutable = first.diagnostics!.failures as Array<{ candidate: number; reasons: string[] }>;
      mutable[0].candidate = 3;
      mutable[0].reasons.push('drawdown');
      expect(await read()).toEqual(expected);
      expect(progress.diagnostics.failures[0].candidate).toBe(1);
    }
  );

  it('projects only the opening stage, excluding its price, loss and time evidence', async () => {
    const h = harness();
    const client = await h.connect(true, {
      readProgress: () =>
        ({
          state: 'research_failed',
          errorKey: 'bots.autopilot.errors.openingRejected',
          diagnostics: { stage: 'opening', failures: [], opening: { lossPercent: '10.69', openedAt: NOW } },
        }) as DesktopAiProgress,
    });
    expect(client.getStatus().diagnostics).toEqual({ stage: 'opening', failures: [] });
  });

  it('reports a fully screened authored batch without inventing a replay result', async () => {
    const h = harness();
    const client = await h.connect(true, {
      readProgress: () => ({
        state: 'research_failed',
        errorKey: 'bots.autopilot.errors.trainingRejected',
        diagnostics: {
          stage: 'training',
          failures: [],
          screening: {
            submitted: 1,
            dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
          },
        },
      }),
    });
    expect(client.getStatus().diagnostics).toEqual({
      stage: 'training',
      failures: [],
      screening: {
        submitted: 1,
        dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
      },
    });
  });

  it('keeps handshake and pending-draft priority without reading the local callback', async () => {
    const h = harness();
    const readProgress = vi.fn((): DesktopAiProgress => ({ state: 'researching' }));
    const client = await h.connect(false, { readProgress });
    expect(client.getStatus().state).toBe('awaiting_connection');
    await expect(h.tool('status').execute()).resolves.toMatchObject({ state: 'awaiting_connection' });
    expect(readProgress).not.toHaveBeenCalled();
    await client.connect({ connectionId: client.connectionId });
    readProgress.mockClear();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = client.readContext();
    expect(client.getStatus()).toMatchObject({ state: 'awaiting_draft', requestId: context.requestId });
    await expect(h.tool('status').execute()).resolves.toMatchObject({
      state: 'awaiting_draft',
      requestId: context.requestId,
    });
    expect(readProgress).not.toHaveBeenCalled();
    await client.submitDraft({ requestId: context.requestId, strategy });
    await pending;
    expect(client.getStatus()).toEqual({ connectionId: client.connectionId, connected: true, state: 'researching' });
    expect(readProgress).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable when a progress callback throws, with no exception details', async () => {
    const h = harness();
    const client = await h.connect(true, {
      readProgress: () => {
        throw new Error('PRIVATE-CALLBACK-ERROR');
      },
    });
    expect(client.getStatus()).toEqual({ connectionId: client.connectionId, connected: true, state: 'unavailable' });
    await expect(h.tool('status').execute()).resolves.toEqual(client.getStatus());
  });

  it.each([
    null,
    [],
    { state: 'running' },
    { state: 'research_failed', errorKey: 'PRIVATE provider exception' },
    { state: 'research_failed', errorKey: 'bots.errors.SecretProviderResponse' },
    { state: 'research_failed', errorKey: 'bots.errors.invalid_key' },
    { state: 'research_failed', errorKey: `bots.errors.${'a'.repeat(81)}` },
    { state: 'research_failed', diagnostics: { stage: 'holdout', failures: [] } },
    { state: 'research_failed', diagnostics: { stage: 'training', failures: [] } },
    {
      state: 'research_failed',
      diagnostics: {
        stage: 'training',
        failures: [{ candidate: 1, reasons: ['netLoss'] }],
        screening: { submitted: 2, dropped: [{ candidate: 1, reasons: ['quoteUnavailable'] }] },
      },
    },
    { state: 'research_failed', diagnostics: { stage: 'opening', failures: [{ candidate: 1, reasons: ['netLoss'] }] } },
    {
      state: 'research_failed',
      diagnostics: { stage: 'training', failures: [{ candidate: 4, reasons: ['netLoss'] }] },
    },
    {
      state: 'research_failed',
      diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: ['privateDetail'] }] },
    },
    { state: 'research_failed', diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: [] }] } },
    {
      state: 'research_failed',
      diagnostics: { stage: 'training', failures: [{ candidate: 1, reasons: Array(8).fill('priceImpact') }] },
    },
    {
      state: 'research_failed',
      diagnostics: { stage: 'validation', failures: [{ candidate: 1, reasons: ['priceImpact'] }] },
    },
    {
      state: 'research_failed',
      diagnostics: { stage: 'validation', failures: [{ candidate: 1, reasons: ['goalTradeCost'] }] },
    },
    {
      state: 'research_failed',
      errorKey: 'bots.autopilot.errors.validationRejected',
      diagnostics: { stage: 'validation', failures: [{ candidate: 1, reasons: ['feeBudget'] }] },
    },
    {
      state: 'research_failed',
      diagnostics: {
        stage: 'training',
        failures: [
          { candidate: 1, reasons: ['netLoss'] },
          { candidate: 1, reasons: ['drawdown'] },
        ],
      },
    },
    {
      state: 'research_failed',
      diagnostics: {
        stage: 'validation',
        failures: [
          { candidate: 1, reasons: ['netLoss'] },
          { candidate: 2, reasons: ['drawdown'] },
        ],
      },
    },
    Object.assign(Object.create({ inherited: true }), { state: 'researching' }),
  ])('projects malformed callback data %# to unavailable', async (progress) => {
    const h = harness();
    const client = await h.connect(true, { readProgress: () => progress as DesktopAiProgress });
    expect(client.getStatus()).toEqual({ connectionId: client.connectionId, connected: true, state: 'unavailable' });
    await expect(h.tool('status').execute()).resolves.toEqual(client.getStatus());
  });

  it.each(['state', 'extra', 'diagnostics', 'candidate', 'reason'] as const)(
    'rejects a %s accessor without evaluating it',
    async (location) => {
      const getter = vi.fn(() => 'PRIVATE-GETTER');
      const progress = {
        state: 'research_failed' as const,
        diagnostics: { stage: 'training' as const, failures: [{ candidate: 1, reasons: ['netLoss'] }] },
      };
      if (location === 'state' || location === 'extra' || location === 'diagnostics')
        Object.defineProperty(progress, location, { enumerable: true, get: getter });
      if (location === 'candidate')
        Object.defineProperty(progress.diagnostics.failures[0], 'candidate', { enumerable: true, get: getter });
      if (location === 'reason')
        Object.defineProperty(progress.diagnostics.failures[0].reasons, '0', { enumerable: true, get: getter });
      const h = harness();
      const client = await h.connect(true, { readProgress: () => progress as DesktopAiProgress });
      expect(client.getStatus().state).toBe('unavailable');
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('does not read progress after disconnect or report a connection revoked inside the callback', async () => {
    const h = harness();
    const readProgress = vi.fn((): DesktopAiProgress => ({ state: 'bot_available' }));
    const client = await h.connect(true, { readProgress });
    readProgress.mockClear();
    client.disconnect();
    expect(() => client.getStatus()).toThrow('bots.errors.provider');
    expect(readProgress).not.toHaveBeenCalled();
    const second = await h.connect(false, { readProgress });
    readProgress.mockImplementationOnce(() => {
      second.disconnect();
      return { state: 'bot_available' };
    });
    await expect(second.connect({ connectionId: second.connectionId })).rejects.toThrow('bots.errors.provider');
  });
});

describe('desktop AI drafting mailbox', () => {
  it.each(['native', 'portable'] as const)(
    'accepts one distinct strategy batch through %s without consuming invalid drafts',
    async (transport) => {
      const h = harness();
      const client =
        transport === 'native' ? await h.connect() : await createDesktopAiClient({ portable: true }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const { bot, candles, strategy } = inputs();
      const pending = client.suggest(bot, candles);
      const context =
        transport === 'native' ? ((await h.tool('context').execute()) as DesktopAiContext) : client.readContext();
      const submit = (value: unknown) =>
        transport === 'native' ? h.tool('draft').execute(value) : client.submitDraft(value);
      const dca = { ...strategy, amount: '1', threshold: '0', rules: null, signalTiming: null };
      const sma = { ...dca, kind: 'sma', fastWindow: 2, slowWindow: 3, signalTiming: 'closed-hour' };
      const rules = { ...dca, kind: 'rules', rules: ruleRecipe('trend') };
      const strategies = [dca, sma, rules];
      expect(context.rules).toContain('Draft 1 to 3 distinct');
      expect(context.rules.length).toBeLessThanOrEqual(3000);
      if (transport === 'native') {
        const properties = h.tool('draft').inputSchema.properties as Record<string, unknown>;
        expect(properties.strategies).toMatchObject({ minItems: 1, maxItems: 3 });
      }
      for (const invalid of [
        { requestId: context.requestId, strategies: [] },
        { requestId: context.requestId, strategies: [...strategies, dca] },
        { requestId: context.requestId, strategies: [dca, { ...dca, threshold: '99' }] },
        { requestId: context.requestId, strategies: [dca, { ...dca, amount: '2' }] },
        { requestId: context.requestId, strategies: [{ ...dca, amount: '10' }] },
        { requestId: context.requestId, strategies: [dca], wallet: true },
      ])
        await expect(submit(invalid)).rejects.toThrow('bots.errors.provider');
      await expect(submit({ requestId: context.requestId, strategies })).resolves.toEqual({
        status: 'research_started',
        requiresTradingAuthorization: true,
      });
      const result = await pending;
      expect(result.strategy.kind).toBe('dca');
      expect(result.strategies?.map((candidate) => candidate.kind)).toEqual(['dca', 'sma', 'rules']);
      await expect(submit({ requestId: context.requestId, strategies })).rejects.toThrow();
    }
  );

  it('detects only a top-level registrar and never discovers models or invokes a network service', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const h = harness();
    expect(isDesktopAiSupported(h.target)).toBe(true);
    expect(isDesktopAiSupported({} as Document)).toBe(false);
    const frame = { modelContext: h.context, defaultView: { top: {} } } as unknown as Document;
    expect(isDesktopAiSupported(frame)).toBe(false);
    await expect(createDesktopAiClient({}, frame)).rejects.toThrow('bots.errors.provider');
    const client = await h.connect();
    expect(h.tools.map((tool) => tool.annotations.readOnlyHint)).toEqual([false, true, true, false]);
    await expect(client.listModels()).rejects.toThrow();
    expect(() => client.selectModel('pretend-account')).toThrow();
    const { bot, candles } = inputs();
    await expect(client.propose(bot, candles)).rejects.toThrow();
    await expect(h.tool('context').execute()).rejects.toThrow();
    expect(h.onPending).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the navigator fallback while rejecting duplicate registration on the same document', async () => {
    const h = harness();
    const view = { top: undefined as unknown, navigator: { modelContext: h.context } };
    view.top = view;
    const target = { defaultView: view } as unknown as Document;
    expect(isDesktopAiSupported(target)).toBe(true);
    const client = await createDesktopAiClient({}, target);
    clients.push(client);
    await expect(createDesktopAiClient({}, target)).rejects.toThrow();
    expect(h.context.registerTool).toHaveBeenCalledTimes(4);
  });

  it('awaits an actual matching tool handshake before allowing research, independently of a wallet or budget', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const h = harness();
    const client = await h.connect(false);
    expect(client.connectionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(h.onAgentConnected).not.toHaveBeenCalled();
    const initial = { connectionId: client.connectionId, connected: false, state: 'awaiting_connection' };
    await expect(h.tool('status').execute()).resolves.toEqual(initial);
    await expect(h.tool('status').execute()).resolves.toEqual(initial);
    expect(h.onAgentConnected).not.toHaveBeenCalled();
    const { bot, candles, strategy } = inputs();
    await expect(client.suggest(bot, candles)).rejects.toThrow('bots.errors.provider');
    await expect(h.tool('context').execute()).rejects.toThrow();
    await expect(h.tool('draft').execute({ requestId: 'not-yet-created', strategy })).rejects.toThrow();
    await expect(h.tool('connect').execute({ connectionId: CONNECTION_ID })).rejects.toThrow();
    expect(h.onAgentConnected).not.toHaveBeenCalled();
    await expect(h.tool('connect').execute({ connectionId: client.connectionId })).resolves.toEqual({
      connectionId: client.connectionId,
      connected: true,
      state: 'awaiting_budget',
    });
    await h.tool('connect').execute({ connectionId: client.connectionId });
    expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
    expect(h.onPending).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a stable supplied UUID and rejects malformed IDs before publishing any tools', async () => {
    const h = harness();
    for (const connectionId of ['', 'short', `${CONNECTION_ID}x`, 'z'.repeat(36), null]) {
      await expect(createDesktopAiClient({ connectionId: connectionId as string }, h.target)).rejects.toThrow(
        'bots.errors.provider'
      );
    }
    expect(h.context.registerTool).not.toHaveBeenCalled();
    const client = await createDesktopAiClient({ connectionId: CONNECTION_ID }, h.target);
    clients.push(client);
    expect(client.connectionId).toBe(CONNECTION_ID);
    await expect(h.tool('connect').execute({ connectionId: CONNECTION_ID })).resolves.toMatchObject({
      connectionId: CONNECTION_ID,
      connected: true,
    });
  });

  it('keeps handshake and status inputs strict and rejects aborted calls without establishing a connection', async () => {
    const h = harness();
    const client = await h.connect(false);
    const getter = vi.fn(() => client.connectionId);
    const accessor = Object.defineProperty({}, 'connectionId', { enumerable: true, get: getter });
    const abort = new AbortController();
    abort.abort();
    await expect(h.tool('connect').execute(accessor)).rejects.toThrow();
    await expect(h.tool('connect').execute({ connectionId: client.connectionId, wallet: true })).rejects.toThrow();
    await expect(h.tool('connect').execute({})).rejects.toThrow();
    await expect(
      h.tool('connect').execute({ connectionId: client.connectionId }, { signal: abort.signal })
    ).rejects.toThrow();
    await expect(h.tool('status').execute({ includeWallet: true })).rejects.toThrow();
    await expect(h.tool('status').execute({}, { signal: abort.signal })).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(h.onAgentConnected).not.toHaveBeenCalled();
    await expect(h.tool('status').execute()).resolves.toMatchObject({ connected: false });
  });

  it('reports only session progress before, during and after a draft', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = (await h.tool('context').execute()) as PublicContext;
    await expect(h.tool('status').execute()).resolves.toEqual({
      connectionId: client.connectionId,
      connected: true,
      state: 'awaiting_draft',
      requestId: context.requestId,
    });
    await h.tool('draft').execute({ requestId: context.requestId, strategy });
    await pending;
    await expect(h.tool('status').execute()).resolves.toEqual({
      connectionId: client.connectionId,
      connected: true,
      state: 'awaiting_budget',
    });
  });

  it('revokes old handshakes and status calls after disconnect and generates a different reconnect ID', async () => {
    const h = harness();
    const first = await h.connect();
    const oldConnect = h.tool('connect');
    const oldStatus = h.tool('status');
    first.disconnect();
    const second = await h.connect(false);
    expect(second.connectionId).not.toBe(first.connectionId);
    await expect(oldConnect.execute({ connectionId: first.connectionId })).rejects.toThrow();
    await expect(oldStatus.execute()).rejects.toThrow();
    await expect(h.tool('connect').execute({ connectionId: first.connectionId })).rejects.toThrow();
    await expect(h.tool('status').execute()).resolves.toMatchObject({ connected: false });
    expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
    await h.tool('connect').execute({ connectionId: second.connectionId });
    expect(h.onAgentConnected).toHaveBeenCalledTimes(2);
  });

  it('does not let callback failures repeat a handshake or callback-triggered disconnect report a live connection', async () => {
    const h = harness();
    const client = await h.connect(false);
    h.onAgentConnected.mockImplementationOnce(() => {
      throw new Error('view error');
    });
    await expect(h.tool('connect').execute({ connectionId: client.connectionId })).resolves.toMatchObject({
      connected: true,
    });
    await h.tool('connect').execute({ connectionId: client.connectionId });
    expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
    client.disconnect();
    const second = await h.connect(false);
    h.onAgentConnected.mockImplementationOnce(() => second.disconnect());
    await expect(h.tool('connect').execute({ connectionId: second.connectionId })).rejects.toThrow();
    await expect(h.tool('status').execute()).rejects.toThrow();
  });

  it('uses the same handshake and draft validation through a portable form with no native registrar', async () => {
    const onAgentConnected = vi.fn();
    const onContext = vi.fn();
    const client = await createDesktopAiClient({ portable: true, onAgentConnected, onContext }, {} as Document);
    clients.push(client);
    expect(client.getStatus()).toEqual({
      connectionId: client.connectionId,
      connected: false,
      state: 'awaiting_connection',
    });
    expect(onAgentConnected).not.toHaveBeenCalled();
    await expect(client.syncTools()).resolves.toBe(false);
    expect(() => client.readContext()).toThrow();
    await expect(client.connect({ connectionId: CONNECTION_ID })).rejects.toThrow();
    await client.connect({ connectionId: client.connectionId });
    expect(onAgentConnected).toHaveBeenCalledTimes(1);
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = client.readContext();
    expect(onContext).toHaveBeenCalledTimes(1);
    expect(onContext.mock.calls[0][0]).toEqual(context);
    onContext.mock.calls[0][0].candles[0].close = '999';
    expect(client.readContext().candles[0].close).toBe('2');
    await expect(client.submitDraft({ requestId: context.requestId, strategy, approve: true })).rejects.toThrow();
    await expect(
      client.submitDraft({ requestId: context.requestId, strategy: { ...strategy, amount: '10.01' } })
    ).rejects.toThrow();
    await expect(client.submitDraft({ requestId: context.requestId, strategy })).resolves.toEqual({
      status: 'research_started',
      requiresTradingAuthorization: true,
    });
    await expect(pending).resolves.toMatchObject({ strategy });
    expect(onContext).toHaveBeenLastCalledWith(null);
    await expect(client.submitDraft({ requestId: context.requestId, strategy })).rejects.toThrow();
    client.disconnect();
    expect(() => client.getStatus()).toThrow();
    await expect(client.connect({ connectionId: client.connectionId })).rejects.toThrow();
    await expect(client.syncTools()).resolves.toBe(false);
  });

  it('keeps public total capital distinct from the fee sample in portable and native contexts', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const research = {
      ...researchConstraintsFixture(),
      minimumIntervalMs: HOUR,
      maximumIntervalMs: 12 * HOUR,
      minimumTrades: 5,
      trainingCandles: 117,
      validationCandles: 50,
      sizing: { capitalCodec: '10000', spendableInputCodec: '9900', feeSampleAmountCodec: '100' },
    };
    research.goal!.targetRequiresIdleOutperformance = true;
    const { finalizedAt, blockHash, buy, sell } = research.costs!;
    const costSamples: NonNullable<BotAiResearchConstraints['costSamples']> = [
      {
        amountInCodec: '100',
        status: 'available',
        finalizedAt,
        blockHash,
        buy: { ...buy },
        sell: { ...sell },
        openingFeeScenario: openingFeeScenario(),
      },
      {
        amountInCodec: '2475',
        status: 'available',
        finalizedAt: finalizedAt + 1,
        blockHash: `0x${'b'.repeat(64)}`,
        buy: { ...buy, priceImpactPercent: '2.5' },
        sell: { ...sell },
      },
      { amountInCodec: '4950', status: 'unavailable', reason: 'quoteUnavailable' },
    ];
    Object.assign(research, { costSamples });
    const expectedSizing = { ...research.sizing };
    const expectedCosts = structuredClone(research.costs);
    const expectedSamples = structuredClone(costSamples);
    const expectedGoal = {
      targetReturnPercent: research.goal!.targetReturnPercent,
      maxLossPercent: research.goal!.maxLossPercent,
      durationMs: research.goal!.durationMs,
      valuationAsset: research.goal!.valuationAsset,
      lossMetric: research.goal!.lossMetric,
    };
    const pending = client.suggest(bot, candles.slice(0, 117), undefined, research);
    const expectedImpactLimit = bot.policy.maxPriceImpactPercent;
    bot.policy.maxPriceImpactPercent = '99';
    research.sizing.capitalCodec = '999999';
    research.costs!.buy.priceImpactPercent = '99';
    research.goal!.durationMs = HOUR;
    costSamples[0].amountInCodec = '2';
    const reference = costSamples[0];
    if (reference.status === 'available') {
      reference.openingFeeScenario!.opening.feeOnlyLossPercent = '99';
      reference.openingFeeScenario!.firstPossibleTrade.feeOnlyReachesLossLimit = true;
    }
    const sample = costSamples[1];
    if (sample.status === 'available') sample.buy.priceImpactPercent = '99';
    const native = (await h.tool('context').execute()) as DesktopAiContext;
    const portable = client.readContext();
    expect(native).toEqual(portable);
    expect(portable.constraints.sizing).toEqual(expectedSizing);
    expect(portable.constraints.costs).toEqual(expectedCosts);
    expect(portable.constraints.costSamples).toEqual(expectedSamples);
    expect(JSON.stringify(portable.constraints.costSamples)).not.toMatch(
      /amountOut|currentPrice|heldOut|qualified|authorize/
    );
    expect(portable.constraints.goal).toEqual(expectedGoal);
    expect(research.goal!.targetRequiresIdleOutperformance).toBe(true);
    expect(portable.constraints.goal).not.toHaveProperty('targetRequiresIdleOutperformance');
    expect(portable.constraints.maxPriceImpactPercent).toBe(expectedImpactLimit);
    portable.constraints.sizing!.capitalCodec = '1';
    expect(client.readContext().constraints.sizing).toEqual(expectedSizing);
    portable.constraints.costs!.sell.priceImpactPercent = '98';
    expect(client.readContext().constraints.costs).toEqual(expectedCosts);
    portable.constraints.costSamples![2].amountInCodec = '3';
    const copied = portable.constraints.costSamples![1];
    if (copied.status === 'available') copied.sell.networkFeeXor = '99';
    const copiedReference = portable.constraints.costSamples![0];
    if (copiedReference.status === 'available') {
      copiedReference.openingFeeScenario!.opening.feeOnlyReachesLossLimit = false;
      copiedReference.openingFeeScenario!.firstPossibleTrade.feeOnlyLossPercent = '99';
    }
    const nativeReference = native.constraints.costSamples![0];
    if (nativeReference.status === 'available') nativeReference.openingFeeScenario!.opening.timestamp = 499;
    expect(client.readContext().constraints.costSamples).toEqual(expectedSamples);
    expect(((await h.tool('context').execute()) as DesktopAiContext).constraints.costSamples).toEqual(expectedSamples);
    await expect(client.submitDraft({ requestId: portable.requestId, strategy, approve: true })).rejects.toThrow();
    await expect(client.submitDraft({ requestId: portable.requestId, strategy })).resolves.toEqual({
      status: 'research_started',
      requiresTradingAuthorization: true,
    });
    await expect(pending).resolves.toMatchObject({ strategy });
  });

  it('copies the descriptive goal episode layout equally into native and portable context', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const research: BotAiResearchConstraints = {
      ...researchConstraintsFixture(),
      maximumIntervalMs: 24 * HOUR,
      minimumTrades: 1,
      goalEpisodes: {
        protocol: 'goal-episodes-v2',
        durationMs: 24 * HOUR,
        trainingEpisodes: 4,
        validationEpisodes: 2,
        trainingTailCandles: 20,
        validationTailCandles: 1,
        aggregation: 'mean-net-return',
        minimumTradesPerPartition: 1,
      },
    };
    const expected = structuredClone(research.goalEpisodes);
    const pending = client.suggest(bot, candles.slice(0, 117), undefined, research);
    research.goalEpisodes!.trainingEpisodes = 999;
    const native = await h.tool('context').execute();
    const portable = client.readContext();
    expect(native).toEqual(portable);
    expect(portable.constraints.goalEpisodes).toEqual(expected);
    portable.constraints.goalEpisodes!.trainingEpisodes = 888;
    expect(client.readContext().constraints.goalEpisodes).toEqual(expected);
    await client.submitDraft({ requestId: portable.requestId, strategy });
    await expect(pending).resolves.toMatchObject({ strategy });
  });

  it('attaches native tools discovered later without replacing the portable connection or pending draft', async () => {
    const h = harness();
    const target = {} as Document & { modelContext?: typeof h.context };
    const client = await createDesktopAiClient({ portable: true, onAgentConnected: h.onAgentConnected }, target);
    clients.push(client);
    await client.connect({ connectionId: client.connectionId });
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = client.readContext();
    target.modelContext = h.context;
    await expect(Promise.all([client.syncTools(), client.syncTools()])).resolves.toEqual([true, true]);
    expect(h.context.registerTool).toHaveBeenCalledTimes(4);
    await expect(h.tool('status').execute()).resolves.toEqual(client.getStatus());
    await expect(h.tool('context').execute()).resolves.toEqual(context);
    await h.tool('draft').execute({ requestId: context.requestId, strategy });
    await expect(pending).resolves.toMatchObject({ strategy });
    await expect(client.submitDraft({ requestId: context.requestId, strategy })).rejects.toThrow();
    expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
    const oldStatus = h.tool('status');
    delete target.modelContext;
    await expect(client.syncTools()).resolves.toBe(false);
    await expect(oldStatus.execute()).rejects.toThrow();
    expect(client.getStatus().connected).toBe(true);
  });

  it.each(['native', 'portable'] as const)(
    'binds v3 warmup to the funded training window before publishing %s context',
    async (transport) => {
      const h = harness();
      const onContext = vi.fn();
      const client =
        transport === 'native'
          ? await h.connect(true, { onContext })
          : await createDesktopAiClient({ portable: true, onPending: h.onPending, onContext }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const { bot, candles, strategy } = inputs();
      const training = candles.slice(0, 117);
      const funding = training[0].timestamp;
      const research: BotAiResearchConstraints = {
        ...researchConstraintsFixture(),
        minimumTrades: 1,
        goalEpisodes: {
          protocol: 'goal-episodes-v3',
          durationMs: 24 * HOUR,
          trainingEpisodes: 4,
          validationEpisodes: 2,
          trainingTailCandles: 20,
          validationTailCandles: 1,
          aggregation: 'mean-net-return',
          minimumTradesPerPartition: 1,
          signalWarmup: {
            candles: 201,
            firstCompletedAt: funding - 201 * HOUR,
            lastCompletedAt: funding - HOUR,
            use: 'signals-only',
            prices: 'not-supplied',
          },
        },
      };
      const shifted = structuredClone(research);
      if (shifted.goalEpisodes?.protocol !== 'goal-episodes-v3') throw new Error('fixture');
      shifted.goalEpisodes.signalWarmup.firstCompletedAt += HOUR;
      shifted.goalEpisodes.signalWarmup.lastCompletedAt += HOUR;
      await expect(client.suggest(bot, training, undefined, shifted)).rejects.toThrow('bots.errors.provider');
      for (const observations of [
        training.slice(1),
        [...training, { timestamp: funding + 117 * HOUR, close: '999999.123' }],
        training.map((candle) => ({ ...candle, timestamp: candle.timestamp + HOUR })),
      ])
        await expect(client.suggest(bot, observations, undefined, research)).rejects.toThrow('bots.errors.provider');
      const leakedPrefix = structuredClone(research);
      Object.assign(leakedPrefix.goalEpisodes!, {
        warmupCandles: [{ timestamp: funding - HOUR, close: '777777.321' }],
      });
      await expect(client.suggest(bot, training, undefined, leakedPrefix)).rejects.toThrow('bots.errors.provider');
      expect(h.onPending).not.toHaveBeenCalled();
      expect(onContext).not.toHaveBeenCalled();
      expect(client.getStatus().state).toBe('awaiting_budget');
      expect(() => client.readContext()).toThrow();
      if (transport === 'native') await expect(h.tool('context').execute()).rejects.toThrow();

      const pending = client.suggest(bot, training, undefined, research);
      const context = client.readContext();
      expect(context.candles).toEqual(training);
      expect(context.candles).toHaveLength(117);
      expect(context.trainingCutoff).toBe(training.at(-1)!.timestamp);
      expect(context.constraints.goalEpisodes).toEqual(research.goalEpisodes);
      expect(context.constraints.trainingCandles).toBe(117);
      expect(context.constraints.validationCandles).toBe(50);
      expect(JSON.stringify(context)).not.toMatch(/777777\.321|999999\.123|warmupCandles|heldOutCandles/);
      if (transport === 'native') expect(await h.tool('context').execute()).toEqual(context);
      await client.submitDraft({ requestId: context.requestId, strategy });
      await expect(pending).resolves.toMatchObject({ strategy });
    }
  );

  it('keeps portable access alive after partial native registration failure and allows retrying native tools', async () => {
    const h = harness();
    h.context.registerTool
      .mockImplementationOnce(async (tool, options) => {
        h.tools.push(tool);
        h.signals.push(options.signal);
      })
      .mockRejectedValueOnce(new Error('host registration unavailable'));
    const client = await createDesktopAiClient({ portable: true, onAgentConnected: h.onAgentConnected }, h.target);
    clients.push(client);
    expect(h.context.unregisterTool.mock.calls.flat()).toEqual([
      'polkaswap_autopilot_connect',
      'polkaswap_autopilot_status',
    ]);
    await expect(h.tool('connect').execute({ connectionId: client.connectionId })).rejects.toThrow();
    await client.connect({ connectionId: client.connectionId });
    await expect(client.syncTools()).resolves.toBe(true);
    await expect(h.tool('status').execute()).resolves.toMatchObject({ connected: true });
    expect(h.onAgentConnected).toHaveBeenCalledTimes(1);
  });

  it('revokes an in-flight late registration before a different client can reuse the registrar', async () => {
    const h = harness();
    const target = {} as Document & { modelContext?: typeof h.context };
    const client = await createDesktopAiClient({ portable: true }, target);
    clients.push(client);
    let release!: () => void;
    h.context.registerTool.mockImplementationOnce(
      (tool, options) =>
        new Promise<void>((resolve) => {
          h.tools.push(tool);
          h.signals.push(options.signal);
          release = resolve;
        })
    );
    target.modelContext = h.context;
    const syncing = client.syncTools();
    await Promise.resolve();
    const oldConnect = h.tool('connect');
    client.disconnect();
    const reconnecting = createDesktopAiClient({}, target);
    await expect(oldConnect.execute({ connectionId: client.connectionId })).rejects.toThrow();
    release();
    await expect(syncing).resolves.toBe(false);
    const next = await reconnecting;
    clients.push(next);
    expect(next.getStatus().connected).toBe(false);
    expect(h.context.registerTool).toHaveBeenCalledTimes(5);
    await next.connect({ connectionId: next.connectionId });
  });

  it('clears portable context on cancellation even when the context observer throws', async () => {
    const onContext = vi.fn(() => {
      throw new Error('view error');
    });
    const client = await createDesktopAiClient({ portable: true, onContext }, {} as Document);
    clients.push(client);
    await client.connect({ connectionId: client.connectionId });
    const { bot, candles } = inputs();
    const pending = client.suggest(bot, candles);
    const rejected = expect(pending).rejects.toThrow('bots.errors.stale');
    expect(client.readContext().candles).toHaveLength(202);
    client.disconnect();
    await rejected;
    expect(onContext).toHaveBeenLastCalledWith(null);
    expect(() => client.readContext()).toThrow();
  });

  it('publishes only supplied old training prices and exact public limits with a current expiry', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    Object.assign(bot.assetIn, { balance: 'SECRET_BALANCE', apiKey: 'SECRET_KEY' });
    Object.assign(bot, { endpoint: 'SECRET_ENDPOINT', model: 'SECRET_MODEL' });
    bot.portfolio.holdings.in = 'SECRET_HOLDINGS';
    bot.policy.maxTradeCodec.private = 'SECRET_EXTRA';
    Object.assign(candles[0], { holdout: 'SECRET_HOLDOUT' });
    const pending = client.suggest(bot, candles);
    const context = (await h.tool('context').execute()) as PublicContext;
    expect(context.expiresAt).toBe(NOW + 300_000);
    expect(context.trainingCutoff).toBe(candles.at(-1)!.timestamp);
    expect(context.candles).toHaveLength(202);
    expect(context.constraints.maxTradeCodec).toEqual({ in: '1000', out: '1000' });
    expect(context.constraints.maxPriceImpactPercent).toBe(bot.policy.maxPriceImpactPercent);
    expect(JSON.stringify(context)).not.toMatch(/SECRET_|"holdings"|"account"|"network"|"portfolio"|"provider"/);
    expect(((await h.tool('context').execute()) as PublicContext).requestId).toBe(context.requestId);
    context.assets[0].symbol = 'MUTATED';
    context.candles[0].close = '999';
    expect(((await h.tool('context').execute()) as PublicContext).candles[0].close).toBe('2');
    await expect(h.tool('draft').execute({ requestId: context.requestId, strategy })).resolves.toEqual({
      status: 'research_started',
      requiresTradingAuthorization: true,
    });
    await expect(pending).resolves.toEqual({ strategy, usage: { inputTokens: 0, outputTokens: 0, requests: 0 } });
    expect(h.onPending.mock.calls).toEqual([[true], [false]]);
    expect(h.signals.every((signal) => !signal.aborted)).toBe(true);
    await expect(h.tool('draft').execute({ requestId: context.requestId, strategy })).rejects.toThrow();
    await expect(h.tool('context').execute()).rejects.toThrow();
  });

  it.each(['native', 'portable'] as const)(
    'accepts instruction-compliant timing for every strategy through the %s transport',
    async (transport) => {
      const h = harness();
      const client =
        transport === 'native' ? await h.connect() : await createDesktopAiClient({ portable: true }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const submit = (value: unknown) =>
        transport === 'native' ? h.tool('draft').execute(value) : client.submitDraft(value);
      for (const kind of ['dca', 'threshold', 'sma', 'rules'] as const) {
        const { bot, candles, strategy } = inputs();
        const pending = client.suggest(bot, candles);
        const context = (
          transport === 'native' ? await h.tool('context').execute() : client.readContext()
        ) as DesktopAiContext;
        expect(context.rules).toContain('Set signalTiming to "closed-hour" for sma');
        expect(context.rules).toContain('set signalTiming to null for dca, threshold and rules');
        expect(context.rules).toContain('Never use "live-price" in autopilot');
        expect(context.rules).toContain('individual 24-hour episodes may have zero fills');
        expect(context.rules).toContain('A selective long-only rules entry may set exit to null');
        expect(context.responseSchema.properties.signalTiming.anyOf).toEqual([
          { type: 'null' },
          { type: 'string', enum: ['closed-hour'] },
        ]);
        expect(context.responseSchema.anyOf).toEqual([
          { properties: { kind: { enum: ['sma'] }, signalTiming: { enum: ['closed-hour'] } } },
          { properties: { kind: { enum: ['dca', 'threshold', 'rules'] }, signalTiming: { type: 'null' } } },
        ]);
        if (transport === 'native')
          expect(h.tool('draft').inputSchema.properties).toMatchObject({ strategy: context.responseSchema });
        const draft = {
          ...strategy,
          kind,
          threshold: kind === 'threshold' ? '2' : '0',
          signalTiming: kind === 'sma' ? 'closed-hour' : null,
          rules: kind === 'rules' ? ruleRecipe('trend') : null,
        };
        // An invalid timing never consumes the request, including the live-price option from the advanced schema.
        await expect(
          submit({ requestId: context.requestId, strategy: { ...draft, signalTiming: 'live-price' } })
        ).rejects.toThrow('bots.errors.provider');
        if (kind !== 'sma')
          await expect(
            submit({ requestId: context.requestId, strategy: { ...draft, signalTiming: 'closed-hour' } })
          ).rejects.toThrow('bots.errors.provider');
        await expect(submit({ requestId: context.requestId, strategy: draft })).resolves.toEqual({
          status: 'research_started',
          requiresTradingAuthorization: true,
        });
        const result = await pending;
        expect(result.strategy).toMatchObject({ kind, threshold: draft.threshold });
        expect(result.strategy.signalTiming).toBe(kind === 'sma' ? 'closed-hour' : undefined);
      }
    }
  );

  it('keeps a rejected oversized draft retryable and snapshots exact monetary caps against later caller edits', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = (await h.tool('context').execute()) as PublicContext;
    bot.policy.maxTradeCodec.in = '99999999';
    bot.assetIn.decimals = 18;
    await expect(
      h.tool('draft').execute({ requestId: context.requestId, strategy: { ...strategy, amount: '10.01' } })
    ).rejects.toThrow();
    await expect(h.tool('draft').execute({ requestId: 'wrong', strategy })).rejects.toThrow();
    expect(h.onPending).toHaveBeenCalledTimes(1);
    await h.tool('draft').execute({ requestId: context.requestId, strategy: { ...strategy, amount: '10' } });
    expect((await pending).strategy.amount).toBe('10');
  });

  it.each(['native', 'portable'] as const)(
    'publishes and enforces the feasible research cadence through the %s transport',
    async (transport) => {
      const h = harness();
      const client =
        transport === 'native' ? await h.connect() : await createDesktopAiClient({ portable: true }, {} as Document);
      if (transport === 'portable') {
        clients.push(client);
        await client.connect({ connectionId: client.connectionId });
      }
      const { bot, candles, strategy } = inputs();
      const research: BotAiResearchConstraints = {
        minimumIntervalMs: HOUR,
        maximumIntervalMs: 12 * HOUR,
        minimumTrades: 5,
        trainingCandles: candles.length,
        validationCandles: 50,
      };
      const pending = client.suggest(bot, candles, undefined, research);
      const context = client.readContext();
      expect(context.constraints).toMatchObject(research);
      expect(context.responseSchema.properties.intervalMs).toEqual({
        type: 'integer',
        minimum: HOUR,
        maximum: 12 * HOUR,
      });
      expect(context.rules).toContain('Use a 1 to 12 hour interval');
      expect(context.candles).toHaveLength(candles.length);
      expect(context.trainingCutoff).toBe(candles.at(-1)!.timestamp);
      research.maximumIntervalMs = 24 * HOUR;
      context.constraints.maximumIntervalMs = 24 * HOUR;
      const submit = (value: unknown) =>
        transport === 'native' ? h.tool('draft').execute(value) : client.submitDraft(value);
      for (const intervalMs of [HOUR - 1, 24 * HOUR])
        await expect(submit({ requestId: context.requestId, strategy: { ...strategy, intervalMs } })).rejects.toThrow(
          'bots.errors.provider'
        );
      await submit({ requestId: context.requestId, strategy: { ...strategy, intervalMs: 12 * HOUR } });
      await expect(pending).resolves.toMatchObject({ strategy: { intervalMs: 12 * HOUR } });
    }
  );

  it('rejects an accessor impact limit before exposing native or portable research context', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles } = inputs();
    const getter = vi.fn(() => '1');
    Object.defineProperty(bot.policy, 'maxPriceImpactPercent', { get: getter });
    await expect(client.suggest(bot, candles)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() => client.readContext()).toThrow();
    await expect(h.tool('context').execute()).rejects.toThrow();
    expect(h.onPending).not.toHaveBeenCalled();
  });

  it.each(['forged', 'accessor', 'currentPrice', 'heldOutClose', 'qualified', 'scenario-accessor'] as const)(
    'rejects %s exact-size costs before exposing either desktop transport',
    async (malformation) => {
      const h = harness();
      const client = await h.connect();
      const { bot, candles } = inputs();
      const research = researchConstraintsFixture();
      const { finalizedAt, blockHash, buy, sell } = research.costs!;
      research.costSamples = [
        {
          amountInCodec: '100',
          status: 'available',
          finalizedAt,
          blockHash,
          buy: { ...buy },
          sell: { ...sell },
          openingFeeScenario: openingFeeScenario(),
        },
      ];
      const getter = vi.fn(() => 'private');
      const sample = research.costSamples[0];
      if (sample.status !== 'available') throw Error('Expected available synthetic sample');
      if (malformation === 'forged') Object.assign(research.costSamples[0], { finalizedAt: finalizedAt + 1 });
      else if (malformation === 'accessor') Object.defineProperty(research.costSamples, '0', { get: getter });
      else if (malformation === 'scenario-accessor')
        Object.defineProperty(sample.openingFeeScenario!.opening, 'feeOnlyLossPercent', { get: getter });
      else Object.assign(sample.openingFeeScenario!.firstPossibleTrade, { [malformation]: 'private' });
      await expect(client.suggest(bot, candles, undefined, research)).rejects.toThrow();
      expect(getter).not.toHaveBeenCalled();
      expect(() => client.readContext()).toThrow();
      await expect(h.tool('context').execute()).rejects.toThrow();
      expect(h.onPending).not.toHaveBeenCalled();
      expect(client.getStatus().state).toBe('awaiting_budget');
    }
  );

  it.each([
    { maximumIntervalMs: 25 * HOUR },
    { minimumIntervalMs: 0 },
    { maximumIntervalMs: HOUR + 1 },
    { trainingCandles: 1 },
    { validationCandles: 2161 },
    { minimumTrades: 0 },
    { minimumTrades: 50 },
    { extra: 'never expose arbitrary extensions' },
  ])('rejects invalid public research constraints %# before publishing a context', async (patch) => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles } = inputs();
    await expect(
      client.suggest(bot, candles, undefined, {
        minimumIntervalMs: HOUR,
        maximumIntervalMs: 12 * HOUR,
        minimumTrades: 5,
        trainingCandles: candles.length,
        validationCandles: 50,
        ...patch,
      })
    ).rejects.toThrow('bots.errors.provider');
    expect(client.getStatus().state).toBe('awaiting_budget');
    expect(h.onPending).not.toHaveBeenCalled();
  });

  it('revokes superseded request IDs without allowing a duplicate submission to resolve the new request', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const first = client.suggest(bot, candles);
    const firstRejection = expect(first).rejects.toThrow('bots.errors.stale');
    const old = (await h.tool('context').execute()) as PublicContext;
    const second = client.suggest(bot, candles);
    await firstRejection;
    const current = (await h.tool('context').execute()) as PublicContext;
    expect(current.requestId).not.toBe(old.requestId);
    await expect(h.tool('draft').execute({ requestId: old.requestId, strategy })).rejects.toThrow();
    await h.tool('draft').execute({ requestId: current.requestId, strategy });
    await expect(second).resolves.toMatchObject({ strategy });
  });

  it('times out after five minutes and rejects the old request even if its tool call arrives later', async () => {
    vi.useFakeTimers();
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const rejected = expect(pending).rejects.toThrow('bots.codex.expired');
    const context = (await h.tool('context').execute()) as PublicContext;
    await vi.advanceTimersByTimeAsync(300_000);
    await rejected;
    await expect(h.tool('draft').execute({ requestId: context.requestId, strategy })).rejects.toThrow();
    expect(h.onPending.mock.calls).toEqual([[true], [false]]);
  });

  it('enforces wall-clock expiry even if browser throttling delayed the timeout callback', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles } = inputs();
    const pending = client.suggest(bot, candles);
    const rejected = expect(pending).rejects.toThrow('bots.codex.expired');
    vi.spyOn(Date, 'now').mockReturnValue(NOW + 300_000);
    await expect(h.tool('status').execute()).resolves.toEqual({
      connectionId: client.connectionId,
      connected: true,
      state: 'awaiting_budget',
    });
    await expect(h.tool('context').execute()).rejects.toThrow();
    await rejected;
  });

  it('reports expiry from a late draft without consuming it or describing a market-data failure', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = client.readContext();
    const rejected = expect(pending).rejects.toThrow('bots.codex.expired');
    vi.spyOn(Date, 'now').mockReturnValue(context.expiresAt);
    await expect(client.submitDraft({ requestId: context.requestId, strategy })).rejects.toThrow();
    await rejected;
    expect(h.onPending.mock.calls).toEqual([[true], [false]]);
    expect(client.getStatus().state).toBe('awaiting_budget');
  });

  it('handles external cancellation and disconnect without exposing an obsolete context', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const controller = new AbortController();
    const pending = client.suggest(bot, candles, controller.signal);
    const rejected = expect(pending).rejects.toThrow('bots.errors.stale');
    const context = (await h.tool('context').execute()) as PublicContext;
    controller.abort();
    await rejected;
    await expect(h.tool('draft').execute({ requestId: context.requestId, strategy })).rejects.toThrow();
    const again = client.suggest(bot, candles);
    const disconnected = expect(again).rejects.toThrow('bots.errors.stale');
    client.disconnect();
    client.disconnect();
    await disconnected;
    expect(h.signals.every((signal) => signal.aborted)).toBe(true);
    expect(h.context.unregisterTool).toHaveBeenCalledTimes(4);
    await expect(client.suggest(bot, candles)).rejects.toThrow('bots.errors.stale');
  });

  it('rejects an aborted tool call without consuming a valid pending draft', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = (await h.tool('context').execute()) as PublicContext;
    const abort = new AbortController();
    abort.abort();
    await expect(
      h.tool('draft').execute({ requestId: context.requestId, strategy }, { signal: abort.signal })
    ).rejects.toThrow();
    await h.tool('draft').execute({ requestId: context.requestId, strategy });
    await pending;
  });

  it('cleans up every attempted registration after partial failure and allows a fresh retry', async () => {
    const h = harness();
    h.context.registerTool.mockRejectedValueOnce(new Error('private-host-error'));
    await expect(h.connect()).rejects.toThrow('bots.errors.provider');
    expect(h.context.unregisterTool).toHaveBeenCalledWith('polkaswap_autopilot_connect');
    expect(h.signals).toHaveLength(0);
    await h.connect();
    expect(h.tools).toHaveLength(4);
  });

  it('revokes attempted tools if registration fails after the first tool was installed', async () => {
    const h = harness();
    h.context.registerTool
      .mockImplementationOnce(async (tool, options) => {
        h.tools.push(tool);
        h.signals.push(options.signal);
      })
      .mockRejectedValueOnce(new Error('private-host-error'));
    await expect(h.connect()).rejects.toThrow('bots.errors.provider');
    expect(h.context.unregisterTool.mock.calls.flat()).toEqual([
      'polkaswap_autopilot_connect',
      'polkaswap_autopilot_status',
    ]);
    expect(h.signals[0].aborted).toBe(true);
    await expect(h.tool('connect').execute({ connectionId: CONNECTION_ID })).rejects.toThrow();
  });

  it('waits for disconnect cleanup before immediately connecting again, including failed unregister calls', async () => {
    const h = harness();
    const client = await h.connect();
    h.context.unregisterTool.mockImplementation(() => {
      throw new Error('private-removal-error');
    });
    client.disconnect();
    await h.connect();
    expect(h.context.registerTool).toHaveBeenCalledTimes(8);
  });

  it('rejects extra fields and getters without executing or consuming the pending request', async () => {
    const h = harness();
    const client = await h.connect();
    const { bot, candles, strategy } = inputs();
    const pending = client.suggest(bot, candles);
    const context = (await h.tool('context').execute()) as PublicContext;
    const getter = vi.fn(() => strategy);
    const input = { requestId: context.requestId };
    Object.defineProperty(input, 'strategy', { enumerable: true, get: getter });
    await expect(h.tool('draft').execute(input)).rejects.toThrow();
    await expect(h.tool('draft').execute({ requestId: context.requestId, strategy, start: true })).rejects.toThrow();
    await expect(h.tool('context').execute({ includeHoldout: true })).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    await h.tool('draft').execute({ requestId: context.requestId, strategy });
    await pending;
  });

  it.each(['oversize', 'future', 'unordered', 'live', 'wallet', 'invalid-price'] as const)(
    'refuses %s input without publishing context',
    async (fault) => {
      const h = harness();
      const client = await h.connect();
      const { bot, candles } = inputs();
      if (fault === 'oversize') candles.push({ timestamp: NOW, close: '2', feeClose: '1' });
      if (fault === 'future') candles.at(-1)!.timestamp = NOW + 1;
      if (fault === 'unordered') candles[1].timestamp = candles[0].timestamp;
      if (fault === 'live') bot.mode = 'live';
      if (fault === 'wallet') bot.account = 'private-wallet';
      if (fault === 'invalid-price') candles[0].close = 'Infinity';
      await expect(client.suggest(bot, candles)).rejects.toThrow();
      await expect(h.tool('context').execute()).rejects.toThrow();
      expect(h.onPending).not.toHaveBeenCalled();
    }
  );
});
