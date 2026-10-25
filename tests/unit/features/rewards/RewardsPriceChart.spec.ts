import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import RewardsPriceChart from '@/features/rewards/components/rewards/RewardsPriceChart.vue';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 5, 12);
const points = [
  { time: START, price: 0.003 },
  { time: START + DAY, price: 0.004 },
  { time: START + 2 * DAY, price: 0.005 },
];

const resizeCallbacks: Array<() => void> = [];
const observers: ResizeObserverStub[] = [];
let width = 0;

class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: () => void) {
    resizeCallbacks.push(callback);
    observers.push(this);
  }
}

const mountChart = (props: Record<string, unknown> = {}) =>
  mount(RewardsPriceChart, {
    props: { points, symbol: '$', label: 'PSWAP – Last 30 days', locale: 'en', ...props },
    attachTo: document.body,
  });

const pointerMove = (element: Element, clientX: number) => {
  element.dispatchEvent(new MouseEvent('pointermove', { clientX, bubbles: true }));
};

beforeEach(() => {
  resizeCallbacks.length = 0;
  observers.length = 0;
  width = 0;
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 0, top: 0, width, height: 128 }) as DOMRect
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RewardsPriceChart.vue', () => {
  it('draws the price line, its area wash and one gridline per tick', () => {
    const wrapper = mountChart();

    expect(wrapper.find('.rw-chart__line').attributes('d')).toMatch(/^M[\d.]+ [\d.]+ L/);
    expect(wrapper.find('.rw-chart__line').attributes('pathLength')).toBe('1');
    expect(wrapper.find('.rw-chart__area').attributes('d')).toMatch(/Z$/);
    expect(wrapper.findAll('.rw-chart__grid').length).toBe(wrapper.findAll('.rw-chart__tick').length);
    expect(wrapper.findAll('.rw-chart__tick').map((tick) => tick.text())).toEqual(['$0.003', '$0.004', '$0.005']);
    expect(wrapper.find('.rw-chart__dot--end').exists()).toBe(true);
  });

  it('names the plot for assistive technology and makes it focusable', () => {
    const plot = mountChart().find('.rw-chart__plot');

    expect(plot.attributes('role')).toBe('img');
    expect(plot.attributes('aria-label')).toBe('PSWAP – Last 30 days');
    expect(plot.attributes('tabindex')).toBe('0');
  });

  it('labels only the first and last day on the axis', () => {
    const labels = mountChart().find('.rw-chart__x').findAll('span');

    expect(labels.map((label) => label.text())).toEqual(['Sep 5', 'Sep 7']);
  });

  it('snaps a crosshair and tooltip to the nearest day under the pointer', async () => {
    width = 280;

    const wrapper = mountChart();
    const plot = wrapper.find('.rw-chart__plot');

    expect(wrapper.find('.rw-chart__tip').exists()).toBe(false);

    // Three evenly spaced days across 280px: x = 4, 138, 272.
    pointerMove(plot.element, 150);
    await nextTick();

    expect(wrapper.find('.rw-chart__cross').exists()).toBe(true);
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.004');
    expect(wrapper.find('.rw-chart__tip-date').text()).toBe('Sep 6, 2026');
    expect(wrapper.find('.rw-chart__tip').attributes('style')).toContain('left: 138px');

    pointerMove(plot.element, 400);
    await nextTick();
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.005');

    await plot.trigger('pointerleave');
    expect(wrapper.find('.rw-chart__tip').exists()).toBe(false);
  });

  it('shows the same readout from the keyboard', async () => {
    width = 280;

    const wrapper = mountChart();
    const plot = wrapper.find('.rw-chart__plot');

    await plot.trigger('focus');
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.005');

    await plot.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.004');

    await plot.trigger('keydown', { key: 'Home' });
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.003');

    await plot.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.003');

    await plot.trigger('keydown', { key: 'End' });
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.005');

    await plot.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('.rw-chart__tip-value').text()).toBe('$0.005');

    await plot.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.rw-chart__tip').exists()).toBe(false);

    await plot.trigger('keydown', { key: 'a' });
    expect(wrapper.find('.rw-chart__tip').exists()).toBe(false);
  });

  it('announces the active day to screen readers', async () => {
    width = 280;

    const wrapper = mountChart();

    await wrapper.find('.rw-chart__plot').trigger('focus');

    expect(wrapper.find('[aria-live="polite"]').text()).toBe('Sep 7, 2026: $0.005');
  });

  it('keeps the tooltip inside the chart near the edges', async () => {
    width = 280;

    const wrapper = mountChart();
    const plot = wrapper.find('.rw-chart__plot');

    pointerMove(plot.element, 0);
    await nextTick();
    expect(wrapper.find('.rw-chart__tip').classes()).toContain('is-start');

    pointerMove(plot.element, 280);
    await nextTick();
    expect(wrapper.find('.rw-chart__tip').classes()).toContain('is-end');
  });

  it('follows the width of its container', async () => {
    width = 300;

    const wrapper = mountChart();
    await nextTick();

    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 300 128');

    width = 480;
    resizeCallbacks.forEach((callback) => callback());
    await nextTick();

    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 480 128');
  });

  it('drops the crosshair when the data changes', async () => {
    width = 280;

    const wrapper = mountChart();

    await wrapper.find('.rw-chart__plot').trigger('focus');
    expect(wrapper.find('.rw-chart__tip').exists()).toBe(true);

    await wrapper.setProps({ points: points.slice(0, 2) });
    expect(wrapper.find('.rw-chart__tip').exists()).toBe(false);
  });

  it('swaps the plot for a table with the same numbers, newest day first', async () => {
    const wrapper = mountChart({ tableView: true, dateHeading: 'Date', priceHeading: 'Price' });

    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.findAll('th[scope="col"]').map((heading) => heading.text())).toEqual(['Date', 'Price']);

    const rows = wrapper.findAll('tbody tr');

    expect(rows.map((row) => row.find('td').text())).toEqual(['$0.005', '$0.004', '$0.003']);
    expect(rows[0].find('th').text()).toBe('Sep 7, 2026');
    expect(wrapper.find('.rw-chart__table').attributes('tabindex')).toBe('0');
  });

  it('keeps the old chart on screen, dimmed, while it refreshes', () => {
    const wrapper = mountChart({ loading: true });

    expect(wrapper.find('figure').classes()).toContain('is-loading');
    expect(wrapper.find('figure').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('.rw-chart__line').exists()).toBe(true);
  });

  it('renders no plot without data', () => {
    const wrapper = mountChart({ points: [] });

    expect(wrapper.find('.rw-chart__plot').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('stops observing when it is removed', () => {
    const wrapper = mountChart();

    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledTimes(1);
    expect(observers[0].disconnect).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('reads daily candles in UTC, where the indexer stamps them', () => {
    // The indexer stamps a daily candle with the last block of its UTC day (about 23:59 UTC). East of Greenwich that
    // is already the next day in local time, so the date must be read in UTC.
    const RealDateTimeFormat = Intl.DateTimeFormat;
    const requested: Array<Intl.DateTimeFormatOptions | undefined> = [];

    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions
    ) {
      requested.push(options);

      return new RealDateTimeFormat(locales, options);
    } as never);

    const closeOfOct2 = Date.UTC(2026, 9, 2, 23, 59, 30);
    const wrapper = mountChart({
      points: [
        { time: closeOfOct2, price: 0.003 },
        { time: closeOfOct2 + DAY, price: 0.004 },
      ],
    });

    expect(
      wrapper
        .find('.rw-chart__x')
        .findAll('span')
        .map((label) => label.text())
    ).toEqual(['Oct 2', 'Oct 3']);
    expect(requested.length).toBeGreaterThan(0);
    requested.forEach((options) => expect(options).toMatchObject({ timeZone: 'UTC' }));
  });

  it('tells neighbouring axis labels apart for prices of 1 or more', () => {
    const wrapper = mountChart({
      points: [
        { time: START, price: 0.9991 },
        { time: START + DAY, price: 1.0004 },
        { time: START + 2 * DAY, price: 1.0014 },
      ],
    });
    const labels = wrapper.findAll('.rw-chart__tick').map((tick) => tick.text());

    expect(new Set(labels).size).toBe(labels.length);
  });

  it('draws the line once per series, not again for every resize', async () => {
    width = 300;

    const wrapper = mountChart();
    await nextTick();

    const line = wrapper.find('.rw-chart__line').element;
    const end = wrapper.find('.rw-chart__dot--end').element;

    width = 480;
    resizeCallbacks.forEach((callback) => callback());
    await nextTick();

    // Same elements: a remount would restart the draw animation and the line would vanish while the window resizes.
    expect(wrapper.find('.rw-chart__line').element).toBe(line);
    expect(wrapper.find('.rw-chart__dot--end').element).toBe(end);

    await wrapper.setProps({ label: 'VAL – Last 30 days' });

    expect(wrapper.find('.rw-chart__line').element).not.toBe(line);
  });
});
