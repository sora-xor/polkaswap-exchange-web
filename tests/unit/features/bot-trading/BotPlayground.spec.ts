import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BotPlayground from '@/features/bot-trading/components/BotPlayground.vue';
import { BotHistoryRangeError } from '@/features/bot-trading/playground-history';
import type { PlaygroundSettings } from '@/features/bot-trading/playground';
import type { BotDefinition, BotHistory, BotResearchSnapshot } from '@/features/bot-trading/types';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { ResearchCandidate, ResearchSettings } from '@/features/bot-trading/research';
import { toCodec } from '@/features/bot-trading/amounts';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';
import { createMockHistoricalSource } from '../../../fixtures/bot-trading/mockHistory';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}));
// Isolate the component from wallet/indexer modules. This mock models only the
// provider's structured range error, not successful historical observations.
vi.mock('@/features/bot-trading/playground-history', () => ({
  BotHistoryRangeError: class extends Error {
    readonly requestedStartAt: number;
    readonly requestedEndAt: number;
    readonly availableStartAt: number | null;
    readonly availableEndAt: number | null;
    readonly missing: number;
    constructor(history: BotHistory, startAt: number, endAt: number) {
      super('bots.errors.history');
      this.requestedStartAt = startAt;
      this.requestedEndAt = endAt;
      this.availableStartAt = history.candles[0]?.timestamp ?? null;
      this.availableEndAt = history.candles.at(-1)?.timestamp ?? null;
      this.missing = history.missing;
    }
  },
}));

const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const START = Date.UTC(2026, 2, 1);
const HOUR = 3_600_000;
const END = START + 361 * HOUR;
const NOW = END + 30 * 60_000;

/** Fabricated unit-test prices mock the provider boundary; they are not real market evidence. */
function history(): BotHistory {
  return {
    ...createMockHistoricalSource(END).history,
    identity: { genesisHash: `0x${'b'.repeat(64)}`, denominator: '1' },
  };
}

/** Explicit fabricated finalized observations; production fee values are never supplied by this fixture. */
function feeSnapshot(bot: BotDefinition, patch: Partial<ResearchFeeSnapshot> = {}): ResearchFeeSnapshot {
  return {
    networkFeeXor: '0.125',
    priceImpactPercent: '0',
    sellPriceImpactPercent: '0',
    networkFeeCodec: toCodec('0.125', XOR.decimals),
    swapFeePercent: '0.9',
    sellNetworkFeeXor: '0.25',
    sellNetworkFeeCodec: toCodec('0.25', XOR.decimals),
    sellSwapFeePercent: '1.2',
    sellAmountIn: '5',
    sellAmountOut: '9.94',
    sellDexId: 0,
    sellRoute: [bot.assetOut.address, bot.assetIn.address],
    sellRouteFees: [
      {
        assetAddress: bot.assetOut.address,
        amountCodec: toCodec('0.06', bot.assetOut.decimals),
        amount: '0.06',
        decimals: bot.assetOut.decimals,
      },
    ],
    queriedAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    blockNumber: 123456,
    blockHash: `0x${'a'.repeat(64)}`,
    genesisHash: `0x${'b'.repeat(64)}`,
    endpoint: 'wss://unit-test.invalid',
    denominator: '1',
    amountIn: bot.strategy.amount,
    amountOut: '5',
    assetInAddress: bot.assetIn.address,
    assetOutAddress: bot.assetOut.address,
    dexId: 0,
    route: [bot.assetIn.address, bot.assetOut.address],
    routeFees: [
      {
        assetAddress: bot.assetIn.address,
        amountCodec: toCodec('0.09', bot.assetIn.decimals),
        amount: '0.09',
        decimals: bot.assetIn.decimals,
      },
    ],
    ...patch,
  };
}

interface Providers {
  loadHistory?: (bot: BotDefinition, settings: PlaygroundSettings) => Promise<BotHistory>;
  loadFees?: (bot: BotDefinition, settings: ResearchSettings) => Promise<ResearchFeeSnapshot>;
}
const mounted: VueWrapper[] = [];

/** Mount with mocked provider boundaries while retaining the actual replay engine and monetary arithmetic. */
function render(overrides: Providers = {}) {
  const wrapper = mount(BotPlayground, {
    props: {
      assets,
      loadHistory: vi.fn(async () => history()),
      loadFees: vi.fn(async (bot: BotDefinition) => feeSnapshot(bot)),
      ...overrides,
    },
    global: { stubs: { TradeDistribution: true } },
  });
  mounted.push(wrapper);
  return wrapper;
}

