import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, shallowRef } from 'vue';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import QuantCommandCenter from '@/features/bot-trading/components/quant/QuantCommandCenter.vue';
import {
  generateQuantCandidates,
  type QuantLoopResult,
  type QuantMarketResult,
} from '@/features/bot-trading/quant-loop';
import type { QuantDeployPayload } from '@/features/bot-trading/quant-deploy';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotAsset } from '@/features/bot-trading/types';

const mocks = vi.hoisted(() => ({
  translate: vi.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key
  ),
  loop: null as unknown as Record<string, unknown>,
}));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: mocks.translate }) }));
vi.mock('@/features/bot-trading/useQuantLoop', () => ({ useQuantLoop: () => mocks.loop }));

const PSWAP: BotAsset = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 };
const DAI: BotAsset = { address: '0xdai', symbol: 'DAI', decimals: 18 };
const VAL: BotAsset = { address: '0xval', symbol: 'VAL', decimals: 18 };
const XST: BotAsset = { address: '0xxst', symbol: 'XST', decimals: 18 };
const ASSETS: BotAsset[] = [{ address: XOR.address, symbol: 'XOR', decimals: 18 }, PSWAP, DAI, VAL, XST];
const candidates = generateQuantCandidates();
const pick = (id: string) => candidates.find((item) => item.id === id)!;

function market(asset: BotAsset, status: QuantMarketResult['status'], returnPercent = '0.00'): QuantMarketResult {
  const start = Date.UTC(2026, 5, 10);
  return {
    asset,
    status,
    medianXorDepth: status === 'thin' ? 10.72 : 56.55,
    folds:
      status === 'thin'
        ? []
        : [0, 1, 2, 3].map((index) => ({
            startAt: start + index * 25 * 86_400_000,
            endAt: start + (index + 1) * 25 * 86_400_000 - 3_600_000,
            candidateId: index === 2 ? null : 'reversion:96/20/10:2',
            family: index === 2 ? null : 'reversion',
            robust: index === 2 ? 0 : 50,
            returnPercent: index === 2 ? '0.00' : '9.57',
            trades: index === 2 ? 0 : 10,
            priceChangePercent: '-8.54',
          })),
    walkForward:
      status === 'thin'
        ? null
        : {
            startAt: start,
            endAt: start + 100 * 86_400_000,
            returnPercent,
            drawdownPercent: '33.72',
            trades: 37,
            priceChangePercent: '60.04',
            equity: [
              { timestamp: start, value: '10', price: '0.00005' },
              { timestamp: start + 50 * 86_400_000, value: '12', price: '0.00007' },
              { timestamp: start + 100 * 86_400_000, value: '14.349', price: '0.00008' },
            ],
            cadence: {
              episodes: 5,
              daysPerEpisode: 20.2,
              holdHours: { min: 26, max: 164 },
              lastEntryAt: start + 91 * 86_400_000,
            },
            fills: [
              {
                timestamp: start + 86_400_000,
                side: 'sell',
                input: '1000',
                output: '2.4',
                fee: '0.1',
                price: '0.00005',
                pnlPercent: '12.50',
                impactPercent: '6.10',
              },
            ],
          },
    final:
      status === 'deploy'
        ? {
            candidate: pick('reversion:48/15/10:3'),
            robust: 103,
            train: { returnPercent: '94.17', drawdownPercent: '57.27', trades: 19, maxImpactPercent: '14.06' },
          }
        : status === 'watch'
          ? null
          : null,
  };
}

const RESULT: QuantLoopResult = {
  version: 1,
  testedAt: Date.UTC(2026, 9, 2),
  archive: {
    genesisHash: `0x${'7e'.repeat(32)}`,
    denominator: '100',
    generatedAt: Date.UTC(2026, 8, 19),
    startAt: Date.UTC(2026, 2, 1, 1),
    endAt: Date.UTC(2026, 8, 19, 3),
    hours: 4851,
  },
  costs: { networkFeeXor: '0.100020612589707326', swapFeePercent: '0.6', slippagePercent: '0.5' },
  counts: { candidates: 672, markets: 6, backtests: 19372, killed: 3907, robust: 125, deployable: 2 },
  markets: [
    market(XST, 'thin'),
    market(VAL, 'watch'),
    market(DAI, 'deploy', '11.20'),
    market(PSWAP, 'deploy', '43.49'),
  ],
  mesh: [],
  families: [
    { family: 'reversion', tested: 240, robust: 60 },
    { family: 'guarded', tested: 480, robust: 50 },
    { family: 'shock', tested: 216, robust: 15 },
    { family: 'trend', tested: 96, robust: 0 },
    { family: 'breakout', tested: 24, robust: 0 },
  ],
};

