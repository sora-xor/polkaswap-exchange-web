import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import RewardsReactor from '@/features/rewards/components/rewards/RewardsReactor.vue';

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'TokenLogoStub',
    props: ['token', 'size'],
    setup(props) {
      return () => h('i', { class: 'token-logo-stub', 'data-symbol': (props.token as { symbol: string }).symbol });
    },
  }),
}));

const CIRCUMFERENCE = Number((2 * Math.PI * 112).toFixed(2));
const token = (symbol: string) => ({ address: `0x${symbol.toLowerCase()}`, symbol, decimals: 18 }) as never;

let frames: FrameRequestCallback[] = [];

const flushFrames = async (): Promise<void> => {
  const queued = frames;
  frames = [];
  queued.forEach((callback) => callback(0));
  await nextTick();
};

const stubMotion = (reduced: boolean) => {
  const query = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  window.matchMedia = globalThis.matchMedia;
};

const fillOffset = (wrapper: ReturnType<typeof mount>): number =>
  Number((wrapper.find('.rw-reactor__fill').element as SVGElement).style.strokeDashoffset);

const pointerMove = (element: Element, clientX: number, clientY: number, pointerType = 'mouse') => {
  const event = new MouseEvent('pointermove', { clientX, clientY, bubbles: true });

  Object.defineProperty(event, 'pointerType', { value: pointerType });
  element.dispatchEvent(event);
};

