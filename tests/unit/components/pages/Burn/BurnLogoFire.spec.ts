import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BurnLogoFire from '@/features/misc/components/burn/BurnLogoFire.vue';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/features/misc/lib/burnLogoFire', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/misc/lib/burnLogoFire')>()),
  createBurnFireRenderer: mocks.create,
}));

type ImageStub = { complete: boolean; naturalWidth: number; src: string; onload: (() => void) | null };
let wrapper: VueWrapper | undefined;
let images: ImageStub[];
let frames: Map<number, FrameRequestCallback>;
let sequence: number;
let motion: {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let motionChange: (() => void) | undefined;
let intersection: IntersectionObserverCallback | undefined;
let observer: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
let renderer: { draw: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> };
let hidden: boolean;
let request: ReturnType<typeof vi.fn>;
let cancel: ReturnType<typeof vi.fn>;

/** Advances the fake browser's currently queued frames, never a recursive animation loop. */
async function frameAt(time: number): Promise<void> {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
  await nextTick();
}

/** Completes a local mocked SVG load without loading any actual URL. */
async function loadLogo(): Promise<void> {
  images[0].complete = true;
  images[0].naturalWidth = 128;
  images[0].onload?.();
  await nextTick();
}

async function setVisibility(visible: boolean): Promise<void> {
  intersection?.(
    [{ isIntersecting: visible } as IntersectionObserverEntry],
    observer as unknown as IntersectionObserver
  );
  await nextTick();
}

beforeEach(() => {
  images = [];
  frames = new Map();
  sequence = 0;
  hidden = false;
  motionChange = undefined;
  intersection = undefined;
  renderer = { draw: vi.fn(() => true), dispose: vi.fn() };
  mocks.create.mockReset().mockReturnValue(renderer);
  motion = {
    matches: false,
    addEventListener: vi.fn((_event: string, callback: () => void) => {
      motionChange = callback;
    }),
    removeEventListener: vi.fn(),
  };
  observer = { observe: vi.fn(), disconnect: vi.fn() };
  request = vi.fn((callback: FrameRequestCallback) => {
    const id = ++sequence;
    frames.set(id, callback);
    return id;
  });
  cancel = vi.fn((id: number) => {
    frames.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motion)
  );
  vi.stubGlobal('navigator', { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: false } });
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal(
    'Image',
    class {
      complete = false;
      naturalWidth = 0;
      src = '';
      onload: (() => void) | null = null;
      constructor() {
        images.push(this);
      }
    }
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe = observer.observe;
      disconnect = observer.disconnect;
    }
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('decorative burn logo fire', () => {
  it.each(['tonswap', 'sora'] as const)(
    'keeps an accessible %s SVG visible until a successful frame',
    async (variant) => {
      wrapper = mount(BurnLogoFire, { props: { variant } });
      expect(wrapper.attributes('data-renderer')).toBe('static');
      expect(wrapper.get('img').attributes('alt')).toBe(variant === 'tonswap' ? 'Tonswap' : 'SORA');
      expect(wrapper.get('canvas').attributes('aria-hidden')).toBe('true');
      expect(wrapper.get('img').classes()).not.toContain('is-animated');
      expect(mocks.create).not.toHaveBeenCalled();
      await loadLogo();
      expect(mocks.create).toHaveBeenCalledWith(wrapper.get('canvas').element, images[0], variant);
      expect(wrapper.attributes('data-renderer')).toBe('static');
      await frameAt(40);
      expect(wrapper.attributes('data-renderer')).toBe('webgl');
      expect(wrapper.get('canvas').classes()).toContain('is-active');
    }
  );

  it('never creates GPU resources when reduced motion is requested', async () => {
    motion.matches = true;
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    expect(mocks.create).not.toHaveBeenCalled();
    await loadLogo();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(wrapper.attributes('data-renderer')).toBe('static');
  });

  it.each([
    { hardwareConcurrency: 8, deviceMemory: 8, connection: { saveData: true } },
    { hardwareConcurrency: 2, deviceMemory: 8 },
    { hardwareConcurrency: 8, deviceMemory: 2 },
  ])('retains the static logo for constrained capabilities %j', async (device) => {
    vi.stubGlobal('navigator', device);
    wrapper = mount(BurnLogoFire, { props: { variant: 'sora' } });
    await loadLogo();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(wrapper.attributes('data-renderer')).toBe('static');
  });

  it('switches immediately to static when reduced motion is enabled and can resume when disabled', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await loadLogo();
    await frameAt(40);
    motion.matches = true;
    motionChange?.();
    await nextTick();
    expect(wrapper.attributes('data-renderer')).toBe('static');
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    motion.matches = false;
    motionChange?.();
    await frameAt(80);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(wrapper.attributes('data-renderer')).toBe('webgl');
  });

  it('pauses offscreen without recreating the renderer and resumes on intersection', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await setVisibility(false);
    await loadLogo();
    expect(mocks.create).not.toHaveBeenCalled();
    await setVisibility(true);
    await frameAt(40);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    await setVisibility(false);
    await frameAt(80);
    expect(frames.size).toBe(0);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).not.toHaveBeenCalled();
    await setVisibility(true);
    await frameAt(120);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('pauses hidden documents and resumes only when the document becomes visible', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'sora' } });
    await loadLogo();
    await frameAt(40);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await frameAt(80);
    expect(frames.size).toBe(0);
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await frameAt(120);
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('bounds drawing to 30fps even when the display schedules faster frames', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await loadLogo();
    for (const time of [16, 32, 48, 64, 80, 96]) await frameAt(time);
    expect(renderer.draw.mock.calls).toEqual([[0.048], [0.096]]);
  });

  it('falls back permanently when WebGL creation is unavailable', async () => {
    mocks.create.mockReturnValue(null);
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await loadLogo();
    document.dispatchEvent(new Event('visibilitychange'));
    await setVisibility(false);
    await setVisibility(true);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(wrapper.attributes('data-renderer')).toBe('static');
  });

  it('restores the static logo and stops drawing when a frame cannot be rendered', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await loadLogo();
    await frameAt(40);
    renderer.draw.mockReturnValueOnce(false);
    await frameAt(80);
    expect(wrapper.attributes('data-renderer')).toBe('static');
    expect(wrapper.get('img').classes()).not.toContain('is-animated');
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('handles context loss without retrying a failed GPU context', async () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'sora' } });
    await loadLogo();
    await frameAt(40);
    const loss = new Event('webglcontextlost', { cancelable: true });
    wrapper.get('canvas').element.dispatchEvent(loss);
    await nextTick();
    expect(loss.defaultPrevented).toBe(true);
    expect(wrapper.attributes('data-renderer')).toBe('static');
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    document.dispatchEvent(new Event('visibilitychange'));
    await setVisibility(true);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('cleans observers, listeners, queued frames, GPU allocations and image callbacks on unmount', async () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    wrapper = mount(BurnLogoFire, { props: { variant: 'tonswap' } });
    await loadLogo();
    await frameAt(40);
    expect(frames.size).toBe(1);
    wrapper.unmount();
    wrapper = undefined;
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', motionChange);
    expect(remove).toHaveBeenCalledWith('visibilitychange', motionChange);
    expect(images[0].onload).toBeNull();
    expect(frames.size).toBe(0);
    await frameAt(80);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
  });

  it('does not allocate a GPU if the component unmounts before the logo loads', () => {
    wrapper = mount(BurnLogoFire, { props: { variant: 'sora' } });
    const lateLoad = images[0].onload;
    wrapper.unmount();
    wrapper = undefined;
    images[0].complete = true;
    images[0].naturalWidth = 128;
    lateLoad?.();
    expect(images[0].onload).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
});
