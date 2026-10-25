import { mount } from '@vue/test-utils';
import { defineComponent, h, type Component } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAsyncComponent, preloadAsyncComponents } from '@/shared/ui/async';

const Inner = defineComponent({
  name: 'PreloadedInner',
  render: () => h('span', { class: 'inner' }, 'ready'),
});

/** Shape of a real dynamic-import namespace, which Vue unwraps to its default export. */
const moduleOf = (component: Component) => ({ __esModule: true, default: component });

const renderWith = (component: Component) =>
  mount(
    defineComponent({
      render: () => h('div', [h(component)]),
    })
  );

describe('preloadAsyncComponents', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets a preloaded wrapper render its component in the first pass', async () => {
    const loader = vi.fn(async () => moduleOf(Inner));
    const Wrapper = createAsyncComponent(loader);

    await preloadAsyncComponents([Wrapper]);
    const wrapper = renderWith(Wrapper);

    // No flushPromises/nextTick: the component is there in the initial render.
    expect(wrapper.find('.inner').exists()).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('documents the default behaviour: an unresolved wrapper renders nothing at first', () => {
    const Wrapper = createAsyncComponent(async () => moduleOf(Inner));
    const wrapper = renderWith(Wrapper);

    expect(wrapper.find('.inner').exists()).toBe(false);
  });

  it('reuses the in-flight request instead of loading twice', async () => {
    const loader = vi.fn(async () => moduleOf(Inner));
    const Wrapper = createAsyncComponent(loader);

    await Promise.all([preloadAsyncComponents([Wrapper]), preloadAsyncComponents([Wrapper])]);
    renderWith(Wrapper);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('skips values that are not async component wrappers', async () => {
    await expect(preloadAsyncComponents([Inner, null, undefined, 'x', {}])).resolves.toBeUndefined();
  });

  it('ignores load failures so the wrapper can still retry on render', async () => {
    const Wrapper = createAsyncComponent(async () => {
      throw new Error('not retryable');
    });

    await expect(preloadAsyncComponents([Wrapper])).resolves.toBeUndefined();
  });

  it('stops waiting after the timeout while loading continues in the background', async () => {
    vi.useFakeTimers();
    const Wrapper = createAsyncComponent(() => new Promise<never>(() => undefined));

    let settled = false;
    const pending = preloadAsyncComponents([Wrapper], { timeoutMs: 1_000 }).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
  });

  it('returns immediately when there is nothing to preload', async () => {
    vi.useFakeTimers();
    let settled = false;
    const pending = preloadAsyncComponents([]).then(() => {
      settled = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(true);
    await pending;
  });
});
