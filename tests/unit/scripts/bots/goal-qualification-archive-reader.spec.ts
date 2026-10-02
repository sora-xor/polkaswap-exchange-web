import {
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY,
  GOAL_QUALIFICATION_POLICY_V2,
} from '../../../../src/features/bot-trading/goal-qualification';
import { verifyGoalEpisodeClock } from '../../../../src/features/bot-trading/goal-qualification-clock-v2';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TypeRegistry } from '@polkadot/types';
import { createHistoricalExecutionPoolCodec } from '../../../../scripts/bots/historical-execution-pool-codec';
import { GoalTargetRuntimeQuoteError } from '../../../../scripts/bots/goal-target-runtime-quote';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import {
  createGoalQualificationArchiveSource,
  createGoalQualificationArchiveSourceV2,
  createGoalQualificationArchiveSourceV3,
  snapshotGoalArchiveTargetBinary,
  createGoalArchiveDevelopmentSource,
  evaluateGoalArchiveEngineeringEpisode,
  type GoalArchiveDevelopmentInput,
  type GoalQualificationArchiveOptions,
  type GoalQualificationArchiveInput,
} from '../../../../scripts/bots/goal-qualification-archive-reader';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';
import { goalRawEvidenceDigest } from '@/features/bot-trading/goal-raw-envelope';
import { verifyGoalQualificationClock } from '@/features/bot-trading/goal-qualification-clock';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import {
  createHistoricalExecutionCodec,
  decodeHistoricalFeeDetailsScale,
} from '../../../../scripts/bots/historical-execution-codec';
import { prepareHistoricalGoalBoundFeeSource } from '../../../../scripts/bots/historical-goal-bound-fee';
import { createHistoricalFeeMetadataFixture, feeBytes } from './fixtures/historical-goal-bound-fee-fixture';
import { GOAL_EXACT_KUSD as KUSD, GOAL_EXACT_XOR as XOR } from '@/features/bot-trading/goal-exact-ledger';

const doubles = vi.hoisted(() => ({
  market: vi.fn(),
  quote: vi.fn(),
  fee: vi.fn(),
  history: vi.fn(),
  target: vi.fn(),
  targetQuote: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../../../../scripts/bots/goal-target-runtime-archive-quote', () => ({
  createGoalTargetRuntimeArchiveQuote: doubles.target,
}));
vi.mock('../../../../scripts/bots/historical-goal-market-reader', () => ({
  createHistoricalGoalMarketReader: doubles.market,
  HistoricalGoalMarketReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/historical-execution-reader', () => ({
  readHistoricalExecutionQuote: doubles.quote,
  HistoricalExecutionReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/historical-goal-bound-fee-reader', () => ({
  readHistoricalGoalBoundFee: doubles.fee,
  HistoricalGoalBoundFeeReadError: class extends Error {},
}));
vi.mock('../../../../scripts/bots/goal-qualification-history-reader', () => ({
  readGoalQualificationHistory: doubles.history,
  GoalQualificationHistoryReadError: class extends Error {},
}));

const HOUR = 3_600_000,
  START = 201 * HOUR,
  END = START + 24 * HOUR;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Synthetic chain identities and SDK metadata; never reads an archive or market observation. */
