import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BuyXorJourneyArt from '@/features/misc/components/buy-xor/BuyXorJourneyArt.vue';
import { buyXorJourneyTargets } from '@/features/misc/lib/buyXorJourney';

const mocks = vi.hoisted(() => ({ create: vi.fn(), simulation: vi.fn(), atlas: vi.fn() }));
vi.mock('@/features/bot-trading/quant-water-renderer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/quant-water-renderer')>()),
  createWaterRenderer: mocks.create,
}));
vi.mock('@/features/bot-trading/quant-water-coins', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/quant-water-coins')>()),
  buildCoinAtlas: mocks.atlas,
}));
vi.mock('@/features/misc/lib/buyXorJourneyWater', () => ({ createJourneySimulation: mocks.simulation }));

type Spy = ReturnType<typeof vi.fn>;
let wrapper: VueWrapper | undefined;
let frames: Map<number, FrameRequestCallback>;
let sequence: number;
let now: number;
let idle: (() => void) | undefined;
let hidden: boolean;
let motion: { matches: boolean; addEventListener: Spy; removeEventListener: Spy };
let motionChange: (() => void) | undefined;
let intersection: IntersectionObserverCallback | undefined;
let resized: ResizeObserverCallback | undefined;
let disconnects: Spy[];
let renderer: { setPalette: Spy; setCoins: Spy; resize: Spy; setView: Spy; draw: Spy; dispose: Spy };
let simulation: {
  setAspect: Spy;
  setTargets: Spy;
  kick: Spy;
  celebrate: Spy;
  poke: Spy;
  step: Spy;
  settle: Spy;
  frame: Spy;
};
const atlas = { canvas: 'atlas', tints: [] };

/** Run the browser's currently queued frames at a time, never a recursive loop. */
async function frameAt(time: number): Promise<void> {
  now = time;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
  await nextTick();
}

/** Let the deferred start run as the browser would after first paint, then wait for the water code to load. */
async function start(art: VueWrapper): Promise<void> {
  idle?.();
  // The first import of the water code is transformed on the spot, which can be slow on a busy machine.
  await vi.waitFor(() => expect(art.attributes('data-renderer')).not.toBe('pending'), { timeout: 10_000 });
  await nextTick();
}

async function mountArt(props: Record<string, unknown> = {}, begin = true): Promise<VueWrapper> {
  wrapper = mount(BuyXorJourneyArt, { props: { stage: 'receive', ...props }, attachTo: document.body });
  if (begin) await start(wrapper);
  return wrapper;
}

function pointer(target: Element, x: number, y: number, time: number): void {
  const event = new Event('pointermove', { bubbles: true });
  Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y }, timeStamp: { value: time } });
  target.dispatchEvent(event);
}

const dropOf = (art: VueWrapper, coin: string) => art.get(`.journey-art__drop[data-coin="${coin}"]`);
const radiusOf = (art: VueWrapper, coin: string) => Number(dropOf(art, coin).element.style.getPropertyValue('--r'));

