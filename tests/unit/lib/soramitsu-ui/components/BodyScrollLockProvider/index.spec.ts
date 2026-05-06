import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  BODY_SCROLL_LOCK_API_KEY,
  SBodyScrollLockProvider,
  useBodyScrollLockIfPossible,
} from '@/lib/soramitsu-ui/components/BodyScrollLockProvider';

describe('BodyScrollLockProvider', () => {
  it('provides the lock api through the provider component and unlocks when the target changes', async () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    const element = document.createElement('div');
    let setTarget: ((value: HTMLElement | null) => void) | undefined;

    const Child = defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null);
        useBodyScrollLockIfPossible(target);
        setTarget = (value) => {
          target.value = value;
        };

        return () => h('div');
      },
    });

    const Wrapped = defineComponent({
      setup() {
        return () =>
          h(
            SBodyScrollLockProvider,
            { api: { lock, unlock } },
            {
              default: () => h(Child),
            }
          );
      },
    });

    const app = createApp(Wrapped);
    app.mount(document.createElement('div'));

    setTarget?.(element);
    await nextTick();
    expect(lock).toHaveBeenCalledWith(element);

    setTarget?.(null);
    await nextTick();
    expect(unlock).toHaveBeenCalledWith(element);

    app.unmount();
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the scroll lock api is absent', () => {
    const Harness = defineComponent({
      setup() {
        useBodyScrollLockIfPossible(ref(null));
        return () => h('div');
      },
    });

    const app = createApp(Harness);
    expect(() => app.mount(document.createElement('div'))).not.toThrow();
    app.unmount();
  });

  it('can still inject the api through the raw key for non-component providers', async () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    const element = document.createElement('div');
    let setTarget: ((value: HTMLElement | null) => void) | undefined;

    const Harness = defineComponent({
      setup() {
        const target = ref<HTMLElement | null>(null);
        useBodyScrollLockIfPossible(target);
        setTarget = (value) => {
          target.value = value;
        };
        return () => h('div');
      },
    });

    const app = createApp(Harness);
    app.provide(BODY_SCROLL_LOCK_API_KEY, { lock, unlock });
    app.mount(document.createElement('div'));

    setTarget?.(element);
    await nextTick();
    expect(lock).toHaveBeenCalledWith(element);

    app.unmount();
    expect(unlock).toHaveBeenCalledWith(element);
  });
});