/** A controlled provider request makes stale-result races deterministic without network access. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

/** Flush the component's settings debounce, then its asynchronous provider and Vue work. */
async function updateSettings(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
  await settleResearch();
}

/** Advance only active computation checkpoints, retaining real provider and engine work in this component test. */
async function settleResearch(): Promise<void> {
  for (let step = 0; step < 100; step++) {
    await flushPromises();
    if (mounted.at(-1)?.attributes('aria-busy') !== 'true') return;
    await vi.advanceTimersByTimeAsync(20);
  }
  await flushPromises();
}

/** An unavailable source must leave no animated outcomes, equity, or saveable result. */
function expectNoResults(wrapper: ReturnType<typeof render>): void {
  expect(wrapper.findComponent({ name: 'TradeDistribution' }).exists()).toBe(false);
  expect(wrapper.get('[data-testid="strategy-flow"]').attributes('data-mode')).toBe('illustrative');
  expect(wrapper.get('[data-testid="strategy-flow-source"]').text()).toBe('bots.flow.illustrative');
  expect(wrapper.find('[data-testid="strategy-flow-outcome"]').exists()).toBe(false);
  expect(wrapper.get('[data-testid="playground-return"]').text()).toBe('—%');
  expect(wrapper.get('[data-testid="playground-trades"]').text()).toBe('—');
  expect(wrapper.find('.equity-path').exists()).toBe(false);
  expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeDefined();
  expect(wrapper.emitted('save')).toBeUndefined();
}

/** Apply exactly the component's presentation precision after exact candidate arithmetic. */
function signed(amount: string): string {
  const value = new FPNumber(amount);
  return `${value.gt(FPNumber.ZERO) ? '+' : ''}${value.toFixed(2)}`;
}