beforeEach(() => {
  frames = new Map();
  sequence = 0;
  now = 1000;
  idle = undefined;
  hidden = false;
  motionChange = undefined;
  intersection = undefined;
  resized = undefined;
  disconnects = [];
  renderer = {
    setPalette: vi.fn(),
    setCoins: vi.fn(),
    resize: vi.fn(),
    setView: vi.fn(),
    draw: vi.fn(() => true),
    dispose: vi.fn(),
  };
  simulation = {
    setAspect: vi.fn(),
    setTargets: vi.fn(),
    kick: vi.fn(),
    celebrate: vi.fn(),
    poke: vi.fn(() => true),
    step: vi.fn(),
    settle: vi.fn(),
    frame: vi.fn(() => ({ frame: true })),
  };
  mocks.create.mockReset().mockReturnValue(renderer);
  mocks.simulation.mockReset().mockReturnValue(simulation);
  mocks.atlas.mockReset().mockReturnValue(atlas);
  motion = {
    matches: false,
    addEventListener: vi.fn((_type: string, callback: () => void) => (motionChange = callback)),
    removeEventListener: vi.fn(),
  };
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++sequence, callback);
      return sequence;
    })
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id))
  );
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((callback: () => void) => {
      idle = callback;
      return 7;
    })
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motion)
  );
  vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: false } });
  vi.stubGlobal('WebGLRenderingContext', class {});
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe = vi.fn();
      disconnect = (() => {
        const disconnect = vi.fn();
        disconnects.push(disconnect);
        return disconnect;
      })();
    }
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resized = callback;
      }
      observe = vi.fn();
      disconnect = (() => {
        const disconnect = vi.fn();
        disconnects.push(disconnect);
        return disconnect;
      })();
    }
  );
  // A banner 600 × 150 px: the art measures itself from its element.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(150);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Buy XOR journey art without WebGL', () => {
  beforeEach(() => vi.stubGlobal('WebGLRenderingContext', undefined));

  it('shows glass drops with the three coin logos, hidden from assistive technology, and loads no water code', async () => {
    const art = await mountArt({ stage: 'send' });
    expect(art.attributes('data-renderer')).toBe('static');
    expect(art.attributes('aria-hidden')).toBe('true');
    expect(art.text()).toBe('');
    expect(art.find('button, a, input, [tabindex]').exists()).toBe(false);
    const drops = art.findAll('.journey-art__drop');
    expect(drops.map((drop) => drop.attributes('data-coin'))).toEqual(['ETH', 'ETH-SORA', 'XOR']);
    drops.forEach((drop) => expect(drop.element.style.getPropertyValue('--coin')).toContain('data:image/svg+xml'));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.simulation).not.toHaveBeenCalled();
  });

  it('sizes and positions the drops like the WebGL bubbles, and follows the stage', async () => {
    const art = await mountArt({ stage: 'receive' });
    const receive = buyXorJourneyTargets('receive').bubbles;
    expect(radiusOf(art, 'ETH')).toBe(receive[0].radius);
    expect(radiusOf(art, 'XOR')).toBe(receive[2].radius);
    // The coins sit left to right across the art.
    const left = (coin: string) => parseFloat(dropOf(art, coin).element.style.getPropertyValue('--x'));
    expect(left('ETH')).toBeLessThan(left('ETH-SORA'));
    expect(left('ETH-SORA')).toBeLessThan(left('XOR'));
    expect(left('ETH-SORA')).toBeCloseTo(50, 5);
    await art.setProps({ stage: 'swap' });
    expect(art.attributes('data-stage')).toBe('swap');
    expect(radiusOf(art, 'XOR')).toBe(buyXorJourneyTargets('swap').bubbles[2].radius);
    expect(radiusOf(art, 'ETH')).toBeLessThan(0.3);
  });

  it('breathes in the coin the step is about and sends four droplets along the flow', async () => {
    const art = await mountArt({ stage: 'send' });
    expect(art.findAll('.journey-art__drop.is-focus').map((drop) => drop.attributes('data-coin'))).toEqual([
      'ETH-SORA',
    ]);
    expect(art.findAll('.journey-art__bead')).toHaveLength(4);
    expect(art.attributes('data-flow')).toBe('0-1');
    const style = art.get('.journey-art__fallback').element.style;
    expect(style.getPropertyValue('--flow-seconds')).toBe('2.1s');
    expect(parseFloat(style.getPropertyValue('--fx'))).toBeLessThan(parseFloat(style.getPropertyValue('--tx')));
    await art.setProps({ stage: 'receive' });
    expect(art.attributes('data-flow')).toBe('card-0');
    // The card payment comes in from beyond the left edge.
    expect(parseFloat(art.get('.journey-art__fallback').element.style.getPropertyValue('--fx'))).toBeLessThan(0);
    await art.setProps({ stage: 'pay' });
    expect(art.attributes('data-flow')).toBe('none');
    expect(art.findAll('.journey-art__bead')).toHaveLength(0);
  });

  it('turns green when done and amber, with a shivering drop, when a step stopped', async () => {
    const art = await mountArt({ stage: 'send' });
    expect(art.classes()).toContain('journey-art--normal');
    expect(art.attributes('data-mood')).toBe('normal');
    await art.setProps({ failed: true });
    expect(art.attributes('data-mood')).toBe('problem');
    expect(art.classes()).toContain('journey-art--problem');
    expect(art.findAll('.journey-art__drop.is-trouble').map((drop) => drop.attributes('data-coin'))).toEqual([
      'ETH-SORA',
    ]);
    expect(art.findAll('.journey-art__bead')).toHaveLength(0);
    await art.setProps({ stage: 'done', failed: false });
    expect(art.attributes('data-mood')).toBe('success');
    expect(art.findAll('.journey-art__drop.is-trouble')).toHaveLength(0);
  });

  it('spreads the drops over the measured width when the art is resized', async () => {
    const art = await mountArt({ stage: 'pay' });
    const xor = () => parseFloat(dropOf(art, 'XOR').element.style.getPropertyValue('--x'));
    // 600 × 150 is four half-heights wide: the XOR coin sits 2.4 of them from the middle, at 80 %.
    expect(xor()).toBeCloseTo(80, 5);
    // A very wide art keeps the coins together (they stop spreading at 3), a very narrow one keeps them apart.
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get');
    width.mockReturnValue(900);
    resized?.([], {} as ResizeObserver);
    await nextTick();
    expect(xor()).toBeCloseTo(75, 5);
    width.mockReturnValue(225);
    resized?.([], {} as ResizeObserver);
    await nextTick();
    expect(xor()).toBeCloseTo(85, 5);
  });

  it('throws confetti, and flips the XOR coin, when the purchase finishes', async () => {
    const art = await mountArt({ stage: 'swap' });
    expect(art.classes()).not.toContain('is-celebrating');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await art.setProps({ stage: 'done' });
    expect(art.classes()).toContain('is-celebrating');
    expect(art.findComponent({ name: 'RewardsBurst' }).props('active')).toBe(true);
    vi.advanceTimersByTime(3300);
    await nextTick();
    expect(art.classes()).not.toContain('is-celebrating');
    expect(art.findComponent({ name: 'RewardsBurst' }).props('active')).toBe(false);
  });

  it('does not celebrate a purchase that was already finished when the page opened', async () => {
    const art = await mountArt({ stage: 'done' });
    expect(art.classes()).not.toContain('is-celebrating');
    expect(art.attributes('data-mood')).toBe('success');
  });

  it('does not celebrate again when something else about a finished purchase changes', async () => {
    const art = await mountArt({ stage: 'done' });
    // A failure flag means nothing for a finished purchase, but the props do change.
    await art.setProps({ failed: true });
    await art.setProps({ failed: false });
    expect(art.classes()).not.toContain('is-celebrating');
    expect(art.attributes('data-mood')).toBe('success');
  });
});