const FEES = {
  networkFeeXor: '0.100020612589707326',
  swapFeePercent: '0.6',
  sellNetworkFeeXor: '0.100020612589707326',
  sellSwapFeePercent: '0.6',
  priceImpactPercent: '5',
  sellPriceImpactPercent: '5',
  queriedAt: Date.UTC(2026, 9, 2, 11),
  blockNumber: 1,
  blockHash: `0x${'ab'.repeat(32)}`,
  genesisHash: `0x${'7e'.repeat(32)}`,
  endpoint: 'wss://ws.mof.sora.org',
  amountIn: '3',
  sellAmountIn: '100',
} as ResearchFeeSnapshot;

function setLoop(overrides: Record<string, unknown> = {}) {
  mocks.loop = {
    status: ref('done'),
    progress: shallowRef(null),
    result: shallowRef(RESULT),
    fees: shallowRef(FEES),
    signals: ref({
      PSWAP: {
        state: 'entry',
        observedAt: Date.UTC(2026, 9, 2, 10),
        deviation: { value: '-18.4', threshold: '-15', window: 48 },
        source: 'live',
      },
    }),
    error: ref(''),
    start: vi.fn(),
    refreshSignals: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  };
}

function render(props: Partial<InstanceType<typeof QuantCommandCenter>['$props']> = {}) {
  return mount(QuantCommandCenter, {
    props: {
      assets: ASSETS,
      loadFees: vi.fn(async () => FEES),
      loadHistory: vi.fn(),
      busy: false,
      ...props,
    },
    global: { stubs: { QuantMesh: true, QuantLattice: true, QuantGlassArt: true } },
  });
}

