import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, watch } from 'vue';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { resetQuantLoopCache, useQuantLoop, type QuantLoopDependencies } from '@/features/bot-trading/useQuantLoop';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotAsset } from '@/features/bot-trading/types';

const BASE = '0x0200000000000000000000000000000000000000000000000000000000000000';
const TOKEN = '0x0200050000000000000000000000000000000000000000000000000000000000';
const HOUR = 3_600_000;
const START = Date.UTC(2026, 2, 1, 1);
const E18 = 10n ** 18n;
const ASSETS: BotAsset[] = [
  { address: XOR.address, symbol: 'XOR', decimals: 18 },
  { address: TOKEN, symbol: 'PSWAP', decimals: 18 },
];

/** Periodic thin-pool dislocations: a robust reversion edge the loop should find. */
function archiveText(): string {
  const prices = Array.from({ length: 1600 }, (_value, index) =>
    index % 97 >= 80 && index % 97 < 88 ? 690 : index % 97 >= 88 && index % 97 < 96 ? 1120 : 1000
  );
  const depth = 60n * E18;
  return JSON.stringify({
    version: 1,
    kind: 'sora-pool-reserves-hourly',
    genesisHash: `0x${'7e'.repeat(32)}`,
    baseAsset: BASE,
    generatedAt: START + prices.length * HOUR,
    assets: [
      { address: BASE, symbol: 'XOR' },
      { address: TOKEN, symbol: 'PSWAP' },
    ],
    rows: prices.map((milli, index) => ({
      timestamp: START + index * HOUR,
      denominator: '1',
      pools: { [TOKEN]: [depth.toString(), ((depth * 1000n) / BigInt(milli)).toString()] },
      metadata: { [BASE]: { symbol: 'XOR', decimals: 18 }, [TOKEN]: { symbol: 'PSWAP', decimals: 18 } },
    })),
  });
}

const fees = {
  networkFeeXor: '0.100020612589707326',
  swapFeePercent: '0.6',
} as ResearchFeeSnapshot;

function harness(deps: Partial<QuantLoopDependencies>) {
  const statuses: string[] = [];
  let api!: ReturnType<typeof useQuantLoop>;
  const component = defineComponent({
    setup() {
      api = useQuantLoop(ref(ASSETS), {
        fetchArchive: async () => archiveText(),
        loadFees: vi.fn(async () => fees),
        loadHistory: vi.fn(async () => {
          throw new Error('bots.errors.history');
        }),
        workerFactory: null,
        wait: async () => undefined,
        now: () => START + 1700 * HOUR,
        ...deps,
      });
      watch(api.status, (status) => statuses.push(status), { immediate: true });
      return () => h('div');
    },
  });
  const wrapper = mount(component);
  return { wrapper, api: () => api, statuses };
}

afterEach(() => resetQuantLoopCache());

describe('useQuantLoop', () => {
  it('loads the archive, observes fees, researches and evaluates live signals', async () => {
    const loadFees = vi.fn(async () => fees);
    const loadHistory = vi.fn(async () => ({
      candles: Array.from({ length: 120 }, (_value, index) => ({
        timestamp: START + (1600 + index) * HOUR,
        close: index === 119 ? '0.69' : '1',
      })),
      missing: 0,
      denominationVerified: true,
    }));
    const { api, statuses } = harness({ loadFees, loadHistory });
    await api().start();
    await flushPromises();
    expect(statuses).toEqual(['idle', 'loading', 'fees', 'running', 'done']);
    expect(api().fees.value).toBe(fees);
    const result = api().result.value!;
    expect(result.costs).toEqual({ networkFeeXor: fees.networkFeeXor, swapFeePercent: '0.6', slippagePercent: '0.5' });
    const market = result.markets.find((item) => item.asset.symbol === 'PSWAP')!;
    expect(market.final).not.toBeNull();
    // The fee probe quotes XOR → token with the researched 2 XOR order size.
    expect(loadFees.mock.calls[0][0]).toMatchObject({ assetIn: { address: XOR.address }, strategy: { amount: '2' } });
    expect(api().signals.value.PSWAP).toMatchObject({ source: 'live', observedAt: START + 1719 * HOUR });
    expect(api().progress.value?.phase).toBe('done');
  });

  it('retries fee observation while the node connects, then reuses the session cache', async () => {
    let attempts = 0;
    const loadFees = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('bots.errors.quote');
      return fees;
    });
    const first = harness({ loadFees });
    await first.api().start();
    expect(first.api().status.value).toBe('done');
    expect(loadFees).toHaveBeenCalledTimes(3);
    // Same archive and fee rates: a second mount reuses the result without another search.
    const second = harness({});
    await second.api().start();
    expect(second.statuses).toEqual(['idle', 'loading', 'fees', 'done']);
    expect(second.api().result.value?.markets).toEqual(first.api().result.value?.markets);
  });

  it('falls back to dated archive closes when live history is unavailable', async () => {
    const { api } = harness({});
    await api().start();
    await flushPromises();
    const signal = api().signals.value.PSWAP;
    expect(signal.source).toBe('archive');
    expect(signal.observedAt).toBe(START + 1599 * HOUR);
  });

  it('reports archive failures without inventing a result', async () => {
    const { api } = harness({
      fetchArchive: async () => {
        throw new TypeError('offline');
      },
    });
    await api().start();
    expect(api().status.value).toBe('error');
    expect(api().error.value).toBe('bots.errors.history');
    expect(api().result.value).toBeNull();
  });

  it('stops pending work when the component unmounts', async () => {
    let release!: () => void;
    const { wrapper, api } = harness({
      loadFees: () =>
        new Promise((resolve) => {
          release = () => resolve(fees);
        }),
    });
    const pending = api().start();
    await flushPromises();
    expect(api().status.value).toBe('fees');
    wrapper.unmount();
    release();
    await pending;
    expect(api().result.value).toBeNull();
  });
});

describe('useQuantLoop live signal refresh', () => {
  it('re-evaluates after each completed hour without overlapping requests, and stops on unmount', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      vi.setSystemTime(START + 1700 * HOUR + 10 * 60_000);
      let release: (() => void) | undefined;
      const loadHistory = vi.fn(
        () =>
          new Promise<never>((_resolve, reject) => {
            release = () => reject(new Error('bots.errors.history'));
          })
      );
      const { wrapper, api } = harness({ loadHistory, now: () => Date.now() });
      const started = api().start();
      await vi.waitFor(() => expect(loadHistory).toHaveBeenCalledTimes(1));
      release!();
      await started;
      expect(api().signals.value.PSWAP.source).toBe('archive');
      // A second call while a refresh is in flight shares it instead of stacking requests.
      const first = api().refreshSignals();
      const second = api().refreshSignals();
      expect(second).toBe(first);
      release!();
      await first;
      const calls = loadHistory.mock.calls.length;
      // The next refresh runs after the next completed hour plus the indexer delay.
      await vi.advanceTimersByTimeAsync(55 * 60_000);
      await vi.waitFor(() => expect(loadHistory.mock.calls.length).toBeGreaterThan(calls));
      release!();
      await vi.advanceTimersByTimeAsync(0);
      wrapper.unmount();
      const afterUnmount = loadHistory.mock.calls.length;
      await vi.advanceTimersByTimeAsync(3 * HOUR);
      expect(loadHistory.mock.calls.length).toBe(afterUnmount);
    } finally {
      vi.useRealTimers();
    }
  });
});
