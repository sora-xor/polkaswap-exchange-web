import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { useCountUp } from '@/features/bot-trading/useCountUp';

function harness(target = ref(0), initial = 0) {
  let shown!: ReturnType<typeof useCountUp>;
  const wrapper = mount(
    defineComponent({
      setup() {
        shown = useCountUp(target, 1000, initial);
        return () => h('span');
      },
    })
  );
  return { wrapper, target, shown: () => shown.value };
}

function motion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }));
}

afterEach(() => vi.unstubAllGlobals());

describe('useCountUp', () => {
  it('shows the exact target immediately for reduced-motion users', async () => {
    motion(true);
    const { target, shown } = harness(ref(42.5));
    expect(shown()).toBe(42.5);
    target.value = 7;
    await nextTick();
    expect(shown()).toBe(7);
  });

  it('eases from its starting value and settles exactly on the target', async () => {
    motion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const start = performance.now();
    const { shown } = harness(ref(100), -50);
    expect(shown()).toBe(-50);
    frames.shift()!(start + 500);
    const midway = shown();
    // Ease-out: well past the linear midpoint (25) after half the duration, but not finished.
    expect(midway).toBeGreaterThan(25);
    expect(midway).toBeLessThan(100);
    while (frames.length) frames.shift()!(start + 2_000);
    expect(shown()).toBe(100);
  });

  it('cancels a pending frame when the component unmounts', () => {
    motion(false);
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 7);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const { wrapper } = harness(ref(10));
    wrapper.unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });
});
