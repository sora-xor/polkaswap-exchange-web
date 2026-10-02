// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import { feeBytes, hex } from './fixtures/historical-goal-bound-fee-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { createHistoricalGoalFeeCodec } from '../../../../scripts/bots/historical-goal-fee-codec';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import {
  accumulationEvidenceDigest,
  verifyAccumulationDecisionPacket,
  isVerifiedAccumulationDecisionPacket,
  AccumulationEvidenceError,
  type AccumulationTrustedSource,
  type AccumulationRpcReceipt,
} from '../../../../scripts/bots/accumulation-evidence-bridge';

const HOUR = 3600000,
  H = HOUR * 1000,
  UNIT = 10n ** 18n;
const endpoint = 'https://ws.mof.sora.org/' as const;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
afterEach(() => vi.unstubAllGlobals());

/** Only invented raw receipts; real codecs, no network or operational observations. */
function fixture(completedAt = H, denominator = '1') {
  const H = completedAt;
  const synthetic = createAccumulationEvidenceFixture(H + 1000);
  synthetic.proof.denominator = hex(synthetic.registry.createType('u128', denominator).toU8a());
  const identity = { ...synthetic.identity, blockHash: hash(100) };
  const codec = createHistoricalExecutionPoolCodec(identity),
    fee = createHistoricalGoalFeeCodec(identity),
    keys = codec.storageKeys();
  let id = 0;
  const rpc = (method: string, params: unknown[], result: unknown): AccumulationRpcReceipt => {
    const n = ++id,
      responseBody = JSON.stringify({ jsonrpc: '2.0', id: n, result });
    return {
      endpoint,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id: n, method, params }),
      responseBody,
      responseSha256: sha(responseBody),
      requestedAtMs: n * 10,
      completedAtMs: n * 10 + 1,
      httpStatus: 200,
      failure: null,
    };
  };
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const version = { specName: 'sora-substrate', ...identity.runtimeVersion };
  const contextRpc = [
    rpc('chain_getBlockHash', [0], GENESIS),
    rpc('chain_getBlockHash', [110], hash(110)),
    rpc('chain_getFinalizedHead', [], hash(120)),
    rpc('chain_getHeader', [hash(120)], header(120)),
    rpc('chain_getHeader', [hash(110)], header(110)),
    rpc('chain_getBlockHash', [100], hash(100)),
    rpc('chain_getHeader', [hash(100)], header(100)),
    rpc('chain_getBlockHash', [99], hash(99)),
    rpc('chain_getHeader', [hash(99)], header(99)),
    rpc('state_getRuntimeVersion', [hash(100)], version),
    rpc('state_getRuntimeVersion', [hash(99)], version),
    rpc('state_getMetadata', [hash(100)], identity.metadataHex),
    rpc('state_getMetadata', [hash(99)], identity.metadataHex),
    rpc('state_getStorageHash', ['0x3a636f6465', hash(100)], hash(902)),
    rpc(
      'state_queryStorageAt',
      [Object.values(keys), hash(100)],
      [
        {
          block: hash(100),
          changes: Object.entries(keys).map(([name, key]) => [
            key,
            synthetic.proof[name as keyof typeof synthetic.proof],
          ]),
        },
      ]
    ),
  ];
  const row = (symbol: string) => ({
    timestamp: H / 1000 - 1,
    denominator,
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: H / 1000,
      timestamp: H / 1000 - 1,
      symbol,
      requestedSymbol: symbol,
      decimals: 18,
      blockHeight: 99,
      blockHash: hash(99),
      nextBlockHeight: 100,
      nextBlockHash: hash(100),
      nextTimestamp: H / 1000 + 1,
      xorPool:
        symbol === 'XOR'
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: String(1000n * UNIT),
              targetAssetReserves: String(2000n * UNIT),
            },
    },
  });
  const closeRowsJson = JSON.stringify({ [KUSD]: [row('KUSD')], [XOR]: [row('XOR')] });
  const candidates = Array.from({ length: 9 }, (_, i) => {
    const amount = String(BigInt(i + 1) * UNIT),
      quoted = { amount, amount_without_impact: amount, fee: { [XOR]: '10' }, route: [KUSD, XOR], rewards: [] };
    const envelope = fee.buildBoundSwapEnvelope(
      { assetIn: KUSD, assetOut: XOR, amountInCodec: amount, quotedAmountOutCodec: amount },
      { blockNumber: 100 }
    );
    const info = hex(
      synthetic.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '6' }).toU8a()
    );
    return {
      inputKusd: i + 1,
      quoteReceivedAtMs: H + 2200,
      feeReceivedAtMs: H + 2500,
      expiresAtMs: H + 6000,
      rpc: [
        rpc(
          'liquidityProxy_quote',
          [0, KUSD, XOR, amount, 'WithDesiredInput', ['XYKPool'], 'AllowSelected', hash(100)],
          quoted
        ),
        rpc('state_call', ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, hash(100)], info),
        rpc(
          'state_call',
          ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, hash(100)],
          feeBytes(1, 2, 3)
        ),
      ],
    };
  });
  const packet = {
    block: { hash: hash(100), height: 100 },
    contextReceivedAtMs: H + 2100,
    decisionAtMs: H + 3000,
    contextRpc,
    closeRowsJson,
    candidates,
  };
  const trusted: AccumulationTrustedSource = {
    packetSha256: accumulationEvidenceDigest(packet),
    sourceRegistrationSha256: 'a'.repeat(64),
    endpoint,
    finalizedSource: { hash: hash(110), height: 110 },
    metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
    codeHash: hash(902),
    runtimeVersion: identity.runtimeVersion,
    denominator,
    completedClose: {
      timestampMs: H,
      availableAtMs: H + 2000,
      rawRowsSha256: sha(closeRowsJson),
      sourceReceiptSha256: 'b'.repeat(64),
    },
  };
  return { packet, trusted, synthetic, fee, rpc };
}
function repin(f: ReturnType<typeof fixture>) {
  f.trusted.packetSha256 = accumulationEvidenceDigest(f.packet);
  return f;
}
function response(receipt: AccumulationRpcReceipt, alter: (v: Record<string, any>) => void) {
  const body = JSON.parse(receipt.responseBody!);
  alter(body);
  receipt.responseBody = JSON.stringify(body);
  receipt.responseSha256 = sha(receipt.responseBody);
}
function request(receipt: AccumulationRpcReceipt, alter: (v: Record<string, any>) => void) {
  const body = JSON.parse(receipt.requestBody);
  alter(body);
  receipt.requestBody = JSON.stringify(body);
}

