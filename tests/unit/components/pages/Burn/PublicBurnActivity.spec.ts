import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PublicBurnActivity from '@/features/misc/components/burn/PublicBurnActivity.vue';
import { fetchPublicBurnActivity } from '@/indexer/queries/publicBurnActivity';

const genesis = vi.hoisted(() => '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5');
vi.mock('@/indexer/queries/capabilities', () => ({ RECOVERY_MAINNET_GENESIS: genesis }));
const wallet = reactive({ indexers: { polkaswap: { endpoint: 'https://first.invalid/graphql' } } });
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => wallet }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { from: number; to: number }) => (params ? `${params.from}–${params.to}` : key),
  }),
}));

const request = vi.fn();
const endpoint = 'https://first.invalid/graphql';
const now = 1_794_200_000;
const base = {
  startBlock: 28_194_043,
  throughBlock: 28_294_044,
  throughTimestamp: now,
  burnCount: 2,
  burnedXor: '9007199254740993.123456789012345678',
  tonswapCount: 1,
  tonswapXor: '0.000000000000000001',
};
const caps = { genesisHash: genesis, historyReady: true, statsReady: true, indexedBlock: base.throughBlock };

function response(activity: unknown, capabilities = caps, errors?: object[]) {
  return {
    ok: true,
    json: async () => ({ data: { publicBurnActivity: activity, indexerCapabilities: capabilities }, errors }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now * 1000);
  wallet.indexers.polkaswap.endpoint = endpoint;
  vi.stubGlobal('fetch', request.mockReset());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('finalized public burn activity', () => {
  it('renders exact decimal amounts and covered blocks independently of entitlement permission', async () => {
    request.mockResolvedValue(response(base));
    const wrapper = mount(PublicBurnActivity);
    await flushPromises();
    // Digits are grouped for reading, but none is rounded away; the untouched value stays in the title.
    const total = wrapper.get('[data-testid="public-burn-total-xor"]');
    expect(total.text()).toBe('9,007,199,254,740,993.123456789012345678');
    expect(total.text().replaceAll(',', '')).toBe(base.burnedXor);
    expect(total.attributes('title')).toBe(`${base.burnedXor} XOR`);
    expect(wrapper.get('[data-testid="public-burn-tonswap-xor"]').text()).toBe(base.tonswapXor);
    expect(wrapper.get('[data-testid="public-burn-total-count"]').text()).toBe('2');
    const coverage = wrapper.get('[data-testid="public-burn-coverage"]');
    expect(coverage.text()).toBe('28,194,043–28,294,044');
    expect(coverage.attributes('data-start-block')).toBe('28194043');
    expect(coverage.attributes('data-through-block')).toBe('28294044');
    const [url, opts] = request.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(opts).toMatchObject({ cache: 'no-store', credentials: 'omit' });
    expect(JSON.parse(opts.body).query).not.toMatch(/xorBurns|tonswapBurnSnapshot|entitlementsReady/);
    wrapper.unmount();
  });

  it('distinguishes a covered zero from missing, stale, foreign-chain, partial, or inconsistent data', async () => {
    const empty = { ...base, burnCount: 0, tonswapCount: 0, burnedXor: '0', tonswapXor: '0' };
    request.mockResolvedValueOnce(response(empty));
    expect(await fetchPublicBurnActivity(endpoint)).toEqual(empty);
    for (const invalid of [
      response(null),
      response(base, { ...caps, historyReady: false }),
      response(base, { ...caps, statsReady: false }),
      response(base, { ...caps, genesisHash: '0xdead' }),
      response(base, caps, [{ message: 'partial' }]),
      response({ ...base, throughTimestamp: now - 180 }),
      response({ ...base, throughTimestamp: now + 31 }),
      response({ ...base, throughBlock: caps.indexedBlock - 1 }),
      response({ ...base, startBlock: caps.indexedBlock + 1 }),
      response({ ...base, tonswapXor: '1e9' }),
      response({ ...empty, burnedXor: '1' }),
      response({ ...base, burnedXor: '0' }),
      response({ ...base, tonswapCount: 3 }),
      response({ ...base, burnedXor: '0.1234567890123456789' }),
    ]) {
      request.mockResolvedValueOnce(invalid);
      expect(await fetchPublicBurnActivity(endpoint)).toBeNull();
    }
  });

  it('renders the historical campaign with its own range and preserves the finalized observation between polls', async () => {
    const campaign = {
      startBlock: 27_720_478,
      throughBlock: 27_728_669,
      throughTimestamp: now - 30 * 86_400,
      burnCount: 28,
      burnedXor: '10263.4',
      tonswapCount: 28,
      tonswapXor: '10263.4',
    };
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { publicTonswapCampaignActivity: campaign, indexerCapabilities: caps } }),
    });
    const wrapper = mount(PublicBurnActivity, { props: { campaignHistory: true } });
    await flushPromises();
    expect(wrapper.get('h2').text()).toBe('burnActivity.campaignHistory');
    expect(wrapper.get('[data-testid="campaign-burn-coverage"]').text()).toBe('27,720,478–27,728,669');
    expect(wrapper.get('[data-testid="campaign-burn-tonswap-count"]').text()).toBe('28');
    expect(wrapper.get('[data-testid="campaign-burn-total-xor"]').text()).toBe('10,263.4');
    expect(wrapper.find('[data-testid="public-burn-total-xor"]').exists()).toBe(false);
    expect(JSON.parse(request.mock.calls[0][1].body).query).toContain('publicTonswapCampaignActivity');
    await vi.advanceTimersByTimeAsync(185_000);
    expect(wrapper.get('[data-testid="campaign-burn-tonswap-xor"]').text()).toBe('10,263.4');
    wrapper.unmount();
  });

  it('requires the campaign start, an admitted endpoint and a covered finalized height', async () => {
    const row = { ...base, startBlock: 27_720_478, throughBlock: 27_728_669, throughTimestamp: now - 100_000 };
    const cases = [
      { row: { ...row, startBlock: row.startBlock + 1 }, caps },
      { row: { ...row, throughBlock: 28_191_818 }, caps },
      { row: { ...row, throughTimestamp: 0 }, caps },
      { row: { ...row, throughTimestamp: now + 1000 }, caps },
      { row, caps: { ...caps, indexedBlock: row.throughBlock - 1 } },
      { row, caps: { ...caps, historyReady: false } },
      { row, caps: { ...caps, genesisHash: 'other' } },
    ];
    for (const sample of cases) {
      request.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { publicTonswapCampaignActivity: sample.row, indexerCapabilities: sample.caps },
        }),
      });
      expect(await fetchPublicBurnActivity(endpoint, 'campaign')).toBeNull();
    }
    // Older deployments can still answer the established live query when the added field is unavailable.
    request.mockResolvedValueOnce({ ok: true, json: async () => ({ errors: [{ message: 'Unknown field' }] }) });
    expect(await fetchPublicBurnActivity(endpoint, 'campaign')).toBeNull();
    request.mockResolvedValueOnce(response(base));
    expect(await fetchPublicBurnActivity(endpoint)).toEqual(base);
  });

  it('withdraws expired values while a poll is in flight', async () => {
    request.mockResolvedValueOnce(response({ ...base, throughTimestamp: now - 155 }));
    request.mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mount(PublicBurnActivity);
    await flushPromises();
    expect(wrapper.find('table').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(25_001);
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toBe('burnActivity.unavailable');
    wrapper.unmount();
  });

  it('ignores a previous endpoint that finishes after the current endpoint', async () => {
    let completeFirst!: (result: ReturnType<typeof response>) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeFirst = resolve;
        })
    );
    request.mockResolvedValueOnce(response(null));
    const wrapper = mount(PublicBurnActivity);
    wallet.indexers.polkaswap.endpoint = 'https://second.invalid/graphql';
    await flushPromises();
    completeFirst(response(base));
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(2);
    expect(wrapper.find('table').exists()).toBe(false);
    wrapper.unmount();
  });
});
