// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import { u8aToHex } from '@polkadot/util';
import * as browserExecution from '@/features/bot-trading/execution-codecs/execution';
import * as browserPool from '@/features/bot-trading/execution-codecs/pool';
import * as browserFee from '@/features/bot-trading/execution-codecs/fee';
import * as historicalExecution from '../../../../scripts/bots/historical-execution-codec';
import * as historicalPool from '../../../../scripts/bots/historical-execution-pool-codec';
import * as historicalFee from '../../../../scripts/bots/historical-goal-fee-codec';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import {
  createHistoricalFeeMetadataFixture,
  feeBytes,
  hex,
  le,
  MAX,
} from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

const request = {
  assetIn: historicalExecution.HISTORICAL_EXECUTION_KUSD,
  assetOut: historicalExecution.HISTORICAL_EXECUTION_XOR,
  amountInCodec: '2500000000000000000',
  quotedAmountOutCodec: '1000000000000000001',
};
const context = { blockNumber: 333 };

/** Invented envelope bytes exercise structural checks only, with no valid cryptographic signature. */
function candidate(
  fixture: ReturnType<typeof createHistoricalFeeMetadataFixture>,
  nonce: string,
  signature: number,
  period = 64,
  tip = '0'
) {
  const call = historicalExecution.createHistoricalExecutionCodec(fixture.identity).buildSwapEnvelope(request).callHex;
  const envelope = fixture.registry.createType('Extrinsic', fixture.registry.createType('Call', call), { version: 4 });
  const payload = fixture.registry.createType(
    'ExtrinsicPayload',
    {
      method: call,
      nonce,
      tip,
      era: { current: 335, period },
      genesisHash: fixture.identity.genesisHash,
      blockHash: fixture.identity.blockHash,
      ...fixture.identity.runtimeVersion,
    },
    { version: 4 }
  );
  envelope.addSignature(
    `0x${'33'.repeat(32)}`,
    hex(Uint8Array.from([signature, ...new Array(signature < 2 ? 64 : 65).fill(1)])),
    payload.toHex()
  );
  return envelope.toHex();
}