function setup(step = 6000, offset = 0) {
  const metadata = createHistoricalFeeMetadataFixture();
  const plan = syntheticQualificationPlan();
  plan.training = { ...plan.training, startAtMs: START, endAtMs: START + 116 * HOUR };
  plan.validation = { ...plan.validation, startAtMs: START + 118 * HOUR, endAtMs: START + 167 * HOUR };
  plan.runtimeProfiles = [
    {
      specVersion: 130,
      transactionVersion: 130,
      metadataSha256: createHash('sha256')
        .update(Buffer.from(metadata.identity.metadataHex.slice(2), 'hex'))
        .digest('hex'),
      codeHash: hash(999_999),
    },
  ];
  const blocks = Array.from({ length: Math.ceil((24 * HOUR) / step) + 13 }, (_, i) => ({
    height: 1000 + i,
    hash: hash(1000 + i),
    parentHash: hash(999 + i),
    timestampMs: START - 60_000 + i * step + offset,
  }));
  const partition = {
    identitySha256: plan.training.identitySha256,
    blocksSha256: sha(blocks),
    receiptSha256: 'a'.repeat(64),
    source: {
      finalizedSource: { height: 100_000, hash: hash(100_000), receiptSha256: 'b'.repeat(64) },
      schemaAnchor: { height: 1000, hash: hash(1000) },
    },
  };
  const manifest: GoalQualificationArchiveInput['manifest'] = {
    protocol: 'goal-qualification-archive-source-v1',
    sourceId: plan.source.sourceId,
    genesisHash: plan.candidates[0].genesisHash,
    denominator: '1',
    warmupHours: 200,
    captureModel: {
      kind: 'fixed-pinned-capture-delays-v1',
      historyReadMs: 1000,
      indexerPublicationDelayMs: 0,
      markReadMs: 100,
      quoteAndFeeReadMs: 100,
    },
    partitions: { training: partition, validation: { ...partition, identitySha256: plan.validation.identitySha256 } },
    accessAuditSha256: 'c'.repeat(64),
    operationalIngestionSha256: ['d'.repeat(64)],
    maximumHttpRequests: 10_000,
    maximumResponseBytes: 268_435_456,
  };
  plan.source = { ...plan.source, manifestSha256: goalQualificationDigest(manifest) };
  const request: GoalQualificationArchiveInput['request'] = {
    planSha256: goalQualificationDigest(plan),
    candidate: plan.candidates[0],
    candidateSha256: goalQualificationDigest(plan.candidates[0]),
    phase: 'training',
    partitionIdentitySha256: plan.training.identitySha256,
    startAtMs: START,
    endAtMs: END,
    episodeIndex: 0,
  };
  const registration: GoalQualificationArchiveInput['registration'] = {
    planSha256: request.planSha256,
    registrationSha256: 'e'.repeat(64),
    trainingIdentitySha256: plan.training.identitySha256,
    validationIdentitySha256: plan.validation.identitySha256,
    kind: 'preregistered-unopened-validation',
  };
  const input = { plan, registration, request, manifest, blocks };
  const canonicalBlocks = clone(blocks);
  const receipts = new Map<string, unknown>();
  const retainEvidence = vi.fn(async (name: string, value: unknown) => {
    expect(receipts.has(name)).toBe(false);
    receipts.set(name, clone(value));
    return { sha256: goalRawEvidenceDigest(value), bytes: Buffer.byteLength(JSON.stringify(value)) };
  });
  const markReads = vi.fn();
  doubles.market.mockImplementation(async () => {
    const blockEvidence: unknown[] = [{ schema: 'synthetic' }],
      storageEvidence: unknown[] = [];
    return {
      context: {
        genesisHash: manifest.genesisHash,
        schema: {
          metadataSha256: plan.runtimeProfiles[0].metadataSha256,
          codeHash: plan.runtimeProfiles[0].codeHash,
          runtimeVersion: { specVersion: 130, transactionVersion: 130 },
        },
      },
      evidence: () => ({
        blockEvidence,
        storageEvidence,
        blockReads: storageEvidence.length,
        markReads: storageEvidence.length,
      }),
      readMark: async (height: number) => {
        markReads(height);
        const block = canonicalBlocks.find((b) => b.height === height)!;
        blockEvidence.push({ height, rawHeader: 'synthetic' });
        storageEvidence.push({ height, rawStorage: 'synthetic' });
        return {
          block,
          poolEvidence: { status: 'present' },
          mark: {
            timestampMs: block.timestampMs,
            blockHash: block.hash,
            kusdReserveCodec: '10000000000000000000000',
            xorReserveCodec: '10000000000000000000000',
          },
        };
      },
    };
  });
  doubles.history.mockImplementation(async (range) => ({
    history: {
      history: {
        candles: Array.from({ length: 201 }, (_, i) => ({
          timestamp: range.startAtMs + (i + 1) * HOUR,
          close: '1',
          feeClose: '1',
        })),
        missing: 0,
        denominationVerified: true,
        identity: { genesisHash: manifest.genesisHash, denominator: '1' },
      },
      boundaries: [{ successor: { timestampSeconds: range.endAtMs / 1000 } }],
    },
    rpcEvidence: [{ raw: 'synthetic-indexer-page' }],
  }));
  doubles.quote.mockImplementation(async (pending) => {
    const block = canonicalBlocks.find((b) => b.height === pending.block.height)!;
    const identity = { ...metadata.identity, blockHash: block.hash };
    const codec = createHistoricalExecutionCodec(identity);
    const request = {
      assetIn: pending.assetIn,
      assetOut: pending.assetOut,
      amountInCodec: pending.amountInCodec,
      quotedAmountOutCodec: pending.amountInCodec,
    };
    return {
      kind: 'hypothetical-historical-execution-estimate',
      request: pending,
      context: {
        genesisHash: manifest.genesisHash,
        block: pending.block,
        parentHash: block.parentHash,
        state: { timestampMs: block.timestampMs, denominator: '1' },
        expectedDenominator: '1',
        codecBinding: codec.binding,
      },
      quote: {
        amountOutCodec: request.quotedAmountOutCodec,
        amountWithoutImpactCodec: request.quotedAmountOutCodec,
        poolFeeCodec: '10000',
        dexId: 0,
        liquiditySource: 'XYKPool',
        slippageBps: 50,
        feeAssetAddress: XOR,
        route: [pending.assetIn, pending.assetOut],
      },
      envelope: codec.buildSwapEnvelope(request),
      fees: {
        assetId: XOR,
        info: { partialFeeCodec: '6' },
        details: decodeHistoricalFeeDetailsScale(feeBytes(1, 2, 3)),
      },
      rpcEvidence: [
        {
          method: 'state_getMetadata',
          params: [block.hash],
          responseBody: JSON.stringify({ result: metadata.identity.metadataHex }),
        },
      ],
      observedFill: false,
      transactionSubmitted: false,
    };
  });
  doubles.fee.mockImplementation(async (source) => {
    const p = prepareHistoricalGoalBoundFeeSource(source);
    return {
      receipt: { envelope: p.bound },
      info: { partialFeeCodec: '11' },
      details: { finalFee: '11' },
      rpcEvidence: [{ raw: 'synthetic-bounded-fee' }],
    };
  });
  const create = (fetcher?: typeof fetch) =>
    createGoalQualificationArchiveSource(input, {
      sink: { retainEvidence },
      fetch:
        fetcher ??
        vi.fn(async () => {
          throw Error('No network in source test');
        }),
    });
  return { input, create, receipts, retainEvidence, markReads, metadata };
}
/** Keep synthetic manifest/request hashes internally consistent when exercising a declared lower budget. */
function rebind(h: Pick<ReturnType<typeof setup>, 'input'>) {
  h.input.plan.source.manifestSha256 = goalQualificationDigest(h.input.manifest);
  h.input.request.planSha256 = goalQualificationDigest(h.input.plan);
  h.input.registration.planSha256 = h.input.request.planSha256;
}
async function first(h: ReturnType<typeof setup>, source = h.create()) {
  const opened = await source.open(h.input.request);
  const checks = verifyGoalQualificationClock(opened.clock, h.input.plan.arrivalModel, {
    startAtMs: START,
    endAtMs: END,
  });
  const check = checks[0],
    history = await source.history(h.input.request, { check, completedAtMs: START });
  const valuation = await source.valuation(h.input.request, { check, notBeforeMs: history.availableAtMs });
  return { source, opened, checks, check, history, valuation };
}
beforeEach(() => vi.clearAllMocks());

