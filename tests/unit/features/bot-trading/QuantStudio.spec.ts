import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, reactive, ref, shallowRef } from 'vue';
import { routeLocationKey } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import QuantStudio from '@/features/bot-trading/components/quant/studio/QuantStudio.vue';
import {
  defaultStudioState,
  normalizeStudioState,
  studioCandidate,
  type StudioReplay,
  type StudioState,
} from '@/features/bot-trading/quant-studio';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';

const mocks = vi.hoisted(() => ({ studio: null as unknown as Record<string, any> }));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    language: { value: 'en' },
  }),
}));
vi.mock('@/features/bot-trading/useQuantStudio', () => ({ useQuantStudio: () => mocks.studio }));

const Stub = (name: string, emits: string[] = []) =>
  defineComponent({
    name,
    inheritAttrs: false,
    props: {
      landscape: null,
      selected: null,
      series: null,
      replay: null,
      replayCurrent: Boolean,
      recipe: null,
      values: null,
      axes: null,
      data: null,
      columns: null,
      rows: Number,
      current: Number,
      paused: Boolean,
      busy: Boolean,
      labels: null,
      describe: Function,
      formatX: Function,
    },
    emits,
    setup:
      (_props, { slots }) =>
      () =>
        h('div', { 'data-stub': name }, slots.tooltip?.({ x: 96, y: 15, row: 0 })),
  });
const TerrainStub = Stub('QuantTerrain', ['select', 'hover']);
const ChartStub = Stub('QuantSignalChart', ['change']);
const ParallelStub = Stub('QuantParallel', ['select', 'hover']);
const LinkStub = defineComponent({
  name: 'RouterLink',
  props: ['to'],
  setup:
    (props, { slots }) =>
    () =>
      h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.()),
});

const PSWAP = {
  address: '0x0200050000000000000000000000000000000000000000000000000000000000',
  symbol: 'PSWAP',
  decimals: 18,
};
const ASSETS = [{ address: XOR.address, symbol: 'XOR', decimals: 18 }, PSWAP];
const START = Date.UTC(2026, 2, 1);
const SPLIT = Date.UTC(2026, 5, 10);
const END = Date.UTC(2026, 8, 19);
const FEES = {
  networkFeeXor: '0.100020612589707326',
  swapFeePercent: '0.6',
  sellNetworkFeeXor: '0.100020612589707326',
  sellSwapFeePercent: '0.6',
  queriedAt: Date.UTC(2026, 9, 3),
  blockNumber: 1,
  blockHash: `0x${'ab'.repeat(32)}`,
  genesisHash: `0x${'7e'.repeat(32)}`,
  endpoint: 'wss://ws.mof.sora.org',
  amountIn: '3',
  sellAmountIn: '100',
} as ResearchFeeSnapshot;

function replay(state: StudioState): StudioReplay {
  const half = (
    startAt: number,
    endAt: number,
    returnPercent: string,
    drawdownPercent: string,
    trades: number,
    holdPercent: string
  ) => ({
    startAt,
    endAt,
    returnPercent,
    drawdownPercent,
    trades,
    fills: [],
    equity: [{ timestamp: startAt, value: '10' }],
    maxImpactPercent: '4.00',
    holdPercent,
  });
  return {
    candidate: studioCandidate(state),
    splitAt: SPLIT,
    first: half(START, SPLIT - 3_600_000, '62.62', '50.91', 69, '20.50'),
    second: half(SPLIT, END, '-18.41', '28.67', 38, '60.04'),
    cadence: { episodes: 7, daysPerEpisode: 14.4, holdHours: { min: 20, max: 540 }, lastEntryAt: SPLIT },
    latestClose: '0.0001',
  };
}

function fakeStudio(state = defaultStudioState('dip')) {
  return {
    status: ref('ready'),
    error: ref(''),
    jobError: ref(''),
    info: shallowRef({
      genesisHash: FEES.genesisHash,
      denominator: '100',
      startAt: START,
      endAt: END,
      hours: 4851,
      splitAt: SPLIT,
      markets: [
        { symbol: 'PSWAP', address: PSWAP.address, decimals: 18, medianXorDepth: 56.55, tradable: true },
        { symbol: 'ETH', address: '0xeth', decimals: 18, medianXorDepth: 0.83, tradable: false },
      ],
    }),
    fees: shallowRef(FEES),
    costs: shallowRef({ networkFeeXor: FEES.networkFeeXor, swapFeePercent: '0.6', slippagePercent: '0.5' }),
    market: ref('PSWAP'),
    state: shallowRef(state),
    landscape: shallowRef(null),
    grid: shallowRef({
      recipe: state.recipe,
      columns: ['window', 'buy', 'sell', 'amount', 'first', 'second', 'maxDrop', 'holding', 'trades'],
      rows: 2,
      data: Float32Array.from([24, 10, 5, 2, 0.1, 0.2, 0.3, 0.4, 10, 48, 15, 10, 3, 0.6, 0.18, 0.5, 0.9, 107]),
    }),
    series: shallowRef(null),
    replay: shallowRef(replay(state)),
    pending: reactive({ landscape: false, grid: false, series: false, replay: false, probe: false }),
    probeResult: shallowRef<{ key: string; replay: StudioReplay } | null>(null),
    probeKey: (target: StudioState) => JSON.stringify(normalizeStudioState(target)),
    probe: vi.fn(),
    start: vi.fn(),
    retry: vi.fn(),
    setMarket: vi.fn(),
    setRecipe: vi.fn(),
    setValues: vi.fn(),
    applyLink: vi.fn(() => true),
    dispose: vi.fn(),
  };
}

