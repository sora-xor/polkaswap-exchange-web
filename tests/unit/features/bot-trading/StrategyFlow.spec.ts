import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StrategyFlow from '@/features/bot-trading/components/StrategyFlow.vue';
import { PLAYGROUND_DEFAULT_SETTINGS } from '@/features/bot-trading/playground';
import type { ResearchDecision } from '@/features/bot-trading/research';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => `${key}${values ? ` ${JSON.stringify(values)}` : ''}`,
  }),
}));

let callbacks: Map<number, FrameRequestCallback>;
let nextId = 0;
let timestamp = 0;
let hidden = false;
let reduce = false;
let intersection: (visible: boolean) => void;
let resize: (width: number) => void;
let mediaChange: (() => void) | undefined;
const disconnect = vi.fn();
const resizeDisconnect = vi.fn();
const removeMedia = vi.fn();

/** Drive a bounded animation clock instead of depending on jsdom's unbounded RAF loop. */
async function advance(milliseconds: number): Promise<void> {
  const target = timestamp + milliseconds;
  do {
    timestamp = Math.min(target, timestamp + 80);
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(timestamp));
    await nextTick();
  } while (timestamp < target);
}

beforeEach(() => {
  vi.clearAllMocks();
  callbacks = new Map();
  nextId = 0;
  timestamp = 0;
  hidden = false;
  reduce = false;
  mediaChange = undefined;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    })
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => callbacks.delete(id))
  );
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return reduce;
      },
      addEventListener: (_event: string, callback: () => void) => {
        mediaChange = callback;
      },
      removeEventListener: removeMedia,
    }))
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersection = (visible) => callback([{ isIntersecting: visible }]);
      }
      observe() {
        intersection(true);
      }
      disconnect = disconnect;
    }
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
        resize = (width) => callback([{ contentRect: { width } }]);
      }
      observe() {
        resize(780);
      }
      disconnect = resizeDisconnect;
    }
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** An explicit evaluator-shaped fixture lets the view prove it shows supplied checks, never invented fills. */
function decision(selected = true): ResearchDecision {
  return {
    id: 'observation-7',
    timestamp: Date.UTC(2026, 8, 14, 13),
    signalTimestamp: Date.UTC(2026, 8, 14, 12),
    action: 'buy',
    price: '2',
    amount: '10',
    selected,
    reason: selected ? 'bots.events.scheduled' : 'bots.errors.feeBudget',
    checks: ['signal', 'cooldown', 'balance', 'tradeLimit', 'feeBudget'].map((key) => ({
      key: key as ResearchDecision['checks'][number]['key'],
      passed: selected || key !== 'feeBudget',
    })),
  };
}

