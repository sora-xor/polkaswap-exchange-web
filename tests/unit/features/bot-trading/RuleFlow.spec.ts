import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RuleFlow from '@/features/bot-trading/components/RuleFlow.vue';
import { evaluateStrategyRules } from '@/features/bot-trading/strategy-rules';
import type { StrategyRules } from '@/features/bot-trading/strategy-rules';

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

const rules: StrategyRules = {
  version: 1,
  entry: {
    operator: 'all',
    conditions: [
      { kind: 'trend', window: 3, direction: 'above' },
      { kind: 'momentum', window: 2, direction: 'above', threshold: '0' },
    ],
  },
  exit: { operator: 'any', conditions: [{ kind: 'trend', window: 3, direction: 'below' }] },
};
const candles = ['100', '100', '104', '100', '94', '103', '102', '101'].map((close, index) => ({
  timestamp: index * 3600000,
  close,
}));

describe('RuleFlow', () => {
  it('shows real composed-rule evidence and signal outcomes without presenting fills', async () => {
    reduce = true;
    const wrapper = mount(RuleFlow, { props: { rules, candles } });
    await nextTick();
    const evaluation = evaluateStrategyRules(rules, candles);
    expect(wrapper.attributes('data-source')).toBe('historical');
    expect(wrapper.attributes('data-outcome')).toBe(evaluation.exit ? 'sell' : 'hold');
    expect(wrapper.get('[data-testid="rule-flow-outcome"]').text()).toContain('bots.rules.flowSell');
    expect(wrapper.get('[data-testid="rule-flow-entry"]').text()).toContain('bots.rules.flowAll');
    expect(wrapper.get('[data-testid="rule-flow-exit"]').text()).toContain('bots.rules.flowAny');
    expect(wrapper.get('[data-testid="rule-flow-condition-exit-0"]').classes()).toContain('is-passed');
    expect(wrapper.get('[data-testid="rule-flow-condition-entry-0"]').classes()).not.toContain('is-passed');
    expect(wrapper.text()).toContain('bots.rules.flowSignalNote');
    expect(wrapper.text()).not.toContain('profit');
    expect(wrapper.emitted()).toEqual({});
  });

  it('preserves progress for same-value rules and condition selection, then pauses and replays', async () => {
    const wrapper = mount(RuleFlow, { props: { rules } });
    await nextTick();
    await advance(0);
    await advance(400);
    const progress = wrapper.attributes('data-progress');
    expect(Number(progress)).toBeGreaterThan(0);
    const scan = wrapper.get('[data-testid="rule-flow-scan"]');
    expect(scan.attributes('aria-hidden')).toBe('true');
    expect(Number(scan.attributes('x')) + Number(scan.attributes('width'))).toBeCloseTo(
      Number(wrapper.get('[data-testid="rule-flow-playhead"]').attributes('x1'))
    );
    expect(wrapper.get('[data-testid="rule-flow-progress"]').attributes('style')).toContain('scaleX(');
    const progressStyle = wrapper.get('[data-testid="rule-flow-progress"]').attributes('style');
    expect(wrapper.get('.plot-condition').attributes('cx')).toBe(
      wrapper.get('[data-testid="rule-flow-playhead"]').attributes('x1')
    );
    await wrapper.setProps({ rules: JSON.parse(JSON.stringify(rules)) });
    expect(wrapper.attributes('data-progress')).toBe(progress);
    await wrapper.get('[data-testid="rule-flow-condition-entry-1"]').trigger('click');
    expect(wrapper.get('[data-testid="rule-flow-condition-entry-1"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.attributes('data-progress')).toBe(progress);
    await wrapper.get('[data-testid="rule-flow-toggle"]').trigger('click');
    expect(callbacks.size).toBe(0);
    await advance(5000);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    expect(wrapper.get('[data-testid="rule-flow-progress"]').attributes('style')).toBe(progressStyle);
    expect(wrapper.attributes('data-playing')).toBe('false');
    await wrapper.get('[data-testid="rule-flow-toggle"]').trigger('click');
    await advance(80);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    await advance(80);
    expect(Number(wrapper.attributes('data-progress'))).toBeGreaterThan(Number(progress));
    await wrapper.get('[data-testid="rule-flow-replay"]').trigger('click');
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
    expect(callbacks.size).toBe(1);
    await wrapper.setProps({ rules: { ...rules, entry: { ...rules.entry, operator: 'any' } } });
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
  });

  it('repeats the same historical evidence across multiple complete passes without emitting trades', async () => {
    const original = structuredClone(candles);
    const wrapper = mount(RuleFlow, { props: { rules, candles } });
    await nextTick();
    await advance(0);
    const duration = Number(wrapper.attributes('data-duration-ms'));
    const initialPath = wrapper.get('.plot-price').attributes('d');
    const firstOutcome = wrapper.attributes('data-outcome');
    for (let cycle = 0; cycle < 3; cycle++) {
      await advance(duration);
      expect(wrapper.attributes('data-complete')).toBe('true');
      expect(wrapper.attributes('data-progress')).toBe('1.0000');
      expect(wrapper.attributes('data-outcome')).toBe('sell');
      expect(wrapper.get('[data-testid="rule-flow-toggle"]').attributes('disabled')).toBeUndefined();
      expect(wrapper.attributes('data-playing')).toBe('true');
      expect(callbacks.size).toBe(1);
      await advance(400);
      expect(wrapper.attributes('data-progress')).toBe('1.0000');
      await advance(400);
      expect(wrapper.attributes('data-progress')).toBe('0.0000');
      expect(wrapper.attributes('data-complete')).toBe('false');
      expect(wrapper.attributes('data-outcome')).toBe(firstOutcome);
      expect(wrapper.get('.plot-price').attributes('d')).toBe(initialPath);
      expect(callbacks.size).toBe(1);
    }
    expect(candles).toEqual(original);
    expect(wrapper.emitted()).toEqual({});
  });

  it('can pause the final observation and keeps that pause when the rules change', async () => {
    const wrapper = mount(RuleFlow, { props: { rules, candles } });
    await nextTick();
    await advance(0);
    await advance(Number(wrapper.attributes('data-duration-ms')));
    await wrapper.get('[data-testid="rule-flow-toggle"]').trigger('click');
    await advance(4000);
    expect(wrapper.attributes('data-progress')).toBe('1.0000');
    expect(callbacks.size).toBe(0);
    await wrapper.setProps({ rules: { ...rules, entry: { ...rules.entry, operator: 'any' } } });
    expect(wrapper.attributes('data-progress')).toBe('0.0000');
    expect(wrapper.get('[data-testid="rule-flow-toggle"]').attributes('aria-pressed')).toBe('true');
    expect(callbacks.size).toBe(0);
    await wrapper.get('[data-testid="rule-flow-replay"]').trigger('click');
    expect(wrapper.attributes('data-playing')).toBe('true');
    await advance(0);
    await advance(400);
    expect(Number(wrapper.attributes('data-progress'))).toBeGreaterThan(0);
    expect(wrapper.emitted('run')).toBeUndefined();
    expect(wrapper.emitted('start')).toBeUndefined();
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('suspends offscreen, hidden and inactive animation without catching up', async () => {
    const wrapper = mount(RuleFlow, { props: { rules } });
    await nextTick();
    await advance(0);
    await advance(400);
    const progress = wrapper.attributes('data-progress');
    intersection(false);
    await advance(5000);
    expect(callbacks.size).toBe(0);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    intersection(true);
    await advance(80);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await advance(5000);
    expect(callbacks.size).toBe(0);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await advance(80);
    expect(wrapper.attributes('data-progress')).toBe(progress);
    await wrapper.setProps({ active: false });
    expect(callbacks.size).toBe(0);
  });

  it('respects reduced motion, scales coordinates rather than marker sizes, and releases observers', async () => {
    reduce = true;
    const wrapper = mount(RuleFlow, { props: { rules } });
    await nextTick();
    expect(wrapper.attributes('data-complete')).toBe('true');
    expect(wrapper.attributes('data-playing')).toBe('false');
    expect(wrapper.get('[data-testid="rule-flow-progress"]').attributes('style')).toContain('scaleX(1)');
    expect(wrapper.get('[data-testid="rule-flow-toggle"]').attributes('disabled')).toBeDefined();
    expect(callbacks.size).toBe(0);
    resize(342);
    await nextTick();
    expect(wrapper.get('[data-testid="rule-flow-chart"]').attributes('viewBox')).toBe('0 0 342 200');
    expect(wrapper.get('.plot-cursor').attributes('r')).toBe('4');
    expect(wrapper.get('[data-testid="rule-flow-playhead"]').attributes('x1')).toBe('324');
    reduce = false;
    mediaChange?.();
    await nextTick();
    expect(callbacks.size).toBe(1);
    wrapper.unmount();
    expect(callbacks.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(resizeDisconnect).toHaveBeenCalledOnce();
    expect(removeMedia).toHaveBeenCalledOnce();
  });

  it('does not replace an explicitly empty historical series with fabricated example data', async () => {
    const wrapper = mount(RuleFlow, { props: { rules, candles: [] } });
    await nextTick();
    expect(wrapper.attributes('data-source')).toBe('historical');
    expect(wrapper.attributes('data-outcome')).toBe('unavailable');
    expect(wrapper.text()).toContain('bots.rules.flowUnavailable');
    expect(wrapper.find('[data-testid="rule-flow-chart"]').exists()).toBe(false);
    expect(callbacks.size).toBe(0);
  });
});
