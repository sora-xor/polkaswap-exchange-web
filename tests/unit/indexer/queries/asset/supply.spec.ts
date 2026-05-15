import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAllEntitiesMock = vi.hoisted(() => vi.fn());
const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const getAssetSupplyMock = vi.hoisted(() => vi.fn());
const waitForSoraNetworkFromEnvMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      getAssetSupply: getAssetSupplyMock,
    },
  },
}));

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
    getAssetSupplyMock.mockResolvedValue('12880123450000000000000000');
    getCurrentIndexerMock.mockReturnValue({
      type: 'polkaswap',
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
    expect(getAssetSupplyMock).not.toHaveBeenCalled();
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

  it('uses current chain supply when indexer snapshots contain only zero supply values', async () => {
    fetchAllEntitiesMock.mockResolvedValue([
      {
        timestamp: 1_700_000_000_000,
        value: 0,
        mint: 12,
        burn: 3,
      },
      {
        timestamp: 1_699_996_400_000,
        value: 0,
        mint: 0,
        burn: 0,
      },
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(getAssetSupplyMock).toHaveBeenCalledWith(XOR.address);
    expect(data).toEqual([
      {
        timestamp: 1_700_000_000_000,
        value: 12_880_123.45,
        mint: 12,
        burn: 3,
      },
      {
        timestamp: 1_699_996_400_000,
        value: 12_880_123.45,
        mint: 0,
        burn: 0,
      },
    ]);
  });

  it('adds a current supply point when the indexer returns no supply snapshots', async () => {
    fetchAllEntitiesMock.mockResolvedValue([]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, 1_700_000_000, 1_699_996_400, 'daily' as any);

    expect(data).toEqual([
      {
        timestamp: 1_700_000_000_000,
        value: 12_880_123.45,
        mint: 0,
        burn: 0,
      },
    ]);
  });
});
