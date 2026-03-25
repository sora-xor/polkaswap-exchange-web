import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';

import { useSubscriptions } from '@/composables/useSubscriptions';

const login = ref(true);
const connection = ref(true);

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get nodeIsConnected() {
      return connection.value;
    },
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get isLoggedIn() {
      return login.value;
    },
  }),
}));

describe('useSubscriptions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    login.value = true;
    connection.value = true;
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const createHarness = async (options?: Parameters<typeof useSubscriptions>[0]) => {
    const TestComponent = defineComponent({
      name: 'SubscriptionsHarness',
      setup() {
        useSubscriptions({
          connectionSource: computed(() => connection.value),
          ...options,
        });
        return () => null;
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: TestComponent }],
    });

    await router.push('/');
    await router.isReady();

    const Root = defineComponent({
      name: 'RootHarness',
      setup: () => () => h('div', [h(RouterView)]),
    });

    const wrapper = mount(Root, {
      global: {
        plugins: [router],
      },
    });

    return { wrapper, router };
  };

  it('starts subscriptions on mount', async () => {
    const startSpy = vi.fn().mockResolvedValue(undefined);
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });

    await nextTick();
    await Promise.resolve();

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('resets subscriptions when login toggles to false', async () => {
    const startSpy = vi.fn().mockResolvedValue(undefined);
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });

    await nextTick();
    expect(startSpy).toHaveBeenCalledTimes(1);

    login.value = false;
    await nextTick();
    await Promise.resolve();

    expect(resetSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('resets subscriptions when node connection is lost', async () => {
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      resetSubscriptions: [resetSpy],
    });

    connection.value = false;
    await nextTick();
    await Promise.resolve();

    expect(resetSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('skips login watcher when tracking disabled', async () => {
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      resetSubscriptions: [resetSpy],
      trackLogin: false,
    });

    login.value = false;
    await nextTick();
    await Promise.resolve();

    expect(resetSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('runs reset callbacks on route leave', async () => {
    const startSpy = vi.fn().mockResolvedValue(undefined);
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const TestView = {
      setup() {
        useSubscriptions({
          startSubscriptions: [startSpy],
          resetSubscriptions: [resetSpy],
        });
        return () => null;
      },
    };

    const NextView = defineComponent({
      name: 'NextView',
      setup: () => () => null,
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: TestView },
        { path: '/next', component: NextView },
      ],
    });

    await router.push('/');
    await router.isReady();

    const Root = defineComponent({
      name: 'RootHarness',
      setup: () => () => h('div', [h(RouterView)]),
    });

    const wrapper = mount(Root, {
      global: {
        plugins: [router],
      },
    });

    await nextTick();
    expect(startSpy).toHaveBeenCalledTimes(1);

    await router.push('/next');
    await nextTick();

    expect(resetSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});
