import { describe, expect, it } from 'vitest';
import { FPNumber } from '../../../../src/lib/substrate/math';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_INPUT_CODEC,
  EXECUTION_EVIDENCE_KUSD as KUSD,
  EXECUTION_EVIDENCE_XOR as XOR,
  canonicalEvidenceJson,
  hashEvidence,
  normalizeExecutionQuote,
  type ExecutionContext,
  type ExecutionQuote,
  type ExecutionSnapshot,
} from '../../../../scripts/bots/execution-evidence';
import {
  createExecutionManifest,
  validateExecutionJournal,
  type ExecutionManifest,
  type ExecutionOutcome,
  type ExecutionRecord,
} from '../../../../scripts/bots/execution-store';
import {
  EXECUTION_EPISODE_DURATION_MS,
  replayExecutionEpisode,
  type ExecutionEpisodePolicy,
} from '../../../../scripts/bots/execution-replay';

const START = 2_000_000;
const HOUR = 3_600_000;

/** Synthetic exact decimal input; no floating-point token arithmetic or external observations. */
function codec(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  if (!/^\d+$/.test(whole) || !/^\d{0,18}$/.test(fraction)) throw new Error('Invalid test amount');
  return (BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))).toString();
}

interface SampleOptions {
  impactFree?: string;
  output?: string;
  fee?: string;
  durationMs?: number;
  block?: number;
  blockHash?: string;
  finalizedAt?: number;
  denominator?: string;
  timed?: boolean;
  sellOutput?: string;
}

function snapshot(slotAt: number, index: number, options: SampleOptions = {}): ExecutionSnapshot {
  const block = options.block ?? 100 + index;
  const blockHash = options.blockHash ?? `0x${block.toString(16).padStart(64, '0')}`;
  const context: ExecutionContext = {
    endpoint: EXECUTION_EVIDENCE_ENDPOINT,
    genesisHash: EXECUTION_EVIDENCE_GENESIS,
    blockHash,
    blockNumber: block,
    finalizedAt: options.finalizedAt ?? slotAt,
    denominator: options.denominator ?? '1',
    specVersion: 131,
    transactionVersion: 3,
    metadataHashAlgorithm: 'sha256',
    metadataHash: 'a'.repeat(64),
    metadataFormatVersion: 16,
    metadataReadMethod: 'Metadata_metadata_at_version',
    dexId: 0,
    allowedSourceTypes: ['XYKPool'],
    filterMode: 'AllowSelected',
    poolIdentity: 'synthetic-exact-kusd-xor-pool',
  };
  const quote = (sell: boolean, input: string): ExecutionQuote => {
    const assetIn = sell ? XOR : KUSD;
    const assetOut = sell ? KUSD : XOR;
    const output = codec(sell ? (options.sellOutput ?? '5') : (options.output ?? options.impactFree ?? '1'));
    const impactFree = codec(sell ? (options.sellOutput ?? '5') : (options.impactFree ?? '1'));
    const fee = codec(options.fee ?? '0.1');
    return normalizeExecutionQuote({
      blockHash,
      assetIn,
      assetOut,
      assetInDecimals: 18,
      assetOutDecimals: 18,
      amountInCodec: input,
      amountOutCodec: output,
      amountWithoutImpactCodec: impactFree,
      route: [assetIn, assetOut],
      routeFees: [],
      rawQuoteJson: { amount: output, amountWithoutImpact: impactFree, route: [assetIn, assetOut], fee: {} },
      fee: {
        partialFeeCodec: fee,
        baseFeeCodec: fee,
        lenFeeCodec: '0',
        adjustedWeightFeeCodec: '0',
        tipCodec: '0',
        encodedLength: 208,
        callHex: '0x01020304',
        envelopeHashAlgorithm: 'sha256',
        envelopeHash: 'e'.repeat(64),
        blockHash,
        runtimeVersion: { specVersion: 131, transactionVersion: 3 },
        rawQueryInfo: { partialFee: fee },
        rawFeeDetails: { inclusionFee: { baseFee: fee, lenFee: '0', adjustedWeightFee: '0' }, tip: '0' },
      },
    });
  };
  const buy = quote(false, EXECUTION_EVIDENCE_INPUT_CODEC);
  return {
    schemaVersion: 1,
    purpose: 'development',
    slotAt,
    requestStartedAt: slotAt,
    requestFinishedAt: slotAt + (options.durationMs ?? 1000),
    context,
    buy,
    sell: quote(true, buy.minimumCodec),
    reverseLot: { kind: 'same-block-buy-minimum' },
    ...(options.timed === false
      ? {}
      : {
          quoteTiming: {
            buy: { startedAt: slotAt + 100, finishedAt: slotAt + 200 },
            sell: { startedAt: slotAt + 300, finishedAt: slotAt + 400 },
          },
        }),
  };
}

