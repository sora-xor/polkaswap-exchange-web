import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import QuantGlassArt from '@/features/bot-trading/components/quant/QuantGlassArt.vue';

const mocks = vi.hoisted(() => ({ create: vi.fn(), simulation: vi.fn(), atlas: vi.fn() }));
vi.mock('@/features/bot-trading/quant-water-renderer', () => ({ createWaterRenderer: mocks.create }));
vi.mock('@/features/bot-trading/quant-water', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/quant-water')>()),
  createWaterSimulation: mocks.simulation,
}));
vi.mock('@/features/bot-trading/quant-water-coins', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/bot-trading/quant-water-coins')>()),
  buildCoinAtlas: mocks.atlas,
}));

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
let renderer: { setPalette: Spy; setCoins: Spy; resize: Spy; draw: Spy; dispose: Spy };
let simulation: { step: Spy; setEnergy: Spy; poke: Spy; frame: Spy };
const atlas = { canvas: 'atlas', tints: [] };

/** Run the browser's currently queued frames at a time, never a recursive loop. */
async function frameAt(time: number): Promise<void> {
  now = time;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
  await nextTick();
}

/** Mount, then let the deferred renderer start as the browser would after first paint. */
async function mountArt(props: Record<string, unknown> = {}, start = true): Promise<VueWrapper> {
  wrapper = mount(QuantGlassArt, { props, attachTo: document.body });
  if (start) {
    idle?.();
    await nextTick();
  }
  return wrapper;
}

function pointer(target: Element, x: number, y: number, time: number): void {
  const event = new Event('pointermove', { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    timeStamp: { value: time },
  });
  target.dispatchEvent(event);
}

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
    draw: vi.fn(() => true),
    dispose: vi.fn(),
  };
  simulation = { step: vi.fn(), setEnergy: vi.fn(), poke: vi.fn(() => true), frame: vi.fn(() => ({ frame: true })) };
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
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('QuantGlassArt water bubbles', () => {
  it('shows CSS drops with the coin logos when WebGL is unavailable', async () => {
    vi.stubGlobal('WebGLRenderingContext', undefined);
    const art = await mountArt();
    expect(art.attributes('data-renderer')).toBe('static');
    const drops = art.findAll('.glass-art-drop');
    expect(drops).toHaveLength(3);
    drops.forEach((drop) => expect(drop.attributes('style')).toContain('data:image/svg+xml'));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('waits for the first paint, then draws ray-traced water with printed coins', async () => {
    const art = await mountArt({}, false);
    expect(art.attributes('data-renderer')).toBe('pending');
    expect(art.find('.glass-art-drop').exists()).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    idle?.();
    await nextTick();
    expect(mocks.create).toHaveBeenCalledWith(art.find('canvas').element, expect.any(Function));
    expect(renderer.setPalette).toHaveBeenCalledWith({
      surface: expect.any(String),
      pink: expect.any(String),
      violet: expect.any(String),
    });
    expect(renderer.setCoins).toHaveBeenCalledWith(atlas);
    expect(renderer.resize).toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(art.attributes('data-renderer')).toBe('webgl');
    expect(art.find('canvas').classes()).toContain('is-live');
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

  it('livens the water while research runs', async () => {
    const art = await mountArt({ active: true });
    expect(simulation.setEnergy).toHaveBeenLastCalledWith(1.8);
    await art.setProps({ active: false });
    expect(simulation.setEnergy).toHaveBeenLastCalledWith(1);
  });

  it('stops drawing in calm mode and resumes when woken', async () => {
    const art = await mountArt();
    await art.setProps({ paused: true });
    expect(frames.size).toBe(0);
    await frameAt(2000);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    await art.setProps({ paused: false });
    expect(frames.size).toBe(1);
    await frameAt(2100);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
  });

  it('goes still after a minute without input and wakes on interaction', async () => {
    await mountArt();
    await frameAt(1000 + 61_000);
    expect(frames.size).toBe(0);
    const draws = renderer.draw.mock.calls.length;
    document.dispatchEvent(new Event('keydown'));
    expect(frames.size).toBe(1);
    await frameAt(1000 + 61_100);
    expect(renderer.draw).toHaveBeenCalledTimes(draws + 1);
  });

  it('draws one still frame for reduced motion and animates if the preference changes', async () => {
    motion.matches = true;
    await mountArt();
    expect(simulation.step).toHaveBeenCalledTimes(32);
    simulation.step.mock.calls.forEach(([seconds]) => expect(seconds).toBe(0.1));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    motion.matches = false;
    motionChange?.();
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

  it('redraws a still frame when resized or re-themed while paused', async () => {
    const art = await mountArt({ paused: true });
    renderer.draw.mockClear();
    resized?.([], {} as ResizeObserver);
    expect(renderer.resize).toHaveBeenCalledTimes(2);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(renderer.setPalette).toHaveBeenCalledTimes(2);
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
    expect(art.findAll('.glass-art-drop')).toHaveLength(3);
    expect(frames.size).toBe(0);
  });

  it('falls back when the GPU context is lost mid-session', async () => {
    const art = await mountArt();
    const [, lost] = mocks.create.mock.calls[0] as [HTMLCanvasElement, () => void];
    lost();
    await nextTick();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(art.attributes('data-renderer')).toBe('static');
    expect(frames.size).toBe(0);
  });

  it('pushes bubbles under a moving pointer in backdrop coordinates', async () => {
    const art = await mountArt();
    const canvas = art.find('canvas').element;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 260,
      height: 190,
    } as DOMRect);
    pointer(canvas, 130, 95, 100);
    expect(simulation.poke).not.toHaveBeenCalled();
    pointer(canvas, 156, 95, 120);
    const [x, y, vx, vy] = simulation.poke.mock.calls[0];
    expect(x).toBeCloseTo(0.2 * (520 / 380), 6);
    expect(y).toBeCloseTo(0, 6);
    expect(vx).toBeCloseTo((0.2 * (520 / 380)) / 0.02, 6);
    expect(vy).toBeCloseTo(0, 6);
    canvas.dispatchEvent(new Event('pointerleave'));
    pointer(canvas, 10, 10, 140);
    expect(simulation.poke).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending start when unmounted early', async () => {
    const art = await mountArt({}, false);
    art.unmount();
    wrapper = undefined;
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
    idle?.();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('releases the GPU, observers and listeners on unmount', async () => {
    const removed = vi.spyOn(document, 'removeEventListener');
    const art = await mountArt();
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
