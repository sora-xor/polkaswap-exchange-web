import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAllEntitiesMock = vi.hoisted(() => vi.fn());
const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const waitForSoraNetworkFromEnvMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: getCurrentIndexerMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => useSettingsStoreMock(),
}));

vi.mock('@/utils', () => ({
  waitForSoraNetworkFromEnv: waitForSoraNetworkFromEnvMock,
}));

describe('fetchAssetSupplyData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllEntitiesMock.mockResolvedValue([
      {
        timestamp: 1_700_000_000_000,
        value: 100,
        mint: 0,
        burn: 0,
      },
    ]);
    getCurrentIndexerMock.mockReturnValue({
      type: 'subquery',
      services: {
        explorer: {
          fetchAllEntities: fetchAllEntitiesMock,
        },
      },
    });
    waitForSoraNetworkFromEnvMock.mockResolvedValue('Dev');
    useSettingsStoreMock.mockReturnValue({ soraNetwork: 'Dev' });
  });

  it('uses the Pinia settings store before falling back to env resolution', async () => {
    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { VAL } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(VAL.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toEqual([
      {
        timestamp: 1_700_000_000_000,
        value: 100,
        mint: 0,
        burn: 0,
      },
    ]);
    expect(waitForSoraNetworkFromEnvMock).not.toHaveBeenCalled();
  });

  it('falls back to env resolution when the settings store is unavailable', async () => {
    useSettingsStoreMock.mockImplementation(() => {
      throw new Error('pinia unavailable');
    });
    waitForSoraNetworkFromEnvMock.mockResolvedValue('Prod');

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { VAL } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(VAL.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(waitForSoraNetworkFromEnvMock).toHaveBeenCalledTimes(1);
    expect(data[0]?.value).toBeCloseTo(100 - 33449609.3779);
  });
});
