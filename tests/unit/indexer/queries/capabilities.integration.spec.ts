import { beforeEach, expect, it, vi } from 'vitest';
import { fetchData as burns, clearBurnXorQueryCaches } from '@/indexer/queries/burnXor';
import {
  fetchBridgeData,
  fetchCount,
  CountType,
  fetchAccountMeta,
  fetchAccountPointSystems,
} from '@/indexer/queries/pointSystem';
import { getReferralRewards } from '@/indexer/queries/referrals';
import { fetchPointOwnership } from '@/indexer/queries/pointOwnership';
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  entities: vi.fn(),
  all: vi.fn(),
  rpc: vi.fn(),
  indexer: null as any,
}));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({ getCurrentIndexer: () => mocks.indexer }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      api: {
        rpc: { chain: { getBlockHash: mocks.rpc, getBlock: mocks.rpc } },
        query: { system: { events: { at: mocks.rpc } } },
      },
    },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  clearBurnXorQueryCaches();
  const explorer = {
    request: mocks.request,
    fetchAllEntities: mocks.all,
    fetchEntities: mocks.entities,
    captureNetworkOnly: () => explorer,
  };
  mocks.indexer = { services: { explorer } };
  mocks.request.mockResolvedValue({
    indexerCapabilities: {
      schemaVersion: 1,
      mode: 'canonical-stats-history',
      genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
      policyHash: '0x1f4e11427a9c0a61a4868af40c9e0bdf263bb44a9ee59886a537c52164f3cdbb',
      statsReady: true,
      historyReady: true,
      currentViewsReady: false,
      entitlementsReady: false,
      indexedBlock: 28194050,
      indexedBlockHash: '0x' + '11'.repeat(32),
      reason: 'uncertified',
    },
  });
});
it('stats-only burn requests never read compact/raw history, legacy hints, RPC or cached fallback', async () => {
  await expect(burns(0, 28194050, 'alice')).rejects.toThrow();
  await expect(burns(0, 28194050, 'alice')).rejects.toThrow();
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(mocks.all).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('raw points and referral scoring inputs remain unavailable, never zero', async () => {
  await expect(fetchBridgeData(0, 100, 'alice')).rejects.toThrow();
  await expect(fetchCount(0, 100, 'alice', CountType.Swap)).rejects.toThrow();
  await expect(getReferralRewards('alice')).rejects.toThrow();
  expect(mocks.entities).not.toHaveBeenCalled();
  expect(mocks.all).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('materialized point and ownership reads stop at capabilities', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(fetchAccountMeta('alice')).resolves.toBeNull();
  await expect(fetchAccountPointSystems('alice')).resolves.toBeNull();
  await expect(fetchPointOwnership('alice')).resolves.toBeNull();
  expect(mocks.request).toHaveBeenCalledTimes(3);
  expect(mocks.all).not.toHaveBeenCalled();
  expect(mocks.entities).not.toHaveBeenCalled();
  error.mockRestore();
});

vi.mock('@/plugins/pinia', () => ({ resolveGlobalPinia: () => undefined }));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({ indexers: { polkaswap: { endpoint: 'https://approved.test/graphql' } } }),
}));
it('TONSWAP stops after the raw HTTP capability response, before snapshot/scoring', async () => {
  const { fetchTonswapBurnSnapshot } = await import('@/indexer/queries/tonswapBurn');
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { indexerCapabilities: (await mocks.request()).indexerCapabilities } }),
  });
  vi.stubGlobal('fetch', fetch);
  await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse(fetch.mock.calls[0][1].body).query).toContain('indexerCapabilities');
  vi.unstubAllGlobals();
});
it('Get TS injected snapshots and swap quotes cannot bypass blocked entitlements', async () => {
  const { requestGetTsPlanPreview } = await import('@/features/misc/lib/getTsPlanQuote');
  const snapshot = vi.fn(),
    quoteDai = vi.fn();
  const result = await requestGetTsPlanPreview(
    { source: 'sora', paymentAsset: 'DAI', amount: '1' },
    {
      checkMainnet: () => true,
      fees: { swapFeeCodec: '1000000000000000', burnFeeCodec: '1000000000000000', slippageTolerance: '1' },
      snapshot,
      quoteDai,
    }
  );
  expect(result).toMatchObject({ state: 'unavailable', reason: 'campaign-unavailable' });
  expect(snapshot).not.toHaveBeenCalled();
  expect(quoteDai).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