describe('browser execution codec parity with authoritative historical codecs', () => {
  it.each([130, 131])(
    'preserves runtime %s exact calls, u128 minimums, hashes, storage keys and decodes',
    (version) => {
      const fixture = createHistoricalFeeMetadataFixture(51, 7);
      fixture.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
      const original = historicalExecution.createHistoricalExecutionCodec(fixture.identity);
      const portable = browserExecution.createHistoricalExecutionCodec(fixture.identity);
      expect(portable.binding).toEqual(original.binding);
      expect(portable.storageKeys()).toEqual(original.storageKeys());
      expect(portable.decodeStorage(fixture.proof)).toEqual(original.decodeStorage(fixture.proof));
      for (const value of [
        request,
        {
          ...request,
          assetIn: request.assetOut,
          assetOut: request.assetIn,
          amountInCodec: MAX.toString(),
          quotedAmountOutCodec: MAX.toString(),
        },
      ]) {
        expect(portable.buildSwapEnvelope(value)).toEqual(original.buildSwapEnvelope(value));
        expect(portable.buildSwapEnvelope(value).callHex.slice(0, 6)).toBe('0x3307');
      }
      const info = hex(
        fixture.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '11' }).toU8a()
      );
      expect(portable.decodeQueryInfo(info)).toEqual(original.decodeQueryInfo(info));
      expect(browserExecution.assertHistoricalFeeDetailsMatchesQueryInfo(feeBytes(1, 7, 3), '11', '0')).toEqual(
        historicalExecution.assertHistoricalFeeDetailsMatchesQueryInfo(feeBytes(1, 7, 3), '11', '0')
      );
    }
  );

  it('preserves SCALE fee tip, None, saturation and exact minimum arithmetic', () => {
    const inputs = [
      feeBytes(1, 2, 3),
      hex(Buffer.concat([Uint8Array.of(0), le(0)])),
      hex(Buffer.concat([Uint8Array.of(1), le(MAX), le(MAX), le(MAX), le(7)])),
    ];
    for (const input of inputs)
      expect(browserExecution.decodeHistoricalFeeDetailsScale(input)).toEqual(
        historicalExecution.decodeHistoricalFeeDetailsScale(input)
      );
    for (const input of ['2', '201', '1000000000000000001', MAX.toString()])
      expect(browserExecution.historicalMinimumCodec(input)).toEqual(historicalExecution.historicalMinimumCodec(input));
    for (const malformed of ['0x', `${feeBytes(1, 2, 3)}00`, '0x00', `0x${'00'.repeat(65)}`])
      for (const codec of [browserExecution, historicalExecution])
        expect(() => codec.decodeHistoricalFeeDetailsScale(malformed)).toThrow();
    for (const malformed of ['0', '1', '01', (MAX + 1n).toString()])
      for (const codec of [browserExecution, historicalExecution])
        expect(() => codec.historicalMinimumCodec(malformed)).toThrow();
  });

  it.each([130, 131])('preserves runtime %s exact pool ratios and absent/missing/zero status', (version) => {
    const fixture = createHistoricalPoolFixture(42, 3, false, undefined, {}, 'HistoricalPool');
    fixture.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
    const original = historicalPool.createHistoricalExecutionPoolCodec(fixture.identity);
    const portable = browserPool.createHistoricalExecutionPoolCodec(fixture.identity);
    expect(portable.binding).toEqual(original.binding);
    expect(portable.storageKeys()).toEqual(original.storageKeys());
    for (const proof of [
      fixture.proof,
      { ...fixture.proof, properties: null, reserves: null },
      { ...fixture.proof, reserves: null },
      { ...fixture.proof, reserves: hex(Buffer.concat([le(0), le(3)])) },
      { ...fixture.proof, reserves: hex(Buffer.concat([le(MAX), le(1)])) },
    ])
      expect(portable.decodeStorage(proof)).toEqual(original.decodeStorage(proof));
    for (const ratio of [
      { numeratorCodec: '1', denominatorCodec: '3' },
      { numeratorCodec: '1', denominatorCodec: MAX.toString() },
      { numeratorCodec: MAX.toString(), denominatorCodec: '1' },
    ])
      expect(browserPool.roundHistoricalPoolRatioTo18(ratio)).toEqual(
        historicalPool.roundHistoricalPoolRatioTo18(ratio)
      );
  });

  it.each([130, 131])(
    'preserves runtime %s bounded envelope/policy hash and all allowed nonce/signature widths',
    (version) => {
      const fixture = createHistoricalFeeMetadataFixture();
      fixture.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
      const original = historicalFee.createHistoricalGoalFeeCodec(fixture.identity);
      const portable = browserFee.createHistoricalGoalFeeCodec(fixture.identity);
      expect(browserFee.HISTORICAL_GOAL_FEE_POLICY).toEqual(historicalFee.HISTORICAL_GOAL_FEE_POLICY);
      expect(portable.policySha256).toBe(original.policySha256);
      expect(portable.buildBoundSwapEnvelope(request, context)).toEqual(
        original.buildBoundSwapEnvelope(request, context)
      );
      for (const nonce of ['0', '63', '64', '16383', '16384', '1073741823', '1073741824', '4294967295'])
        for (const signature of [0, 1, 2]) {
          const envelope = candidate(fixture, nonce, signature);
          expect(portable.inspectSwapEnvelope(request, context, envelope)).toEqual(
            original.inspectSwapEnvelope(request, context, envelope)
          );
        }
      for (const envelope of [
        candidate(fixture, '0', 1, 32),
        candidate(fixture, '0', 1, 64, '1'),
        `${candidate(fixture, '0', 1)}00`,
      ])
        for (const codec of [original, portable])
          expect(() => codec.inspectSwapEnvelope(request, context, envelope)).toThrow();
    }
  );

  it('rejects identical malformed metadata, pool encodings, requests and BOM-prefixed token symbols', () => {
    for (const identity of [
      createHistoricalFeeMetadataFixture(42, 3, true).identity,
      createHistoricalFeeMetadataFixture(42, 3, false, 'UnknownExtension').identity,
      {
        ...createHistoricalFeeMetadataFixture().identity,
        runtimeVersion: { specVersion: 132, transactionVersion: 132 },
      },
    ])
      for (const make of [
        historicalExecution.createHistoricalExecutionCodec,
        browserExecution.createHistoricalExecutionCodec,
        historicalFee.createHistoricalGoalFeeCodec,
        browserFee.createHistoricalGoalFeeCodec,
      ])
        expect(() => make(identity)).toThrow();
    const wrongPool = createHistoricalPoolFixture(42, 3, false, undefined, {}, 'PoolXYK', { key: 29 });
    for (const make of [
      historicalPool.createHistoricalExecutionPoolCodec,
      browserPool.createHistoricalExecutionPoolCodec,
    ])
      expect(() => make(wrongPool.identity)).toThrow();
    const fixture = createHistoricalPoolFixture();
    for (const make of [
      historicalPool.createHistoricalExecutionPoolCodec,
      browserPool.createHistoricalExecutionPoolCodec,
    ]) {
      const codec = make(fixture.identity);
      for (const proof of [
        { ...fixture.proof, properties: null },
        { ...fixture.proof, reserves: '0x' },
        { ...fixture.proof, properties: `0x01${fixture.proof.properties.slice(2)}` },
      ])
        expect(() => codec.decodeStorage(proof)).toThrow();
    }
    const badToken = {
      ...fixture.proof,
      kusd: hex(fixture.registry.createType('Lookup18', { symbol: '0xefbbbf4b555344', precision: 18 }).toU8a()),
    };
    const baseProof = {
      timestamp: badToken.timestamp,
      denominator: badToken.denominator,
      kusd: badToken.kusd,
      xor: badToken.xor,
      dex0: badToken.dex0,
    };
    for (const make of [
      historicalExecution.createHistoricalExecutionCodec,
      browserExecution.createHistoricalExecutionCodec,
    ]) {
      const codec = make(fixture.identity);
      expect(() => codec.decodeStorage(baseProof)).toThrow();
      for (const bad of [
        { ...request, amountInCodec: '01' },
        { ...request, amountInCodec: (MAX + 1n).toString() },
        { ...request, assetOut: request.assetIn },
      ])
        expect(() => codec.buildSwapEnvelope(bad)).toThrow();
    }
  });

  it('builds and decodes browser values without the Node Buffer global', () => {
    const execution = createHistoricalFeeMetadataFixture();
    const pool = createHistoricalPoolFixture();
    const expected = {
      envelope: historicalExecution.createHistoricalExecutionCodec(execution.identity).buildSwapEnvelope(request),
      pool: historicalPool.createHistoricalExecutionPoolCodec(pool.identity).decodeStorage(pool.proof),
      fee: historicalFee.createHistoricalGoalFeeCodec(execution.identity).buildBoundSwapEnvelope(request, context),
      details: historicalExecution.decodeHistoricalFeeDetailsScale(feeBytes(1, 2, 3)),
    };
    const rawFee = feeBytes(1, 2, 3);
    let actual: unknown;
    vi.stubGlobal('Buffer', undefined);
    try {
      actual = {
        envelope: browserExecution.createHistoricalExecutionCodec(execution.identity).buildSwapEnvelope(request),
        pool: browserPool.createHistoricalExecutionPoolCodec(pool.identity).decodeStorage(pool.proof),
        fee: browserFee.createHistoricalGoalFeeCodec(execution.identity).buildBoundSwapEnvelope(request, context),
        details: browserExecution.decodeHistoricalFeeDetailsScale(rawFee),
      };
    } finally {
      vi.unstubAllGlobals();
    }
    expect(actual).toEqual(expected);
  });

  it('rejects metadata getters without invoking them and retains canonical fee signature rejection', () => {
    const fixture = createHistoricalFeeMetadataFixture();
    const getter = vi.fn();
    const poison = Object.defineProperty({ ...fixture.identity }, 'metadataHex', { enumerable: true, get: getter });
    for (const make of [
      browserExecution.createHistoricalExecutionCodec,
      browserPool.createHistoricalExecutionPoolCodec,
      browserFee.createHistoricalGoalFeeCodec,
    ])
      expect(() => make(poison)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const original = historicalFee.createHistoricalGoalFeeCodec(fixture.identity);
    const portable = browserFee.createHistoricalGoalFeeCodec(fixture.identity);
    const valid = fixture.registry.createType('Extrinsic', candidate(fixture, '0', 2)).toU8a();
    for (const tag of [3, 9]) {
      const modified = Uint8Array.from(valid);
      modified[35] = tag;
      for (const codec of [original, portable])
        expect(() => codec.inspectSwapEnvelope(request, context, u8aToHex(modified))).toThrow();
    }
  });
});
