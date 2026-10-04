import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuantSignalChart from '@/features/bot-trading/components/quant/studio/QuantSignalChart.vue';
import { defaultStudioState, studioRecipe, type StudioSeries } from '@/features/bot-trading/quant-studio';

const HOURS = 400;
const LABELS = {
  price: 'PSWAP price in XOR',
  buyPanel: 'Price vs 48h average',
  sellPanel: '24h price change',
  equity: 'Bot value vs holding',
  first: 'First half',
  second: 'Second half',
  buys: 'Buys',
  sells: 'Sells',
  bot: 'Bot',
  hold: 'Holding PSWAP',
  replay: 'Replay',
  stop: 'Stop',
  buyHandle: 'Buy below average',
  sellHandle: 'Sell above average',
};

/** A wavy price whose deviation indicator spans -40%…+40%. */
function series(shared = true): StudioSeries {
  const price = Float32Array.from({ length: HOURS }, (_value, index) => 1 + 0.3 * Math.sin(index / 9));
  const indicator = Float32Array.from({ length: HOURS }, (_value, index) => 40 * Math.sin(index / 9));
  return {
    recipe: shared ? 'dip' : 'drop',
    startAt: Date.UTC(2026, 2, 1),
    split: HOURS / 2,
    price,
    buy: indicator,
    sell: shared ? null : indicator,
    shared,
    trace: { buys: [20, 150], sells: [60, 260], value: new Float32Array(HOURS).fill(1) },
  };
}

function render(props: Record<string, unknown> = {}) {
  const state = defaultStudioState('dip');
  return mount(QuantSignalChart, {
    props: {
      series: series(),
      replay: null,
      replayCurrent: false,
      recipe: studioRecipe('dip'),
      values: state.values,
      labels: LABELS,
      formatLine: (_role: string, value: number) => `${Math.round(value)}%`,
      formatPercent: (fraction: number) => `${Math.round(fraction * 100)}%`,
      formatPrice: (value: number) => value.toFixed(2),
      formatDate: (timestamp: number) => new Date(timestamp).toISOString().slice(5, 10),
      summary: '2 buys and 2 sells',
      ...props,
    },
  });
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('QuantSignalChart', () => {
  it('offers keyboard sliders for the buy and sell lines with their grid range', async () => {
    const wrapper = render();
    await flushPromises();
    const buy = wrapper.get('[data-testid="studio-handle-buy"]');
    expect(buy.attributes('role')).toBe('slider');
    expect(buy.attributes('aria-label')).toBe('Buy below average');
    expect(buy.attributes('aria-valuenow')).toBe('15');
    expect(buy.attributes('aria-valuemin')).toBe('5');
    expect(buy.attributes('aria-valuemax')).toBe('50');
    expect(buy.attributes('aria-valuetext')).toBe('-15%');
    expect(wrapper.get('[data-testid="studio-handle-sell"]').attributes('aria-valuetext')).toBe('10%');
    expect(wrapper.text()).toContain('2 buys and 2 sells');
  });

  it('steps through the grid with arrow keys, Home and End', async () => {
    const wrapper = render();
    await flushPromises();
    const buy = wrapper.get('[data-testid="studio-handle-buy"]');
    // The buy line sits below zero (sign -1): Up raises the line, so the dip gets shallower.
    await buy.trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ buy: 12.5 }]);
    await buy.trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ buy: 17.5 }]);
    await buy.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ buy: 50 }]);
    const sell = wrapper.get('[data-testid="studio-handle-sell"]');
    await sell.trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ sell: 15 }]);
    await sell.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ sell: -10 }]);
    const count = wrapper.emitted('change')!.length;
    await sell.trigger('keydown', { key: 'a' });
    expect(wrapper.emitted('change')).toHaveLength(count);
  });

  it('snaps a dragged line to the nearest grid value', async () => {
    const wrapper = render();
    await flushPromises();
    const handle = wrapper.get('[data-testid="studio-handle-buy"]');
    const stage = wrapper.get('.signal-stage').element;
    handle.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 0 }));
    // Drag to the very bottom of the indicator panel: the deepest grid value.
    stage.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 1000 }));
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ buy: 50 }]);
    stage.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: -1000 }));
    expect(wrapper.emitted('change')?.at(-1)).toEqual([{ buy: 5 }]);
    stage.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: -1000 }));
    expect(handle.classes()).not.toContain('is-active');
  });

  it('draws a separate sell panel when the sell line uses another indicator, and none without lines', async () => {
    const drop = mount(QuantSignalChart, {
      props: {
        ...render().props(),
        series: series(false),
        recipe: studioRecipe('drop'),
        values: defaultStudioState('drop').values,
      },
    });
    await flushPromises();
    expect(drop.get('.signal-stage').attributes('style')).toContain('470px');
    expect(drop.get('[data-testid="studio-handle-sell"]').attributes('aria-valuenow')).toBe('0');
    const breakout = mount(QuantSignalChart, {
      props: {
        ...render().props(),
        series: { ...series(), recipe: 'breakout', buy: null },
        recipe: studioRecipe('breakout'),
        values: defaultStudioState('breakout').values,
      },
    });
    await flushPromises();
    expect(breakout.findAll('.signal-handle')).toHaveLength(0);
  });

  it('toggles the replay and disables it without data', async () => {
    const wrapper = render();
    await flushPromises();
    const play = wrapper.get('[data-testid="studio-replay"]');
    expect(play.attributes('aria-pressed')).toBe('false');
    await play.trigger('click');
    expect(play.attributes('aria-pressed')).toBe('true');
    expect(play.text()).toContain('Stop');
    await play.trigger('click');
    expect(play.attributes('aria-pressed')).toBe('false');
    const empty = render({ series: null });
    await flushPromises();
    expect(empty.get('[data-testid="studio-replay"]').attributes('disabled')).toBeDefined();
  });
});
