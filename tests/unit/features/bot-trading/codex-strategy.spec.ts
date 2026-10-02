import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isCodexStrategySupported,
  registerCodexStrategyTools,
  createCodexStrategyContext,
  type CodexStrategyContext,
  type CodexStrategyDraft,
} from '@/features/bot-trading/codex-strategy';
import { botFixture } from './fixtures';
import { RULE_RECIPE_IDS, ruleRecipe } from '@/features/bot-trading/rule-recipes';
import { RESEARCH_DEFAULT_SETTINGS } from '@/features/bot-trading/research';

const NOW = Date.UTC(2026, 8, 14, 8, 30);
type Tool = {
  name: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute(input?: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
};
type PublicContext = {
  requestId: string;
  expiresAt: number;
  instruction: string;
  assets: { symbol: string }[];
  constraints: { maxTradeCodec: Record<string, string> };
  candles: { timestamp: number; close: string }[];
};

/** Isolated paper research input; no chain, wallet, or provider access is needed. */
function source(): CodexStrategyContext {
  const bot = botFixture();
  Object.assign(bot, { account: 'paper', network: 'paper', sessionExpiresAt: 0 });
  bot.strategy.prompt = 'Buy on dips.';
  return { bot, revision: 'first', candles: [{ timestamp: NOW, close: '2' }] };
}

/** Minimal structural browser surface records registrations and their lifetime signals. */
function harness() {
  const tools: Tool[] = [];
  const signals: AbortSignal[] = [];
  const registerTool = vi.fn(async (tool: Tool, options: { signal: AbortSignal }) => {
    tools.push(tool);
    signals.push(options.signal);
  });
  const unregisterTool = vi.fn(async () => undefined);
  const context = { registerTool, unregisterTool };
  const target = { modelContext: context } as unknown as Document;
  const initial = source();
  const getContext = vi.fn(async () => initial);
  const getRevision = vi.fn(() => initial.revision);
  const submitDraft = vi.fn(async (_draft: CodexStrategyDraft) => ({ privateValue: 'not-for-agent' }));
  return {
    tools,
    signals,
    context,
    target,
    initial,
    options: { getContext, getRevision, submitDraft },
  };
}

/** Find a registered tool by its stable protocol name. */
function find(tools: Tool[], suffix: 'context' | 'draft'): Tool {
  const tool = tools.find((item) => item.name === `polkaswap_strategy_${suffix}`);
  if (!tool) throw new Error('Expected strategy tool registration.');
  return tool;
}

afterEach(() => vi.restoreAllMocks());

describe('Codex strategy drafting WebMCP session', () => {
  it('detects only a top-level browser registrar and never equates support with authentication', async () => {
    const h = harness();
    expect(isCodexStrategySupported(h.target)).toBe(true);
    expect(isCodexStrategySupported({} as Document)).toBe(false);
    expect(isCodexStrategySupported({ modelContext: {} } as Document)).toBe(false);
    const frame = { modelContext: h.context, defaultView: { top: {} } } as unknown as Document;
    expect(isCodexStrategySupported(frame)).toBe(false);
    await expect(registerCodexStrategyTools(h.options, frame)).rejects.toThrow();
    expect(h.context.registerTool).not.toHaveBeenCalled();
  });

  it('shares bounded copied research fields and keeps wallet-like extensions and usage out of context', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    Object.assign(h.initial.bot.assetIn, { balance: 'private-wallet-balance', apiKey: 'private-key' });
    h.initial.bot.policy.maxTradeCodec.unrelated = 'private-balance';
    h.initial.candles = Array.from({ length: 207 }, (_, index) => ({
      timestamp: NOW - (206 - index) * 60_000,
      close: '2',
      ...({ walletAddress: 'private-account' } as object),
    }));
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    expect(h.tools.map(({ name }) => name)).toEqual(['polkaswap_strategy_context', 'polkaswap_strategy_draft']);
    expect(h.tools.map(({ annotations }) => annotations.readOnlyHint)).toEqual([true, false]);
    const result = (await find(h.tools, 'context').execute({ instruction: 'temporary request' })) as PublicContext;
    expect(h.options.getContext).toHaveBeenCalledWith({ instruction: 'temporary request' });
    expect(result.instruction).toBe('Buy on dips.');
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.expiresAt).toBe(NOW + 300_000);
    expect(result.candles).toHaveLength(202);
    expect(result.constraints.maxTradeCodec).toEqual({ in: '1000', out: '1000' });
    expect(JSON.stringify(result)).not.toMatch(/private-|apiUsage|sessionExpiresAt|"holdings"|"account"|"network"/);
    result.assets[0].symbol = 'MUTATED';
    result.candles[0].close = '9';
    expect(h.initial.bot.assetIn.symbol).toBe('IN');
    expect(h.initial.candles[5].close).toBe('2');
    await cleanup();
  });

  it('detects the standard navigator registrar as a fallback while preferring the existing document surface', async () => {
    const h = harness();
    const view = { top: undefined as unknown, navigator: { modelContext: h.context } };
    view.top = view;
    const target = { defaultView: view } as unknown as Document;
    expect(isCodexStrategySupported(target)).toBe(true);
    const cleanup = await registerCodexStrategyTools(h.options, target);
    expect(h.context.registerTool).toHaveBeenCalledTimes(2);
    await cleanup();
    const alternate = harness();
    const priorityTarget = { defaultView: view, modelContext: alternate.context } as unknown as Document;
    const remove = await registerCodexStrategyTools(alternate.options, priorityTarget);
    expect(alternate.context.registerTool).toHaveBeenCalledTimes(2);
    expect(h.context.registerTool).toHaveBeenCalledTimes(2);
    await remove();
  });

  it('exports portable current rule context and all recipes as copied public data', () => {
    const input = source();
    input.selectedRules = ruleRecipe('spring');
    const result = createCodexStrategyContext(input, NOW);
    expect(result.selectedPreset).toBe('rules');
    expect(result.selectedStrategy?.rules).toEqual(ruleRecipe('spring'));
    expect(result.selectedStrategy?.intervalMs).toBeGreaterThanOrEqual(3_600_000);
    expect(result.recipes.map((recipe) => recipe.id)).toEqual(RULE_RECIPE_IDS);
    expect(Object.keys(result.conditionSemantics)).toHaveLength(10);
    expect(result.responseSchema.properties.kind.enum).toContain('rules');
    result.selectedStrategy!.rules!.entry.conditions[0].window = 199;
    result.recipes[0].rules.entry.conditions[0].window = 199;
    expect(input.selectedRules).toEqual(ruleRecipe('spring'));
    expect(ruleRecipe('spring').entry.conditions[0].window).toBe(48);
    expect(JSON.stringify(result)).not.toMatch(/"account"|"holdings"|"network"|sessionExpiresAt/);
  });

  it('includes current basic SMA preferences in direct context without sharing arbitrary settings', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    h.initial.bot.strategy.kind = 'sma';
    h.initial.settings = {
      ...RESEARCH_DEFAULT_SETTINGS,
      preset: 'sma',
      fastWindow: 7,
      slowWindow: 36,
      signalTiming: 'live-price',
      intervalBlocks: 15,
      tradePercent: 3,
      capital: '12.000000000000000001',
      slippagePercent: '0.25',
      wallet: 'PRIVATE_WALLET',
      apiKey: 'PRIVATE_KEY',
      holdings: 'PRIVATE_HOLDINGS',
    } as typeof h.initial.settings;
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const context = (await find(h.tools, 'context').execute()) as ReturnType<typeof createCodexStrategyContext>;
    expect(context.selectedPreset).toBe('sma');
    expect(context.selectedStrategy).toBeNull();
    expect(context.researchPreferences).toMatchObject({
      preset: 'sma',
      fastWindow: 7,
      slowWindow: 36,
      signalTiming: 'live-price',
      intervalBlocks: 15,
      tradePercent: 3,
      capital: '12.000000000000000001',
      slippagePercent: '0.25',
      optimize: false,
    });
    expect(context.constraints.slippagePercent).toBe('0.25');
    expect(JSON.stringify(context)).not.toMatch(/PRIVATE_WALLET|PRIVATE_KEY|PRIVATE_HOLDINGS/);
    context.researchPreferences!.fastWindow = 9;
    expect(h.initial.settings!.fastWindow).toBe(7);
    await cleanup();
  });

  it('preserves a relative price-trigger preference without inventing an absolute trigger', () => {
    const input = source();
    input.bot.strategy.kind = 'threshold';
    input.bot.strategy.threshold = '0';
    input.settings = { ...RESEARCH_DEFAULT_SETTINGS, preset: 'threshold', thresholdPercent: 17 };
    const result = createCodexStrategyContext(input, NOW);
    expect(result.selectedPreset).toBe('threshold');
    expect(result.selectedStrategy).toBeNull();
    expect(result.researchPreferences).toMatchObject({ preset: 'threshold', thresholdPercent: 17 });
    expect(result.researchPreferences).not.toHaveProperty('threshold');
  });

  it('accepts an exact composed strategy through the single-use draft boundary', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    h.initial.selectedRules = ruleRecipe('persistent');
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const context = (await find(h.tools, 'context').execute()) as PublicContext;
    const strategy = {
      ...h.initial.bot.strategy,
      kind: 'rules',
      threshold: '0',
      intervalMs: 3_600_000,
      rules: ruleRecipe('spring'),
      prompt: '',
    };
    await find(h.tools, 'draft').execute({ requestId: context.requestId, strategy });
    const submitted = h.options.submitDraft.mock.calls[0][0];
    expect(submitted.strategy).toEqual(strategy);
    expect(submitted.strategy.rules).not.toBe(strategy.rules);
    await cleanup();
  });

  it('preserves an explicit custom SMA selection without leaking its provider prose or mutating it', () => {
    const input = source();
    input.selectedStrategy = {
      ...input.bot.strategy,
      kind: 'sma',
      signalTiming: 'live-price',
      fastWindow: 7,
      slowWindow: 36,
      prompt: 'provider-only prose',
    };
    const result = createCodexStrategyContext(input, NOW);
    expect(result.selectedPreset).toBe('sma');
    expect(result.selectedStrategy).toMatchObject({
      kind: 'sma',
      signalTiming: 'live-price',
      fastWindow: 7,
      slowWindow: 36,
      prompt: '',
    });
    expect(JSON.stringify(result)).not.toContain('provider-only prose');
    result.selectedStrategy!.fastWindow = 9;
    expect(input.selectedStrategy.fastWindow).toBe(7);
  });

  it('hands a validated single-use draft to review only and ignores callback return data', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const context = (await find(h.tools, 'context').execute()) as PublicContext;
    const strategy = { ...h.initial.bot.strategy, amount: '1.23', prompt: '' };
    const request = { requestId: context.requestId, strategy };
    await expect(find(h.tools, 'draft').execute(request)).resolves.toEqual({
      status: 'draft_ready',
      requiresUserReview: true,
    });
    expect(h.options.submitDraft).toHaveBeenCalledExactlyOnceWith({
      requestId: context.requestId,
      strategy,
      revision: 'first',
      instruction: 'Buy on dips.',
    });
    expect(h.options.submitDraft.mock.calls[0][0].strategy).not.toBe(strategy);
    await expect(find(h.tools, 'draft').execute(request)).rejects.toThrow();
    expect(h.options.submitDraft).toHaveBeenCalledTimes(1);
    await cleanup();
  });

  it('enforces exact draft fields, supported rules, and the copied token ceiling despite external mutation', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const context = (await find(h.tools, 'context').execute()) as PublicContext;
    h.initial.bot.policy.maxTradeCodec.in = '9999999';
    context.constraints.maxTradeCodec.in = '9999999';
    const valid = { ...h.initial.bot.strategy, prompt: '' };
    for (const strategy of [
      { ...valid, amount: '10.01' },
      { ...valid, amount: '1e-2' },
      { ...valid, kind: 'ai' },
      { ...valid, intervalMs: 5999 },
      { ...valid, slowWindow: 2 },
      { ...valid, execute: 'code' },
    ])
      await expect(find(h.tools, 'draft').execute({ requestId: context.requestId, strategy })).rejects.toThrow();
    await expect(
      find(h.tools, 'draft').execute({ requestId: context.requestId, strategy: valid, startBot: true })
    ).rejects.toThrow();
    expect(h.options.submitDraft).not.toHaveBeenCalled();
    await expect(
      find(h.tools, 'draft').execute({ requestId: context.requestId, strategy: valid })
    ).resolves.toMatchObject({ status: 'draft_ready' });
    await cleanup();
  });

  it('rejects expired, superseded, or edited context identifiers', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const first = (await find(h.tools, 'context').execute()) as PublicContext;
    const second = (await find(h.tools, 'context').execute()) as PublicContext;
    const request = (requestId: string) => ({ requestId, strategy: h.initial.bot.strategy });
    await expect(find(h.tools, 'draft').execute(request(first.requestId))).rejects.toThrow();
    h.options.getRevision.mockReturnValue('changed');
    await expect(find(h.tools, 'draft').execute(request(second.requestId))).rejects.toThrow();
    h.options.getRevision.mockReturnValue('first');
    clock.mockReturnValue(second.expiresAt);
    await expect(find(h.tools, 'draft').execute(request(second.requestId))).rejects.toThrow();
    expect(h.options.submitDraft).not.toHaveBeenCalled();
    await cleanup();
  });

  it('rejects real bot contexts, stale history and unknown or oversized context arguments', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    for (const input of [null, [], { wallet: true }, { instruction: '' }, { instruction: 'x'.repeat(2001) }])
      await expect(find(h.tools, 'context').execute(input)).rejects.toThrow();
    expect(h.options.getContext).not.toHaveBeenCalled();
    h.initial.bot.account = 'actual-wallet';
    await expect(find(h.tools, 'context').execute()).rejects.toThrow();
    h.initial.bot.account = 'paper';
    h.initial.bot.mode = 'live';
    await expect(find(h.tools, 'context').execute()).rejects.toThrow();
    h.initial.bot.mode = 'paper';
    h.initial.candles[0].timestamp = NOW - 7_200_001;
    await expect(find(h.tools, 'context').execute()).rejects.toThrow();
    expect(h.options.submitDraft).not.toHaveBeenCalled();
    await cleanup();
  });

  it('rejects a late context if the user changed settings while history was loading', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    let resolve!: (value: CodexStrategyContext) => void;
    h.options.getContext.mockImplementation(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const request = find(h.tools, 'context').execute();
    h.options.getRevision.mockReturnValue('changed');
    resolve(h.initial);
    await expect(request).rejects.toThrow();
    await expect(
      find(h.tools, 'draft').execute({ requestId: 'anything', strategy: h.initial.bot.strategy })
    ).rejects.toThrow();
    await cleanup();
  });

  it('does not let an older in-flight context replace a newer completed request', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    let resolve!: (value: CodexStrategyContext) => void;
    h.options.getContext.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const older = find(h.tools, 'context').execute();
    const current = (await find(h.tools, 'context').execute()) as PublicContext;
    resolve(h.initial);
    await expect(older).rejects.toThrow();
    await expect(
      find(h.tools, 'draft').execute({ requestId: current.requestId, strategy: h.initial.bot.strategy })
    ).resolves.toMatchObject({ status: 'draft_ready' });
    await cleanup();
  });

  it('cancels pending context work and revokes all tools immediately on cleanup', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    let resolve!: (value: CodexStrategyContext) => void;
    h.options.getContext.mockImplementation(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const pending = find(h.tools, 'context').execute();
    const rejection = expect(pending).rejects.toThrow('unavailable');
    await cleanup();
    await cleanup();
    await rejection;
    resolve(h.initial);
    expect(h.signals.every((signal) => signal.aborted)).toBe(true);
    expect(h.context.unregisterTool).toHaveBeenCalledTimes(2);
    await expect(find(h.tools, 'context').execute()).rejects.toThrow();
    expect(h.options.getContext).toHaveBeenCalledTimes(1);
  });

  it('honors caller abort without leaking its reason or invoking after a pre-abort', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const aborted = new AbortController();
    aborted.abort('private abort reason');
    await expect(find(h.tools, 'context').execute({}, { signal: aborted.signal })).rejects.toMatchObject({
      code: 'POLKASWAP_STRATEGY_UNAVAILABLE',
      message: 'The Polkaswap strategy request is unavailable or no longer current.',
    });
    expect(h.options.getContext).not.toHaveBeenCalled();
    h.options.getContext.mockRejectedValueOnce(new Error('private provider token'));
    await expect(find(h.tools, 'context').execute()).rejects.toThrow(
      'The Polkaswap strategy request is unavailable or no longer current.'
    );
    const context = (await find(h.tools, 'context').execute()) as PublicContext;
    h.options.submitDraft.mockRejectedValueOnce(new Error('private UI value'));
    await expect(
      find(h.tools, 'draft').execute({ requestId: context.requestId, strategy: h.initial.bot.strategy })
    ).rejects.toThrow('The Polkaswap strategy request is unavailable or no longer current.');
    await cleanup();
  });

  it('rolls back partial registration, permits later recovery, and rejects a competing registration', async () => {
    const h = harness();
    h.context.registerTool
      .mockImplementationOnce(async (tool, options) => {
        h.tools.push(tool);
        h.signals.push(options.signal);
      })
      .mockRejectedValueOnce(new Error('private registrar detail'));
    await expect(registerCodexStrategyTools(h.options, h.target)).rejects.toThrow('unavailable');
    expect(h.context.unregisterTool.mock.calls).toEqual([['polkaswap_strategy_context'], ['polkaswap_strategy_draft']]);
    expect(h.signals[0].aborted).toBe(true);
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    await expect(registerCodexStrategyTools(h.options, h.target)).rejects.toThrow();
    await cleanup();
    await (
      await registerCodexStrategyTools(h.options, h.target)
    )();
  });
  it('rejects an in-flight caller abort and prevents its late context from becoming usable', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const h = harness();
    let resolve!: (value: CodexStrategyContext) => void;
    h.options.getContext.mockImplementationOnce(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    const call = new AbortController();
    const pending = find(h.tools, 'context').execute({}, { signal: call.signal });
    const rejected = expect(pending).rejects.toThrow('unavailable');
    call.abort('private cancellation');
    await rejected;
    resolve(h.initial);
    await Promise.resolve();
    const current = (await find(h.tools, 'context').execute()) as PublicContext;
    await expect(
      find(h.tools, 'draft').execute({ requestId: current.requestId, strategy: h.initial.bot.strategy })
    ).resolves.toMatchObject({ status: 'draft_ready' });
    await cleanup();
  });

  it('revokes every tool and releases registration ownership even if legacy unregister throws synchronously', async () => {
    const h = harness();
    h.context.unregisterTool.mockImplementation(() => {
      throw new Error('private unregister failure');
    });
    const cleanup = await registerCodexStrategyTools(h.options, h.target);
    await expect(cleanup()).resolves.toBeUndefined();
    expect(h.context.unregisterTool).toHaveBeenCalledTimes(2);
    expect(h.signals.every((signal) => signal.aborted)).toBe(true);
    await (
      await registerCodexStrategyTools(h.options, h.target)
    )();
  });
});