describe('StrategyFlow', () => {
  it('keeps the animated explanation explicitly illustrative until an evaluated decision exists', async () => {
    const wrapper = mount(StrategyFlow, {
      props: { settings: PLAYGROUND_DEFAULT_SETTINGS, inputSymbol: 'XOR', outputSymbol: 'VAL' },
    });
    await nextTick();
    expect(wrapper.attributes('data-mode')).toBe('illustrative');
    expect(wrapper.find('[data-testid="strategy-landscape"]').exists()).toBe(true);
    expect(wrapper.classes()).toContain('is-moving');
    expect(wrapper.get('[data-testid="strategy-flow-source"]').text()).toBe('bots.flow.illustrative');
    expect(wrapper.text()).toContain('bots.flow.illustrativeNote');
    expect(wrapper.get('.flow-details').element.tagName).toBe('DETAILS');
    expect(wrapper.get('.flow-details').attributes('open')).toBeUndefined();
    expect(wrapper.get('.flow-details summary').text()).toBe('assets.details');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').isVisible()).toBe(false);
    expect(wrapper.get('[data-testid="strategy-flow-action"]').isVisible()).toBe(false);
    (wrapper.get('.flow-details').element as HTMLDetailsElement).open = true;
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="strategy-flow-outcome"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="strategy-flow-action"]').text()).toContain('"amount":"10"');
    expect(wrapper.get('[data-testid="strategy-flow-action"]').text()).toContain('"input":"XOR"');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('"output":"VAL"');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('bots.flow.blockCadence');
    await wrapper.setProps({ settings: { ...PLAYGROUND_DEFAULT_SETTINGS, intervalBlocks: 1200 } });
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('bots.flow.hourCadence');
    await wrapper.setProps({ active: false });
    expect(wrapper.classes()).not.toContain('is-moving');
    expect(wrapper.emitted()).toEqual({});
    wrapper.unmount();
  });

  it('explains the chosen rule and current sizing without changing settings or starting computation', async () => {
    const settings = Object.freeze({ ...PLAYGROUND_DEFAULT_SETTINGS, capital: '1.000001', tradePercent: 33 });
    const wrapper = mount(StrategyFlow, { props: { settings, inputDecimals: 6 } });
    expect(wrapper.get('[data-testid="strategy-flow-action"]').text()).toContain('"amount":"0.33"');
    await wrapper.setProps({ settings: { ...settings, preset: 'threshold', thresholdPercent: 12 } });
    expect(wrapper.get('h3').text()).toBe('bots.flow.rules.threshold.title');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('"dip":12');
    await wrapper.setProps({ settings: { ...settings, preset: 'sma', fastWindow: 4, slowWindow: 30 } });
    expect(wrapper.get('h3').text()).toBe('bots.flow.rules.sma.title');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('"fast":4');
    expect(wrapper.get('[data-testid="strategy-flow-explanation"]').text()).toContain('"slow":30');
    expect(settings.preset).toBe('dca');
    expect(wrapper.emitted()).toEqual({});
    wrapper.unmount();
  });

  it('shows actual accepted and rejected evidence and freezes after calculation', async () => {
    const accepted = Object.freeze(decision());
    const wrapper = mount(StrategyFlow, {
      props: { settings: PLAYGROUND_DEFAULT_SETTINGS, decision: accepted, calculating: true },
    });
    await nextTick();
    expect(wrapper.attributes('data-mode')).toBe('historical');
    expect(wrapper.find('[data-testid="strategy-landscape"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('bots.flow.illustrativeNote');
    expect(wrapper.get('time').text()).toBe('2026-09-14 12:00 UTC');
    expect(wrapper.get('[data-testid="strategy-flow-signal"]').text()).toBe('bots.flow.signalPassed');
    expect(wrapper.get('[data-testid="strategy-flow-budget"]').text()).toBe('bots.flow.budgetPassed');
    expect(wrapper.get('[data-testid="strategy-flow-outcome"]').text()).toContain('bots.flow.filled');
    expect(wrapper.classes()).toContain('is-moving');
    await wrapper.setProps({ decision: decision(false), calculating: false });
    expect(wrapper.classes()).not.toContain('is-moving');
    expect(wrapper.get('[data-testid="strategy-flow-budget"]').text()).toBe('bots.flow.budgetSkipped');
    expect(wrapper.get('[data-testid="strategy-flow-outcome"]').text()).toContain('bots.flow.skipped');
    expect(wrapper.get('[data-testid="strategy-flow-outcome"]').text()).toContain('bots.errors.feeBudget');
    expect(accepted.selected).toBe(true);
    expect(wrapper.emitted()).toEqual({});
    wrapper.unmount();
  });

  it('pauses exactly, resumes without catch-up and supports an explicit replay', async () => {
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    await advance(0);
    await advance(400);
    const position = wrapper.attributes('data-progress');
    expect(Number(position)).toBeGreaterThan(0);
    await wrapper.get('[data-testid="strategy-lesson-toggle"]').trigger('click');
    expect(callbacks.size).toBe(0);
    await advance(6000);
    expect(wrapper.attributes('data-progress')).toBe(position);
    await wrapper.get('[data-testid="strategy-lesson-toggle"]').trigger('click');
    await advance(80);
    expect(wrapper.attributes('data-progress')).toBe(position);
    await advance(80);
    expect(Number(wrapper.attributes('data-progress'))).toBeGreaterThan(Number(position));
    await wrapper.get('[data-testid="strategy-lesson-replay"]').trigger('click');
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
    expect(callbacks.size).toBe(1);
  });

  it('loops the same lesson through multiple complete passes without changing settings or emitting actions', async () => {
    const settings = Object.freeze({ ...PLAYGROUND_DEFAULT_SETTINGS });
    const wrapper = mount(StrategyFlow, { props: { settings } });
    await nextTick();
    await advance(0);
    const duration = Number(wrapper.attributes('data-duration-ms'));
    const initialPath = wrapper.get('.lesson-price').attributes('d');
    for (let cycle = 0; cycle < 3; cycle++) {
      await advance(duration);
      expect(wrapper.attributes('data-phase')).toBe('complete');
      expect(wrapper.attributes('data-progress')).toBe('1.0000');
      expect(wrapper.findAll('.lesson-event.is-reached')).toHaveLength(4);
      expect(wrapper.get('[data-testid="strategy-lesson-toggle"]').attributes('disabled')).toBeUndefined();
      expect(callbacks.size).toBe(1);
      await advance(400);
      expect(wrapper.attributes('data-progress')).toBe('1.0000');
      await advance(400);
      expect(wrapper.attributes('data-progress')).toBe('0.0000');
      expect(wrapper.attributes('data-phase')).toBe('observe');
      expect(wrapper.findAll('.lesson-event.is-reached')).toHaveLength(0);
      expect(wrapper.get('.lesson-price').attributes('d')).toBe(initialPath);
      expect(wrapper.attributes('data-playing')).toBe('true');
      expect(callbacks.size).toBe(1);
    }
    expect(settings).toEqual(PLAYGROUND_DEFAULT_SETTINGS);
    expect(wrapper.emitted()).toEqual({});
  });

  it('can pause at the cycle endpoint and preserves that choice when selecting a new lesson', async () => {
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    await advance(0);
    await advance(Number(wrapper.attributes('data-duration-ms')));
    await wrapper.get('[data-testid="strategy-lesson-toggle"]').trigger('click');
    await advance(4000);
    expect(wrapper.attributes('data-progress')).toBe('1.0000');
    expect(callbacks.size).toBe(0);
    await wrapper.setProps({ settings: { ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'threshold' } });
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
    expect(wrapper.get('[data-testid="strategy-lesson-toggle"]').attributes('aria-pressed')).toBe('true');
    expect(callbacks.size).toBe(0);
    await wrapper.get('[data-testid="strategy-lesson-replay"]').trigger('click');
    await advance(0);
    await advance(400);
    expect(Number(wrapper.attributes('data-progress'))).toBeGreaterThan(0);
    expect(wrapper.emitted('run')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('does not restart for same-value settings objects from parent refreshes', async () => {
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    await advance(0);
    await advance(500);
    const position = wrapper.attributes('data-progress');
    await wrapper.setProps({ settings: { ...PLAYGROUND_DEFAULT_SETTINGS } });
    expect(wrapper.attributes('data-progress')).toBe(position);
    await wrapper.setProps({ settings: { ...PLAYGROUND_DEFAULT_SETTINGS, capital: '200' } });
    expect(wrapper.attributes('data-progress')).toBe(position);
    await wrapper.setProps({ settings: { ...PLAYGROUND_DEFAULT_SETTINGS, preset: 'threshold' } });
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
    expect(wrapper.get('h3').text()).toBe('bots.flow.rules.threshold.title');
  });

  it('suspends hidden, offscreen and inactive lessons without consuming elapsed time', async () => {
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    await advance(0);
    await advance(400);
    const position = wrapper.attributes('data-progress');
    for (const mode of ['hidden', 'offscreen', 'inactive']) {
      if (mode === 'hidden') {
        hidden = true;
        document.dispatchEvent(new Event('visibilitychange'));
      } else if (mode === 'offscreen') intersection(false);
      else await wrapper.setProps({ active: false });
      await nextTick();
      expect(callbacks.size).toBe(0);
      await advance(4000);
      expect(wrapper.attributes('data-progress')).toBe(position);
      if (mode === 'hidden') {
        hidden = false;
        document.dispatchEvent(new Event('visibilitychange'));
      } else if (mode === 'offscreen') intersection(true);
      else await wrapper.setProps({ active: true });
      await nextTick();
      await advance(80);
      expect(wrapper.attributes('data-progress')).toBe(position);
    }
    await advance(80);
    expect(Number(wrapper.attributes('data-progress'))).toBeGreaterThan(Number(position));
  });

  it('renders the complete static lesson for reduced motion and cleans up observers', async () => {
    reduce = true;
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    expect(wrapper.attributes('data-progress')).toBe('1.0000');
    expect(wrapper.attributes('data-phase')).toBe('complete');
    expect(wrapper.findAll('.lesson-event.is-reached')).toHaveLength(4);
    expect(wrapper.get('[data-testid="strategy-lesson-toggle"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="strategy-lesson-replay"]').attributes('disabled')).toBeDefined();
    expect(callbacks.size).toBe(0);
    reduce = false;
    mediaChange?.();
    await nextTick();
    expect(callbacks.size).toBe(1);
    wrapper.unmount();
    expect(callbacks.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(resizeDisconnect).toHaveBeenCalledOnce();
    expect(removeMedia).toHaveBeenCalledOnce();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callbacks.size).toBe(0);
  });

  it('projects the lesson to a mobile or wide viewport without scaling markers or restarting', async () => {
    const wrapper = mount(StrategyFlow, { props: { settings: PLAYGROUND_DEFAULT_SETTINGS } });
    await nextTick();
    await advance(0);
    await advance(400);
    const position = wrapper.attributes('data-progress');
    const initialPath = wrapper.get('.lesson-price').attributes('d');
    for (const width of [342, 1200]) {
      resize(width);
      await nextTick();
      expect(wrapper.get('[data-testid="strategy-lesson"]').attributes('viewBox')).toBe(`0 0 ${width} 170`);
      expect(wrapper.get('.lesson-price').attributes('d')).not.toBe(initialPath);
      expect(wrapper.get('.lesson-cursor').attributes('r')).toBe('4.5');
      const x = Number(wrapper.get('[data-testid="strategy-lesson-playhead"]').attributes('x1'));
      expect(x).toBeCloseTo(24 + Number(position) * (width - 48), 1);
      expect(wrapper.attributes('data-progress')).toBe(position);
    }
  });
});