beforeEach(() => {
  frames = [];
  stubMotion(false);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => frames.push(callback))
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RewardsReactor.vue', () => {
  it('exposes the ring as a meter with the unlocked share', () => {
    const wrapper = mount(RewardsReactor, { props: { progress: 0.4, label: 'Unlocked 40%' } });
    const root = wrapper.find('.rw-reactor');

    expect(root.attributes('role')).toBe('meter');
    expect(root.attributes('aria-valuenow')).toBe('40');
    expect(root.attributes('aria-valuemin')).toBe('0');
    expect(root.attributes('aria-valuemax')).toBe('100');
    expect(root.attributes('aria-label')).toBe('Unlocked 40%');
    expect(wrapper.find('.rw-reactor__stage').attributes('aria-hidden')).toBe('true');
  });

  it('is a plain decoration while the share is unknown', () => {
    const wrapper = mount(RewardsReactor);

    expect(wrapper.find('.rw-reactor').attributes('role')).toBeUndefined();
    expect(wrapper.find('.rw-reactor').classes()).toContain('rw-reactor--idle');
  });

  it('keeps out-of-range shares on the scale', async () => {
    const high = mount(RewardsReactor, { props: { progress: 1.4 } });
    const low = mount(RewardsReactor, { props: { progress: -0.2 } });
    await flushFrames();
    await flushFrames();

    expect(high.find('.rw-reactor').attributes('aria-valuenow')).toBe('100');
    expect(fillOffset(high)).toBe(0);
    expect(low.find('.rw-reactor').attributes('aria-valuenow')).toBe('0');
    expect(fillOffset(low)).toBe(CIRCUMFERENCE);
  });

  it('does not read 100 before everything is unlocked', () => {
    const almost = mount(RewardsReactor, { props: { progress: 0.996 } });
    const done = mount(RewardsReactor, { props: { progress: 1 } });

    expect(almost.find('.rw-reactor').attributes('aria-valuenow')).toBe('99');
    expect(done.find('.rw-reactor').attributes('aria-valuenow')).toBe('100');
  });

  it('starts with an empty ring and fills it once it is on screen', async () => {
    const wrapper = mount(RewardsReactor, { props: { progress: 0.45 } });

    expect(fillOffset(wrapper)).toBe(CIRCUMFERENCE);

    await flushFrames();
    expect(fillOffset(wrapper)).toBe(CIRCUMFERENCE);

    await flushFrames();
    expect(fillOffset(wrapper)).toBe(Number((CIRCUMFERENCE * 0.55).toFixed(2)));
    expect(wrapper.find('.rw-reactor').classes()).toContain('rw-reactor--ready');
  });

  it('shows the finished ring at once for reduced-motion users', () => {
    stubMotion(true);

    const wrapper = mount(RewardsReactor, { props: { progress: 0.25 } });

    expect(fillOffset(wrapper)).toBe(Number((CIRCUMFERENCE * 0.75).toFixed(2)));
  });

  it('puts the first token in the core and lets the others orbit it', () => {
    const wrapper = mount(RewardsReactor, { props: { tokens: [token('PSWAP'), token('VAL'), token('XOR')] } });

    expect(wrapper.find('.rw-reactor__core .token-logo-stub').attributes('data-symbol')).toBe('PSWAP');
    expect(
      wrapper.findAll('.rw-reactor__orbit .token-logo-stub').map((logo) => logo.attributes('data-symbol'))
    ).toEqual(['VAL', 'XOR']);
    // Two satellites plus one decorative dot keep the orbit populated.
    expect(wrapper.findAll('.rw-reactor__orbit')).toHaveLength(3);
    expect(wrapper.findAll('.rw-reactor__orbit--dot')).toHaveLength(1);
  });

  it('fills the orbit with dots when there are few tokens and never shows more than three satellites', () => {
    const one = mount(RewardsReactor, { props: { tokens: [token('PSWAP')] } });
    const many = mount(RewardsReactor, {
      props: { tokens: ['A', 'B', 'C', 'D', 'E', 'F'].map(token) },
    });

    expect(one.findAll('.rw-reactor__orbit--dot')).toHaveLength(3);
    expect(many.findAll('.rw-reactor__orbit')).toHaveLength(3);
    expect(many.findAll('.rw-reactor__orbit--dot')).toHaveLength(0);
    expect(many.findAll('.rw-reactor__orbit .token-logo-stub').map((logo) => logo.attributes('data-symbol'))).toEqual([
      'B',
      'C',
      'D',
    ]);
  });

  it('shows a plain core mark without tokens', () => {
    const wrapper = mount(RewardsReactor);

    expect(wrapper.find('.rw-reactor__mark').exists()).toBe(true);
    expect(wrapper.find('.rw-reactor__core .token-logo-stub').exists()).toBe(false);
  });

  it('spaces the orbiters evenly and gives each its own speed', () => {
    const wrapper = mount(RewardsReactor, { props: { tokens: [token('PSWAP'), token('VAL'), token('XOR')] } });
    const styles = wrapper.findAll('.rw-reactor__orbit').map((orbit) => orbit.attributes('style') ?? '');
    const angles = styles.map((style) => Number(/--a0: (\d+)deg/.exec(style)?.[1]));

    expect(angles).toEqual([24, 144, 264]);
    expect(new Set(styles.map((style) => /--dur: ([\d.]+)s/.exec(style)?.[1])).size).toBe(3);
  });

  it('replays a ripple when the core is clicked, and clears it afterwards', async () => {
    vi.useFakeTimers();

    const wrapper = mount(RewardsReactor);
    const root = wrapper.find('.rw-reactor');

    await wrapper.find('.rw-reactor__stage').trigger('click');
    expect(root.classes()).toContain('rw-reactor--ping');

    vi.advanceTimersByTime(1100);
    expect(root.classes()).not.toContain('rw-reactor--ping');
  });

  it('does not ripple for reduced-motion users', async () => {
    stubMotion(true);

    const wrapper = mount(RewardsReactor);

    await wrapper.find('.rw-reactor__stage').trigger('click');

    expect(wrapper.find('.rw-reactor').classes()).not.toContain('rw-reactor--ping');
  });

  it('tilts toward the pointer and settles when it leaves', async () => {
    const wrapper = mount(RewardsReactor, { attachTo: document.body });
    const root = wrapper.find('.rw-reactor').element as HTMLElement;

    root.getBoundingClientRect = () => ({ left: 100, top: 100, width: 200, height: 200 }) as DOMRect;

    pointerMove(root, 300, 100);
    await flushFrames();

    expect(root.style.getPropertyValue('--px')).toBe('1.000');
    expect(root.style.getPropertyValue('--py')).toBe('-1.000');

    await wrapper.find('.rw-reactor').trigger('pointerleave');

    expect(root.style.getPropertyValue('--px')).toBe('0');
    expect(root.style.getPropertyValue('--py')).toBe('0');
  });

  it('ignores touch input and reduced-motion users for the tilt', async () => {
    const touch = mount(RewardsReactor, { attachTo: document.body });
    const touchRoot = touch.find('.rw-reactor').element as HTMLElement;

    pointerMove(touchRoot, 150, 150, 'touch');
    await flushFrames();
    expect(touchRoot.style.getPropertyValue('--px')).toBe('');

    stubMotion(true);

    const reduced = mount(RewardsReactor, { attachTo: document.body });
    const reducedRoot = reduced.find('.rw-reactor').element as HTMLElement;

    pointerMove(reducedRoot, 150, 150);
    await flushFrames();
    expect(reducedRoot.style.getPropertyValue('--px')).toBe('');
  });

  it('turns each decorative ring as its own svg root so the browser can composite it', () => {
    const wrapper = mount(RewardsReactor);
    const spinners = wrapper.findAll('svg.rw-reactor__spinner');

    expect(spinners).toHaveLength(2);
    expect(spinners.map((spinner) => spinner.classes())).toEqual([
      expect.arrayContaining(['rw-reactor__spinner--forward']),
      expect.arrayContaining(['rw-reactor__spinner--backward']),
    ]);
    // The meter lives in a separate, static svg, so nothing inside an animated svg ever repaints per frame.
    expect(wrapper.find('svg.rw-reactor__svg .rw-reactor__fill').exists()).toBe(true);
    expect(wrapper.find('svg.rw-reactor__spinner .rw-reactor__fill').exists()).toBe(false);
    // The breathing glow is an HTML element for the same reason.
    expect(wrapper.find('span.rw-reactor__glow').exists()).toBe(true);
    expect(wrapper.find('svg g').exists()).toBe(false);
  });
});
