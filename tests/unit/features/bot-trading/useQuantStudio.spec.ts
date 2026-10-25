import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import archiveText from '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json?raw';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { parseQuantArchive } from '@/features/bot-trading/quant-loop';
import { encodeStudioLink, normalizeStudioState } from '@/features/bot-trading/quant-studio';
import { useQuantStudio, type QuantStudioDependencies } from '@/features/bot-trading/useQuantStudio';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotAsset } from '@/features/bot-trading/types';

const FEES = {
  networkFeeXor: '0.100020612589707326',
  swapFeePercent: '0.6',
} as ResearchFeeSnapshot;
const archive = parseQuantArchive(JSON.parse(archiveText));
const ASSETS: BotAsset[] = [
  { address: XOR.address, symbol: 'XOR', decimals: 18 },
  ...archive.markets.map((market) => market.asset),
];

type Studio = ReturnType<typeof useQuantStudio>;
const mounted: { unmount(): void }[] = [];

/** Run the composable inside a component so its unmount cleanup is exercised. */
function setup(overrides: Partial<QuantStudioDependencies> = {}) {
  let studio!: Studio;
  const deps: QuantStudioDependencies = {
    loadFees: vi.fn(async () => FEES),
    fetchArchive: vi.fn(async () => archiveText),
    workerFactory: null,
    wait: vi.fn(async () => undefined),
    ...overrides,
  };
  const wrapper = mount(
    defineComponent({
      setup() {
        studio = useQuantStudio(ref(ASSETS), deps);
        return () => h('div');
      },
    })
  );
  mounted.push(wrapper);
  return { studio, deps, wrapper };
}

/** Wait until every view has answered the current choice. */
async function settle(studio: Studio): Promise<void> {
  await vi.waitFor(
    () => {
      expect(studio.status.value).toBe('ready');
      expect(Object.values(studio.pending).some(Boolean)).toBe(false);
      expect(studio.replay.value).not.toBeNull();
      expect(studio.grid.value?.recipe).toBe(studio.state.value.recipe);
    },
    { timeout: 20_000, interval: 20 }
  );
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('useQuantStudio', () => {
  it('loads the archive, observes fees and fills every view for the default choice', async () => {
    const { studio, deps } = setup();
    expect(studio.status.value).toBe('idle');
    await studio.start();
    await settle(studio);
    expect(studio.market.value).toBe('PSWAP');
    expect(studio.info.value?.markets.find((item) => item.symbol === 'ETH')?.tradable).toBe(false);
    expect(studio.costs.value).toEqual({ ...FEES, slippagePercent: '0.5' });
    expect(studio.landscape.value?.recipe).toBe('dip');
    expect(studio.series.value?.recipe).toBe('dip');
    expect(studio.replay.value?.candidate.id).toBe('studio:dip:48/15/10:3');
    expect(deps.loadFees).toHaveBeenCalledTimes(1);
    // Starting again is a no-op once ready.
    await studio.start();
    expect(deps.fetchArchive).toHaveBeenCalledTimes(1);
  }, 30_000);

  it('follows recipe, value and market changes, keeping the order size and ignoring thin markets', async () => {
    const { studio } = setup();
    await studio.start();
    await settle(studio);
    studio.setRecipe('oversold');
    expect(studio.state.value.recipe).toBe('oversold');
    expect(studio.state.value.values.amount).toBe(3);
    studio.setValues({ level: 23 });
    expect(studio.state.value.values.level).toBe(25);
    studio.setMarket('ETH');
    expect(studio.market.value).toBe('PSWAP');
    studio.setMarket('DAI');
    await settle(studio);
    expect(studio.market.value).toBe('DAI');
    expect(studio.replay.value?.candidate.id).toBe('studio:oversold:12/25/48/5:3');
  }, 30_000);

  it('answers only the latest choice when values change faster than jobs finish', async () => {
    const { studio } = setup();
    await studio.start();
    await settle(studio);
    for (const buy of [10, 12.5, 20, 25, 30]) studio.setValues({ buy });
    await settle(studio);
    expect(studio.state.value.values.buy).toBe(30);
    expect(studio.replay.value?.candidate.id).toBe('studio:dip:48/30/10:3');
    expect(studio.landscape.value?.recipe).toBe('dip');
  }, 30_000);

  it('replays hovered choices exactly for tooltips without changing the current choice', async () => {
    const { studio } = setup();
    await studio.start();
    await settle(studio);
    const hovered = normalizeStudioState({ recipe: 'dip', values: { ...studio.state.value.values, window: 96 } });
    studio.probe(hovered);
    await vi.waitFor(() => expect(studio.probeResult.value?.key).toBe(studio.probeKey(hovered)), { timeout: 10_000 });
    expect(studio.probeResult.value?.replay.candidate.id).toBe('studio:dip:96/15/10:3');
    expect(studio.state.value.values.window).toBe(48);
    studio.probe(null);
  }, 30_000);

  it('opens deep links and ignores malformed ones', async () => {
    const { studio } = setup();
    const state = normalizeStudioState({ recipe: 'peak', values: { fall: 40 } });
    expect(studio.applyLink('nonsense')).toBe(false);
    expect(studio.applyLink(encodeStudioLink('DAI', state))).toBe(true);
    await studio.start();
    await settle(studio);
    expect(studio.market.value).toBe('DAI');
    expect(studio.state.value).toEqual(state);
  }, 30_000);

  it('retries fees while the node connects and reports a lasting failure', async () => {
    const loadFees = vi
      .fn()
      .mockRejectedValueOnce(new Error('bots.errors.quote'))
      .mockRejectedValueOnce(new Error('bots.errors.quote'))
      .mockResolvedValue(FEES);
    const { studio } = setup({ loadFees });
    await studio.start();
    expect(studio.status.value).toBe('ready');
    expect(loadFees).toHaveBeenCalledTimes(3);

    const failing = setup({ loadFees: vi.fn().mockRejectedValue(new Error('bots.errors.quote')) });
    await failing.studio.start();
    expect(failing.studio.status.value).toBe('error');
    expect(failing.studio.error.value).toBe('bots.errors.quote');
    failing.studio.retry();
    await flushPromises();
    expect(failing.deps.loadFees).toHaveBeenCalledTimes(60);
  }, 30_000);

  it('moves to the identical in-thread engine when the worker fails', async () => {
    const terminate = vi.fn();
    class BrokenWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage() {
        setTimeout(() => this.onerror?.(), 0);
      }
      terminate = terminate;
    }
    const { studio, deps } = setup({ workerFactory: () => new BrokenWorker() as unknown as Worker });
    await studio.start();
    await settle(studio);
    expect(terminate).toHaveBeenCalled();
    expect(studio.replay.value?.candidate.id).toBe('studio:dip:48/15/10:3');
    expect(deps.fetchArchive).toHaveBeenCalledTimes(1);
  }, 30_000);

  it('releases the worker and pending work on unmount', async () => {
    const terminate = vi.fn();
    class SilentWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage() {}
      terminate = terminate;
    }
    const { studio, wrapper } = setup({ workerFactory: () => new SilentWorker() as unknown as Worker });
    const starting = studio.start();
    await flushPromises();
    wrapper.unmount();
    mounted.pop();
    await starting;
    expect(terminate).toHaveBeenCalled();
    expect(studio.status.value).toBe('idle');
  });
});