beforeEach(() => {
  mocks.translate.mockClear();
  setLoop();
  // Reduced motion shows the gauge's exact value immediately instead of sweeping the needle.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('QuantCommandCenter', () => {
  it('explains how to use the page in three steps that match the card actions', () => {
    const wrapper = render();
    const steps = wrapper.findAll('[data-testid="quant-steps"] li');
    expect(steps.map((step) => step.get('strong').text())).toEqual([
      'bots.quant.steps.choose.title',
      'bots.quant.steps.paper.title',
      'bots.quant.steps.live.title',
    ]);
    expect(steps[1].text()).toContain('bots.quant.steps.paper.text');
    const actions = wrapper.findAll('[data-testid="quant-market-PSWAP"] .quant-actions button');
    expect(actions.map((button) => button.attributes('data-testid'))).toEqual([
      'quant-paper-PSWAP',
      'quant-live-PSWAP',
      'quant-swap-PSWAP',
    ]);
  });

  it('orders ready markets first and lists the others with a plain reason', () => {
    const wrapper = render();
    const cards = wrapper.findAll('.quant-market').map((card) => card.attributes('data-testid'));
    expect(cards).toEqual(['quant-market-PSWAP', 'quant-market-DAI']);
    const idle = wrapper.findAll('.quant-idle-item').map((item) => item.attributes('data-testid'));
    expect(idle).toEqual(['quant-market-VAL', 'quant-market-XST']);
    expect(wrapper.get('.quant-other h4').text()).toBe('bots.quant.otherMarkets');
    expect(wrapper.find('[data-testid="quant-swap-XST"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="quant-market-XST"]').text()).toContain('bots.quant.thinNote');
    expect(wrapper.get('[data-testid="quant-market-VAL"]').text()).toContain('bots.quant.watchNote');
    expect(wrapper.get('[data-testid="quant-market-VAL"]').text()).not.toContain('bots.quant.priceChange');
    expect(wrapper.find('[data-testid="quant-live-VAL"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="quant-return-PSWAP"]').text()).toBe('+43.5%');
    expect(wrapper.get('[data-testid="quant-disclaimer"]').text()).toContain('bots.quant.disclaimer');
  });

  it('states each rule, the budget and the fee reserve in plain terms', () => {
    const card = render().get('[data-testid="quant-market-PSWAP"]');
    const rule = card.get('.quant-rule');
    expect(rule.attributes('aria-label')).toBe('bots.quant.rule.label');
    expect(rule.findAll('dt').map((term) => term.text())).toEqual([
      'bots.quant.rule.buy {"amount":"3"}',
      'bots.quant.rule.sell',
    ]);
    expect(rule.findAll('dd').map((item) => item.text())).toEqual([
      'bots.quant.rule.deviationBelow {"window":48,"value":"-15"}',
      'bots.quant.rule.deviationAbove {"window":48,"value":"+10"}',
    ]);
    expect(card.text()).toContain('bots.quant.budget {"total":"10","amount":"3","reserve":"2"}');
  });

  it('shows the live rule signal and the exact distance from the trigger', () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="quant-signal-PSWAP"]').text()).toContain('bots.quant.signal.entry');
    const gauge = wrapper.get('[data-testid="quant-market-PSWAP"] .gauge');
    expect(gauge.text()).toContain('-18.4%');
    expect(wrapper.find('[data-testid="quant-market-DAI"] .gauge').exists()).toBe(false);
  });

  it('shows research progress until results are ready, then hides the status line', () => {
    setLoop({
      status: ref('running'),
      result: shallowRef(null),
      progress: shallowRef({
        phase: 'backtest',
        market: 'PSWAP',
        fold: 1,
        folds: 4,
        backtests: 10,
        killed: 2,
        robust: 1,
        candidates: 672,
        completed: 5,
        total: 20,
      }),
    });
    const running = render();
    expect(running.get('[data-testid="quant-status"]').text()).toBe('bots.quant.status.running');
    expect(running.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
    expect(running.findAll('.quant-skeleton')).toHaveLength(2);
    expect(running.attributes('aria-busy')).toBe('true');
    setLoop();
    const done = render();
    expect(done.find('[data-testid="quant-status"]').exists()).toBe(false);
    expect(done.find('[role="progressbar"]').exists()).toBe(false);
    expect(done.find('.quant-skeleton').exists()).toBe(false);
  });

  it('observes fresh fees and emits a reviewed live template', async () => {
    const loadFees = vi.fn(async () => FEES);
    const wrapper = render({ loadFees });
    await wrapper.get('[data-testid="quant-live-PSWAP"]').trigger('click');
    await flushPromises();
    expect(loadFees).toHaveBeenCalledTimes(1);
    expect(loadFees.mock.calls[0][0]).toMatchObject({ strategy: { kind: 'rules', amount: '3' }, assetOut: PSWAP });
    const [payload] = wrapper.emitted('live')![0] as [QuantDeployPayload];
    expect(payload.bot.name).toBe('bots.quant.botName {"symbol":"PSWAP"}');
    expect(payload.bot.strategy.rules).toEqual(pick('reversion:48/15/10:3').rules);
    expect(payload.bot.policy.maxPriceImpactPercent).toBe('16');
    expect(payload.research).toMatchObject({ validation: 'walk-forward', returnPercent: '43.49', trades: 37 });
    expect(payload.denomination).toEqual({ genesisHash: RESULT.archive.genesisHash, denominator: '100' });
    expect(payload.settings).toMatchObject({ capital: '10', assetOutAddress: PSWAP.address });
  });

  it('emits paper trading and swap requests', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="quant-paper-DAI"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('paper')).toHaveLength(1);
    await wrapper.get('[data-testid="quant-swap-VAL"]').trigger('click');
    expect(wrapper.emitted('swap')).toEqual([[VAL.address]]);
  });

  it('keeps the user in place with a readable error when fees cannot be observed', async () => {
    const wrapper = render({
      loadFees: vi.fn(async () => {
        throw new Error('bots.errors.quote');
      }),
    });
    await wrapper.get('[data-testid="quant-live-PSWAP"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('live')).toBeUndefined();
    expect(wrapper.get('[data-testid="quant-market-PSWAP"] [role="alert"]').text()).toBe('bots.errors.quote');
  });

  it('offers a retry after a failed research run and starts automatically when idle', async () => {
    const start = vi.fn();
    setLoop({ status: ref('error'), result: shallowRef(null), start });
    const failed = render();
    expect(failed.get('[data-testid="quant-status"]').text()).toContain('bots.quant.status.error');
    expect(failed.find('.quant-skeleton').exists()).toBe(false);
    await failed.get('[data-testid="quant-retry"]').trigger('click');
    expect(start).toHaveBeenCalledTimes(1);
    const idleStart = vi.fn();
    setLoop({ status: ref('idle'), result: shallowRef(null), start: idleStart });
    render();
    expect(idleStart).toHaveBeenCalledTimes(1);
  });

  it('labels the strategies-tested map with plain family names and exact totals', () => {
    const wrapper = render();
    const mesh = wrapper.getComponent({ name: 'QuantMesh' });
    const families = mesh.props('families') as { key: string; label: string; robust: number; tested: number }[];
    expect(families.find((family) => family.key === 'guarded')).toMatchObject({
      label: 'bots.quant.families.guarded',
      robust: 50,
      tested: 480,
    });
    expect(families.find((family) => family.key === 'trend')).toMatchObject({ robust: 0, tested: 96 });
    expect(mesh.props('caption')).toBe('bots.quant.mesh.caption');
    expect(wrapper.text()).toContain('bots.quant.mesh.summary {"robust":"125","killed":"3,907"}');
  });

  it('switches the results chart between markets and labels each test period', async () => {
    const wrapper = render();
    expect(wrapper.find('[data-testid="quant-equity"]').exists()).toBe(true);
    await wrapper.get('[data-testid="quant-tab-PSWAP"]').trigger('click');
    expect(wrapper.get('[data-testid="quant-tab-PSWAP"]').attributes('aria-selected')).toBe('true');
    const periods = wrapper.findAll('.quant-folds li');
    expect(periods).toHaveLength(4);
    expect(periods[0].get('strong').text()).toBe('+9.6%');
    expect(periods[0].text()).toContain('bots.quant.equity.trades {"count":10}');
    expect(periods[2].get('strong').text()).toBe('bots.quant.equity.idle');
    expect(periods[2].text()).not.toContain('bots.quant.equity.trades');
    const captions = wrapper.findAll('.quant-caption').map((caption) => caption.text());
    expect(captions).toContain('bots.quant.equity.caption {"symbol":"PSWAP"}');
  });

  it('never adds forms or the autopilot primary action to the page', () => {
    const wrapper = render();
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('.autopilot-primary').exists()).toBe(false);
    wrapper.findAll('button').forEach((button) => expect(button.attributes('type')).toBe('button'));
  });
});

