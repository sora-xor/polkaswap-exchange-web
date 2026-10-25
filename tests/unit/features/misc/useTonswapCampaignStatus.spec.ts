import { FPNumber } from '@sora-substrate/sdk';
import { effectScope, nextTick, reactive, type EffectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// TextEncoder returns Node-realm arrays; SS58 hashing must use that same constructor in jsdom.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');

import { SoraNetwork } from '@/consts';
import { TONSWAP_START_BLOCK, type TonswapBurn } from '@/features/misc/lib/tonswapBurn';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const settings = reactive<{ soraNetwork: string | null }>({ soraNetwork: 'Prod' });

vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
vi.mock('@/indexer/queries/tonswapBurn', () => ({
  fetchTonswapBurnSnapshot: mocks.fetch,
  TONSWAP_MAINNET_GENESIS: '0x00',
}));

type StatusModule = typeof import('@/features/misc/composables/useTonswapCampaignStatus');

const burn = (amount: string, index = 0): TonswapBurn => ({
  address: 'alice',
  amount: new FPNumber(amount),
  blockHeight: TONSWAP_START_BLOCK + index,
  extrinsicIndex: index,
  txHash: `0x${(index + 1).toString(16).padStart(2, '0').repeat(32)}`,
});
const snapshot = (burns: TonswapBurn[] = [], fresh = true) => ({
  burns,
  indexedThroughBlock: TONSWAP_START_BLOCK + 10,
  fresh,
});

const scopes: EffectScope[] = [];
let hidden = false;

/** The status lives in module state, so every case starts from a freshly evaluated module. */
async function load() {
  vi.resetModules();
  const mod: StatusModule = await import('@/features/misc/composables/useTonswapCampaignStatus');
  // Warm the on-demand modules so the fake clock only has to flush microtasks.
  await Promise.all([
    import('@/indexer/queries/tonswapBurn'),
    import('@/features/misc/lib/tonswapBurn'),
    import('@/features/misc/lib/tonswapCampaignStatus'),
  ]);
  return mod;
}

function consume(mod: StatusModule) {
  const scope = effectScope();
  const status = scope.run(() => mod.useTonswapCampaignStatus())!;
  scopes.push(scope);
  return { scope, status };
}

describe('TONSWAP campaign status for the sidebar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    settings.soraNetwork = SoraNetwork.Prod;
    mocks.fetch.mockReset();
  });

  afterEach(() => {
    scopes.splice(0).forEach((scope) => scope.stop());
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'hidden');
  });

  describe('formatTonswapRate', () => {
    it('rounds down to two decimals so the label never promises more than the campaign pays', async () => {
      const { formatTonswapRate } = await load();
      expect(formatTonswapRate(new FPNumber('49.70248'))).toBe('49.70');
      expect(formatTonswapRate(new FPNumber('49.999999'))).toBe('49.99');
      expect(formatTonswapRate(new FPNumber('5.000025'))).toBe('5.00');
      expect(formatTonswapRate(new FPNumber('50'))).toBe('50.00');
    });

    it('uses the decimal mark of the current language', async () => {
      const { formatTonswapRate } = await load();
      const previous = { ...FPNumber.DELIMITERS_CONFIG };
      FPNumber.DELIMITERS_CONFIG = { thousand: '.', decimal: ',' };
      try {
        expect(formatTonswapRate(new FPNumber('49.70248'))).toBe('49,70');
      } finally {
        FPNumber.DELIMITERS_CONFIG = previous;
      }
    });
  });

  it('stays silent off mainnet: no request and nothing to show', async () => {
    settings.soraNetwork = SoraNetwork.Test;
    const { status } = consume(await load());

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(status.isLive.value).toBe(false);
    expect(status.rateLabel.value).toBe('');
  });

  it('reads once after the startup delay and reports the campaign as live with its current rate', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS - 1);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(status.isLive.value).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(status.isLive.value).toBe(true);
    expect(status.rateLabel.value).toBe('49.70');
    expect(status.summary.value?.burned.toString()).toBe('11592.4');
  });

  it('refreshes every minute while the tab is visible', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
    const mod = await load();
    consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });

  it('is not live when the cap has been reached', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('1753357')]));
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);

    expect(status.summary.value?.live).toBe(false);
    expect(status.isLive.value).toBe(false);
  });

  it('retries a failed read with a growing delay and recovers', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('indexer down')).mockResolvedValue(snapshot([burn('100')]));
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(status.isLive.value).toBe(false);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(status.isLive.value).toBe(true);
  });

  it('never calls burning open on a stale snapshot, and drops the last verified reading when it expires', async () => {
    mocks.fetch.mockResolvedValueOnce(snapshot([burn('100')])).mockResolvedValue(snapshot([burn('100')], false));
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(status.isLive.value).toBe(true);

    // Stale reads do not replace the verified reading, but they cannot extend it either.
    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_MAX_AGE_MS - 1_000);
    expect(mocks.fetch.mock.calls.length).toBeGreaterThan(2);
    expect(status.isLive.value).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(status.isLive.value).toBe(false);
  });

  it('does not read while the tab is hidden and catches up as soon as it is visible again', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
    hidden = true;
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS + mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).not.toHaveBeenCalled();

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(status.isLive.value).toBe(true);
  });

  it('skips its own read when the Burn page just published a fresh one, and shows it right away', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
    const mod = await load();
    const { summarizeTonswapCampaign } = await import('@/features/misc/lib/tonswapCampaignStatus');
    const { allocateTonswapBurns } = await import('@/features/misc/lib/tonswapBurn');
    const { status } = consume(mod);

    mod.publishTonswapCampaignSummary(
      summarizeTonswapCampaign(allocateTonswapBurns([burn('876678.5')]), TONSWAP_START_BLOCK + 20)
    );
    expect(status.isLive.value).toBe(true);
    expect(status.rateLabel.value).toBe('27.50');

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('lets a published reading expire on its own', async () => {
    const mod = await load();
    const { summarizeTonswapCampaign } = await import('@/features/misc/lib/tonswapCampaignStatus');
    const { allocateTonswapBurns } = await import('@/features/misc/lib/tonswapBurn');
    const { status } = consume(mod);
    mocks.fetch.mockRejectedValue(new Error('offline'));

    mod.publishTonswapCampaignSummary(summarizeTonswapCampaign(allocateTonswapBurns([]), TONSWAP_START_BLOCK));
    expect(status.isLive.value).toBe(true);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_MAX_AGE_MS);
    expect(status.isLive.value).toBe(false);
  });

  it('follows the network: hides on a test network and resumes on mainnet', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
    const mod = await load();
    const { status } = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(status.isLive.value).toBe(true);

    settings.soraNetwork = SoraNetwork.Test;
    await nextTick();
    expect(status.isLive.value).toBe(false);
    const calls = mocks.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(calls);

    settings.soraNetwork = SoraNetwork.Prod;
    await nextTick();
    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch.mock.calls.length).toBeGreaterThan(calls);
    expect(status.isLive.value).toBe(true);
  });

  it('shares one poller between consumers and stops with the last one', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
    const mod = await load();
    const first = consume(mod);
    const second = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(first.status.isLive.value).toBe(true);
    expect(second.status.isLive.value).toBe(true);

    first.scope.stop();
    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);

    second.scope.stop();
    await vi.advanceTimersByTimeAsync(10 * mod.TONSWAP_STATUS_REFRESH_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a read that finishes after its consumer is gone', async () => {
    let resolveRead!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValue(new Promise((resolve) => (resolveRead = resolve)));
    const mod = await load();
    const first = consume(mod);

    await vi.advanceTimersByTimeAsync(mod.TONSWAP_STATUS_FIRST_READ_MS);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    first.scope.stop();

    resolveRead(snapshot([burn('100')]));
    await vi.advanceTimersByTimeAsync(0);

    const second = consume(mod);
    expect(second.status.isLive.value).toBe(false);
  });
});