interface Dataset {
  manifest: ExecutionManifest;
  records: ExecutionRecord[];
}

/** Rehash after deliberate synthetic changes, so lineage checks do not hide a semantic validation failure. */
function rechain(dataset: Dataset): Dataset {
  let previousHash = hashEvidence(dataset.manifest);
  dataset.records = dataset.records.map((record) => {
    const { recordHash: _oldHash, ...body } = record;
    const next = { ...body, previousHash };
    const result = { ...next, recordHash: hashEvidence(next) } as ExecutionRecord;
    previousHash = result.recordHash;
    return result;
  });
  return dataset;
}

function dataset(
  samples: Array<SampleOptions | 'error' | 'missed'>,
  options: { cadenceMs?: number; slots?: number; legacy?: boolean } = {}
): Dataset {
  const cadenceMs = options.cadenceMs ?? 60000;
  const manifest = createExecutionManifest(
    { startAt: START, slots: options.slots ?? samples.length, cadenceMs },
    { syntheticFixture: 'a'.repeat(64) },
    { nonce: 0 },
    START - 1000
  );
  if (options.legacy) delete manifest.quoteTiming;
  const records = samples.map((sample, index) => {
    const slotAt = START + index * cadenceMs;
    let outcome: ExecutionOutcome;
    if (sample === 'error')
      outcome = {
        status: 'error',
        code: 'observation',
        message: 'Synthetic unavailable quote',
        progress: { stage: 'buy' },
      };
    else if (sample === 'missed') outcome = { status: 'missed', reason: 'start-deadline-exceeded' };
    else outcome = { status: 'complete', snapshot: snapshot(slotAt, index, sample) };
    return {
      ...outcome,
      slotAt,
      recordedAt: outcome.status === 'complete' ? outcome.snapshot.requestFinishedAt + 1 : slotAt + 6000,
      previousHash: '',
      recordHash: '',
    } as ExecutionRecord;
  });
  return rechain({ manifest, records });
}

function replay(data: Dataset, policy: ExecutionEpisodePolicy = 'seed-once') {
  return replayExecutionEpisode(data.manifest, data.records, policy);
}

function complete(data: Dataset, index: number): ExecutionSnapshot {
  const record = data.records[index];
  if (record.status !== 'complete') throw new Error('Expected synthetic complete record');
  return record.snapshot;
}

