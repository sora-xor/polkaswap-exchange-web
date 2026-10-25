import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';

import { useSubscriptions } from '@/composables/useSubscriptions';

const login = ref(true);
const connection = ref(true);
const address = ref('addr-1');
const accountSource = ref('polkadot-js');

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
    get address() {
      return address.value;
    },
    get accountSource() {
      return accountSource.value;
    },
  }),
}));

describe('useSubscriptions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    login.value = true;
    connection.value = true;
    address.value = 'addr-1';
    accountSource.value = 'polkadot-js';
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const createHarness = async (options?: Parameters<typeof useSubscriptions>[0]) => {
    let subscriptions!: ReturnType<typeof useSubscriptions>;
    const TestComponent = defineComponent({
      name: 'SubscriptionsHarness',
      setup() {
        subscriptions = useSubscriptions({
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

    return { wrapper, router, subscriptions };
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
    await flushPromises();

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
    await flushPromises();

    expect(resetSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('refreshes subscriptions when the connected account changes', async () => {
    const startSpy = vi.fn().mockResolvedValue(undefined);
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });

    await nextTick();
    await Promise.resolve();

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).toHaveBeenCalledTimes(0);

    address.value = 'addr-2';
    await nextTick();
    await flushPromises();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('refreshes a new account without waiting for the old account startup', async () => {
    let resolveInitialStart!: () => void;
    const initialStart = new Promise<void>((resolve) => {
      resolveInitialStart = resolve;
    });
    const startedAddresses: string[] = [];
    const startSpy = vi.fn(async () => {
      startedAddresses.push(address.value);
      if (startSpy.mock.calls.length === 1) await initialStart;
    });
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper, subscriptions } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });

    await flushPromises();
    expect(startSpy).toHaveBeenCalledTimes(1);

    address.value = 'addr-2';
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(subscriptions.subscriptionsDataLoading.value).toBe(true);
    await flushPromises();

    expect(startSpy).toHaveBeenCalledTimes(2);
    expect(startedAddresses).toEqual(['addr-1', 'addr-2']);
    expect(subscriptions.subscriptionsDataLoading.value).toBe(false);

    resolveInitialStart();
    await flushPromises();
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('tears down immediately when unmounting during a pending startup', async () => {
    let resolveStart!: () => void;
    const startSpy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        })
    );
    const resetSpy = vi.fn().mockResolvedValue(undefined);
    const { wrapper } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });

    await nextTick();
    expect(startSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(resetSpy).toHaveBeenCalledTimes(1);

    resolveStart();
    await flushPromises();

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('skips obsolete starts during rapid account switches and logout', async () => {
    const startedAddresses: string[] = [];
    const startSpy = vi.fn(async () => {
      startedAddresses.push(address.value);
    });
    const resetSpy = vi.fn().mockResolvedValue(undefined);
    const { wrapper, subscriptions } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
    });
    await flushPromises();

    address.value = 'addr-2';
    expect(subscriptions.subscriptionsDataLoading.value).toBe(true);
    address.value = 'addr-3';
    await flushPromises();
    expect(startedAddresses).toEqual(['addr-1', 'addr-3']);
    expect(subscriptions.subscriptionsDataLoading.value).toBe(false);

    address.value = 'addr-4';
    login.value = false;
    await flushPromises();
    expect(startedAddresses).toEqual(['addr-1', 'addr-3']);
    wrapper.unmount();
  });

  it('skips account refresh watcher when account tracking is disabled', async () => {
    const startSpy = vi.fn().mockResolvedValue(undefined);
    const resetSpy = vi.fn().mockResolvedValue(undefined);

    const { wrapper } = await createHarness({
      startSubscriptions: [startSpy],
      resetSubscriptions: [resetSpy],
      trackAccount: false,
    });

    await nextTick();
    await Promise.resolve();

    address.value = 'addr-2';
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();

    expect(resetSpy).toHaveBeenCalledTimes(0);
    expect(startSpy).toHaveBeenCalledTimes(1);

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
