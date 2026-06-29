import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAllEntitiesMock = vi.hoisted(() => vi.fn());
const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const waitForSoraNetworkFromEnvMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());
const CODEC_SCALE = 10n ** 18n;
const codecFromNatural = (value: bigint): string => (value * CODEC_SCALE).toString();

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
  });

  it('uses env resolution when the settings store is unavailable', async () => {
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

  it('keeps zero supply values returned by the indexer', async () => {
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

    expect(data).toEqual([
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
  });

  it('decodes corrected XOR supply snapshots without token-specific scaling', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700000000',
        supply: codecFromNatural(2_000_000_000n),
        mint: '0',
        burn: '0',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toEqual([
      {
        timestamp: 1_700_000_000_000,
        value: 2_000_000_000,
        mint: 0,
        burn: 0,
      },
    ]);
  });

  it('does not apply legacy XOR division to indexer snapshot supplies', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700000000',
        supply: codecFromNatural(999_000n),
        mint: '0',
        burn: '0',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(1);
    expect(data[0]?.timestamp).toBe(1_700_000_000_000);
    expect(data[0]?.value).toBe(999_000);
    expect(data[0]?.mint).toBe(0);
    expect(data[0]?.burn).toBe(0);
  });

  it('decodes each XOR snapshot supply independently without delta rescaling', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700003600',
        supply: codecFromNatural(999_000n),
        mint: '0',
        burn: '0',
      }),
      parse({
        timestamp: '1700000000',
        supply: codecFromNatural(999_002n),
        mint: '0',
        burn: '2.8758563281',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(2);
    expect(data[0]?.value).toBe(999_000);
    expect(data[1]?.value).toBe(999_002);
    expect(data[1]?.burn).toBeCloseTo(2.8758563, 7);
  });

  it('does not rescale XOR burn buckets in the frontend', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1780120812',
        supply: codecFromNatural(988_999n),
        mint: '0',
        burn: '900100.0942320589',
      }),
      parse({
        timestamp: '1780119312',
        supply: codecFromNatural(998_999n),
        mint: '0',
        burn: '0.0236330147',
      }),
      parse({
        timestamp: '1780119311',
        supply: codecFromNatural(999_000n),
        mint: '0',
        burn: '100000.1976598377',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(3);
    expect(data[0]?.value).toBe(988_999);
    expect(data[0]?.burn).toBeCloseTo(900_100.0942320589, 6);
    expect(data[1]?.value).toBe(998_999);
    expect(data[1]?.burn).toBeCloseTo(0.0236330147, 6);
    expect(data[2]?.burn).toBeCloseTo(100_000.1976598377, 6);
  });

  it('returns an empty series when the indexer returns no supply snapshots', async () => {
    fetchAllEntitiesMock.mockResolvedValue([]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, 1_700_000_000, 1_699_996_400, 'daily' as any);

    expect(data).toEqual([]);
  });
});