function render(options: { loadFees?: ReturnType<typeof vi.fn>; route?: unknown; busy?: boolean } = {}) {
  return mount(QuantStudio, {
    props: { assets: ASSETS, loadFees: options.loadFees ?? vi.fn(async () => FEES), busy: options.busy ?? false },
    global: {
      stubs: {
        QuantTerrain: TerrainStub,
        QuantSignalChart: ChartStub,
        QuantParallel: ParallelStub,
        RouterLink: LinkStub,
      },
      provide: options.route ? { [routeLocationKey as symbol]: options.route } : {},
    },
  });
}

beforeEach(() => {
  mocks.studio = fakeStudio();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('QuantStudio', () => {
  it('starts loading on mount and explains the four steps in plain words', () => {
    const wrapper = render();
    expect(mocks.studio.start).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('[data-testid="studio-steps"] li')).toHaveLength(4);
    expect(wrapper.text()).toContain('bots.studio.title');
    expect(wrapper.text()).toContain('bots.studio.recipes.dip.idea');
  });

  it('lets users pick a deep enough market and any idea', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="studio-market-ETH"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="studio-market-PSWAP"]').attributes('aria-checked')).toBe('true');
    await wrapper.get('[data-testid="studio-market-PSWAP"]').trigger('click');
    expect(mocks.studio.setMarket).toHaveBeenCalledWith('PSWAP');
    expect(wrapper.findAll('.studio-recipe')).toHaveLength(11);
    await wrapper.get('[data-testid="studio-recipe-oversold"]').trigger('click');
    expect(mocks.studio.setRecipe).toHaveBeenCalledWith('oversold');
    // New ideas are marked as such.
    expect(wrapper.get('[data-testid="studio-recipe-oversold"]').text()).toContain('bots.studio.newIdea');
    expect(wrapper.get('[data-testid="studio-recipe-dip"]').text()).not.toContain('bots.studio.newIdea');
  });

  it('prints exact results for both halves with the holding comparison, drop, trades and cadence', () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="studio-first"]').text()).toBe('+62.6%');
    expect(wrapper.get('[data-testid="studio-first"]').classes()).toContain('up');
    expect(wrapper.get('[data-testid="studio-second"]').text()).toBe('-18.4%');
    expect(wrapper.get('[data-testid="studio-second"]').classes()).toContain('down');
    expect(wrapper.text()).toContain('bots.quant.priceChange {"symbol":"PSWAP"} +60.0%');
    expect(wrapper.get('[data-testid="studio-drop"]').text()).toBe('50.91%');
    expect(wrapper.get('[data-testid="studio-trades"]').text()).toBe('107');
    expect(wrapper.get('[data-testid="studio-cadence"]').text()).toContain('bots.quant.cadence.every {"days":14.4}');
    expect(wrapper.text()).toContain('bots.quant.rule.deviationBelow {"window":48,"value":"-15"}');
    expect(wrapper.text()).toContain('bots.quant.rule.deviationAbove {"window":48,"value":"+10"}');
  });

  it('describes the newer conditions and any-of sell groups in words', () => {
    mocks.studio = fakeStudio(defaultStudioState('oversold'));
    expect(render().text()).toContain('bots.studio.rule.rsiBelow {"window":12,"value":"20"}');
    mocks.studio = fakeStudio(defaultStudioState('rebound'));
    const rebound = render().text();
    expect(rebound).toContain('bots.studio.rule.sellAny');
    expect(rebound).toContain('bots.quant.rule.momentumAbove {"window":6,"value":"+15"}');
    mocks.studio = fakeStudio(defaultStudioState('rare-drop'));
    expect(render().text()).toContain('bots.studio.rule.quantileBelow {"window":168,"percentile":2}');
  });

  it('turns every control into a snapped setting change', async () => {
    const wrapper = render();
    const range = wrapper.get('[data-testid="studio-param-buy"]');
    (range.element as HTMLInputElement).value = '6';
    await range.trigger('input');
    expect(mocks.studio.setValues).toHaveBeenLastCalledWith({ buy: 20 });
    await wrapper.get('[data-testid="studio-param-amount-2"]').trigger('click');
    expect(mocks.studio.setValues).toHaveBeenLastCalledWith({ amount: 2 });
    wrapper.getComponent(TerrainStub).vm.$emit('select', { x: 96, y: 25 });
    expect(mocks.studio.setValues).toHaveBeenLastCalledWith({ window: 96, buy: 25 });
    wrapper.getComponent(ChartStub).vm.$emit('change', { sell: 15 });
    expect(mocks.studio.setValues).toHaveBeenLastCalledWith({ sell: 15 });
    wrapper.getComponent(ParallelStub).vm.$emit('select', 0);
    expect(mocks.studio.setValues).toHaveBeenLastCalledWith({ window: 24, buy: 10, sell: 5, amount: 2 });
    // The current choice is found in the grid.
    expect(wrapper.getComponent(ParallelStub).props('current')).toBe(1);
  });

  it('asks for exact tooltip numbers on hover and shows them once they match', async () => {
    const wrapper = render();
    wrapper.getComponent(TerrainStub).vm.$emit('hover', { x: 96, y: 15 });
    const hovered = normalizeStudioState({ recipe: 'dip', values: { ...mocks.studio.state.value.values, window: 96 } });
    expect(mocks.studio.probe).toHaveBeenCalledWith(hovered);
    expect(wrapper.get('[data-stub="QuantTerrain"]').text()).toContain('bots.studio.calculating');
    mocks.studio.probeResult.value = { key: mocks.studio.probeKey(hovered), replay: replay(hovered) };
    await flushPromises();
    expect(wrapper.get('[data-stub="QuantTerrain"]').text()).toContain('+62.6%');
    wrapper.getComponent(ParallelStub).vm.$emit('hover', 0);
    expect(mocks.studio.probe).toHaveBeenLastCalledWith(
      normalizeStudioState({ recipe: 'dip', values: { window: 24, buy: 10, sell: 5, amount: 2 } })
    );
  });

  it('opens the same rules in the Strategy Lab', () => {
    const wrapper = render();
    const to = JSON.parse(wrapper.get('[data-testid="studio-lab"]').attributes('data-to')!);
    expect(to.params).toEqual({ section: 'lab' });
    expect(typeof to.query.rules).toBe('string');
  });

  it('observes fresh fees and hands a reviewed paper template to the page', async () => {
    const loadFees = vi.fn(async () => FEES);
    const wrapper = render({ loadFees });
    await wrapper.get('[data-testid="studio-paper"]').trigger('click');
    await flushPromises();
    expect(loadFees).toHaveBeenCalledWith(expect.objectContaining({ mode: 'paper' }), { slippagePercent: '0.5' });
    const payload = wrapper.emitted('paper')?.[0]?.[0] as Record<string, any>;
    expect(payload.bot.strategy.rules).toEqual(studioCandidate(defaultStudioState('dip')).rules);
    expect(payload.research.validation).toBe('holdout');
    expect(payload.denomination).toEqual({ genesisHash: FEES.genesisHash, denominator: '100' });
  });

  it('blocks paper trading while results are stale or the page is busy, and reports fee failures', async () => {
    mocks.studio.pending.replay = true;
    expect(render().get('[data-testid="studio-paper"]').attributes('disabled')).toBeDefined();
    mocks.studio = fakeStudio();
    expect(render({ busy: true }).get('[data-testid="studio-paper"]').attributes('disabled')).toBeDefined();
    mocks.studio = fakeStudio();
    const failing = render({ loadFees: vi.fn().mockRejectedValue(new Error('bots.errors.quote')) });
    await failing.get('[data-testid="studio-paper"]').trigger('click');
    await flushPromises();
    expect(failing.get('[role="alert"]').text()).toBe('bots.errors.quote');
    expect(failing.emitted('paper')).toBeUndefined();
  });

  it('shows loading and error states with a retry', async () => {
    mocks.studio.status.value = 'fees';
    expect(render().get('[data-testid="studio-status"]').text()).toContain('bots.quant.status.fees');
    mocks.studio = fakeStudio();
    mocks.studio.status.value = 'error';
    const wrapper = render();
    await wrapper.get('[data-testid="studio-retry"]').trigger('click');
    expect(mocks.studio.retry).toHaveBeenCalled();
  });

  it('opens a deep link from the bots page', () => {
    render({ route: reactive({ query: { studio: 'PSWAP~dip~96_20_10~2' } }) });
    expect(mocks.studio.applyLink).toHaveBeenCalledWith('PSWAP~dip~96_20_10~2');
  });

  it('settles every view after a quiet minute', async () => {
    vi.useFakeTimers();
    const wrapper = render();
    expect(wrapper.getComponent(TerrainStub).props('paused')).toBe(false);
    vi.advanceTimersByTime(60_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.getComponent(TerrainStub).props('paused')).toBe(true);
    expect(wrapper.getComponent(ChartStub).props('paused')).toBe(true);
    document.dispatchEvent(new Event('pointerdown'));
    await wrapper.vm.$nextTick();
    expect(wrapper.getComponent(ParallelStub).props('paused')).toBe(false);
    wrapper.unmount();
  });
});