describe('causal development execution episodes', () => {
  it('validates synthetic raw quotes and hash chain, then buys only at the later quote', () => {
    const data = dataset([{}, { output: '0.99' }, { output: '0.98' }]);
    expect(() => validateExecutionJournal(data.manifest, data.records)).not.toThrow();
    const before = canonicalEvidenceJson(data);
    const result = replay(data);
    expect(result.decisions).toBe(1);
    expect(result.scenarioBuys).toBe(1);
    expect(result.events.filter((event) => event.kind === 'decision')).toMatchObject([
      { slot: 0, availableAt: START + 1000 },
    ]);
    expect(result.events.filter((event) => event.kind === 'scenario-fill')).toMatchObject([
      { slot: 1, decisionSlot: 0, availableAt: START + 61000 },
    ]);
    // Uses slot 1's 0.98505 minimum once, with one 0.1 XOR fee and half the input retained.
    expect(result.finalHoldings).toEqual({
      kusdCodec: codec('5'),
      xorCodec: codec('1.88505'),
      feesPaidXorCodec: codec('0.1'),
    });
    expect(result.performance).toMatchObject({ initialValue: '3', finalValue: '2.88505' });
    expect(result.qualifiedStrategy).toBe(false);
    expect(result.actualTransactions).toBe(0);
    expect(canonicalEvidenceJson(data)).toBe(before);
  });

  it('keeps exact codecs above JavaScript safe integer range and charges neither slippage nor route costs twice', () => {
    const data = dataset([{}, { output: '0.999999999999999999', fee: '0.100000000000000001' }]);
    const quote = complete(data, 1).buy;
    quote.routeFees = [{ assetAddress: XOR, amountCodec: codec('0.001') }];
    quote.rawQuoteJson = { ...(quote.rawQuoteJson as Record<string, unknown>), fee: { [XOR]: codec('0.001') } };
    rechain(data);
    const result = replay(data);
    const later = complete(data, 1).buy;
    expect(result.finalHoldings.xorCodec).toBe(
      (10n ** 18n + BigInt(later.minimumCodec) - BigInt(later.fee.partialFeeCodec)).toString()
    );
    expect(result.finalHoldings.kusdCodec).toBe(codec('5'));
    expect(result.finalHoldings.feesPaidXorCodec).toBe('100000000000000001');
  });

  it('reports an unobserved next slot without filling at its own decision quote', () => {
    const result = replay(dataset([{}], { slots: 3 }));
    expect(result.decisions).toBe(1);
    expect(result.scenarioBuys).toBe(0);
    expect(result.pendingDecision).toEqual({ decisionSlot: 0, dueSlot: 1, decidedAt: START + 1000 });
    expect(result.events.some((event) => event.kind === 'rejected')).toBe(false);
    expect(result.status).toBe('prefix-only');
    expect(result.coverage).toBe('0.333333333333333333333333333333333333');
    expect(result.finalHoldings.kusdCodec).toBe(codec('10'));
  });

  it.each(['error', 'missed'] as const)(
    'consumes a %s next slot without hunting for a later favorable quote',
    (gap) => {
      const result = replay(dataset([{}, gap, { impactFree: '1.01' }, {}]));
      expect(result.missingSlots).toEqual([1]);
      expect(result.scenarioBuys).toBe(0);
      expect(result.decisions).toBe(1);
      expect(result.events.find((event) => event.kind === 'rejected')).toMatchObject({
        slot: 1,
        reason: 'next-slot-unavailable',
      });
      expect(result.finalHoldings).toEqual({ kusdCodec: codec('10'), xorCodec: codec('1'), feesPaidXorCodec: '0' });
    }
  );

  it.each([5100, 10000])('rejects a %ims quote request-to-receipt interval and never retries', (durationMs) => {
    const result = replay(dataset([{}, { durationMs }, {}]));
    expect(result.scenarioBuys).toBe(0);
    expect(result.decisions).toBe(1);
    expect(result.events.find((event) => event.kind === 'rejected')).toMatchObject({
      slot: 1,
      reason: 'quote-too-old-at-availability',
    });
  });

  it('accepts a 4,999ms interval, keeping source finalization separate from quote availability', () => {
    const result = replay(dataset([{}, { durationMs: 5099, finalizedAt: START + 100 }]));
    expect(result.scenarioBuys).toBe(1);
    expect(result.events.find((event) => event.kind === 'scenario-fill')?.availableAt).toBe(START + 65099);
  });

  it('requires an advancing block even when the later request and receipt are timely', () => {
    const result = replay(dataset([{}, { block: 100, finalizedAt: START }, {}]));
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('quote-not-after-decision');
  });

  it('keeps legacy untimed snapshots descriptive without treating them as execution evidence', () => {
    const result = replay(dataset([{ timed: false }, { timed: false }, {}], { legacy: true }));
    expect(result.untimedSlots).toEqual([0, 1]);
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('quote-timing-unavailable');
    expect(result.fullEpisodeEvidence).toBe(false);
  });

  it('does not replace unavailable funding with a later complete slot', () => {
    const result = replay(dataset(['error', {}, {}]));
    expect(result.status).toBe('opening-unavailable');
    expect(result.fundedAt).toBeUndefined();
    expect(result.decisions).toBe(0);
    expect(result.scenarioBuys).toBe(0);
    expect(result.missingSlots).toContain(0);
  });
});