describe('Buy XOR journey art with WebGL', () => {
  it('waits for the first paint, then draws ray-traced water with the printed coins', async () => {
    const art = await mountArt({ stage: 'send' }, false);
    expect(art.attributes('data-renderer')).toBe('pending');
    expect(art.find('.journey-art__drop').exists()).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    await start(art);
    expect(mocks.create).toHaveBeenCalledWith(art.find('canvas').element, expect.any(Function));
    // ETH, ETH on SORA and XOR are printed in route order.
    const logos = mocks.atlas.mock.calls[0][0] as Array<{ shapes: unknown[] } | null>;
    expect(logos).toHaveLength(3);
    logos.forEach((logo) => expect(logo?.shapes.length).toBeGreaterThan(0));
    expect(renderer.setCoins).toHaveBeenCalledWith(atlas);
    expect(renderer.setPalette).toHaveBeenCalledWith({
      surface: expect.any(String),
      pink: expect.stringMatching(/^rgb\(/),
      violet: expect.stringMatching(/^rgb\(/),
    });
    // 600 × 150: a banner four times as wide as it is high, in a scene whose half height is 1.
    expect(renderer.resize).toHaveBeenCalledWith(600, 150, expect.any(Number));
    expect(renderer.setView).toHaveBeenCalledWith(4, 1);
    expect(simulation.setAspect).toHaveBeenCalledWith(4);
    // The bubbles grow into the stage from seeds.
    expect(simulation.setTargets).toHaveBeenCalledWith(buyXorJourneyTargets('send'));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(art.attributes('data-renderer')).toBe('webgl');
    expect(art.find('canvas').classes()).toContain('is-live');
    expect(art.find('.journey-art__drop').exists()).toBe(false);
    expect(frames.size).toBe(1);
  });

  it('animates at thirty frames a second, stepping by real elapsed time', async () => {
    await mountArt();
    await frameAt(1000);
    expect(simulation.step).toHaveBeenLastCalledWith(0);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    await frameAt(1010);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    await frameAt(1040);
    expect(simulation.step).toHaveBeenLastCalledWith(0.04);
    expect(renderer.draw).toHaveBeenCalledTimes(3);
    expect(frames.size).toBe(1);
  });

  it('moves the bubbles to the new stage, and the step that starts pops up', async () => {
    const art = await mountArt({ stage: 'receive' });
    simulation.setTargets.mockClear();
    await art.setProps({ stage: 'send' });
    expect(simulation.setTargets).toHaveBeenCalledExactlyOnceWith(buyXorJourneyTargets('send'));
    expect(simulation.kick).toHaveBeenCalledExactlyOnceWith(1, 0, 1, 2.2);
    expect(art.attributes('data-stage')).toBe('send');
    // A stopped step does not pop; it shivers.
    simulation.kick.mockClear();
    await art.setProps({ failed: true });
    expect(simulation.setTargets).toHaveBeenLastCalledWith(buyXorJourneyTargets('send', true));
    expect(simulation.kick).not.toHaveBeenCalled();
    expect(art.attributes('data-mood')).toBe('problem');
  });

  it('flips the XOR coin and throws droplets when the purchase finishes', async () => {
    const art = await mountArt({ stage: 'swap' });
    simulation.kick.mockClear();
    await art.setProps({ stage: 'done' });
    expect(simulation.celebrate).toHaveBeenCalledExactlyOnceWith(2);
    expect(simulation.kick).not.toHaveBeenCalled();
    expect(art.classes()).toContain('is-celebrating');
  });

  it('wakes the animation when the stage changes after it went still', async () => {
    const art = await mountArt({ stage: 'send' });
    await frameAt(1000 + 121_000);
    expect(frames.size).toBe(0);
    now = 1000 + 121_500;
    await art.setProps({ stage: 'arrive' });
    expect(frames.size).toBe(1);
  });

  it('turns the lights toward green when done, and back to pink for a new purchase', async () => {
    const art = await mountArt({ stage: 'swap' }, false);
    const colour = (name: string, value: string) =>
      ((art.get(`.journey-art__probe--${name}`).element as HTMLElement).style.color = value);
    colour('pink', 'rgb(248, 8, 123)');
    colour('violet', 'rgb(160, 90, 210)');
    colour('success', 'rgb(40, 160, 120)');
    colour('problem', 'rgb(235, 163, 50)');
    await start(art);
    const last = () => renderer.setPalette.mock.calls.at(-1)![0] as { pink: string; violet: string };
    expect(last().pink).toBe('rgb(248, 8, 123)');
    await art.setProps({ stage: 'done' });
    // Ease over a few seconds of frames.
    for (let time = 1000; time <= 1000 + 4000; time += 100) await frameAt(time);
    expect(last().pink).toBe('rgb(40, 160, 120)');
    expect(last().violet).not.toBe('rgb(160, 90, 210)');
    await art.setProps({ stage: 'pay' });
    for (let time = 5000; time <= 5000 + 4000; time += 100) await frameAt(time);
    expect(last().pink).toBe('rgb(248, 8, 123)');
    await art.setProps({ stage: 'send', failed: true });
    for (let time = 9000; time <= 9000 + 4000; time += 100) await frameAt(time);
    expect(last().pink).toBe('rgb(235, 163, 50)');
  });

  it('goes still after two minutes without input and wakes on interaction', async () => {
    await mountArt();
    await frameAt(1000 + 121_000);
    expect(frames.size).toBe(0);
    const draws = renderer.draw.mock.calls.length;
    document.dispatchEvent(new Event('keydown'));
    expect(frames.size).toBe(1);
    await frameAt(1000 + 121_100);
    expect(renderer.draw).toHaveBeenCalledTimes(draws + 1);
  });

  it('draws one still frame for reduced motion, at the final sizes, and animates if the preference changes', async () => {
    motion.matches = true;
    const art = await mountArt({ stage: 'arrive' });
    expect(simulation.setTargets).toHaveBeenCalledWith(buyXorJourneyTargets('arrive'), { snap: true });
    expect(simulation.settle).toHaveBeenCalledTimes(1);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    // A new stage jumps there instead of easing, and draws again.
    await art.setProps({ stage: 'swap' });
    expect(simulation.setTargets).toHaveBeenLastCalledWith(buyXorJourneyTargets('swap'), { snap: true });
    expect(simulation.kick).not.toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(0);
    motion.matches = false;
    motionChange?.();
    expect(frames.size).toBe(1);
  });

  it.each([
    ['data saving is on', { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: true } }],
    ['the device has two cores', { hardwareConcurrency: 2, deviceMemory: 8, connection: { saveData: false } }],
    ['the device has little memory', { hardwareConcurrency: 8, deviceMemory: 2, connection: { saveData: false } }],
  ])('stays still when %s', async (_label, device) => {
    vi.stubGlobal('navigator', device);
    await mountArt();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('goes still for good when frames keep arriving too slowly, whatever the motion preference', async () => {
    const art = await mountArt({ stage: 'send' });
    let time = 1000;
    // Frames 250 ms apart: the first only starts the clock, the next twelve are slow.
    for (let frame = 0; frame < 13; frame++) await frameAt((time += 250));
    expect(frames.size).toBe(0);
    expect(simulation.settle).toHaveBeenCalledTimes(1);
    expect(simulation.setTargets).toHaveBeenLastCalledWith(buyXorJourneyTargets('send'), { snap: true });
    expect(art.attributes('data-renderer')).toBe('webgl');
    const draws = renderer.draw.mock.calls.length;
    // A new step is shown as a still frame, and a change of motion preference does not bring the animation back.
    await art.setProps({ stage: 'arrive' });
    expect(simulation.setTargets).toHaveBeenLastCalledWith(buyXorJourneyTargets('arrive'), { snap: true });
    expect(renderer.draw).toHaveBeenCalledTimes(draws + 1);
    motionChange?.();
    document.dispatchEvent(new Event('keydown'));
    expect(frames.size).toBe(0);
  });

  it('does not mistake a pause for slow frames', async () => {
    await mountArt();
    let time = 1000;
    for (let frame = 0; frame < 8; frame++) await frameAt((time += 250));
    // A hidden tab stops the loop; coming back starts the count again.
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    for (let frame = 0; frame < 8; frame++) await frameAt((time += 250));
    expect(frames.size).toBe(1);
    // Healthy frames reset the count, too.
    for (let frame = 0; frame < 20; frame++) await frameAt((time += 33));
    for (let frame = 0; frame < 8; frame++) await frameAt((time += 250));
    expect(frames.size).toBe(1);
  });

  it('pauses while off-screen or in a hidden tab', async () => {
    await mountArt();
    intersection?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(frames.size).toBe(0);
    intersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(frames.size).toBe(1);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
  });

  it('draws the current step when the tab or the art comes back after a long time away', async () => {
    const art = await mountArt({ stage: 'receive' });
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    // The step moves on while nobody is looking, and minutes pass.
    now += 10 * 60_000;
    await art.setProps({ stage: 'send' });
    expect(frames.size).toBe(0);
    now += 10 * 60_000;
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
    await frameAt(now + 40);
    expect(simulation.step).toHaveBeenLastCalledWith(0);
    // Scrolled off-screen for a long time, then back into view.
    intersection?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(frames.size).toBe(0);
    now += 30 * 60_000;
    intersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(frames.size).toBe(1);
    expect(art.attributes('data-stage')).toBe('send');
  });

  it('redraws a still frame when resized or re-themed while the loop is stopped', async () => {
    motion.matches = true;
    const art = await mountArt();
    renderer.draw.mockClear();
    renderer.setView.mockClear();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    resized?.([], {} as ResizeObserver);
    expect(renderer.setView).toHaveBeenCalledWith(2, 1);
    expect(simulation.setAspect).toHaveBeenLastCalledWith(2);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    const palettes = renderer.setPalette.mock.calls.length;
    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(renderer.setPalette.mock.calls.length).toBeGreaterThan(palettes);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    document.documentElement.removeAttribute('data-theme');
    expect(art.attributes('data-renderer')).toBe('webgl');
  });

  it.each([
    ['the renderer cannot start', () => mocks.create.mockReturnValueOnce(null)],
    ['the first frame fails', () => renderer.draw.mockReturnValueOnce(false)],
  ])('falls back to CSS drops when %s', async (_label, arrange) => {
    arrange();
    const art = await mountArt();
    expect(art.attributes('data-renderer')).toBe('static');
    expect(art.findAll('.journey-art__drop')).toHaveLength(3);
    expect(frames.size).toBe(0);
  });

  it.each([
    [
      'the simulation cannot be made',
      () =>
        mocks.simulation.mockImplementationOnce(() => {
          throw new Error('physics');
        }),
    ],
    [
      'the coin atlas cannot be built',
      () =>
        mocks.atlas.mockImplementationOnce(() => {
          throw new Error('atlas');
        }),
    ],
    [
      'the renderer rejects the coins',
      () =>
        renderer.setCoins.mockImplementationOnce(() => {
          throw new Error('texture');
        }),
    ],
  ])('falls back to CSS drops, and frees the GPU, when %s', async (_label, arrange) => {
    arrange();
    const art = await mountArt({ stage: 'send' });
    expect(art.attributes('data-renderer')).toBe('static');
    expect(art.findAll('.journey-art__drop')).toHaveLength(3);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(art.find('canvas').classes()).not.toContain('is-live');
  });

  it('falls back when the GPU context is lost mid-session, and stops touching the simulation', async () => {
    const art = await mountArt({ stage: 'receive' });
    const [, lost] = mocks.create.mock.calls[0] as [HTMLCanvasElement, () => void];
    lost();
    await nextTick();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(art.attributes('data-renderer')).toBe('static');
    expect(frames.size).toBe(0);
    simulation.setTargets.mockClear();
    await art.setProps({ stage: 'send' });
    expect(simulation.setTargets).not.toHaveBeenCalled();
    expect(art.findAll('.journey-art__drop.is-focus').map((drop) => drop.attributes('data-coin'))).toEqual([
      'ETH-SORA',
    ]);
  });

  it('pushes bubbles under a moving pointer, in the coordinates of the art', async () => {
    const art = await mountArt();
    const canvas = art.find('canvas').element;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 20,
      width: 400,
      height: 100,
    } as DOMRect);
    pointer(canvas, 300, 70, 100);
    expect(simulation.poke).not.toHaveBeenCalled();
    pointer(canvas, 340, 70, 120);
    const [x, y, vx, vy] = simulation.poke.mock.calls[0];
    // 400 × 100: four half-heights across, so the right-hand edge is x = 4 and the middle is 0.
    expect(x).toBeCloseTo(0.8, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(vx).toBeCloseTo(0.8 / 0.02, 6);
    expect(vy).toBeCloseTo(0, 6);
    pointer(canvas, 300, 20, 140);
    expect(simulation.poke.mock.calls.at(-1)![1]).toBeCloseTo(1, 6);
    canvas.dispatchEvent(new Event('pointerleave'));
    pointer(canvas, 10, 10, 160);
    expect(simulation.poke).toHaveBeenCalledTimes(2);
  });

  it('pushes the bubble under a tap', async () => {
    const art = await mountArt();
    const canvas = art.find('canvas').element;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 100 } as DOMRect);
    const event = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(event, { clientX: { value: 300 }, clientY: { value: 50 } });
    canvas.dispatchEvent(event);
    expect(simulation.poke).toHaveBeenCalledWith(2, 0, 0.8, -2.4);
  });

  it('ignores the pointer when the motion is off, or the canvas has no size', async () => {
    motion.matches = true;
    const art = await mountArt();
    const canvas = art.find('canvas').element;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 100 } as DOMRect);
    pointer(canvas, 100, 50, 100);
    pointer(canvas, 200, 50, 120);
    canvas.dispatchEvent(new Event('pointerdown'));
    expect(simulation.poke).not.toHaveBeenCalled();
    motion.matches = false;
    motionChange?.();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    pointer(canvas, 100, 50, 140);
    pointer(canvas, 200, 50, 160);
    expect(simulation.poke).not.toHaveBeenCalled();
  });

  it('cancels a pending start when unmounted early', async () => {
    const art = await mountArt({}, false);
    art.unmount();
    wrapper = undefined;
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
    idle?.();
    await flushPromises();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('does not start the water if it is unmounted while the code loads', async () => {
    const art = await mountArt({}, false);
    idle?.();
    art.unmount();
    wrapper = undefined;
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('releases the GPU, observers, listeners and timers on unmount', async () => {
    const removed = vi.spyOn(document, 'removeEventListener');
    const art = await mountArt({ stage: 'swap' });
    await art.setProps({ stage: 'done' });
    art.unmount();
    wrapper = undefined;
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    disconnects.forEach((disconnect) => expect(disconnect).toHaveBeenCalled());
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    const types = removed.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(['pointermove', 'keydown', 'visibilitychange']));
  });
});
