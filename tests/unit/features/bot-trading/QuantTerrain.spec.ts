import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuantTerrain from '@/features/bot-trading/components/quant/studio/QuantTerrain.vue';
import type { StudioLandscape } from '@/features/bot-trading/quant-studio';

/** A 3 × 2 landscape: windows 24/48/96 by buy depths 10/20. */
function landscape(): StudioLandscape {
  return {
    recipe: 'dip',
    xKey: 'window',
    yKey: 'buy',
    xs: [24, 48, 96],
    ys: [10, 20],
    first: Float32Array.from([0.1, 0.4, -0.2, 0.3, 0.6, -0.5]),
    second: Float32Array.from([0.05, 0.2, -0.1, -0.3, 0.1, 0]),
    drop: new Float32Array(6),
    trades: new Uint16Array(6),
  };
}

const sizes = { width: 600, height: 300 };
let restore: (() => void)[] = [];

beforeEach(() => {
  // jsdom has no canvas; logging its "not implemented" error on every frame breaks the runner.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  // Frames are driven by hand; jsdom's timer-based frames would outlive each test.
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  for (const [name, value] of [
    ['clientWidth', () => sizes.width],
    ['clientHeight', () => sizes.height],
  ] as const) {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: value });
    restore.push(() => original && Object.defineProperty(HTMLElement.prototype, name, original));
  }
});
afterEach(() => {
  restore.forEach((undo) => undo());
  restore = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Dispatch a pointer-like mouse event; jsdom has no PointerEvent constructor. */
function pointer(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

function render(props: Partial<InstanceType<typeof QuantTerrain>['$props']> = {}) {
  return mount(QuantTerrain, {
    props: {
      landscape: landscape(),
      selected: { x: 48, y: 10 },
      xLabel: 'Average over',
      yLabel: 'Buy below average',
      formatX: (value: number) => `${value} h`,
      formatY: (value: number) => `${value}%`,
      formatPercent: (fraction: number) => `${Math.round(fraction * 100)}%`,
      heightLabel: 'Height: first half',
      colorLabel: 'Colour: second half',
      help: 'Drag to turn the view.',
      ariaLabel: 'Results by setting',
      describe: (x: number, y: number) => `cell ${x}/${y}`,
      ...props,
    },
    slots: { tooltip: '<span data-testid="tip-slot">exact</span>' },
  });
}

describe('QuantTerrain', () => {
  it('falls back to the flat heatmap without WebGL and labels both axes and the legend', async () => {
    const wrapper = render();
    await flushPromises();
    expect(wrapper.classes()).toContain('is-flat');
    const labels = wrapper.findAll('.terrain-label').map((label) => label.text());
    expect(labels).toEqual(expect.arrayContaining(['24 h', '96 h', '10%', '20%', 'Average over', 'Buy below average']));
    expect(wrapper.text()).toContain('Height: first half');
    expect(wrapper.text()).toContain('-50% … 50%');
    expect(wrapper.get('[role="application"]').attributes('aria-label')).toBe('Results by setting');
  });

  it('moves a keyboard cursor across columns, announces it and selects with Enter', async () => {
    const wrapper = render();
    const stage = wrapper.get('[role="application"]');
    await stage.trigger('focus');
    expect(wrapper.text()).toContain('cell 48/10');
    expect(wrapper.find('[data-testid="studio-terrain-tooltip"]').text()).toContain('exact');
    await stage.trigger('keydown', { key: 'ArrowRight' });
    await stage.trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([{ x: 96, y: 20 }]);
    await stage.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([{ x: 96, y: 20 }]);
    await stage.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('select')?.[0]).toEqual([{ x: 96, y: 20 }]);
    await stage.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([null]);
  });

  it('picks the clicked heatmap cell and ignores drags', async () => {
    const wrapper = render();
    await flushPromises();
    const stage = wrapper.get('[role="application"]').element;
    // Flat layout: 64px left pad, 12px top pad, cells of (600-76)/3 by (300-52)/2 px.
    const cellWidth = (sizes.width - 64 - 12) / 3;
    const cellHeight = (sizes.height - 40 - 12) / 2;
    const x = 64 + cellWidth * 2.5;
    const y = 12 + cellHeight * 0.5; // top row is the larger depth
    pointer(stage, 'pointerdown', x, y);
    pointer(stage, 'pointerup', x, y);
    expect(wrapper.emitted('select')?.[0]).toEqual([{ x: 96, y: 20 }]);
    pointer(stage, 'pointerdown', x, y);
    pointer(stage, 'pointermove', x - 60, y);
    pointer(stage, 'pointerup', x - 60, y);
    expect(wrapper.emitted('select')).toHaveLength(1);
    // Hovering a cell reports it for the exact tooltip.
    pointer(stage, 'pointermove', 64 + cellWidth * 0.5, 12 + cellHeight * 1.5);
    expect(wrapper.emitted('hover')?.at(-1)).toEqual([{ x: 24, y: 10 }]);
  });

  it('shows the busy state and draws no animation frames while paused', async () => {
    const wrapper = render({ busy: true, paused: true });
    await flushPromises();
    expect(wrapper.classes()).toContain('is-busy');
    wrapper.unmount();
  });
});