describe('runtime-equivalent goal and cost semantics', () => {
  it.each([
    ['positive', '0.969999999999999999'],
    ['negative', '1.030000000000000001'],
  ] as const)('rejects %s absolute price impact just beyond 3%% without charging a fee', (_sign, output) => {
    const result = replay(dataset([{}, { output }, {}]));
    expect(result.scenarioBuys).toBe(0);
    expect(result.decisions).toBe(1);
    expect(result.events.find((event) => event.kind === 'rejected')).toMatchObject({
      slot: 1,
      reason: 'price-impact-limit',
    });
    expect(result.finalHoldings).toEqual({ kusdCodec: codec('10'), xorCodec: codec('1'), feesPaidXorCodec: '0' });
    expect(result.goalState?.outcome).toBe('active');
  });

  it.each([
    ['positive', '0.97'],
    ['negative', '1.03'],
  ] as const)('accepts exactly 3%% %s absolute price impact when cost admission also passes', (_sign, output) => {
    const data = dataset([{}, { output }]);
    const result = replay(data);
    expect(result.scenarioBuys).toBe(1);
    expect(result.events.some((event) => event.kind === 'rejected')).toBe(false);
    expect(result.finalHoldings.xorCodec).toBe(
      (BigInt(codec('1')) + BigInt(complete(data, 1).buy.minimumCodec) - BigInt(codec('0.1'))).toString()
    );
  });

  it.each([
    ['target', '1.075'],
    ['loss', '0.925'],
  ] as const)('latches exact 5%% %s before a pending first fill, despite a later recovery', (outcome, impactFree) => {
    const result = replay(dataset([{}, { impactFree }, {}]));
    expect(result.goalState?.outcome).toBe(outcome);
    expect(result.goalState?.completedAt).toBe(START + 61000);
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('goal-already-terminal');
    expect(result.goalState?.baselineValue).toBe('3');
  });

  it('marks peak while waiting and rejects projected trade cost against that peak without inventing holdings', () => {
    const result = replay(
      dataset([{}, { impactFree: '1.06', output: '1.06' }, { impactFree: '1', output: '1.02' }]),
      'improved-net-acquisition-once'
    );
    expect(result.decisions).toBe(1);
    expect(result.goalState?.peakValue).toBe('3.12');
    expect(result.goalState?.baselineValue).toBe('3');
    expect(result.goalState?.lastValue).toBe('3');
    expect(result.goalState?.outcome).toBe('active');
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('bots.errors.goalTradeCost');
    expect(result.finalHoldings).toEqual({ kusdCodec: codec('10'), xorCodec: codec('1'), feesPaidXorCodec: '0' });
  });

  it('blocks projected success at exactly the 5% drawdown threshold', () => {
    // 3 XOR opening, 0.005 XOR slippage + 0.145 XOR network fee = exactly 0.15 XOR loss.
    const result = replay(dataset([{}, { fee: '0.145' }]));
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('bots.errors.goalTradeCost');
    expect(result.goalState?.lastValue).toBe('3');
    expect(result.goalState?.outcome).toBe('active');
  });

  it('checks the fee-only branch even when quoted success stays within the loss limit', () => {
    const result = replay(dataset([{}, { output: '1.03', fee: '0.15' }]));
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')?.reason).toBe('bots.errors.goalTradeCost');
    expect(result.finalHoldings.feesPaidXorCodec).toBe('0');
  });

  it('models a fee-only failure with unchanged input, one fee debit and no retry or acquisition', () => {
    const data = dataset([{}, {}, {}]);
    const result = replayExecutionEpisode(data.manifest, data.records, 'seed-once', 'fee-only-failure');
    expect(result.scenarioBuys).toBe(0);
    expect(result.scenarioFailures).toBe(1);
    expect(result.decisions).toBe(1);
    expect(result.finalHoldings).toEqual({
      kusdCodec: codec('10'),
      xorCodec: codec('0.9'),
      feesPaidXorCodec: codec('0.1'),
    });
    expect(result.performance?.finalValue).toBe('2.9');
    expect(result.events.filter((event) => event.kind === 'scenario-failure')).toMatchObject([
      { slot: 1, decisionSlot: 0 },
    ]);
    expect(result.qualifiedStrategy).toBe(false);
    expect(result.actualTransactions).toBe(0);
  });

  it('preserves target latch while retained inventory suffers later marked losses, without using reverse quotes as exits', () => {
    const result = replay(dataset([{}, {}, { impactFree: '1.3' }, { impactFree: '0.5', sellOutput: '999' }]));
    expect(result.scenarioBuys).toBe(1);
    expect(result.goalState?.outcome).toBe('target');
    expect(result.goalState?.lastValue).toBe('3.195');
    expect(result.goalState?.peakValue).toBe('3.195');
    expect(result.performance?.finalValue).toBe('2.395');
    expect(new FPNumber(result.performance!.drawdownPercent, 36).gt(new FPNumber('25'))).toBe(true);
    expect(result.finalHoldings).toEqual({
      kusdCodec: codec('5'),
      xorCodec: codec('1.895'),
      feesPaidXorCodec: codec('0.1'),
    });
    expect(result.events.at(-1)).toMatchObject({ kind: 'mark', valueXor: '2.395', goalOutcome: 'target' });
  });

  it('keeps the idle control fully funded, with mark returns distinct from XOR acquired', () => {
    const result = replay(dataset([{}, { impactFree: '1.02' }, { impactFree: '1.01' }]), 'idle');
    expect(result.decisions).toBe(0);
    expect(result.scenarioBuys).toBe(0);
    expect(result.finalHoldings).toEqual({ kusdCodec: codec('10'), xorCodec: codec('1'), feesPaidXorCodec: '0' });
    expect(result.performance?.finalValue).toBe('3.02');
    expect(result.goalState?.peakValue).toBe('3.04');
    expect(result.performance?.returnPercent).not.toBe('0');
  });
});