describe('BotPlayground verified history and live fees', () => {
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let motion: (event: MediaQueryListEvent) => void;
  let reduced: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    frames = new Map();
    frameId = 0;
    reduced = true;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++frameId;
      frames.set(id, callback);
      setTimeout(() => {
        if (frames.delete(id)) callback(performance.now());
      }, 1);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('matchMedia', () => ({
      matches: reduced,
      addEventListener: (_event: string, callback: typeof motion) => {
        motion = callback;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('restores the shared strategy and reports navigation changes without saving a bot', async () => {
    const wrapper = render();
    await wrapper.setProps({ strategyPreset: 'sma' });
    expect(wrapper.get('[data-testid="playground-preset-sma"]').attributes('aria-pressed')).toBe('true');
    await wrapper.get('[data-testid="playground-preset-threshold"]').trigger('click');
    expect(wrapper.emitted('navigate')?.at(-1)).toEqual(['threshold']);
    await wrapper.setProps({ strategyPreset: 'dca' });
    expect(wrapper.get('[data-testid="playground-preset-dca"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('loads the March 1 study and current fees by default with no sample, import, or wallet UI', async () => {
    const loadHistory = vi.fn<NonNullable<Providers['loadHistory']>>(async () => history());
    const loadFees = vi.fn(async (bot: BotDefinition) => feeSnapshot(bot));
    const wrapper = render({ loadHistory, loadFees });
    await settleResearch();
    expect(loadHistory).toHaveBeenCalledOnce();
    expect(loadFees).toHaveBeenCalledOnce();
    expect(loadFees).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), {
      allowHistoricalFinalizedState: true,
    });
    expect(loadHistory.mock.calls[0][1]).toMatchObject({ historyStartAt: START, historyEndAt: END });
    expect(loadFees.mock.calls[0][0].strategy.threshold).toBe('');
    expect(wrapper.get('[data-testid="research-history-range"]').text()).toContain('2026-03-01 01:00');
    expect(wrapper.get('[data-testid="research-history-range"]').text()).toContain('2026-03-16 01:00');
    expect(wrapper.get('[data-testid="playground-data-label"]').text()).toBe('bots.playground.historicalData');
    expect(wrapper.find('[data-testid="playground-source-preview"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="playground-source-historical"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="research-source-imported"]').exists()).toBe(false);
    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('bots.playground.demoData');
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('trades')).toHaveLength(360);
    expect(wrapper.get('[data-testid="playground-history-coverage"]').text()).toContain('100.00%');
    expect(wrapper.get('[data-testid="playground-chart"]').element.closest('details')).toBeNull();
    expect(wrapper.get('.equity-detail').element.tagName).toBe('SECTION');
    expect(wrapper.get('.equity-detail h4').text()).toContain('bots.research.equityCurve');
    expect(wrapper.get('[data-testid="playground-chart"]').isVisible()).toBe(true);
    expect(wrapper.get('.equity-path').isVisible()).toBe(true);
    expect(wrapper.get('.chart-timeline').isVisible()).toBe(true);
    expect(wrapper.get('.capital-control').text()).toContain('XOR');
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.get('[data-testid="strategy-flow"]').attributes('data-mode')).toBe('historical');
    expect(wrapper.get('[data-testid="strategy-flow"]').classes()).not.toContain('is-moving');
    expect(wrapper.get('[data-testid="research-pair-explanation"]').text()).toContain('XOR VAL');
    expect(wrapper.get('[data-testid="research-cadence-explanation"]').text()).toContain('bots.flow.hourlyBacktest');
    expect(wrapper.get('[data-testid="research-cadence-explanation"]').text()).toContain('bots.flow.liveBlocks 10 60');
    expect((wrapper.get('[data-testid="playground-interval"]').element as HTMLSelectElement).value).toBe('10');
    expect(wrapper.get('[data-testid="research-cadence-explanation"]').text()).toContain('bots.flow.cadenceLimit');
  });

  it('keeps fast live intervals while explaining whole-hour intervals and swapped token roles', async () => {
    const wrapper = render();
    await settleResearch();
    const options = wrapper
      .findAll('[data-testid="playground-interval"] option')
      .map((option) => option.attributes('value'));
    expect(options).toEqual(expect.arrayContaining(['1', '5', '10', '600']));
    await wrapper.get('[data-testid="playground-interval"]').setValue('600');
    await wrapper.get('[data-testid="research-reverse-pair"]').trigger('click');
    expect(wrapper.get('[data-testid="research-pair-explanation"]').text()).toContain('VAL XOR');
    expect(wrapper.get('[data-testid="research-cadence-explanation"]').text()).toContain('bots.flow.liveHours 1');
    expect(wrapper.get('[data-testid="strategy-flow"]').attributes('data-mode')).toBe('illustrative');
    await updateSettings();
    expect(wrapper.get('[data-testid="strategy-flow"]').attributes('data-mode')).toBe('historical');
  });

  it('pauses a hidden renderer and completes research without waiting for its presentation acknowledgement', async () => {
    const waitForCheckpoint = vi.fn(async () => undefined);
    const Renderer = defineComponent({
      props: { paused: Boolean },
      setup(_props, { expose }) {
        expose({ waitForCheckpoint });
        return {};
      },
      template: '<div data-testid="checkpoint-renderer" />',
    });
    const wrapper = mount(BotPlayground, {
      props: {
        assets,
        active: false,
        loadHistory: async () => history(),
        loadFees: async (bot: BotDefinition) => feeSnapshot(bot),
      },
      global: { stubs: { TradeDistribution: Renderer } },
    });
    mounted.push(wrapper);
    await settleResearch();
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.getComponent(Renderer).props('paused')).toBe(true);
    expect(waitForCheckpoint).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="playground-return"]').text()).not.toBe('—%');
    expect(wrapper.get('[data-testid="strategy-flow"]').classes()).not.toContain('is-moving');
    await wrapper.setProps({ active: true });
    expect(wrapper.getComponent(Renderer).props('paused')).toBe(false);
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it.each([
    ['archive-pool-spot', 'bots.research.archiveHistoryNote'],
    ['mixed-pool-spot-and-indexed', 'bots.research.mixedHistoryNote'],
  ] as const)(
    'describes %s history without presenting indexed prices as archive reconstruction',
    async (kind, note) => {
      const wrapper = render({
        loadHistory: async () => ({
          ...history(),
          provenance: {
            kind,
            requestedStartAt: START,
            requestedEndAt: END,
            availableStartAt: START + HOUR,
            availableEndAt: END,
            generatedAt: NOW,
            archiveEndpoint: 'https://mof2.sora.org/',
          },
        }),
      });
      await settleResearch();
      expect(wrapper.get('[data-testid="playground-data-note"]').text()).toContain(note);
      if (kind === 'mixed-pool-spot-and-indexed')
        expect(wrapper.get('[data-testid="playground-data-note"]').text()).not.toContain(
          'bots.research.archiveHistoryNote'
        );
      expect(wrapper.get('[data-testid="research-available-range"]').text()).toContain('2026-03-01 01:00');
    }
  );

  it.each(['dca', 'threshold', 'sma'] as const)(
    'runs %s using only loaded history and saves fresh isolated paper capital',
    async (preset) => {
      let observed!: ResearchFeeSnapshot;
      const wrapper = render({
        loadFees: async (bot) => {
          observed = feeSnapshot(bot);
          return observed;
        },
      });
      await settleResearch();
      await wrapper.get(`[data-testid="playground-preset-${preset}"]`).trigger('click');
      await wrapper.get('[data-testid="playground-capital"]').setValue('100.000000000000000001');
      await updateSettings();
      expect(wrapper.find('[data-testid="playground-error"]').exists()).toBe(false);
      expect(wrapper.emitted('save')).toBeUndefined();
      await wrapper.get('[data-testid="playground-save"]').trigger('click');
      const [saved, settings, snapshot] = wrapper.emitted('save')![0] as [
        BotDefinition,
        ResearchSettings,
        BotResearchSnapshot,
      ];
      expect(saved).toMatchObject({ mode: 'paper', status: 'idle', equity: [], sessionExpiresAt: 0 });
      expect(saved.portfolio.initial[XOR.address]).toBe('100000000000000000001');
      expect(saved.portfolio.holdings).toEqual(saved.portfolio.initial);
      expect(saved.portfolio.trades).toBe(0);
      expect(saved.strategy.kind).toBe(preset);
      expect(saved.strategy.threshold).toBe('1.84');
      expect(saved.name).toBe(`bots.playground.presets.${preset}`);
      expect(settings).toMatchObject({ sellNetworkFeeXor: '0.25', sellSwapFeePercent: '1.2' });
      expect(snapshot).toMatchObject({
        sellNetworkFeeXor: '0.25',
        sellSwapFeePercent: '1.2',
        feeObservation: {
          blockNumber: 123456,
          blockHash: `0x${'a'.repeat(64)}`,
          genesisHash: `0x${'b'.repeat(64)}`,
          endpoint: 'wss://unit-test.invalid',
          queriedAt: observed.queriedAt,
          amountIn: saved.strategy.amount,
          sellAmountIn: '5',
        },
      });
      expect(settings).toMatchObject({ networkFeeXor: '0.125', swapFeePercent: '0.9', historyStartAt: START });
      expect(snapshot).toMatchObject({
        source: 'historical',
        startAt: START + HOUR,
        endAt: END,
        networkFeeXor: '0.125',
        swapFeePercent: '0.9',
      });
    }
  );

  it('shows no fabricated results while history is pending or after a provider failure', async () => {
    const pending = deferred<BotHistory>();
    const wrapper = render({ loadHistory: () => pending.promise });
    await settleResearch();
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expectNoResults(wrapper);
    pending.reject(new Error('provider unavailable'));
    await settleResearch();
    expect(wrapper.get('[data-testid="playground-error"]').text()).toBe('bots.playground.historyError');
    expect(wrapper.attributes('aria-busy')).toBe('false');
    expectNoResults(wrapper);
  });

  it.each(['missing', 'unverified'] as const)(
    'refuses %s history without generating replacement prices',
    async (failure) => {
      const invalid = history();
      if (failure === 'unverified') invalid.denominationVerified = false;
      const wrapper = render({ loadHistory: failure === 'missing' ? undefined : async () => invalid });
      await settleResearch();
      expect(wrapper.get('[data-testid="playground-error"]').text()).toBe('bots.playground.historyError');
      expectNoResults(wrapper);
    }
  );

  it('shows real late-start history and its actual missing coverage instead of failing the pair', async () => {
    const source = history();
    source.candles.shift();
    source.missing = 1;
    const wrapper = render({ loadHistory: async () => source });
    await settleResearch();
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('trades')).toHaveLength(359);
    expect(wrapper.get('[data-testid="playground-history-coverage"]').text()).toContain('99.72%');
    expect(wrapper.get('[data-testid="research-history-range"]').text()).toContain('2026-03-01 02:00');
    expect(wrapper.get('[data-testid="research-available-range"]').text()).toContain('2026-03-01 02:00');
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const saved = wrapper.emitted('save')![0][2] as BotResearchSnapshot;
    expect(saved.startAt).toBe(source.candles[0].timestamp);
  });

  it.each(['missing-proof', 'different-chain', 'different-denominator'] as const)(
    'refuses %s when history and fees do not share one verified denomination',
    async (failure) => {
      const invalid = history();
      if (failure === 'missing-proof') delete invalid.identity;
      if (failure === 'different-chain') invalid.identity!.genesisHash = `0x${'c'.repeat(64)}`;
      if (failure === 'different-denominator') invalid.identity!.denominator = '1000';
      const wrapper = render({ loadHistory: async () => invalid });
      await settleResearch();
      expectNoResults(wrapper);
      expect(wrapper.text()).toContain('bots.research.feeUnavailable');
    }
  );

  it('reports actual available dates when the historical provider rejects a truncated March study', async () => {
    const partial = history();
    partial.candles = partial.candles.slice(100);
    const wrapper = render({
      loadHistory: async () => {
        throw new BotHistoryRangeError(partial, START, END);
      },
    });
    await settleResearch();
    expect(wrapper.get('[data-testid="research-history-unavailable"]').text()).toContain('2026-03-05 05:00');
    expectNoResults(wrapper);
  });

  it('shows exact live fee observations as read-only values with finalized-block provenance', async () => {
    const wrapper = render();
    await settleResearch();
    expect(wrapper.get('[data-testid="research-network-fee"]').element.tagName).toBe('OUTPUT');
    expect(wrapper.get('[data-testid="research-swap-fee"]').element.tagName).toBe('OUTPUT');
    expect(wrapper.get('[data-testid="research-network-fee"]').text()).toBe('0.125');
    expect(wrapper.get('[data-testid="research-swap-fee"]').text()).toBe('0.9');
    expect(wrapper.get('[data-testid="research-sell-network-fee"]').text()).toBe('0.25');
    expect(wrapper.get('[data-testid="research-sell-swap-fee"]').text()).toBe('1.2');
    expect(wrapper.get('[data-testid="research-fee-provenance"]').text()).toContain('123456');
    expect(wrapper.get('[data-testid="research-costs"]').text()).toContain('XOR');
    expect(wrapper.text()).not.toContain('0.0007');
  });

  it.each([
    ['0.0000000123456789', '0.0000000987654321', '0.0000000123457', '0.0000000987654'],
    [
      '0.000000000000000000123456789',
      '0.000000000000000000987654321',
      '0.000000000000000000123457',
      '0.000000000000000000987654',
    ],
    ['2', '12.3456789', '2', '12.3457'],
  ])('preserves significant digits in entry %s and final valuation %s', async (entry, final, entryText, finalText) => {
    const source = history();
    source.candles = source.candles.map((candle, index) => ({
      ...candle,
      close: index === source.candles.length - 1 ? final : entry,
    }));
    const wrapper = render({ loadHistory: async () => source });
    await settleResearch();
    expect(wrapper.get('[data-testid="research-entry-price"]').text().split(' · ')[0]).toBe(entryText);
    expect(wrapper.get('[data-testid="research-mark-price"]').text().split(' · ')[0]).toBe(finalText);
    const candidates = wrapper.findComponent({ name: 'TradeDistribution' }).props('trades') as ResearchCandidate[];
    expect(candidates[0].price).toBe(entry);
    expect(candidates[0].endPrice).toBe(final);
  });

  it.each([
    ['0.6030150753768844', '0.06'],
    ['0.000001', '0.0000000995'],
    ['0', '0.00'],
  ])('rounds displayed LP costs at %s percent without changing their exact value', async (swapFeePercent, display) => {
    reduced = false;
    const source = history();
    source.candles = source.candles.map((candle) => ({ ...candle, close: '1' }));
    const wrapper = render({
      loadHistory: async () => source,
      loadFees: async (bot) => feeSnapshot(bot, { swapFeePercent }),
    });
    await settleResearch();
    const distribution = wrapper.findComponent({ name: 'TradeDistribution' });
    expect(distribution.props('evidenceAssets')).toEqual(
      expect.arrayContaining([expect.objectContaining({ symbol: 'XOR' })])
    );
    expect(distribution.props('outputSymbol')).toBeTruthy();
    const candidates = distribution.props('trades') as ResearchCandidate[];
    const exactCost = candidates[0].costs.swapFeeInCapital;
    if (display === '0.06') {
      expect(new FPNumber(exactCost, 36).lt(new FPNumber('0.06'))).toBe(true);
      expect(new FPNumber(exactCost, 36).gt(new FPNumber('0.0599999999999999'))).toBe(true);
    }
    expect(wrapper.get('[data-testid="research-trade-swap-cost"]').text()).toBe(
      `bots.research.swapCosts: ${display} XOR`
    );
    const total = candidates
      .filter((candidate) => candidate.selected)
      .reduce((sum, candidate) => sum.add(new FPNumber(candidate.costs.swapFeeInCapital, 36)), new FPNumber('0', 36));
    const totalDisplay =
      !total.isZero() && total.lt(new FPNumber('0.01'))
        ? total.value.precision(6, 4).toFixed()
        : total.value.toFixed(2, 4);
    expect(wrapper.get('[data-testid="research-swap-cost-total"]').text()).toBe(`${totalDisplay} XOR`);
    expect(candidates[0].costs.swapFeeInCapital).toBe(exactCost);
  });

  it.each(['missing', 'rejected', 'expired'] as const)(
    'refuses %s live fees without a fixed-rate fallback',
    async (failure) => {
      const wrapper = render({
        loadFees:
          failure === 'missing'
            ? undefined
            : async (bot) => {
                if (failure === 'rejected') throw new Error('node offline');
                return feeSnapshot(bot, { expiresAt: Date.now() });
              },
      });
      await settleResearch();
      expectNoResults(wrapper);
      expect(wrapper.get('[data-testid="research-network-fee"]').text()).toBe('—');
      expect(wrapper.get('[data-testid="research-swap-fee"]').text()).toBe('—');
      expect(wrapper.get('[data-testid="research-sell-network-fee"]').text()).toBe('—');
      expect(wrapper.get('[data-testid="research-sell-swap-fee"]').text()).toBe('—');
      expect(wrapper.text()).toContain('bots.research.feeUnavailable');
    }
  );

  it('disables saving at fee expiry while preserving the completed result for inspection', async () => {
    const wrapper = render({ loadFees: async (bot) => feeSnapshot(bot, { expiresAt: Date.now() + 1000 }) });
    await settleResearch();
    expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1001);
    await settleResearch();
    expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="research-fee-provenance"]').text()).toContain('bots.research.feeStale');
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).exists()).toBe(true);
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('ignores both old history and fee responses after a pair change', async () => {
    const oldHistory = deferred<BotHistory>();
    const oldFees = deferred<ResearchFeeSnapshot>();
    const loadHistory = vi
      .fn()
      .mockImplementationOnce(() => oldHistory.promise)
      .mockImplementation(async () => history());
    const loadFees = vi
      .fn()
      .mockImplementationOnce(() => oldFees.promise)
      .mockImplementation(async (bot: BotDefinition) => feeSnapshot(bot));
    const wrapper = render({ loadHistory, loadFees });
    await settleResearch();
    const oldBot = loadFees.mock.calls[0][0] as BotDefinition;
    await wrapper.get('[data-testid="research-token-out"]').setValue(PSWAP.address);
    await updateSettings();
    expect(loadHistory).toHaveBeenCalledTimes(2);
    expect(loadFees).toHaveBeenCalledTimes(2);
    oldHistory.resolve(history());
    oldFees.resolve(feeSnapshot(oldBot, { networkFeeXor: '0.8' }));
    await settleResearch();
    expect(wrapper.get('[data-testid="research-network-fee"]').text()).toBe('0.125');
    expect(wrapper.get('.chart-context strong').text()).toBe('PSWAP / XOR');
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const [saved, , snapshot] = wrapper.emitted('save')![0] as [BotDefinition, ResearchSettings, BotResearchSnapshot];
    expect(saved.assetOut.address).toBe(PSWAP.address);
    expect(snapshot.networkFeeXor).toBe('0.125');
  });

  it('ignores an earlier settings request and rejects saving stale settings before the new result', async () => {
    const oldHistory = deferred<BotHistory>();
    const loadHistory = vi
      .fn()
      .mockImplementationOnce(() => oldHistory.promise)
      .mockImplementation(async () => history());
    const wrapper = render({ loadHistory });
    await settleResearch();
    await wrapper.get('[data-testid="playground-capital"]').setValue('250');
    expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeDefined();
    await updateSettings();
    oldHistory.reject(new Error('old request failed'));
    await settleResearch();
    expect(wrapper.find('[data-testid="playground-error"]').exists()).toBe(false);
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const saved = wrapper.emitted('save')![0][0] as BotDefinition;
    expect(saved.portfolio.initial[XOR.address]).toBe(toCodec('250', XOR.decimals));
    await wrapper.get('[data-testid="playground-capital"]').setValue('0');
    await updateSettings();
    expect(wrapper.get('[data-testid="playground-error"]').text()).toBe('bots.playground.validationError');
    expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeDefined();
  });

  it('streams processed candidates and exact metrics during calculation, then freezes final state without replay', async () => {
    reduced = false;
    const wrapper = render();
    await flushPromises();
    const distribution = wrapper.findComponent({ name: 'TradeDistribution' });
    expect(distribution.props('live')).toBe(true);
    expect(distribution.props('calculating')).toBe(true);
    const checkpoint = distribution.props('calculation');
    const partialTrades = distribution.props('trades') as ResearchCandidate[];
    expect(partialTrades.length).toBeGreaterThan(0);
    expect(partialTrades.length).toBeLessThan(360);
    expect(wrapper.get('[data-testid="playground-return"]').text()).toBe(`${signed(checkpoint.result.returnPercent)}%`);
    expect(wrapper.get('[data-testid="playground-save"]').attributes('disabled')).toBeDefined();
    await settleResearch();
    expect(distribution.props('calculating')).toBe(false);
    expect(distribution.props('trades')).toHaveLength(360);
    const final = wrapper.get('.research-metrics').text();
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const saved = (wrapper.emitted('save')![0] as [BotDefinition, ResearchSettings, BotResearchSnapshot])[2];
    expect(wrapper.get('[data-testid="playground-return"]').text()).toBe(`${signed(saved.returnPercent)}%`);
    distribution.vm.$emit('replay', { settledCount: 0 });
    motion({ matches: true } as MediaQueryListEvent);
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect(wrapper.get('.research-metrics').text()).toBe(final);
    expect(frames.size).toBe(0);
  });

  it('aborts in-flight computation and rejects stale checkpoints after parameters change', async () => {
    const wrapper = render();
    await flushPromises();
    expect(wrapper.attributes('aria-busy')).toBe('true');
    await wrapper.get('[data-testid="playground-capital"]').setValue('250');
    await updateSettings();
    await settleResearch();
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const bot = wrapper.emitted('save')![0][0] as BotDefinition;
    expect(bot.portfolio.initial[XOR.address]).toBe(toCodec('250', XOR.decimals));
    expect(bot.strategy.intervalMs).toBe(60_000);
  });

  it('retains every candidate while filtering and paginating the ledger', async () => {
    const wrapper = render();
    await settleResearch();
    const distribution = wrapper.findComponent({ name: 'TradeDistribution' });
    const trades = distribution.props('trades') as ResearchCandidate[];
    expect(trades).toHaveLength(360);
    expect(wrapper.findAll('[data-testid="research-ledger"] tbody tr')).toHaveLength(40);
    await wrapper.get('[data-testid="research-trade-filter"]').setValue('excluded');
    expect(distribution.props('trades')).toHaveLength(360);
    expect(
      wrapper
        .findAll('[data-testid="research-ledger"] tbody tr')
        .every((row) => row.text().includes('bots.research.excluded'))
    ).toBe(true);
    distribution.vm.$emit('select', trades[359].id);
    await settleResearch();
    expect(wrapper.get('[data-testid="research-inspector"]').text()).toContain(trades[359].id);
    expect(wrapper.get('[data-testid="research-ledger"] .active-trade').text()).toContain(trades[359].id);
  });

  it('reverses the pair atomically and reloads fees for the new direction', async () => {
    const loadFees = vi.fn(async (bot: BotDefinition) => feeSnapshot(bot));
    const wrapper = render({ loadFees });
    await settleResearch();
    await wrapper.get('[data-testid="research-reverse-pair"]').trigger('click');
    await updateSettings();
    expect((wrapper.get('[data-testid="research-token-in"]').element as HTMLSelectElement).value).toBe(VAL.address);
    expect((wrapper.get('[data-testid="research-token-out"]').element as HTMLSelectElement).value).toBe(XOR.address);
    expect(loadFees).toHaveBeenCalledTimes(2);
    expect(loadFees.mock.calls[1][0].assetIn.address).toBe(VAL.address);
    expect(wrapper.get('.capital-control').text()).toContain('VAL');
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const saved = wrapper.emitted('save')![0][0] as BotDefinition;
    expect(saved.policy.feeAsset.address).toBe(XOR.address);
    expect(saved.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
  });

  it('preserves a separate XOR reserve and observed pair fees when saving a non-XOR strategy', async () => {
    const wrapper = render();
    await settleResearch();
    await wrapper.get('[data-testid="research-token-out"]').setValue(PSWAP.address);
    await wrapper.get('[data-testid="research-token-in"]').setValue(VAL.address);
    await wrapper.get('[data-testid="research-bot-name"]').setValue('My VAL strategy');
    await updateSettings();
    expect(wrapper.find('[data-testid="playground-error"]').exists()).toBe(false);
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    const [saved, settings, snapshot] = wrapper.emitted('save')![0] as [
      BotDefinition,
      ResearchSettings,
      BotResearchSnapshot,
    ];
    expect(saved.name).toBe('My VAL strategy');
    expect(saved.assetIn.address).toBe(VAL.address);
    expect(saved.assetOut.address).toBe(PSWAP.address);
    expect(saved.policy.feeAsset.address).toBe(XOR.address);
    expect(saved.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
    expect(saved.portfolio.trades).toBe(0);
    expect(settings.swapFeePercent).toBe('0.9');
    expect(snapshot).toMatchObject({ source: 'historical', networkFeeXor: '0.125', swapFeePercent: '0.9' });
  });

  it('keeps the study array stable while yielding browser frames for validation', async () => {
    reduced = false;
    const wrapper = render();
    let studyCandidates: readonly ResearchCandidate[] | undefined;
    let validationSeen = false;
    for (let step = 0; step < 150; step++) {
      await flushPromises();
      const renderer = wrapper.findComponent({ name: 'TradeDistribution' });
      const checkpoint = renderer.exists() ? renderer.props('calculation') : undefined;
      if (checkpoint?.scope === 'study') studyCandidates = renderer.props('trades');
      if (checkpoint && checkpoint.scope !== 'study') {
        expect(renderer.props('trades')).toBe(studyCandidates);
        expect(wrapper.attributes('aria-busy')).toBe('true');
        validationSeen = true;
        break;
      }
      await vi.advanceTimersByTimeAsync(1);
    }
    expect(validationSeen).toBe(true);
    await settleResearch();
    expect(wrapper.attributes('aria-busy')).toBe('false');
  });

  it('defaults to three chronological tests and separates portfolio metrics from overlapping attribution', async () => {
    const wrapper = render();
    await settleResearch();
    expect((wrapper.get('[data-testid="research-validation"]').element as HTMLSelectElement).value).toBe(
      'walk-forward'
    );
    expect(wrapper.findAll('[data-testid="research-validation-results"] tbody tr')).toHaveLength(3);
    const metrics = wrapper.get('.research-metrics');
    expect(metrics.text()).toContain('bots.uxResults.maxDrawdown');
    expect(metrics.text()).toContain('bots.uxResults.simulatedFills');
    expect(metrics.text()).toContain('bots.validationInsights.latestTest');
    expect(metrics.text()).not.toContain('bots.research.selectedOutcome');
    expect(metrics.text()).not.toContain('bots.research.missedWinners');
    expect(wrapper.get('[data-testid="research-executions"]').text()).toBe(
      wrapper.get('[data-testid="playground-trades"]').text()
    );
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('validates three chronological folds and applies training settings as a new full-period replay', async () => {
    const wrapper = render();
    await settleResearch();
    await wrapper.get('[data-testid="research-validation"]').setValue('walk-forward');
    await wrapper.get('[data-testid="research-optimize"]').setValue(true);
    await updateSettings();
    expect(wrapper.findAll('[data-testid="research-validation-results"] tbody tr')).toHaveLength(3);
    expect(wrapper.emitted('save')).toBeUndefined();
    await wrapper.get('[data-testid="research-apply-trained"]').trigger('click');
    await updateSettings();
    expect(wrapper.find('[data-testid="research-optimize"]').exists()).toBe(false);
    expect((wrapper.get('[data-testid="research-validation"]').element as HTMLSelectElement).value).toBe('none');
    expect(wrapper.findAll('[data-testid="research-validation-results"] tbody tr')).toHaveLength(0);
    expect(wrapper.find('[data-testid="research-apply-trained"]').exists()).toBe(false);
    await wrapper.get('[data-testid="playground-save"]').trigger('click');
    expect(wrapper.emitted('save')![0][2]).toMatchObject({ validation: 'none', optimized: false });
  });
});