describe('QuantCommandCenter long sessions', () => {
  it('lets the user pick a session of up to 14 days and carries it into the review', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="quant-session-PSWAP-7"]').attributes('aria-checked')).toBe('true');
    await wrapper.get('[data-testid="quant-session-PSWAP-14"]').trigger('click');
    expect(wrapper.get('[data-testid="quant-session-DAI-14"]').attributes('aria-checked')).toBe('true');
    await wrapper.get('[data-testid="quant-live-PSWAP"]').trigger('click');
    await flushPromises();
    const [payload] = wrapper.emitted('live')![0] as [QuantDeployPayload];
    expect(payload.sessionDurationMs).toBe(14 * 86_400_000);
    expect(payload.cadence).toMatchObject({ episodes: 5, daysPerEpisode: 20.2 });
  });

  it('sets expectations for rare, multi-day trades', () => {
    const text = render().get('[data-testid="quant-cadence-PSWAP"]').text();
    expect(text).toContain('bots.quant.cadence.every {"days":20.2}');
    expect(text).toContain('bots.quant.cadence.holdDays {"min":1,"max":7}');
    expect(text).toContain('bots.quant.cadence.last');
  });

  it('highlights a market whose live rule is in the buy zone', async () => {
    const wrapper = render();
    const banner = wrapper.get('[data-testid="quant-banner"]');
    expect(banner.text()).toContain('bots.quant.banner.title {"symbol":"PSWAP"}');
    expect(banner.text()).toContain('"value":"-18.4%"');
    await wrapper.get('[data-testid="quant-banner-live"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('live')).toHaveLength(1);
    setLoop({ signals: ref({}) });
    expect(render().find('[data-testid="quant-banner"]').exists()).toBe(false);
  });

  it('settles ambient motion after a quiet minute and wakes on interaction', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = render();
      const root = wrapper.get('[data-testid="quant-center"]');
      expect(root.classes()).not.toContain('quant--calm');
      vi.advanceTimersByTime(60_000);
      await wrapper.vm.$nextTick();
      expect(root.classes()).toContain('quant--calm');
      expect(root.attributes('style')).toContain('--quant-motion: paused');
      expect(wrapper.getComponent({ name: 'QuantMesh' }).props('paused')).toBe(true);
      expect(wrapper.getComponent({ name: 'QuantGlassArt' }).props('paused')).toBe(true);
      document.dispatchEvent(new Event('pointerdown'));
      await wrapper.vm.$nextTick();
      expect(root.classes()).not.toContain('quant--calm');
      expect(root.attributes('style')).toContain('--quant-motion: running');
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
