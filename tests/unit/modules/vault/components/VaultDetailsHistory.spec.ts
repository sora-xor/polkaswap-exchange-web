import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VaultEventTypes } from '@/modules/vault/consts';

import type { VaultEvent } from '@/modules/vault/types';

const fetchVaultEventsMock = vi.hoisted(() => vi.fn());

vi.mock('@/indexer/queries/vault/events', () => ({
  fetchVaultEvents: fetchVaultEventsMock,
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: { value: false },
    withLoading: async <T>(handler: () => Promise<T> | T): Promise<T> => await handler(),
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    formatDate: (timestamp: number) => String(timestamp),
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    shouldBalanceBeHidden: false,
  }),
}));

import VaultDetailsHistory from '@/modules/vault/components/VaultDetailsHistory.vue';

const UPDATE_INTERVAL = 24_000;
const EVENT_TIMESTAMP = 1_700_000_000_000;

const HistoryPaginationStub = defineComponent({
  name: 'HistoryPagination',
  props: {
    total: { type: Number, default: 0 },
  },
  template: '<div class="history-pagination-stub" :data-total="total"></div>',
});

const createEvent = (id: string): VaultEvent => ({
  id,
  amount: null,
  timestamp: EVENT_TIMESTAMP,
  type: VaultEventTypes.Created,
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const mountComponent = (id = 42) =>
  mount(VaultDetailsHistory, {
    props: { id },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        HistoryPagination: HistoryPaginationStub,
        's-card': { template: '<section><slot name="header" /><slot /></section>' },
      },
    },
  });

describe('VaultDetailsHistory.vue polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not overlap polling requests that take longer than the interval', async () => {
    const initialEvent = createEvent('initial');
    const slowPoll = createDeferred<{ items: VaultEvent[]; totalCount: number }>();
    fetchVaultEventsMock
      .mockResolvedValue({ items: [initialEvent], totalCount: 1 })
      .mockResolvedValueOnce({ items: [initialEvent], totalCount: 1 })
      .mockImplementationOnce(() => slowPoll.promise);
    const wrapper = mountComponent();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL);
    expect(fetchVaultEventsMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL * 3);
    expect(fetchVaultEventsMock).toHaveBeenCalledTimes(2);

    slowPoll.resolve({ items: [initialEvent], totalCount: 1 });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL);

    expect(fetchVaultEventsMock).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('refreshes same-second events without duplicating rows or total count', async () => {
    const initialEvent = createEvent('event-1');
    const lateIndexedEvent = createEvent('event-2');
    const updatedSnapshot = { items: [lateIndexedEvent, initialEvent], totalCount: 2 };
    fetchVaultEventsMock
      .mockResolvedValue(updatedSnapshot)
      .mockResolvedValueOnce({ items: [initialEvent], totalCount: 1 });
    const wrapper = mountComponent();
    await flushPromises();

    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL);
    await flushPromises();

    expect(fetchVaultEventsMock).toHaveBeenNthCalledWith(2, { id: 42, first: 5, offset: 0 });
    expect(wrapper.findAll('.history-item')).toHaveLength(2);
    expect(wrapper.get('.history-pagination-stub').attributes('data-total')).toBe('2');

    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL);
    await flushPromises();

    expect(wrapper.findAll('.history-item')).toHaveLength(2);
    expect(wrapper.get('.history-pagination-stub').attributes('data-total')).toBe('2');
    wrapper.unmount();
  });

  it('ignores a stale page response after the vault changes', async () => {
    const staleRequest = createDeferred<{ items: VaultEvent[]; totalCount: number }>();
    fetchVaultEventsMock
      .mockImplementationOnce(() => staleRequest.promise)
      .mockResolvedValueOnce({ items: [createEvent('current')], totalCount: 1 });
    const wrapper = mountComponent(1);

    await wrapper.setProps({ id: 2 });
    await flushPromises();
    expect(wrapper.text()).toContain(String(EVENT_TIMESTAMP));

    staleRequest.resolve({ items: [createEvent('stale')], totalCount: 99 });
    await flushPromises();

    expect(wrapper.findAll('.history-item')).toHaveLength(1);
    expect(wrapper.get('.history-pagination-stub').attributes('data-total')).toBe('1');
    wrapper.unmount();
  });

  it('does not subscribe when the initial request resolves after unmount', async () => {
    const pendingRequest = createDeferred<{ items: VaultEvent[]; totalCount: number }>();
    fetchVaultEventsMock.mockImplementationOnce(() => pendingRequest.promise);
    const wrapper = mountComponent();
    expect(fetchVaultEventsMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    pendingRequest.resolve({ items: [createEvent('late')], totalCount: 1 });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL * 2);

    expect(fetchVaultEventsMock).toHaveBeenCalledTimes(1);
  });
});
