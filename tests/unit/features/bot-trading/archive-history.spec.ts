import { describe, expect, it, vi } from 'vitest';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { fetchArchivedBotHistory, parseArchivedBotHistory } from '@/features/bot-trading/archive-history';
import { botFixture } from './fixtures';

const HOUR = 3_600_000;
const startAt = Date.UTC(2026, 2, 1);
const endAt = startAt + HOUR * 3;
const genesisHash = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const endpoint = 'https://mof2.sora.org/';
const hash = `0x${'a'.repeat(64)}`;
const options = { startAt, endAt, genesisHash, currentDenominator: '100' };
const bot = () => ({ ...botFixture(), assetIn: XOR, assetOut: VAL, policy: { ...botFixture().policy, feeAsset: XOR } });
const dataset = () => ({
  version: 1,
  kind: 'sora-pool-reserves-hourly',
  genesisHash,
  archiveEndpoint: endpoint,
  generatedAt: endAt,
  startAt,
  endAt,
  baseAsset: XOR.address,
  finalized: { hash, height: 200, timestamp: endAt },
  rows: [1, 2, 3].map((hour) => ({
    genesis: genesisHash,
    source: endpoint,
    timestamp: startAt + hour * HOUR,
    blockHeight: 100 + hour,
    blockHash: hash,
    stateTimestamp: startAt + hour * HOUR - 6_000,
    nextBlockHeight: 101 + hour,
    nextBlockHash: hash,
    nextStateTimestamp: startAt + hour * HOUR,
    denominator: '100',
    pools: {
      [VAL.address]: ['2000000000000000001', '1000000000000000000'],
      [PSWAP.address]: ['4000000000000000000', '1000000000000000000'],
    },
    metadata: {
      [XOR.address]: { symbol: XOR.symbol, decimals: XOR.decimals },
      [VAL.address]: { symbol: VAL.symbol, decimals: VAL.decimals },
      [PSWAP.address]: { symbol: PSWAP.symbol, decimals: PSWAP.decimals },
    },
  })),
});

describe('archived hourly reserve observations', () => {
  it('preserves exact reserve precision and distinguishes historical spot observations from executions', () => {
    const history = parseArchivedBotHistory(dataset(), bot(), options, endAt);
    expect(history.candles).toHaveLength(3);
    expect(history.candles[0]).toEqual({ timestamp: startAt + HOUR, close: '2.000000000000000001', feeClose: '1' });
    expect(history).toMatchObject({
      missing: 0,
      denominationVerified: true,
      provenance: {
        kind: 'archive-pool-spot',
        requestedStartAt: startAt,
        availableStartAt: startAt + HOUR,
        availableEndAt: endAt,
      },
    });
  });
  it('supports reversed and third-token pairs while valuing network fees in XOR from identical state', () => {
    const value = dataset();
    value.rows.forEach((row) => {
      row.pools[VAL.address][0] = '2000000000000000000';
    });
    const reversed = parseArchivedBotHistory(value, { ...bot(), assetIn: VAL, assetOut: XOR }, options, endAt);
    expect(reversed.candles[0]).toMatchObject({ close: '0.5', feeClose: '0.5' });
    const cross = parseArchivedBotHistory(value, { ...bot(), assetIn: VAL, assetOut: PSWAP }, options, endAt);
    expect(cross.candles[0]).toMatchObject({ close: '2', feeClose: '0.5' });
  });
  it('does not fill a halted-chain bucket or certify an incompatible denomination', () => {
    const value = dataset();
    value.rows[0].stateTimestamp = startAt - 1;
    value.rows[1].denominator = '1';
    const history = parseArchivedBotHistory(value, bot(), options, endAt);
    expect(history.candles.map((row) => row.timestamp)).toEqual([endAt]);
    expect(history.missing).toBe(2);
  });
  it('refuses token metadata mismatches, absent pools and zero reserve valuation', () => {
    const value = dataset();
    value.rows[0].metadata[VAL.address].decimals = 12;
    delete (value.rows[1].pools as Record<string, unknown>)[VAL.address];
    value.rows[2].pools[VAL.address][0] = '0';
    expect(parseArchivedBotHistory(value, bot(), options, endAt)).toMatchObject({
      candles: [],
      missing: 3,
      denominationVerified: false,
    });
  });
  it.each(['future', 'duplicate', 'boundary', 'nextBlock', 'overflow', 'network', 'endpoint'])(
    'rejects invalid archival %s evidence',
    (kind) => {
      const value = dataset();
      if (kind === 'future') value.generatedAt = endAt + 1;
      if (kind === 'duplicate') value.rows[1].timestamp = value.rows[0].timestamp;
      if (kind === 'boundary') value.rows[0].stateTimestamp = value.rows[0].timestamp;
      if (kind === 'nextBlock') value.rows[0].nextBlockHeight += 1;
      if (kind === 'overflow') value.rows[0].pools[VAL.address][0] = (1n << 128n).toString();
      if (kind === 'network') value.genesisHash = hash;
      if (kind === 'endpoint') value.archiveEndpoint = 'https://unreviewed.invalid';
      expect(() => parseArchivedBotHistory(value, bot(), options, endAt)).toThrow('bots.errors.history');
    }
  );
  it('loads only the bundled IPFS-relative dataset and reports unavailable static content', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(dataset())));
    await expect(fetchArchivedBotHistory(bot(), options, { fetch, now: () => endAt })).resolves.toMatchObject({
      missing: 0,
    });
    expect(fetch.mock.calls[0][0]).toBe('./bot-history/sora-mainnet-hourly-2026-03-01.json');
    fetch.mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(fetchArchivedBotHistory(bot(), options, { fetch, now: () => endAt })).rejects.toThrow(
      'bots.errors.history'
    );
  });
});
