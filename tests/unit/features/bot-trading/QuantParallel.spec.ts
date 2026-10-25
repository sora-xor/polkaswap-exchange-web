import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuantParallel from '@/features/bot-trading/components/quant/studio/QuantParallel.vue';
import type { ParallelAxis } from '@/features/bot-trading/components/quant/studio/studio-types';

const WIDTH = 800;
const HEIGHT = 320;
const PAD = { left: 48, right: 48, top: 54, bottom: 30 };
const COLUMNS = ['window', 'maxDrop', 'second'];
/** Four strategies: window, biggest drop (fraction) and second-half result (fraction). */
const DATA = Float32Array.from([24, 0.1, 0.3, 48, 0.2, 0.1, 96, 0.5, -0.2, 168, 0.8, -0.6]);
const AXES: ParallelAxis[] = [
  { key: 'window', label: 'Average over', format: (value) => `${Math.round(value)} h`, domain: [24, 168] },
  {
    key: 'maxDrop',
    label: 'Biggest drop',
    format: (value) => `${Math.round(-value * 100) || 0}%`,
    floor: 0,
    ceil: 1,
    baseline: 0,
    invert: true,
  },
  { key: 'second', label: 'Second half', format: (value) => `${Math.round(value * 100)}%`, floor: -1 },
];
const restore: (() => void)[] = [];

const axisX = (index: number) => PAD.left + (index / (AXES.length - 1)) * (WIDTH - PAD.left - PAD.right);
const plot = HEIGHT - PAD.top - PAD.bottom;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  for (const [name, value] of [
    ['clientWidth', WIDTH],
    ['clientHeight', HEIGHT],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value });
    restore.push(() => delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]);
  }
});
afterEach(() => {
  restore.splice(0).forEach((undo) => undo());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render(props: Record<string, unknown> = {}) {
  return mount(QuantParallel, {
    props: {
      axes: AXES,
      data: DATA,
      columns: COLUMNS,
      rows: 4,
      colorKey: 'second',
      current: 0,
      ariaLabel: 'Every variation',
      help: 'Drag along an axis to filter.',
      clearLabel: 'Clear filters',
      countLabel: (shown: number, total: number) => `${shown} of ${total} shown`,
      ...props,
    },
    slots: { tooltip: '<span data-testid="row-tip">row</span>' },
  });
}
const fire = (target: Element, type: string, x: number, y: number) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));

describe('QuantParallel', () => {
  it('labels each axis with its floor, ceiling and direction applied', async () => {
    const wrapper = render();
    await flushPromises();
    const axes = wrapper.findAll('.parallel-axis');
    expect(axes.map((axis) => axis.get('.parallel-axis-title').text())).toEqual([
      'Average over',
      'Biggest drop',
      'Second half',
    ]);
    // The window axis uses its declared domain.
    expect(axes[0].get('.parallel-axis-max').text()).toBe('168 h');
    // Drops read better upward: zero at the top, never past -100% at the bottom.
    expect(axes[1].get('.parallel-axis-max').text()).toBe('0%');
    expect(axes[1].get('.parallel-axis-min').text()).toBe('-83%');
    // Results never pad below -100%.
    expect(axes[2].get('.parallel-axis-min').text()).toBe('-64%');
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('4 of 4 shown');
  });

  it('keeps only the lines inside a brushed range and clears it again', async () => {
    const wrapper = render();
    await flushPromises();
    const stage = wrapper.get('.parallel-stage').element;
    // Brush the top of the second-half axis: results above roughly 0%.
    fire(stage, 'pointerdown', axisX(2), PAD.top);
    fire(stage, 'pointermove', axisX(2), PAD.top + plot * 0.45);
    fire(stage, 'pointerup', axisX(2), PAD.top + plot * 0.45);
    await flushPromises();
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('2 of 4 shown');
    await wrapper.get('[data-testid="studio-parallel-clear"]').trigger('click');
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('4 of 4 shown');
    // Escape also clears, and a click on an axis without dragging removes its range.
    fire(stage, 'pointerdown', axisX(2), PAD.top);
    fire(stage, 'pointermove', axisX(2), PAD.top + plot * 0.45);
    fire(stage, 'pointerup', axisX(2), PAD.top + plot * 0.45);
    await flushPromises();
    await wrapper.get('.parallel-stage').trigger('keydown', { key: 'Escape' });
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('4 of 4 shown');
    fire(stage, 'pointerdown', axisX(2), PAD.top);
    fire(stage, 'pointermove', axisX(2), PAD.top + plot * 0.45);
    fire(stage, 'pointerup', axisX(2), PAD.top + plot * 0.45);
    fire(stage, 'pointerdown', axisX(2), PAD.top + 10);
    fire(stage, 'pointerup', axisX(2), PAD.top + 10);
    await flushPromises();
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('4 of 4 shown');
  });

  it('hovers and picks the nearest line between two axes', async () => {
    const wrapper = render();
    await flushPromises();
    const stage = wrapper.get('.parallel-stage').element;
    // Most of the way to the drop axis on the second row's line (window 48, drop 20%).
    const y0 = PAD.top + ((168 - 48) / (168 - 24)) * plot;
    const dropTop = 0;
    const dropBottom = 0.8 + 0.8 * 0.04;
    const y1 = PAD.top + ((dropTop - 0.2) / (dropTop - dropBottom)) * plot;
    const x = axisX(0) + (axisX(1) - axisX(0)) * 0.8;
    const y = y0 + (y1 - y0) * 0.8;
    fire(stage, 'pointermove', x, y);
    await flushPromises();
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([1]);
    expect(wrapper.find('[data-testid="row-tip"]').exists()).toBe(true);
    fire(stage, 'pointerdown', x, y);
    fire(stage, 'pointerup', x, y);
    expect(wrapper.emitted('select')?.[0]).toEqual([1]);
    fire(stage, 'pointerleave', x, y);
    await flushPromises();
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([null]);
  });

  it('drops brushes on axes that disappear when the data changes', async () => {
    const wrapper = render();
    await flushPromises();
    const stage = wrapper.get('.parallel-stage').element;
    fire(stage, 'pointerdown', axisX(2), PAD.top);
    fire(stage, 'pointermove', axisX(2), PAD.top + plot * 0.45);
    fire(stage, 'pointerup', axisX(2), PAD.top + plot * 0.45);
    await flushPromises();
    await wrapper.setProps({ axes: AXES.slice(0, 2), columns: COLUMNS, data: DATA.slice() });
    expect(wrapper.get('[data-testid="studio-parallel-count"]').text()).toBe('4 of 4 shown');
    expect(wrapper.find('[data-testid="studio-parallel-clear"]').exists()).toBe(false);
  });
});
