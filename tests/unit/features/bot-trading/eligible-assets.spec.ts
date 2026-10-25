import { afterEach, describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { fetchLiquidBotAssets, selectLiquidBotAssets } from '@/features/bot-trading/eligible-assets';
import { toCodec } from '@/features/bot-trading/amounts';
const mocks = vi.hoisted(() => ({ api: { connection: null as unknown }, ready: vi.fn() }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: mocks.api }));
vi.mock('@/features/bot-trading/playground-history', () => ({ waitForHistoryConnection: mocks.ready }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
const pool = (address: string, amount: string) => ({ address, xorCodec: toCodec(amount, 18), targetCodec: '1' });

/** Keep the finalized-state boundary real while replacing every external service with deterministic promises. */
function mockLiquidConnection() {
  const entries = vi.fn(async () => [
    [{ args: [{ code: XOR.address }, { code: kusd.address }] }, [toCodec('2', 18), '1']],
  ]);
  const state = {
    query: {
      denomination: { denominator: vi.fn(async () => '100000000000000000000000000000000000000') },
      poolXYK: { reserves: { entries } },
    },
  };
  const chain = {
    isConnected: true,
    genesisHash: 'genesis',
    rpc: { chain: { getFinalizedHead: vi.fn(async () => 'finalized') } },
    at: vi.fn(async () => state),
  };
  const connection = { api: chain, endpoint: 'wss://unit-test.invalid' };
  mocks.api.connection = connection;
  mocks.ready.mockResolvedValue({ chain, connection, endpoint: connection.endpoint, genesis: 'genesis' });
  const fetch = vi.fn(async () => ({ ok: true, json: async () => [kusd] }));
  vi.stubGlobal('fetch', fetch);
  return { entries, state, chain, connection, fetch };
}

describe('bot token liquidity eligibility', () => {
  it('reads the full whitelist and exact pool reserves from one finalized chain state', async () => {
    const { entries, chain, connection, fetch } = mockLiquidConnection();
    expect(await fetchLiquidBotAssets()).toEqual([{ address: XOR.address, symbol: 'XOR', decimals: 18 }, kusd]);
    expect(fetch).toHaveBeenCalledWith(
      './whitelist.json',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(chain.at).toHaveBeenCalledWith('finalized');
    expect(entries).toHaveBeenCalledWith(XOR.address);
    entries.mockImplementationOnce(async () => {
      connection.endpoint = 'wss://changed.invalid';
      return [];
    });
    await expect(fetchLiquidBotAssets()).rejects.toThrow('bots.errors.stale');
  });

  it('bounds a stalled finalized-head read and discards its late reply before further RPC work', async () => {
    vi.useFakeTimers();
    const { chain } = mockLiquidConnection();
    let finishHead!: (hash: string) => void;
    chain.rpc.chain.getFinalizedHead.mockImplementationOnce(() => new Promise((resolve) => (finishHead = resolve)));
    const settled = fetchLiquidBotAssets().then(
      (assets) => ({ assets, error: undefined }),
      (error: Error) => ({ assets: undefined, error: error.message })
    );
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await settled).toEqual({ assets: undefined, error: 'bots.errors.stale' });
    finishHead('late-finalized');
    await vi.advanceTimersByTimeAsync(0);
    expect(chain.at).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect((await fetchLiquidBotAssets()).map((asset) => asset.symbol)).toEqual(['XOR', 'KUSD']);
    expect(chain.at).toHaveBeenCalledWith('finalized');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses one deadline across finalized metadata and reserves, consuming a late RPC rejection', async () => {
    vi.useFakeTimers();
    const { chain, entries, state } = mockLiquidConnection();
    let finishState!: (state: Awaited<ReturnType<typeof chain.at>>) => void;
    let failEntries!: (error: Error) => void;
    chain.at.mockImplementationOnce(() => new Promise((resolve) => (finishState = resolve)));
    entries.mockImplementationOnce(() => new Promise((_resolve, reject) => (failEntries = reject)));
    const settled = fetchLiquidBotAssets().then(
      (assets) => ({ assets, error: undefined }),
      (error: Error) => ({ assets: undefined, error: error.message })
    );
    await vi.advanceTimersByTimeAsync(10_000);
    finishState(state);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await settled).toEqual({ assets: undefined, error: 'bots.errors.stale' });
    failEntries(new Error('late RPC failure'));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('includes unknown whitelist tokens beyond the common set using exact current XOR units', () => {
    const result = selectLiquidBotAssets(
      [VAL, kusd],
      [pool(VAL.address, '1'), pool(kusd.address, '1.000000000000000001')]
    );
    expect(result.map((asset) => asset.address)).toEqual([XOR.address, kusd.address]);
  });
  it('excludes unlisted, empty, malformed and exactly one-XOR pools without falling back to known assets', () => {
    expect(
      selectLiquidBotAssets([VAL, { ...kusd, decimals: 99 }], [pool(VAL.address, '1'), pool(kusd.address, '2')])
    ).toEqual([]);
    expect(selectLiquidBotAssets([VAL], [{ ...pool(VAL.address, '2'), targetCodec: '0' }])).toEqual([]);
    expect(selectLiquidBotAssets([VAL], [{ ...pool(VAL.address, '2'), xorCodec: 'NaN' }])).toEqual([]);
    expect(() => selectLiquidBotAssets({}, [])).toThrow('bots.errors.config');
  });
});