describe('the declared funding-net acquisition hypothesis', () => {
  it('compares net minimum against funding net quote, not fee-free opening principal, then executes a later quote', () => {
    const result = replay(
      dataset([{}, { impactFree: '1.01' }, { impactFree: '1.02' }, {}]),
      'improved-net-acquisition-once'
    );
    expect(result.events.filter((event) => event.kind === 'decision')).toMatchObject([{ slot: 1 }]);
    expect(result.events.filter((event) => event.kind === 'scenario-fill')).toMatchObject([
      { slot: 2, decisionSlot: 1 },
    ]);
    expect(result.finalHoldings.xorCodec).toBe(codec('1.9149'));
    // Net acquisition is 0.9149 XOR, below the original 1 XOR principal equivalent: this is a different hypothesis.
    expect(BigInt(result.finalHoldings.xorCodec) - BigInt(codec('1'))).toBeLessThan(BigInt(codec('1')));
    expect(result.qualifiedStrategy).toBe(false);
  });

  it('rechecks the same cost hurdle at execution and does not retry if the advantage vanishes', () => {
    const result = replay(
      dataset([{}, { impactFree: '1.01' }, {}, { impactFree: '1.02' }]),
      'improved-net-acquisition-once'
    );
    expect(result.decisions).toBe(1);
    expect(result.scenarioBuys).toBe(0);
    expect(result.events.find((event) => event.kind === 'rejected')).toMatchObject({
      slot: 2,
      reason: 'net-acquisition-advantage-disappeared',
    });
  });

  it('uses each quote own network fee rather than comparing raw acquisition outputs', () => {
    const result = replay(
      dataset([{}, { impactFree: '1.01', fee: '0.11' }, { impactFree: '1.02', fee: '0.12' }]),
      'improved-net-acquisition-once'
    );
    expect(result.decisions).toBe(0);
    expect(result.scenarioBuys).toBe(0);
  });

  it('does not enter when an improved acquisition quote arrives after the target has latched', () => {
    const result = replay(
      dataset([{}, { impactFree: '1.08' }, { impactFree: '1.02' }]),
      'improved-net-acquisition-once'
    );
    expect(result.goalState?.outcome).toBe('target');
    expect(result.decisions).toBe(0);
    expect(result.scenarioBuys).toBe(0);
  });

  it('does not initiate a new decision after an unobserved risk gap', () => {
    const result = replay(
      dataset([{}, 'error', { impactFree: '1.01' }, { impactFree: '1.02' }]),
      'improved-net-acquisition-once'
    );
    expect(result.decisions).toBe(0);
    expect(result.scenarioBuys).toBe(0);
    expect(result.missingSlots).toEqual([1]);
  });
});