describe('request-scoped raw archive qualification source', () => {
  it('selects true as-of opening and fresh causal valuation after history, retaining evidence first', async () => {
    const h = setup(),
      { opened, history, valuation } = await first(h);
    expect(opened.opening.block.timestampMs).toBe(START - 6000);
    expect(opened.opening.receivedAtMs).toBe(START);
    expect(history.availableAtMs).toBe(START + 1000);
    expect(valuation.block.timestampMs).toBe(START);
    expect(valuation.captureStartedAtMs).toBe(history.availableAtMs);
    expect(valuation.receivedAtMs).toBe(START + 1100);
    expect(doubles.history.mock.calls[0][0]).toMatchObject({ startAtMs: START - 201 * HOUR, endAtMs: START });
    expect([...h.receipts.keys()]).toEqual([
      'source.json',
      'market-schema-1.json',
      'market-state-1009.json',
      'opening.json',
      'history-1.json',
      'market-state-1010.json',
      'valuation-1.json',
    ]);
    expect(Object.isFrozen(valuation.mark)).toBe(true);
  });

  it.each([false, true])('freezes exact input and same-state SDK fee envelope for reverse=%s', async (reverse) => {
    const h = setup(),
      { source, check, valuation } = await first(h);
    const pending = {
      assetIn: reverse ? XOR : KUSD,
      assetOut: reverse ? KUSD : XOR,
      amountInCodec: '1234567890123456789',
      expectedDenominator: '1',
    };
    const quote = await source.quote(h.input.request, {
      check,
      signalIndex: 0,
      decisionAtMs: valuation.receivedAtMs,
      pending,
      valuation,
    });
    expect(doubles.quote.mock.calls[0][0]).toEqual({
      block: { height: valuation.block.height, hash: valuation.block.hash },
      finalizedSource: h.input.manifest.partitions.training.source.finalizedSource,
      ...pending,
    });
    expect(quote.pending).toEqual(pending);
    expect(quote.minimumOutputCodec).toBe(((BigInt(pending.amountInCodec) * 9950n) / 10000n).toString());
    expect(quote.feeCodec).toBe('11');
    expect(quote.queryInfoFeeCodec).toBe(quote.queryDetailsFeeCodec);
    expect(quote.context.mark).toEqual(valuation.mark);
    expect(quote.context.evidenceSha256).not.toBe(valuation.evidenceSha256);
    expect(quote).toMatchObject({
      receivedAtMs: START + 1200,
      observedFill: false,
      transactionSubmitted: false,
      feeAdequacyVerified: false,
    });
    expect(h.receipts.has('quote-context-1.json')).toBe(true);
  });

  it('checks all due states and exact terminal with rotating bounded market readers', async () => {
    const h = setup(),
      source = h.create(),
      opening = await source.open(h.input.request);
    const checks = verifyGoalQualificationClock(opening.clock, h.input.plan.arrivalModel, {
      startAtMs: START,
      endAtMs: END,
    });
    for (const check of checks) await source.valuation(h.input.request, { check, notBeforeMs: check.checkedAtMs });
    const terminal = await source.terminal(h.input.request);
    expect(terminal.context.block.timestampMs).toBe(END);
    expect(terminal.successor.timestampMs).toBe(END + 6000);
    expect(terminal.successor.parentHash).toBe(terminal.context.block.hash);
    expect(h.markReads).toHaveBeenCalledTimes(checks.length + 2);
    expect(doubles.market).toHaveBeenCalledTimes(Math.ceil((checks.length + 2) / 64));
    expect(h.receipts.has('complete-source.json')).toBe(true);
    await expect(source.terminal(h.input.request)).rejects.toThrow();
  }, 60_000);

  it('cannot skip a valuation or rewrite its modeled capture clock', async () => {
    const h = setup(),
      source = h.create(),
      opening = await source.open(h.input.request);
    const checks = verifyGoalQualificationClock(opening.clock, h.input.plan.arrivalModel, {
      startAtMs: START,
      endAtMs: END,
    });
    await expect(
      source.valuation(h.input.request, { check: checks[1], notBeforeMs: checks[1].checkedAtMs })
    ).rejects.toThrow('valuation-order');
    await expect(
      source.valuation(h.input.request, { check: checks[0], notBeforeMs: checks[0].checkedAtMs })
    ).rejects.toThrow('valuation-order');
    expect(h.receipts.has('failure.json')).toBe(true);
  });

  it('rejects late hourly availability without replacing the check or opening quote data', async () => {
    const h = setup();
    doubles.history.mockImplementationOnce(async () => ({
      history: { boundaries: [{ successor: { timestampSeconds: (START + 6000) / 1000 } }] },
      rpcEvidence: [],
    }));
    await expect(first(h)).rejects.toThrow('history-unavailable-within-check');
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(h.markReads).toHaveBeenCalledTimes(1);
  });

  it.each(['metadata', 'parent', 'timestamp'])(
    'rejects a mismatched %s quote before bounded fee calls',
    async (field) => {
      const h = setup(),
        original = doubles.quote.getMockImplementation()!,
        { source, check, valuation } = await first(h);
      doubles.quote.mockImplementationOnce(async (...args) => {
        const result = await original(...args);
        if (field === 'metadata')
          result.context.codecBinding = { ...result.context.codecBinding, metadataSha256: '0'.repeat(64) };
        if (field === 'parent') result.context.parentHash = hash(7);
        if (field === 'timestamp') result.context.state.timestampMs++;
        return result;
      });
      await expect(
        source.quote(h.input.request, {
          check,
          signalIndex: 0,
          decisionAtMs: valuation.receivedAtMs,
          pending: { assetIn: KUSD, assetOut: XOR, amountInCodec: '1000000000000000000', expectedDenominator: '1' },
          valuation,
        })
      ).rejects.toThrow('quote-state-changed');
      expect(doubles.fee).not.toHaveBeenCalled();
      expect(h.receipts.has('quote-1.json')).toBe(true);
    }
  );

  it('rejects incomplete terminal, excessive input and repeated quote operations', async () => {
    const h = setup(),
      { source, check, valuation } = await first(h);
    await expect(
      source.quote(h.input.request, {
        check,
        signalIndex: 0,
        decisionAtMs: valuation.receivedAtMs,
        pending: {
          assetIn: KUSD,
          assetOut: XOR,
          amountInCodec: h.input.request.candidate.initialKusdCodec,
          expectedDenominator: '1',
        },
        valuation,
      })
    ).rejects.toThrow('input-changed');
    expect(doubles.quote).not.toHaveBeenCalled();
    const h2 = setup(),
      b = await first(h2);
    await expect(b.source.terminal(h2.input.request)).rejects.toThrow('incomplete-valuations');
  });

  it.each(['manifest', 'metadata', 'candidate', 'request'])('refuses changed %s before any data read', (field) => {
    const h = setup();
    if (field === 'manifest') h.input.manifest.captureModel.markReadMs++;
    if (field === 'metadata') h.input.blocks[2].parentHash = hash(9);
    if (field === 'candidate') h.input.request.candidateSha256 = '0'.repeat(64);
    if (field === 'request') h.input.request.startAtMs += HOUR;
    expect(h.create).toThrow();
    expect(doubles.market).not.toHaveBeenCalled();
    expect(doubles.history).not.toHaveBeenCalled();
  });

  it('refuses failed persistence before making a market read', async () => {
    const h = setup();
    h.retainEvidence.mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(h.create().open(h.input.request)).rejects.toThrow('missing-or-inconsistent-evidence');
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it.each(['requests', 'bytes', 'endpoint'])('enforces the source-wide %s transport bound', async (limit) => {
    const h = setup();
    if (limit === 'requests') h.input.manifest.maximumHttpRequests = 1;
    if (limit === 'bytes') h.input.manifest.maximumResponseBytes = 1;
    rebind(h);
    const upstream = vi.fn(async () => new Response('{}'));
    doubles.market.mockImplementationOnce(async (_input, options) => {
      const url = limit === 'endpoint' ? 'https://invalid.example/' : 'https://mof2.sora.org/';
      for (let i = 0; i < 2; i++) {
        const response = await options.fetch(url, { method: 'POST' });
        await new Response(response.body).text();
      }
      throw Error('Budget was not enforced');
    });
    const source = h.create(upstream);
    await expect(source.open(h.input.request)).rejects.toThrow(
      limit === 'requests' ? 'request-budget' : limit === 'bytes' ? 'response-budget' : 'invalid-evidence'
    );
    expect(upstream).toHaveBeenCalledTimes(limit === 'endpoint' ? 0 : 1);
    await expect(source.open(h.input.request)).rejects.toThrow();
    expect(upstream).toHaveBeenCalledTimes(limit === 'endpoint' ? 0 : 1);
  });

  it('does not replace unavailable quotes or repeat a failed signal request', async () => {
    const h = setup(),
      { source, check, valuation } = await first(h);
    doubles.quote.mockResolvedValueOnce({ kind: 'historical-quote-unavailable', rpcEvidence: [] });
    const input = {
      check,
      signalIndex: 0,
      decisionAtMs: valuation.receivedAtMs,
      pending: { assetIn: KUSD, assetOut: XOR, amountInCodec: '1000000000000000000', expectedDenominator: '1' },
      valuation,
    };
    await expect(source.quote(h.input.request, input)).rejects.toThrow('quote-unavailable');
    await expect(source.quote(h.input.request, input)).rejects.toThrow('quote-unavailable');
    expect(doubles.quote).toHaveBeenCalledTimes(1);
    expect(doubles.fee).not.toHaveBeenCalled();
  });

  it('copies requests and manifest before awaits and never invokes input getters', async () => {
    const h = setup(),
      source = h.create(),
      request = clone(h.input.request);
    h.input.manifest.captureModel.markReadMs = 4000;
    h.input.blocks[9].timestampMs = 0;
    const opening = await source.open(request);
    expect(opening.opening.captureStartedAtMs).toBe(START - 100);
    const poison = setup(),
      getter = vi.fn();
    Object.defineProperty(poison.input, 'manifest', { get: getter, enumerable: true });
    expect(poison.create).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});

function engineeringInput(h: ReturnType<typeof setup>): GoalArchiveDevelopmentInput {
  return {
    plan: h.input.plan,
    request: h.input.request,
    manifest: h.input.manifest,
    blocks: h.input.blocks,
    engineeringReceipt: {
      kind: 'already-exposed-engineering-run-v1',
      planSha256: h.input.request.planSha256,
      requestSha256: goalQualificationDigest(h.input.request),
      manifestSha256: h.input.plan.source.manifestSha256,
      exposureAuditSha256: h.input.manifest.accessAuditSha256,
      protocolRecordedBeforeRunSha256: 'f'.repeat(64),
    },
  };
}
function engineeringOptions(h: ReturnType<typeof setup>) {
  return {
    sink: { retainEvidence: h.retainEvidence },
    fetch: vi.fn<typeof fetch>(async () => {
      throw Error('No network in engineering source test');
    }),
  };
}

describe('explicitly exposed engineering archive entry', () => {
  it('cannot use an engineering receipt through the strict qualification constructor', () => {
    const h = setup(),
      development = engineeringInput(h),
      options = engineeringOptions(h);
    expect(() =>
      createGoalQualificationArchiveSource(development as unknown as GoalQualificationArchiveInput, options)
    ).toThrow('input-fields');
    expect(() =>
      createGoalQualificationArchiveSource(
        { ...h.input, registration: development.engineeringReceipt as never },
        options
      )
    ).toThrow();
    expect(() =>
      createGoalArchiveDevelopmentSource(h.input as unknown as GoalArchiveDevelopmentInput, options)
    ).toThrow('input-fields');
    expect(doubles.market).not.toHaveBeenCalled();
    expect(h.retainEvidence).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'retains honest provenance and reuses pinned raw quote/fee joins for reverse=%s',
    async (reverse) => {
      const h = setup(),
        input = engineeringInput(h),
        original = clone(input.engineeringReceipt),
        options = engineeringOptions(h);
      const source = createGoalArchiveDevelopmentSource(input, options);
      input.engineeringReceipt.protocolRecordedBeforeRunSha256 = '0'.repeat(64);
      const { check, valuation } = await first(h, source);
      const pending = {
        assetIn: reverse ? XOR : KUSD,
        assetOut: reverse ? KUSD : XOR,
        amountInCodec: '1234567890123456789',
        expectedDenominator: '1',
      };
      const quote = await source.quote(h.input.request, {
        check,
        signalIndex: 0,
        decisionAtMs: valuation.receivedAtMs,
        pending,
        valuation,
      });
      const retained = h.receipts.get('source.json') as Record<string, unknown>;
      expect(retained).toMatchObject({
        kind: 'already-exposed-engineering-source-v1',
        qualificationEligible: false,
        exposure: 'already-exposed',
        engineeringReceipt: original,
      });
      expect(retained).not.toHaveProperty('registration');
      expect(retained).not.toHaveProperty('selection');
      expect(JSON.stringify([...h.receipts.values()])).not.toContain('preregistered-unopened-validation');
      expect((retained.clock as { source: { preregistrationSha256: string } }).source.preregistrationSha256).toBe(
        original.protocolRecordedBeforeRunSha256
      );
      expect(quote.pending).toEqual(pending);
      expect(quote.context.mark).toEqual(valuation.mark);
      expect(quote.minimumOutputCodec).toBe(((BigInt(pending.amountInCodec) * 9950n) / 10000n).toString());
      expect(quote.feeCodec).toBe('11');
      expect(quote.queryInfoFeeCodec).toBe(quote.queryDetailsFeeCodec);
      expect(doubles.quote.mock.calls[0][0].block).toEqual({
        height: valuation.block.height,
        hash: valuation.block.hash,
      });
      expect(doubles.fee).toHaveBeenCalledTimes(1);
      expect(options.fetch).not.toHaveBeenCalled();
    }
  );

  it.each([
    'kind',
    'planSha256',
    'requestSha256',
    'manifestSha256',
    'exposureAuditSha256',
    'protocolRecordedBeforeRunSha256',
  ] as const)('rejects a mismatched engineering %s before any source read', (key) => {
    const h = setup(),
      input = engineeringInput(h);
    (input.engineeringReceipt as unknown as Record<string, string>)[key] =
      key === 'protocolRecordedBeforeRunSha256' ? 'invalid' : '0'.repeat(64);
    expect(() => createGoalArchiveDevelopmentSource(input, engineeringOptions(h))).toThrow(
      'engineering-access-binding'
    );
    expect(h.retainEvidence).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it('rejects validation phase and any supplied selection without retaining a qualification label', async () => {
    const h = setup(),
      input = engineeringInput(h);
    input.request = { ...input.request, phase: 'validation' };
    input.engineeringReceipt.requestSha256 = goalQualificationDigest(input.request);
    expect(() => createGoalArchiveDevelopmentSource(input, engineeringOptions(h))).toThrow();
    const source = createGoalArchiveDevelopmentSource(engineeringInput(h), engineeringOptions(h));
    await expect(
      source.open(h.input.request, {
        kind: 'selection-sealed-before-validation',
        registrationSha256: 'a'.repeat(64),
        candidateSha256: h.input.request.candidateSha256,
        trainingSha256: 'b'.repeat(64),
        sealSha256: 'c'.repeat(64),
        validationIdentitySha256: h.input.plan.validation.identitySha256,
      })
    ).rejects.toThrow('engineering-selection-forbidden');
    expect(h.receipts.has('source.json')).toBe(false);
    expect(doubles.market).not.toHaveBeenCalled();
  });

  it('rejects executable engineering receipts without invoking accessors', () => {
    const h = setup(),
      input = engineeringInput(h),
      getter = vi.fn();
    Object.defineProperty(input.engineeringReceipt, 'exposureAuditSha256', { get: getter, enumerable: true });
    expect(() => createGoalArchiveDevelopmentSource(input, engineeringOptions(h))).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('returns a frozen nonqualification result after the actual complete causal episode loop', async () => {
    const h = setup(),
      options = engineeringOptions(h);
    doubles.history.mockImplementation(async (range) => {
      const completed = Array.from({ length: 201 }, (_, i) => range.startAtMs + (i + 1) * HOUR);
      const block = (at: number) => {
        // Distinct invented pre-episode heights, and the same canonical six-second chain thereafter.
        const height = at < START ? Math.floor(at / HOUR) * 2 + 1 : 1010 + (at - START) / 6000;
        return { height, hash: hash(height), timestampSeconds: at / 1000 };
      };
      return {
        history: {
          history: {
            candles: completed.map((timestamp) => ({ timestamp, close: '1', feeClose: '1' })),
            missing: 0,
            denominationVerified: true,
            identity: { genesisHash: h.input.manifest.genesisHash, denominator: '1' },
          },
          boundaries: completed.map((timestamp) => {
            const successor = block(timestamp);
            return {
              kind: 'indexed-finalized-hour-boundary',
              completedAtMs: timestamp,
              genesisHash: h.input.manifest.genesisHash,
              denominator: '1',
              closing: {
                height: successor.height - 1,
                hash: hash(successor.height - 1),
                timestampSeconds: (timestamp - 6000) / 1000,
              },
              successor,
              arrivalTimeKnown: false,
            };
          }),
        },
        rpcEvidence: [{ raw: 'synthetic-engineering-history' }],
      };
    });
    const input = engineeringInput(h);
    const result = await evaluateGoalArchiveEngineeringEpisode(input, options);
    expect(result).toMatchObject({
      kind: 'goal-archive-engineering-result-v1',
      qualificationEligible: false,
      exposure: 'already-exposed',
      engineeringReceipt: input.engineeringReceipt,
    });
    expect(result).not.toHaveProperty('protocol');
    expect(result).not.toHaveProperty('register');
    expect(result).not.toHaveProperty('sealSelection');
    expect(result.traceSha256).toBe(goalQualificationDigest(result.trace));
    expect(result.trace.events.filter((event) => event.kind === 'valuation')).toHaveLength(1440);
    expect(result.trace.signals).toHaveLength(24);
    expect(Object.isFrozen(result.trace.events[0])).toBe(true);
    expect(Object.isFrozen(result.engineeringReceipt)).toBe(true);
    expect(h.receipts.has('complete-source.json')).toBe(true);
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(options.fetch).not.toHaveBeenCalled();
  }, 60000);
});

/** Exercise the actual outer transport wrappers while keeping every lower response invented. */
function probeReadTransports() {
  for (const name of ['market', 'history', 'quote', 'fee'] as const) {
    const original = doubles[name].getMockImplementation()!;
    doubles[name].mockImplementation(async (input, options) => {
      const response = await options.fetch(
        name === 'history' ? 'https://pi.soramitsu.io/graphql' : 'https://mof2.sora.org/',
        {
          method: 'POST',
          body: name,
          signal: options.signal,
        }
      );
      await new Response(response.body).text();
      return original(input, options);
    });
  }
}

describe('shared-budget market-only transport lane', () => {
  it('snapshots both lanes and routes only pool/mark reads through marketFetch', async () => {
    const h = setup();
    probeReadTransports();
    const ordinary = vi.fn<typeof fetch>(async () => new Response('{}'));
    const market = vi.fn<typeof fetch>(async () => new Response('{}'));
    const replacement = vi.fn<typeof fetch>(async () => {
      throw Error('mutated');
    });
    const options: GoalQualificationArchiveOptions = {
      sink: { retainEvidence: h.retainEvidence },
      fetch: ordinary,
      marketFetch: market,
    };
    const source = createGoalQualificationArchiveSource(h.input, options);
    options.fetch = replacement;
    options.marketFetch = replacement;
    const { check, valuation } = await first(h, source);
    await source.quote(h.input.request, {
      check,
      signalIndex: 0,
      decisionAtMs: valuation.receivedAtMs,
      pending: { assetIn: KUSD, assetOut: XOR, amountInCodec: '1000000000000000000', expectedDenominator: '1' },
      valuation,
    });
    expect(market.mock.calls.map(([, init]) => init?.body)).toEqual(['market']);
    expect(ordinary.mock.calls.map(([, init]) => init?.body)).toEqual(['history', 'quote', 'fee']);
    expect(replacement).not.toHaveBeenCalled();
  });

  it('uses ordinary fetch for both lanes when no market override is supplied', async () => {
    const h = setup();
    probeReadTransports();
    const ordinary = vi.fn<typeof fetch>(async () => new Response('{}'));
    await first(
      h,
      createGoalQualificationArchiveSource(h.input, { sink: { retainEvidence: h.retainEvidence }, fetch: ordinary })
    );
    expect(ordinary.mock.calls.map(([, init]) => init?.body)).toEqual(['market', 'history']);
  });

  it.each(['requests', 'bytes'] as const)('enforces one cumulative %s budget across both lanes', async (kind) => {
    const h = setup();
    if (kind === 'requests') h.input.manifest.maximumHttpRequests = 1;
    else h.input.manifest.maximumResponseBytes = 3;
    rebind(h);
    probeReadTransports();
    const ordinary = vi.fn<typeof fetch>(async () => new Response('{}'));
    const market = vi.fn<typeof fetch>(async () => new Response('{}'));
    const source = createGoalQualificationArchiveSource(h.input, {
      sink: { retainEvidence: h.retainEvidence },
      fetch: ordinary,
      marketFetch: market,
    });
    await expect(first(h, source)).rejects.toThrow(kind === 'requests' ? 'request-budget' : 'response-budget');
    expect(market).toHaveBeenCalledTimes(1);
    expect(ordinary).toHaveBeenCalledTimes(kind === 'requests' ? 0 : 1);
    expect(h.receipts.get('failure.json')).toMatchObject({ requests: 2, responseBytes: kind === 'requests' ? 2 : 4 });
    expect(doubles.quote).not.toHaveBeenCalled();
  });

  it.each(['market', 'history'] as const)(
    'discards a late aborted %s response without counting its bytes',
    async (lane) => {
      const h = setup();
      probeReadTransports();
      const controller = new AbortController();
      let release!: (response: Response) => void, entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const late: typeof fetch = () => {
        entered();
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      };
      const immediate: typeof fetch = async () => new Response('{}');
      const source = createGoalQualificationArchiveSource(h.input, {
        sink: { retainEvidence: h.retainEvidence },
        signal: controller.signal,
        fetch: lane === 'history' ? late : immediate,
        marketFetch: lane === 'market' ? late : immediate,
      });
      const pending = first(h, source);
      const rejected = expect(pending).rejects.toThrow('aborted');
      await started;
      controller.abort();
      const cancel = vi.fn();
      release(
        new Response(
          new ReadableStream({
            start(stream) {
              stream.enqueue(new TextEncoder().encode('late bytes must not count'));
            },
            cancel,
          })
        )
      );
      await rejected;
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(h.receipts.get('failure.json')).toMatchObject({ responseBytes: lane === 'market' ? 0 : 2 });
    }
  );

  it('rejects an accessor or nonfunction market lane without invoking it', () => {
    const h = setup(),
      getter = vi.fn();
    const options = { sink: { retainEvidence: h.retainEvidence } } as GoalQualificationArchiveOptions;
    Object.defineProperty(options, 'marketFetch', { get: getter, enumerable: true });
    expect(() => createGoalQualificationArchiveSource(h.input, options)).toThrow();
    expect(() =>
      createGoalQualificationArchiveSource(h.input, { sink: options.sink, marketFetch: null as never })
    ).toThrow();
    expect(() => createGoalQualificationArchiveSource(h.input, { sink: options.sink, fetch: null as never })).toThrow();
    expect(() =>
      createGoalQualificationArchiveSource(h.input, { sink: options.sink, timeoutMs: null as never })
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(doubles.market).not.toHaveBeenCalled();
  });
});

function asV2(h: ReturnType<typeof setup>) {
  h.input.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  h.input.plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  h.input.manifest.protocol = 'goal-qualification-archive-source-v2';
  if (h.input.plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
  h.input.plan.arrivalModel.checkDurationMs = 30000;
  rebind(h);
  return createGoalQualificationArchiveSourceV2(h.input, engineeringOptions(h));
}
describe('archive source v2 deadline and publication', () => {
  it('uses only metadata for a pending hour, still values it, and requests prices on the next ready check', async () => {
    const h = setup(),
      source = asV2(h),
      opened = await source.open(h.input.request);
    const checks = verifyGoalEpisodeClock(opened.clock, h.input.plan.arrivalModel, { startAtMs: START, endAtMs: END });
    const pending = await source.history(h.input.request, { check: checks[0], completedAtMs: START });
    expect(pending).toMatchObject({ kind: 'awaiting-history', completedAtMs: START, notBeforeMs: START + 999 });
    expect(pending).not.toHaveProperty('history');
    expect(doubles.history).not.toHaveBeenCalled();
    await source.valuation(h.input.request, { check: checks[0], notBeforeMs: checks[0].checkedAtMs });
    const ready = await source.history(h.input.request, { check: checks[1], completedAtMs: START });
    expect(ready).toHaveProperty('history');
    expect(doubles.history).toHaveBeenCalledTimes(1);
    expect(h.receipts.has('history-pending-1.json')).toBe(true);
    expect(() => h.create()).toThrow();
  });
  it('cancels only the late quote stage, keeps its prior valuation and reads the true terminal', async () => {
    const h = setup(60000, 59000);
    h.input.manifest.captureModel.historyReadMs = 0;
    h.input.manifest.captureModel.quoteAndFeeReadMs = 4000;
    const source = asV2(h),
      opened = await source.open(h.input.request);
    const checks = verifyGoalEpisodeClock(opened.clock, h.input.plan.arrivalModel, { startAtMs: START, endAtMs: END });
    for (const check of checks.slice(0, -1))
      await source.valuation(h.input.request, { check, notBeforeMs: check.checkedAtMs });
    const last = checks.at(-1)!;
    expect(last).toMatchObject({ cancelledAtMs: END, plannedCompletedAtMs: END + 29000 });
    const history = await source.history(h.input.request, { check: last, completedAtMs: END - HOUR });
    if ('kind' in history) throw Error('Expected ready history');
    const valuation = await source.valuation(h.input.request, { check: last, notBeforeMs: history.availableAtMs });
    await expect(
      source.quote(h.input.request, {
        check: last,
        signalIndex: 23,
        decisionAtMs: valuation.receivedAtMs,
        valuation,
        pending: { assetIn: KUSD, assetOut: XOR, amountInCodec: '1000000000000000000', expectedDenominator: '1' },
      })
    ).rejects.toMatchObject({ receipt: { checkId: last.id, stage: 'quote', cancelledAtMs: END } });
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(doubles.fee).not.toHaveBeenCalled();
    expect(h.receipts.has('valuation-1440.json')).toBe(true);
    expect(h.receipts.get('deadline-cancelled-stage.json')).toMatchObject({ completed: false, stage: 'quote' });
    expect((await source.terminal(h.input.request)).context.mark.timestampMs).toBe(END - 1000);
  }, 60000);
});

/** Public metadata and invented pool values only. The target helper is tested independently with the actual WASM. */
function targetSetup() {
  const h = setup();
  const folder = new URL(
    '../../../../output/go-history/goal-runtime-wasm-offline-20260921/synthetic-episode-v2/',
    import.meta.url
  );
  const exportResult = JSON.parse(readFileSync(new URL('metadata-130.json', folder), 'utf8')).actualExport.resultHex;
  const metadataHex = new TypeRegistry().createType('Bytes', Buffer.from(exportResult.slice(2), 'hex')).toHex();
  const compressedBytes = readFileSync(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
  const hashFile = (file: string) =>
    createHash('sha256')
      .update(readFileSync(new URL(`../../../../scripts/bots/${file}`, import.meta.url)))
      .digest('hex');
  const model = readGoalTargetExecutionModel({
    protocol: GOAL_TARGET_MODEL_PROTOCOL,
    sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: hashFile('goal-target-runtime-host.cjs'),
      stateCodecSha256: hashFile('goal-target-runtime-state.ts'),
      quoteCodecSha256: hashFile('goal-target-runtime-quote.ts'),
    },
    stateModel: 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
  });
  h.input.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
  h.input.plan.policy = GOAL_QUALIFICATION_POLICY_V3;
  h.input.plan.executionModel = model;
  h.input.plan.runtimeProfiles = [model.sourceRuntimeProfile];
  h.input.manifest.protocol = 'goal-qualification-archive-source-v3';
  rebind(h);
  const source = h.input.manifest.partitions.training.source;
  const key = createHistoricalExecutionPoolCodec({
    genesisHash: h.input.manifest.genesisHash,
    blockHash: source.schemaAnchor.hash,
    metadataHex,
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  }).storageKeys().properties;
  const properties = `0x${'11'.repeat(32)}${'22'.repeat(32)}`;
  const oldMarket = doubles.market.getMockImplementation()!;
  doubles.market.mockImplementation(async (...args) => {
    const reader = await oldMarket(...args);
    reader.context.schemaAnchor = source.schemaAnchor;
    const raw = reader.evidence();
    raw.blockEvidence.splice(0, 1, {
      method: 'state_getMetadata',
      params: [source.schemaAnchor.hash],
      responseBody: JSON.stringify({ result: metadataHex }),
    });
    const read = reader.readMark;
    reader.readMark = async (height: number) => {
      const result = await read(height);
      raw.storageEvidence[raw.storageEvidence.length - 1] = {
        blockHash: result.block.hash,
        responseBody: JSON.stringify({ result: [{ block: result.block.hash, changes: [[key, properties]] }] }),
      };
      result.poolEvidence.accounts = {
        reservesAccountId: `0x${'11'.repeat(32)}`,
        feesAccountId: `0x${'22'.repeat(32)}`,
      };
      return result;
    };
    return reader;
  });
  doubles.target.mockResolvedValue({ quote: doubles.targetQuote, dispose: doubles.dispose });
  doubles.dispose.mockResolvedValue(undefined);
  doubles.targetQuote.mockImplementation(async (input) => {
    await input.retain({ id: 1, raw: 'synthetic target storage' });
    return {
      state: {},
      receipts: [{ id: 1, raw: 'synthetic target storage' }],
      estimate: {
        kind: 'hypothetical-target-runtime-execution-estimate',
        quote: { amountOutCodec: '1000', amountWithoutImpactCodec: '1000', minimumCodec: '995' },
        fees: { feeCodec: '11', info: { partialFeeCodec: '11' }, details: { finalFee: '11' } },
        envelope: {
          bound: {
            policy: { id: GOAL_QUALIFICATION_POLICY.feePolicyId },
            policySha256: GOAL_QUALIFICATION_POLICY.feePolicySha256,
          },
        },
        apis: [{ api: 'quote' }, { api: 'info' }, { api: 'details' }],
      },
    };
  });
  const abort = new AbortController();
  const create = () =>
    createGoalQualificationArchiveSourceV3(h.input, {
      sink: { retainEvidence: h.retainEvidence },
      fetch: vi.fn(async () => {
        throw Error('No network');
      }),
      targetCompressedBytes: compressedBytes,
      signal: abort.signal,
    });
  const firstTarget = async () => {
    const source = create();
    const opened = await source.open(h.input.request);
    const checks = verifyGoalEpisodeClock(opened.clock, h.input.plan.arrivalModel, { startAtMs: START, endAtMs: END });
    await source.history(h.input.request, { check: checks[0], completedAtMs: START });
    await source.valuation(h.input.request, { check: checks[0], notBeforeMs: checks[0].checkedAtMs });
    const check = checks[1];
    const history = await source.history(h.input.request, { check, completedAtMs: START });
    if ('kind' in history) throw Error('fixture expected history');
    const valuation = await source.valuation(h.input.request, { check, notBeforeMs: history.availableAtMs });
    const quote = () =>
      source.quote(h.input.request, {
        check,
        signalIndex: 0,
        decisionAtMs: valuation.receivedAtMs,
        pending: { assetIn: KUSD, assetOut: XOR, amountInCodec: '1000', expectedDenominator: '1' },
        valuation,
      });
    return { source, valuation, quote };
  };
  return { ...h, model, create, firstTarget, compressedBytes, metadataHex, properties, abort };
}
describe('explicit target-runtime v3 archive integration', () => {
  it('journals raw storage before projected target quote and preserves historical source identity', async () => {
    const h = targetSetup();
    const { quote, valuation } = await h.firstTarget();
    const result = await quote();
    expect(result).toMatchObject({
      context: { runtimeProfile: h.model.sourceRuntimeProfile, block: valuation.block },
      executionRuntimeProfile: h.model.targetRuntimeProfile,
      executionModelSha256: goalQualificationDigest(h.model),
      feeCodec: '11',
      minimumOutputCodec: '995',
    });
    expect(doubles.targetQuote.mock.calls[0][0]).toMatchObject({
      sourceBlock: { hash: valuation.block.hash, height: valuation.block.height },
      sourceMetadataHex: h.metadataHex,
      sourcePropertiesHex: h.properties,
      amountInCodec: '1000',
    });
    expect([...h.receipts.keys()].slice(-4)).toEqual([
      'target-rpc-2-1.json',
      'quote-2.json',
      'fee-2.json',
      'quote-context-2.json',
    ]);
    expect(doubles.quote).not.toHaveBeenCalled();
    expect(doubles.fee).not.toHaveBeenCalled();
    h.abort.abort();
  });
  it('retains unavailable route without manufacturing fee evidence', async () => {
    const h = targetSetup();
    doubles.targetQuote.mockResolvedValue({
      state: {},
      receipts: [],
      estimate: { kind: 'target-runtime-route-unavailable', apis: [{ api: 'quote' }] },
    });
    const { quote } = await h.firstTarget();
    const result = await quote();
    expect(result).toMatchObject({
      kind: 'target-runtime-route-unavailable',
      executionRuntimeProfile: h.model.targetRuntimeProfile,
    });
    expect(result).not.toHaveProperty('feeCodec');
    expect(h.receipts.has('quote-2.json')).toBe(true);
    expect(h.receipts.has('fee-2.json')).toBe(false);
    h.abort.abort();
  });
  it('disposes target execution and journals a failed acquisition', async () => {
    const h = targetSetup();
    doubles.targetQuote.mockRejectedValue(new Error('malformed archive data'));
    const { quote } = await h.firstTarget();
    await expect(quote()).rejects.toThrow('missing-or-inconsistent-evidence');
    expect(doubles.dispose).toHaveBeenCalledOnce();
    expect(h.receipts.has('failure.json')).toBe(true);
    await expect(quote()).rejects.toThrow();
  });
  it('retains typed target API failure diagnostics before terminating the episode', async () => {
    const h = targetSetup();
    doubles.targetQuote.mockRejectedValue(new GoalTargetRuntimeQuoteError('info', [], 'worker-unavailable'));
    const { quote } = await h.firstTarget();
    await expect(quote()).rejects.toThrow('missing-or-inconsistent-evidence');
    expect(h.receipts.get('failure.json')).toMatchObject({
      stage: 'quote',
      diagnostic: { stage: 'info', reason: 'worker-unavailable', receipts: [] },
    });
    expect(doubles.dispose).toHaveBeenCalledOnce();
  });
  it('requires matching code pins and binary before any external reads', () => {
    const h = targetSetup();
    expect(() => snapshotGoalArchiveTargetBinary(new Uint8Array([1]))).toThrow('target-binary-pin');
    h.input.plan.executionModel = {
      ...h.model,
      implementation: { ...h.model.implementation, hostSha256: '0'.repeat(64) },
    };
    rebind(h);
    expect(h.create).toThrow('target-implementation-pin');
    expect(doubles.market).not.toHaveBeenCalled();
  });
  it('detaches pinned binary bytes and rejects shared memory', () => {
    const h = targetSetup();
    const copied = snapshotGoalArchiveTargetBinary(h.compressedBytes);
    h.compressedBytes.fill(0);
    expect(createHash('sha256').update(copied).digest('hex')).toBe(GOAL_TARGET_COMPRESSED_SHA256);
    expect(() => snapshotGoalArchiveTargetBinary(new Uint8Array(new SharedArrayBuffer(10)))).toThrow('target-binary');
  });
});