describe('offline accumulation evidence bridge', () => {
  it('reconstructs all nine native quotes, original minima, fee SCALE and separate close/current prices without fetch', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw Error('network forbidden');
      })
    );
    const f = fixture(),
      result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
    expect(isVerifiedAccumulationDecisionPacket(result)).toBe(true);
    expect(result.packet.currentPrice).toEqual({ numerator: '1', denominator: '1' });
    expect(result.packet.latestCompletedClose?.price).toEqual({ numerator: '2', denominator: '1' });
    expect(result.packet.candidates.map((v) => v.inputKusd)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.packet.candidates.every((v) => v.status === 'ready')).toBe(true);
    expect(result.packet.candidates[8].quote).toMatchObject({
      minimumOutputXorCodec: '8955000000000000000',
      networkFeeXorCodec: '6',
      quoteReceivedAtMs: H + 2200,
      feeReceivedAtMs: H + 2500,
      priceImpact: { numerator: '0', denominator: '1' },
    });
    expect(result.actualPaidFeeVerified).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it('keeps unavailable routes and all outcomes without creating zero-fee quotes', () => {
    const f = fixture();
    response(f.packet.candidates[4].rpc[0], (b) => {
      b.result = null;
    });
    f.packet.candidates[4].rpc.splice(1);
    repin(f);
    const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
    expect(result.packet.status).toBe('verified');
    expect(result.packet.candidates[4]).toMatchObject({
      status: 'unavailable',
      quote: null,
      reason: 'native-null-route',
    });
    expect(result.packet.candidates).toHaveLength(9);
  });
  it('retains over-impact quote and authenticated fee for the frozen policy to reject', () => {
    const f = fixture();
    response(f.packet.candidates[0].rpc[0], (b) => {
      b.result.amount_without_impact = '2000000000000000000';
    });
    repin(f);
    const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
    expect(result.packet.status).toBe('verified');
    expect(result.packet.candidates[0]).toMatchObject({
      status: 'rejected-impact',
      quote: { networkFeeXorCodec: '6', priceImpact: { numerator: '1', denominator: '2' } },
    });
  });
  it('rejects altered bytes against independent trusted packet and runtime pins', () => {
    const f = fixture();
    f.packet.candidates[0].expiresAtMs++;
    expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(/trusted-packet/);
    repin(f);
    f.trusted.metadataSha256 = 'c'.repeat(64);
    expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(/metadata-binding/);
  });

  it('does not coerce array-valued trusted source or publication pins', () => {
    for (const publication of [false, true]) {
      const f = fixture();
      if (publication) f.trusted.completedClose!.sourceReceiptSha256 = ['b'.repeat(64)] as unknown as string;
      else f.trusted.sourceRegistrationSha256 = ['a'.repeat(64)] as unknown as string;
      expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(AccumulationEvidenceError);
    }
  });
  it('rejects canonical state, finalized anchor, runtime, storage and denomination contradictions', () => {
    for (const [index, alter] of [
      [
        1,
        (b: any) => {
          b.result = hash(111);
        },
      ],
      [
        6,
        (b: any) => {
          b.result.number = '0x63';
        },
      ],
      [
        10,
        (b: any) => {
          b.result.specVersion = 131;
        },
      ],
      [
        13,
        (b: any) => {
          b.result = hash(903);
        },
      ],
      [
        14,
        (b: any) => {
          b.result[0].block = hash(99);
        },
      ],
    ] as const) {
      const f = fixture();
      response(f.packet.contextRpc[index], alter);
      repin(f);
      expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(AccumulationEvidenceError);
    }
    const f = fixture();
    f.trusted.denominator = '2';
    expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(/denomination/);
  });
  it('requires exactly the canonical nine sizes and no extra common RPC receipts', () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => f.packet.candidates.pop(),
      (f: ReturnType<typeof fixture>) => {
        f.packet.candidates[1].inputKusd = 1;
      },
      (f: ReturnType<typeof fixture>) => f.packet.contextRpc.push(clone(f.packet.contextRpc[0])),
    ]) {
      const f = fixture();
      mutate(f);
      repin(f);
      expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(AccumulationEvidenceError);
    }
  });
  it('retains transport and JSON-RPC failures as incomplete entire decisions, never unavailable', () => {
    for (const mutate of [
      (r: AccumulationRpcReceipt) => {
        r.failure = 'timeout';
        r.httpStatus = null;
        r.responseBody = null;
        r.responseSha256 = null;
      },
      (r: AccumulationRpcReceipt) =>
        response(r, (b) => {
          delete b.result;
          b.error = { code: -1, message: 'unavailable' };
        }),
      (r: AccumulationRpcReceipt) => {
        r.responseBody = 'malformed';
        r.responseSha256 = sha('malformed');
      },
    ]) {
      const f = fixture();
      mutate(f.packet.candidates[1].rpc[0]);
      repin(f);
      const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
      expect(result.packet.status).toBe('incomplete');
      expect(result.packet.candidates[1].status).toBe('failed');
      expect(result.packet.candidates[1].reason).toMatch(/^[a-zA-Z0-9_-]{1,96}$/);
      expect(result.packet.candidates[1].quote).toBeNull();
      expect(result.packet.candidates.filter((v) => v.status === 'ready')).toHaveLength(8);
      expect(isVerifiedAccumulationDecisionPacket(result)).toBe(false);
      expect(result.retainedEvidence).toEqual(f.packet);
    }
  });
  it('binds quote input/state/route and original minimum envelope, not just response hashes', () => {
    for (const mutate of [
      (r: AccumulationRpcReceipt[]) =>
        request(r[0], (b) => {
          b.params[3] = '2000000000000000000';
        }),
      (r: AccumulationRpcReceipt[]) =>
        request(r[0], (b) => {
          b.params[7] = hash(99);
        }),
      (r: AccumulationRpcReceipt[]) =>
        response(r[0], (b) => {
          b.result.route = [XOR, KUSD];
        }),
      (r: AccumulationRpcReceipt[]) =>
        response(r[0], (b) => {
          b.result.amount = '2000000000000000000';
          b.result.amount_without_impact = b.result.amount;
        }),
      (r: AccumulationRpcReceipt[]) =>
        request(r[1], (b) => {
          b.params[2] = hash(99);
        }),
    ]) {
      const f = fixture();
      mutate(f.packet.candidates[0].rpc);
      repin(f);
      const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
      expect(result.packet.status).toBe('incomplete');
      expect(result.packet.candidates[0].status).toBe('failed');
    }
  });
  it('requires both bound fee responses to agree and rejects missing or extra candidate evidence', () => {
    for (const mutate of [
      (r: AccumulationRpcReceipt[]) =>
        response(r[2], (b) => {
          b.result = feeBytes(1, 2, 4);
        }),
      (r: AccumulationRpcReceipt[]) => r.pop(),
      (r: AccumulationRpcReceipt[]) => r.push(clone(r[0])),
    ]) {
      const f = fixture();
      mutate(f.packet.candidates[2].rpc);
      repin(f);
      expect(verifyAccumulationDecisionPacket(f.packet, f.trusted).packet.status).toBe('incomplete');
    }
  });
  it('never lets later fees refresh original quote or context age, and rejects future receipts', () => {
    for (const change of [
      { quoteReceivedAtMs: H + 3001 },
      { feeReceivedAtMs: H + 3001 },
      { quoteReceivedAtMs: H - 2000 },
      { feeReceivedAtMs: H + 2100 },
      { expiresAtMs: H + 3000 },
    ]) {
      const f = fixture();
      Object.assign(f.packet.candidates[0], change);
      repin(f);
      expect(verifyAccumulationDecisionPacket(f.packet, f.trusted).packet.status).toBe('incomplete');
    }
    const f = fixture();
    f.packet.contextReceivedAtMs = H + 1000;
    f.packet.decisionAtMs = H + 6000;
    for (const q of f.packet.candidates) {
      q.quoteReceivedAtMs = H + 5900;
      q.feeReceivedAtMs = H + 5950;
      q.expiresAtMs = H + 9000;
    }
    repin(f);
    expect(verifyAccumulationDecisionPacket(f.packet, f.trusted).diagnostics).toContain('stale-context-or-block');
  });
  it('requires independently bound completed-hour bytes and publication before decision', () => {
    const f = fixture();
    delete f.trusted.completedClose;
    const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
    expect(result.packet.status).toBe('incomplete');
    expect(result.packet.latestCompletedClose).toBeNull();
    for (const mutate of [
      (v: ReturnType<typeof fixture>) => {
        v.trusted.completedClose!.rawRowsSha256 = 'e'.repeat(64);
      },
      (v: ReturnType<typeof fixture>) => {
        v.trusted.completedClose!.availableAtMs = H + 3001;
      },
      (v: ReturnType<typeof fixture>) => {
        const rows = JSON.parse(v.packet.closeRowsJson);
        rows[KUSD][0].closeEvidence.nextBlockHash = hash(102);
        v.packet.closeRowsJson = JSON.stringify(rows);
        v.trusted.completedClose!.rawRowsSha256 = sha(v.packet.closeRowsJson);
        repin(v);
      },
    ]) {
      const changed = fixture();
      mutate(changed);
      expect(() => verifyAccumulationDecisionPacket(changed.packet, changed.trusted)).toThrow(
        AccumulationEvidenceError
      );
    }
  });
  it('does not transfer verifier ownership through JSON and detaches all input data', () => {
    const f = fixture(),
      result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
    expect(isVerifiedAccumulationDecisionPacket(clone(result))).toBe(false);
    expect(Object.isFrozen(result.packet.candidates[0])).toBe(true);
    f.packet.candidates[0].quoteReceivedAtMs = 0;
    expect(result.packet.candidates[0].quote?.quoteReceivedAtMs).toBe(H + 2200);
    const getter = vi.fn();
    const bad = Object.defineProperty({}, 'block', { get: getter, enumerable: true });
    expect(() => verifyAccumulationDecisionPacket(bad, f.trusted)).toThrow(/accessor/);
    expect(getter).not.toHaveBeenCalled();
  });

  it('rejects repinned duplicate raw JSON keys including escaped aliases and preserves failed outcomes', () => {
    for (const mutate of [
      (r: AccumulationRpcReceipt) => {
        r.requestBody = r.requestBody.replace('"id":', '"id":999,"id":');
      },
      (r: AccumulationRpcReceipt) => {
        r.responseBody = r.responseBody!.replace('"result":', '"result":null,"result":');
      },
      (r: AccumulationRpcReceipt) => {
        r.responseBody = r.responseBody!.replace('"amount":', '"amount":"1","\\u0061mount":');
      },
    ]) {
      const f = fixture();
      const raw = f.packet.candidates[0].rpc[0];
      mutate(raw);
      raw.responseSha256 = sha(raw.responseBody!);
      repin(f);
      const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
      expect(result.packet.status).toBe('incomplete');
      expect(result.packet.candidates[0]).toMatchObject({
        status: 'failed',
        reason: 'duplicate-json-key',
        quote: null,
      });
      expect(result.retainedEvidence).toEqual(f.packet);
    }
    const f = fixture();
    f.packet.closeRowsJson = f.packet.closeRowsJson.replace('"timestamp":', '"timestamp":0,"timestamp":');
    f.trusted.completedClose!.rawRowsSha256 = sha(f.packet.closeRowsJson);
    repin(f);
    expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(/duplicate-json-key/);
  });

  it('checks finalized block age at inclusive 60000ms and never accepts prepublished close data', () => {
    for (const age of [60000, 60001]) {
      const f = fixture();
      const now = H + 1000 + age;
      f.packet.decisionAtMs = now;
      f.packet.contextReceivedAtMs = now - 1000;
      for (const candidate of f.packet.candidates) {
        candidate.quoteReceivedAtMs = now - 500;
        candidate.feeReceivedAtMs = now - 100;
        candidate.expiresAtMs = now + 1000;
      }
      repin(f);
      expect(verifyAccumulationDecisionPacket(f.packet, f.trusted).packet.status).toBe(
        age === 60000 ? 'verified' : 'incomplete'
      );
    }
    const f = fixture();
    f.trusted.completedClose!.availableAtMs = H - 1;
    expect(() => verifyAccumulationDecisionPacket(f.packet, f.trusted)).toThrow(/availability/);
  });

  it('rejects fractional and exponent raw JSON lexemes before integer rounding can hide them', () => {
    for (const rawId of ['1.00000000000000001', '9007199254740990.5', '1e0', '1.0', '9007199254740992']) {
      const f = fixture(),
        receipt = f.packet.candidates[0].rpc[0];
      receipt.requestBody = receipt.requestBody.replace(/"id":\d+/, `"id":${rawId}`);
      receipt.responseBody = receipt.responseBody!.replace(/"id":\d+/, `"id":${rawId}`);
      receipt.responseSha256 = sha(receipt.responseBody);
      repin(f);
      const result = verifyAccumulationDecisionPacket(f.packet, f.trusted);
      expect(result.packet.status).toBe('incomplete');
      expect(result.packet.candidates[0]).toMatchObject({
        status: 'failed',
        reason: 'inexact-json-number',
        quote: null,
      });
      expect(result.retainedEvidence).toEqual(f.packet);
    }
  });

  it('hands real verifier projections to the Python runner with pinned synthetic model bytes only', () => {
    const epoch = 1785261600000 + HOUR,
      denominator = '100000000000000000000000000000000000000';
    const available = fixture(epoch, denominator);
    response(available.packet.candidates[4].rpc[0], (b) => {
      b.result = null;
    });
    available.packet.candidates[4].rpc.splice(1);
    const failed = fixture(epoch, denominator);
    failed.packet.candidates[0].rpc[0].failure = 'synthetic-transport-failure';
    const impact = fixture(epoch, denominator);
    response(impact.packet.candidates[0].rpc[0], (b) => {
      b.result.amount_without_impact = '2000000000000000000';
    });
    const results = [available, failed, impact].map((f) => {
      repin(f);
      return verifyAccumulationDecisionPacket(f.packet, f.trusted);
    });
    expect(results.map(isVerifiedAccumulationDecisionPacket)).toEqual([true, false, true]);
    const harness = fileURLToPath(new URL('./fixtures/accumulation-runner-handoff.py', import.meta.url));
    const child = spawnSync('python3', ['-I', '-S', '-B', harness], {
      input: JSON.stringify(results.map((result) => result.packet)),
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr).toBe(0);
    const outputs = JSON.parse(child.stdout);
    expect(outputs).toHaveLength(3);
    for (const [index, output] of outputs.entries()) {
      expect(output.candidateOutcomes).toEqual(results[index].packet.candidates);
      expect(output).toMatchObject({ financialActions: false, qualificationAuthority: false });
    }
    expect(outputs[0]).toMatchObject({ status: 'evaluated', policyCalled: true });
    expect(outputs[0].candidateOutcomes[4]).toMatchObject({ status: 'unavailable', quote: null });
    expect(outputs[1]).toMatchObject({ status: 'incomplete', policyCalled: false, decision: null });
    expect(outputs[2]).toMatchObject({ status: 'evaluated', policyCalled: true });
    expect(outputs[2].candidateOutcomes[0]).toMatchObject({
      status: 'rejected-impact',
      quote: { networkFeeXorCodec: '6' },
    });
  }, 65000);
});
