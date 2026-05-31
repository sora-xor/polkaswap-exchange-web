import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAllEntitiesMock = vi.hoisted(() => vi.fn());
const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const getAssetSupplyMock = vi.hoisted(() => vi.fn());
const waitForSoraNetworkFromEnvMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());
const CODEC_SCALE = 10n ** 18n;
const CHAIN_XOR_CODEC_SCALE = 10n ** 30n;
const DEFAULT_CHAIN_XOR_SUPPLY = '12880123450000000000000000000000000000';
const PRODUCTION_INDEXER_XOR_SUPPLY = '999000000000003130343037481135';
const PRODUCTION_INDEXER_XOR_SUPPLY_OLDER = '999000000000003133126732426352';
const PRODUCTION_CHAIN_XOR_SUPPLY = '999000000000003130299593070140378854';
const codecFromNatural = (value: bigint): string => (value * CODEC_SCALE).toString();
const chainXorCodecFromNatural = (value: bigint): string => (value * CHAIN_XOR_CODEC_SCALE).toString();

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
    getAssetSupplyMock.mockResolvedValue(DEFAULT_CHAIN_XOR_SUPPLY);
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

  it('normalizes oversized XOR supply snapshots written before the indexer fix', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700000000',
        supply: codecFromNatural(2_000_000_000_000_000n),
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
    expect(getAssetSupplyMock).not.toHaveBeenCalled();
  });

  it('normalizes current production XOR supply snapshots to the post-denomination scale', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700000000',
        supply: PRODUCTION_INDEXER_XOR_SUPPLY,
        mint: '0',
        burn: '0',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(1);
    expect(data[0]?.timestamp).toBe(1_700_000_000_000);
    expect(data[0]?.value).toBeCloseTo(999_000.0000000031, 6);
    expect(data[0]?.mint).toBe(0);
    expect(data[0]?.burn).toBe(0);
    expect(getAssetSupplyMock).not.toHaveBeenCalled();
  });

  it('scales current production XOR supply deltas from raw snapshot movement', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1700003600',
        supply: PRODUCTION_INDEXER_XOR_SUPPLY,
        mint: '0',
        burn: '0',
      }),
      parse({
        timestamp: '1700000000',
        supply: PRODUCTION_INDEXER_XOR_SUPPLY_OLDER,
        mint: '0',
        burn: '2.8758563281',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(2);
    expect(data[0]?.value).toBeCloseTo(999_000.0000000031, 6);
    expect(data[1]?.value).toBeCloseTo(999_002.7836949483, 6);
    expect(data[1]?.burn).toBeCloseTo(2.8758563, 7);
    expect(getAssetSupplyMock).not.toHaveBeenCalled();
  });

  it('normalizes storage-scale XOR burn buckets without changing ordinary burn values', async () => {
    fetchAllEntitiesMock.mockImplementationOnce(async (_query, _variables, parse) => [
      parse({
        timestamp: '1780120812',
        supply: '98899900000002231675376324363',
        mint: '0',
        burn: '900100000000000000.0942320589',
      }),
      parse({
        timestamp: '1780119312',
        supply: '998999900000002231940122740042',
        mint: '0',
        burn: '0.0236330147',
      }),
      parse({
        timestamp: '1780119311',
        supply: PRODUCTION_INDEXER_XOR_SUPPLY,
        mint: '0',
        burn: '100000000197.6598377033',
      }),
    ]);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, Date.now(), Date.now() - 1_000, 'daily' as any);

    expect(data).toHaveLength(3);
    expect(data[0]?.value).toBeCloseTo(98_899.9000000022, 6);
    expect(data[0]?.burn).toBeCloseTo(900_100.0000000942, 6);
    expect(data[1]?.value).toBeCloseTo(998_999.9000000022, 6);
    expect(data[1]?.burn).toBeCloseTo(0.0236330147, 6);
    expect(data[2]?.burn).toBeCloseTo(100_000.0001976598, 6);
  });

  it('decodes current XOR supply fallback values at chain precision', async () => {
    fetchAllEntitiesMock.mockResolvedValue([]);
    getAssetSupplyMock.mockResolvedValue(chainXorCodecFromNatural(2_000_000_000n));

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, 1_700_000_000, 1_699_996_400, 'daily' as any);

    expect(data).toEqual([
      {
        timestamp: 1_700_000_000_000,
        value: 2_000_000_000,
        mint: 0,
        burn: 0,
      },
    ]);
  });

  it('normalizes current chain XOR supply fallback values to the post-denomination scale', async () => {
    fetchAllEntitiesMock.mockResolvedValue([]);
    getAssetSupplyMock.mockResolvedValue(PRODUCTION_CHAIN_XOR_SUPPLY);

    const { fetchAssetSupplyData } = await import('@/indexer/queries/asset/supply');
    const { XOR } = await import('@sora-substrate/sdk/build/assets/consts');

    const data = await fetchAssetSupplyData(XOR.address, 1_700_000_000, 1_699_996_400, 'daily' as any);

    expect(getAssetSupplyMock).toHaveBeenCalledWith(XOR.address);
    expect(data).toHaveLength(1);
    expect(data[0]?.timestamp).toBe(1_700_000_000_000);
    expect(data[0]?.value).toBeCloseTo(999_000.0000000031, 6);
    expect(data[0]?.mint).toBe(0);
    expect(data[0]?.burn).toBe(0);
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