describe('full fixed-horizon evidence and integrity', () => {
  it('requires 24 hours after funding availability; 24 hourly samples are only a prefix', () => {
    const result = replay(
      dataset(
        Array.from({ length: 24 }, () => ({})),
        { cadenceMs: HOUR }
      ),
      'idle'
    );
    expect(result.status).toBe('prefix-only');
    expect(result.fullEpisodeEvidence).toBe(false);
    expect(result.coverage).toBe('1');
    expect(result.goalState?.outcome).toBe('active');
    expect(result.expiresAt).toBe(START + 1000 + EXECUTION_EPISODE_DURATION_MS);
  });

  it('closes at the first observed deadline sample and expires even if that sample would hit the target', () => {
    const samples = Array.from({ length: 25 }, (): SampleOptions => ({}));
    samples[24] = { impactFree: '1.1' };
    const result = replay(dataset(samples, { cadenceMs: HOUR }), 'idle');
    expect(result.status).toBe('full-episode');
    expect(result.fullEpisodeEvidence).toBe(true);
    expect(result.closingObservedAt).toBe(result.expiresAt);
    expect(result.goalState?.outcome).toBe('expired');
    expect(result.performance?.finalValue).toBe('3.2');
    expect(result.qualifiedStrategy).toBe(false);
  });

  it('does not shorten the full episode when target is reached early', () => {
    const samples = Array.from({ length: 25 }, (): SampleOptions => ({}));
    samples[1] = { impactFree: '1.1' };
    samples[24] = { impactFree: '0.5' };
    const result = replay(dataset(samples, { cadenceMs: HOUR }), 'idle');
    expect(result.status).toBe('full-episode');
    expect(result.retainedSlots).toBe(25);
    expect(result.goalState?.outcome).toBe('target');
    expect(result.performance?.finalValue).toBe('2');
    expect(new FPNumber(result.performance!.drawdownPercent, 36).gt(new FPNumber('37'))).toBe(true);
  });

  it('expires a pending entry before the first quote available at the deadline', () => {
    const samples = Array.from({ length: 25 }, (): SampleOptions => ({}));
    samples[23] = { impactFree: '1.01' };
    samples[24] = { impactFree: '1.02' };
    const result = replay(dataset(samples, { cadenceMs: HOUR }), 'improved-net-acquisition-once');
    expect(result.decisions).toBe(1);
    expect(result.events.find((event) => event.kind === 'decision')?.slot).toBe(23);
    expect(result.scenarioBuys).toBe(0);
    expect(result.goalState?.outcome).toBe('expired');
    expect(result.pendingDecision).toBeUndefined();
    expect(result.events.find((event) => event.kind === 'rejected')).toMatchObject({
      slot: 24,
      decisionSlot: 23,
      reason: 'goal-deadline-before-entry',
    });
    expect(result.finalHoldings.kusdCodec).toBe(codec('10'));
  });

  it('does not call a full untimed legacy day eligible execution evidence', () => {
    const samples = Array.from({ length: 25 }, (): SampleOptions => ({ timed: false }));
    const result = replay(dataset(samples, { cadenceMs: HOUR, legacy: true }), 'idle');
    expect(result.closingObservedAt).toBe(result.expiresAt);
    expect(result.status).toBe('incomplete-episode');
    expect(result.coverage).toBe('1');
    expect(result.untimedSlots).toHaveLength(25);
    expect(result.fullEpisodeEvidence).toBe(false);
  });

  it('marks a horizon with a gap incomplete even when the final close is present', () => {
    const samples: Array<SampleOptions | 'error'> = Array.from({ length: 25 }, () => ({}));
    samples[12] = 'error';
    const result = replay(dataset(samples, { cadenceMs: HOUR }), 'idle');
    expect(result.status).toBe('incomplete-episode');
    expect(result.fullEpisodeEvidence).toBe(false);
    expect(result.missingSlots).toEqual([12]);
    expect(result.coverage).toBe('0.96');
    expect(result.goalState?.outcome).toBe('expired');
  });

  it('does not carry the prior price over a missing closing observation or hunt for another endpoint', () => {
    const samples: Array<SampleOptions | 'error'> = Array.from({ length: 27 }, () => ({}));
    samples[24] = { durationMs: 500 };
    samples[25] = 'error';
    samples[26] = { impactFree: '2' };
    const result = replay(dataset(samples, { cadenceMs: HOUR }), 'idle');
    expect(result.status).toBe('incomplete-episode');
    expect(result.closingObservedAt).toBeUndefined();
    expect(result.retainedSlots).toBe(26);
    expect(result.performance?.finalValue).toBe('3');
    expect(result.goalState?.outcome).toBe('expired');
  });

  it('keeps completed episode performance and events invariant when future samples are appended', () => {
    const data = dataset(
      Array.from({ length: 26 }, () => ({})),
      { cadenceMs: HOUR }
    );
    const before = replay({ manifest: data.manifest, records: data.records.slice(0, 25) }, 'idle');
    const final = complete(data, 25);
    data.records[25] = {
      ...data.records[25],
      snapshot: snapshot(final.slotAt, 25, { impactFree: '0.2' }),
    } as ExecutionRecord;
    rechain(data);
    const after = replay(data, 'idle');
    expect(after.performance).toEqual(before.performance);
    expect(after.events).toEqual(before.events);
    expect(after.goalState).toEqual(before.goalState);
    expect(after.retainedSlots).toBe(25);
  });

  it('preserves observed event prefixes as a pending quote becomes available', () => {
    const data = dataset([{}, {}, {}]);
    const prefix = replay({ manifest: data.manifest, records: data.records.slice(0, 1) });
    expect(prefix.pendingDecision).toEqual({ decisionSlot: 0, dueSlot: 1, decidedAt: START + 1000 });
    const later = replay(data);
    expect(later.pendingDecision).toBeUndefined();
    expect(later.events.slice(0, prefix.events.length)).toEqual(prefix.events);
    expect(later.events.find((event) => event.kind === 'scenario-fill')?.slot).toBe(1);
  });

  it('does not create an entry opportunity whose next slot lies outside the frozen manifest', () => {
    const result = replay(dataset([{}, { impactFree: '1.01' }]), 'improved-net-acquisition-once');
    expect(result.decisions).toBe(0);
    expect(result.pendingDecision).toBeUndefined();
    expect(result.scenarioBuys).toBe(0);
  });

  it.each([
    [
      'denomination',
      (s: ExecutionSnapshot) => {
        s.context.denominator = '2';
      },
    ],
    [
      'pool',
      (s: ExecutionSnapshot) => {
        s.context.poolIdentity = 'another-pool';
      },
    ],
    [
      'regressing block',
      (s: ExecutionSnapshot) => {
        s.context.blockNumber = 99;
      },
    ],
    [
      'regressing source timestamp',
      (s: ExecutionSnapshot) => {
        s.context.finalizedAt = START - 1;
      },
    ],
    [
      'same-height different hash',
      (s: ExecutionSnapshot) => {
        s.context.blockNumber = 100;
      },
    ],
  ] as const)('rejects %s changes even with valid retained hashes', (_name, mutate) => {
    const data = dataset([{}, {}]);
    mutate(complete(data, 1));
    rechain(data);
    expect(() => replay(data)).toThrow('Episode state identity or chronology changed');
  });

  it('rejects inconsistent receipt chronology across a gap instead of allowing a false expiry latch', () => {
    const data = dataset([{}, 'error', {}]);
    data.records[1].recordedAt = START + EXECUTION_EPISODE_DURATION_MS + 10000;
    rechain(data);
    expect(() => replay(data)).toThrow();
  });

  it('rejects a later request that precedes the previous gap record availability', () => {
    const data = dataset([{}, 'error', {}]);
    data.records[1].recordedAt = data.records[2].slotAt + 1;
    rechain(data);
    expect(() => replay(data)).toThrow();
  });

  it('rejects tampered record contents, broken linkage and out-of-order slots', () => {
    const changed = dataset([{}, {}]);
    complete(changed, 1).context.poolIdentity = 'tampered';
    expect(() => replay(changed)).toThrow('Execution record chain invalid');
    const broken = dataset([{}, {}]);
    broken.records[1].previousHash = 'b'.repeat(64);
    expect(() => replay(broken)).toThrow('Execution record chain invalid');
    const reordered = dataset([{}, {}]);
    reordered.records.reverse();
    expect(() => replay(reordered)).toThrow('Execution record chain invalid');
  });

  it('rejects unknown policies instead of silently implementing an undeclared strategy', () => {
    const data = dataset([{}, {}]);
    expect(() => replay(data, 'opening-principal-net-acquisition' as ExecutionEpisodePolicy)).toThrow(
      'Unknown episode policy'
    );
  });
});
