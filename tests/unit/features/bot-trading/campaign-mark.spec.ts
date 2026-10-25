import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { readFinalizedDiscoveryCampaignMark } from '@/features/bot-trading/campaign-mark';
import { executionBot } from './execution-fixtures';

const HASH = `0x${'a'.repeat(64)}`;
const NETWORK = `0x${'b'.repeat(64)}`;
const runtime = vi.hoisted(() => ({ connection: undefined as unknown }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: {
  get connection() { return runtime.connection; },
  dex: { publicDexes: [] },
} }));

/** The mark reader must value held units and fee spend at one canonical finalized block. */
describe('finalized discovery campaign marks', () => {
  beforeEach(() => {
    const head = { toHex: () => HASH };
    const chain = {
      isConnected: true,
      isReady: Promise.resolve(),
      genesisHash: { toHex: () => NETWORK },
      at: vi.fn(async () => ({ query: {
        timestamp: { now: async () => ({ toString: () => '1000000' }) },
        denomination: { denominator: async () => ({ toString: () => '1000000000000000000' }) },
      } })),
      rpc: {
        chain: {
          getFinalizedHead: vi.fn(async () => head),
          getHeader: vi.fn(async () => ({ number: { toNumber: () => 101 } })),
          getBlockHash: vi.fn(async () => head),
        },
        liquidityProxy: { quote: vi.fn(async (
          _dexId: number, assetIn: string, assetOut: string, amountCodec: string, side: string,
          _sources: unknown, _mode: string, quoteHead: typeof head
        ) => {
          if (quoteHead !== head) throw new Error('not a finalized quote');
          const amount = BigInt(amountCodec);
          const priced = side === 'WithDesiredOutput'
            ? amount * 4n
            : assetIn === XOR.address ? amount * 3n : amount * 2n;
          return { isNone: false, unwrap: () => ({
            route: [{ toString: () => assetIn }, { toString: () => assetOut }],
            amount: { toString: () => priced.toString() },
          }) };
        }) },
      },
    };
    runtime.connection = { api: chain };
  });

  it('uses exact marked output, unchanged hold, paid fee inventory, and XOR capital', async () => {
    const bot = executionBot();
    bot.network = NETWORK;
    bot.portfolio.holdings = {
      '0xin': '5000000000000000000',
      '0xout': '12000000000000000000',
      [XOR.address]: '900000000000000000',
    };
    bot.portfolio.feesPaidCodec = '100000000000000000';
    const mark = await readFinalizedDiscoveryCampaignMark([bot], 1_006_000);
    expect(mark).toEqual({
      network: NETWORK,
      blockHash: HASH,
      blockNumber: 101,
      timestampMs: 1_000_000,
      denominator: '1000000000000000000',
      values: { [bot.id]: {
        currentOutputCodec: '24700000000000000000',
        holdOutputCodec: '23000000000000000000',
        capitalXorCodec: '41000000000000000000',
      } },
    });
  });

  it('rejects a mark whose finalized block changed while quoting', async () => {
    const connection = runtime.connection as { api: { rpc: { chain: { getBlockHash: ReturnType<typeof vi.fn> } } } };
    connection.api.rpc.chain.getBlockHash.mockResolvedValue({ toHex: () => `0x${'c'.repeat(64)}` });
    const bot = executionBot();
    bot.network = NETWORK;
    await expect(readFinalizedDiscoveryCampaignMark([bot], 1_006_000)).rejects.toThrow('bots.errors.stale');
  });
});
