import { describe, expect, it, vi } from 'vitest';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_KUSD as KUSD,
  EXECUTION_EVIDENCE_XOR as XOR,
  type ExecutionContext,
  type ExecutionRawQuote,
  type ExecutionReverseLot,
} from '../../../../scripts/bots/execution-evidence';
import { readExecutionSnapshot, type ExecutionReader } from '../../../../scripts/bots/execution-reader';

const NOW = 2_000_000;
const HASH = `0x${'ab'.repeat(32)}`;
const context: ExecutionContext = {
  endpoint: EXECUTION_EVIDENCE_ENDPOINT,
  genesisHash: EXECUTION_EVIDENCE_GENESIS,
  blockHash: HASH,
  blockNumber: 100,
  finalizedAt: NOW,
  denominator: '1',
  specVersion: 131,
  transactionVersion: 3,
  metadataHashAlgorithm: 'sha256',
  metadataHash: 'a'.repeat(64),
  metadataFormatVersion: 16,
  metadataReadMethod: 'Metadata_metadata_at_version',
  dexId: 0,
  allowedSourceTypes: ['XYKPool'],
  filterMode: 'AllowSelected',
  poolIdentity: 'exact-pool',
};

/** Synthetic raw SDK records only; this reader never contacts an endpoint. */
function quote(assetIn: string, assetOut: string, amountInCodec: string): ExecutionRawQuote {
  return {
    blockHash: HASH,
    assetIn,
    assetOut,
    assetInDecimals: 18,
    assetOutDecimals: 18,
    amountInCodec,
    amountOutCodec: '1000000000000000000',
    amountWithoutImpactCodec: '1010000000000000000',
    route: [assetIn, assetOut],
    routeFees: [],
    rawQuoteJson: {
      amount: '1000000000000000000',
      amountWithoutImpact: '1010000000000000000',
      route: [assetIn, assetOut],
      fee: {},
    },
    fee: {
      partialFeeCodec: '3',
      baseFeeCodec: '1',
      lenFeeCodec: '1',
      adjustedWeightFeeCodec: '1',
      tipCodec: '0',
      encodedLength: 208,
      callHex: '0x01020304',
      envelopeHashAlgorithm: 'sha256',
      envelopeHash: 'e'.repeat(64),
      blockHash: HASH,
      runtimeVersion: { specVersion: 131, transactionVersion: 3 },
      rawQueryInfo: { partialFee: '3' },
      rawFeeDetails: { inclusionFee: { baseFee: 1, lenFee: 1, adjustedWeightFee: 1 }, tip: 0 },
    },
  };
}

function reader(): ExecutionReader {
  return {
    context: vi.fn().mockResolvedValue(context),
    quote: vi.fn(async (_context, assetIn, assetOut, amount) => quote(assetIn, assetOut, amount)),
    assertUnchanged: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('request intervals and retained reverse-lot observations', () => {
  it('records each full quote-adapter request interval and the later continuity completion', async () => {
    const rpc = reader();
    const times = [NOW + 100, NOW + 350, NOW + 400, NOW + 800, NOW + 900];
    const now = vi.fn(() => times.shift()!);
    const result = await readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, now);
    expect(result.quoteTiming).toEqual({
      buy: { startedAt: NOW + 100, finishedAt: NOW + 350 },
      sell: { startedAt: NOW + 400, finishedAt: NOW + 800 },
    });
    expect(result.requestFinishedAt).toBe(NOW + 900);
    expect(rpc.quote).toHaveBeenNthCalledWith(1, context, KUSD, XOR, '5000000000000000000', expect.any(Function));
    expect(rpc.quote).toHaveBeenNthCalledWith(2, context, XOR, KUSD, '995000000000000000', expect.any(Function));
    expect(now).toHaveBeenCalledTimes(5);
    expect(rpc.assertUnchanged).toHaveBeenCalledWith(context);
  });

  it('quotes the original exact lot and carries its declaration even when the new buy minimum differs', async () => {
    const rpc = reader();
    const lot: ExecutionReverseLot = {
      kind: 'fixed-frozen-lot',
      amountCodec: '9007199254740993001',
      frozenAt: NOW - 1000,
      lotId: 'first-entry-record',
    };
    const result = await readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => NOW + 100, lot);
    expect(rpc.quote).toHaveBeenNthCalledWith(2, context, XOR, KUSD, lot.amountCodec, expect.any(Function));
    expect(result.sell.amountInCodec).toBe(lot.amountCodec);
    expect(result.sell.amountInCodec).not.toBe(result.buy.minimumCodec);
    expect(result.reverseLot).toEqual(lot);
    expect(result.quoteTiming).toBeDefined();
  });

  it('detaches the fixed lot before the first awaited context request', async () => {
    const rpc = reader();
    const lot: ExecutionReverseLot = {
      kind: 'fixed-frozen-lot',
      amountCodec: '800000000000000001',
      frozenAt: NOW - 1000,
      lotId: 'frozen-lot',
    };
    vi.mocked(rpc.context).mockImplementation(async () => {
      lot.amountCodec = '700000000000000001';
      lot.lotId = 'changed-by-caller';
      return context;
    });
    const result = await readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => NOW + 100, lot);
    expect(result.reverseLot).toEqual({
      kind: 'fixed-frozen-lot',
      amountCodec: '800000000000000001',
      frozenAt: NOW - 1000,
      lotId: 'frozen-lot',
    });
    expect(result.sell.amountInCodec).toBe('800000000000000001');
  });

  it.each([
    { kind: 'fixed-frozen-lot', amountCodec: '0', frozenAt: NOW - 1, lotId: 'lot' },
    { kind: 'fixed-frozen-lot', amountCodec: '1', frozenAt: NOW + 1, lotId: 'lot' },
    { kind: 'fixed-frozen-lot', amountCodec: '1', frozenAt: NOW - 1, lotId: '' },
    { kind: 'other' },
    null,
  ])('rejects a malformed lot before any reader request: %j', async (lot) => {
    const rpc = reader();
    await expect(
      readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => NOW + 100, lot as ExecutionReverseLot)
    ).rejects.toThrow('Invalid execution evidence');
    expect(rpc.context).not.toHaveBeenCalled();
    expect(rpc.quote).not.toHaveBeenCalled();
  });

  it('rejects a reverse response for the new buy minimum when the frozen lot was requested', async () => {
    const rpc = reader();
    vi.mocked(rpc.quote)
      .mockResolvedValueOnce(quote(KUSD, XOR, '5000000000000000000'))
      .mockResolvedValueOnce(quote(XOR, KUSD, '995000000000000000'));
    await expect(
      readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => NOW + 100, {
        kind: 'fixed-frozen-lot',
        amountCodec: '800000000000000000',
        frozenAt: NOW - 1,
        lotId: 'retained',
      })
    ).rejects.toThrow('Invalid execution evidence');
  });

  it('refuses a reversed request clock instead of manufacturing a nonnegative latency', async () => {
    const rpc = reader();
    const times = [NOW + 200, NOW + 100, NOW + 300, NOW + 400, NOW + 500];
    await expect(readExecutionSnapshot(rpc, NOW, NOW, { stage: 'connect' }, () => times.shift()!)).rejects.toThrow(
      'Invalid execution evidence'
    );
  });
});
