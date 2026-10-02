import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  replayEngineeringTrace,
  verifyEngineeringDirectory,
} from '../../../../output/go-history/goal-archive-engineering-20260920/verify-engineering-v2.mts';
import { save } from '../../../../output/go-history/goal-archive-engineering-20260920/run-engineering-v2.mts';
import { buildGoalQualificationClockV2 } from '../../../../scripts/bots/goal-qualification-clock-builder-v2';
import {
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
} from '../../../../src/features/bot-trading/goal-exact-ledger';
import {
  goalQualificationDigest as digest,
  GOAL_QUALIFICATION_POLICY_V2,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationPlan,
} from '../../../../src/features/bot-trading/goal-qualification';
const START = 3600000,
  END = START + 86400000,
  UNIT = 10n ** 18n;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
  vi.unstubAllGlobals();
});
function fixture(filled = true) {
  const candidate = {
    genesisHash: GOAL_EXACT_POLICY.genesisHash,
    denominator: '1',
    initialKusdCodec: String(10n * UNIT),
    maxTradeKusdCodec: String((5n * UNIT) / 2n),
    maxTradeXorCodec: String(10n * UNIT),
    strategy: {
      kind: 'dca' as const,
      amount: '2.5',
      intervalMs: 21600000,
      threshold: '2',
      direction: 'below' as const,
      fastWindow: 2,
      slowWindow: 3,
      prompt: '',
    },
  };
  const model = {
    kind: 'modeled-finalized-callbacks' as const,
    model: 'fixed-nonnegative-delays-v1' as const,
    finalityDelayMs: 12000,
    callbackDelayMs: 1000,
    processingDelayMs: 0,
    checkDurationMs: 30000,
  };
  const blocks = Array.from({ length: 1442 }, (_, i) => ({
    height: 100 + i,
    hash: hash(100 + i),
    parentHash: hash(99 + i),
    timestampMs: START - 36000 + i * 60000,
  }));
  const clock = buildGoalQualificationClockV2({
    episode: { startAtMs: START, endAtMs: END },
    model,
    blocks,
    source: {
      sourceId: 'synthetic',
      genesisHash: candidate.genesisHash,
      manifestSha256: 'a'.repeat(64),
      preregistrationSha256: 'b'.repeat(64),
    },
  });
  const mark = (b: (typeof blocks)[number]) => ({
    blockHash: b.hash,
    blockNumber: b.height,
    timestampMs: b.timestampMs,
    denominator: '1',
    kusdReserveCodec: String(1000n * UNIT),
    xorReserveCodec: String(1000n * UNIT),
  });
  const profiles = [
    {
      specVersion: 130 as const,
      transactionVersion: 130 as const,
      metadataSha256: 'c'.repeat(64),
      codeHash: hash(9000),
    },
  ];
  const request = {
    planSha256: 'd'.repeat(64),
    candidate,
    candidateSha256: digest(candidate),
    phase: 'training' as const,
    partitionIdentitySha256: 'e'.repeat(64),
    startAtMs: START,
    endAtMs: END,
    episodeIndex: 0,
  };
  const events: GoalQualificationEpisodeEvidence['events'][number][] = clock.checks.map((c) => ({
    kind: 'valuation',
    checkId: c.id,
    captureStartedAtMs: c.checkedAtMs,
    receivedAtMs: c.checkedAtMs + 1000,
    mark: mark(c.arrival.block),
    evidenceSha256: 'f'.repeat(64),
  }));
  const signals: GoalQualificationEpisodeEvidence['signals'][number][] = Array.from({ length: 24 }, (_, index) => {
    const c = clock.checks[index * 60];
    return {
      index,
      checkId: c.id,
      completedAtMs: START + index * 3600000,
      availableAtMs: c.checkedAtMs,
      decisionAtMs: c.checkedAtMs + 1000,
      action: filled && index === 0 ? 'filled' : 'hold',
      evidenceSha256: 'f'.repeat(64),
    };
  });
  if (filled)
    events.splice(1, 0, {
      kind: 'minimum-output-fill',
      signalIndex: 0,
      contextReceivedAtMs: signals[0].decisionAtMs,
      receivedAtMs: signals[0].decisionAtMs + 1000,
      mark: mark(clock.checks[0].arrival.block),
      inputAsset: KUSD,
      inputCodec: candidate.maxTradeKusdCodec,
      outputAsset: XOR,
      quotedOutputCodec: String((5n * UNIT) / 2n),
      withoutImpactCodec: String((5n * UNIT) / 2n),
      minimumOutputCodec: String((24875n * UNIT) / 10000n),
      feeCodec: String(UNIT / 100n),
      queryInfoFeeCodec: String(UNIT / 100n),
      queryDetailsFeeCodec: String(UNIT / 100n),
      runtimeProfileSha256: digest(profiles[0]),
      quoteEvidenceSha256: 'f'.repeat(64),
      feeEvidenceSha256: 'f'.repeat(64),
    });
  const trace: GoalQualificationEpisodeEvidence = {
    protocol: 'finalized-xyk-execution-validation-v2',
    requestSha256: digest(request),
    dataSha256: 'a'.repeat(64),
    opening: { fundedAtMs: START, receivedAtMs: START, mark: mark(blocks[0]), evidenceSha256: 'f'.repeat(64) },
    clock: clock.trace,
    deadlineCancellation: null,
    terminal: {
      accountingAtMs: END,
      mark: mark(blocks.at(-2)!),
      successor: blocks.at(-1)!,
      evidenceSha256: 'f'.repeat(64),
    },
    signals,
    events,
  };
  return { candidate, model, profiles, request, trace, clock, blocks };
}
const replay = (f: ReturnType<typeof fixture>) =>
  replayEngineeringTrace(f.request, f.trace, f.profiles, f.model, 'finalized-xyk-qualification-v2');
describe('offline engineering accounting', () => {
  it('charges exact hypothetical fees and slippage, keeps the benchmark untouched, and grants no authority', () => {
    const fetch = vi.fn(() => {
      throw Error('network forbidden');
    });
    vi.stubGlobal('fetch', fetch);
    const summary = replay(fixture());
    expect(summary.holdings).toEqual({
      kusdCodec: String((75n * UNIT) / 10n),
      xorCodec: String((34775n * UNIT) / 10000n),
    });
    expect(summary.feesPaidCodec).toBe(String(UNIT / 100n));
    expect(summary.benchmarkHoldings).toEqual({ kusdCodec: String(10n * UNIT), xorCodec: String(UNIT) });
    expect(summary.benchmarkFeesPaidCodec).toBe('0');
    expect(summary.netReturn).toEqual({ numerator: '-9', denominator: '4400' });
    expect(summary.excessReturn).toEqual(summary.netReturn);
    expect(summary.maximumDrawdown).toEqual({ numerator: '9', denominator: '4400' });
    expect(summary).toMatchObject({
      outcome: 'expired',
      fills: 1,
      actualTransactions: 0,
      qualificationEligible: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports an unchanged no-fill episode honestly', () => {
    const summary = replay(fixture(false));
    expect(summary.netReturn).toEqual({ numerator: '0', denominator: '1' });
    expect(summary.excessReturn).toEqual(summary.netReturn);
    expect(summary.fills).toBe(0);
  });
  it('retains a cancelled final valuation without inventing its completion or losing earlier fills', () => {
    const f = fixture();
    const last = f.trace.events.at(-1)!;
    if (last.kind !== 'valuation') throw Error('fixture');
    (f.trace.events as unknown[]).pop();
    f.trace.deadlineCancellation = {
      checkId: last.checkId,
      stage: 'valuation',
      startedAtMs: END - 1000,
      plannedReceivedAtMs: END + 1000,
      cancelledAtMs: END,
      evidenceSha256: 'f'.repeat(64),
    };
    expect(replay(f)).toMatchObject({ fills: 1, feesPaidCodec: String(UNIT / 100n), outcome: 'expired' });
  });
  it.each(['fee', 'omitted-mark', 'terminal', 'late-fill', 'lot', 'missing-hour'] as const)(
    'rejects %s corruption before producing a summary',
    (kind) => {
      const f = fixture(),
        event = f.trace.events[1];
      if (event.kind !== 'minimum-output-fill') throw Error('fixture');
      if (kind === 'fee') event.feeCodec = '1';
      if (kind === 'omitted-mark') (f.trace.events as unknown[]).splice(3, 1);
      if (kind === 'terminal') f.trace.terminal.accountingAtMs++;
      if (kind === 'late-fill') event.receivedAtMs = END;
      if (kind === 'lot') event.inputCodec = '1';
      if (kind === 'missing-hour') (f.trace.signals as unknown[]).pop();
      expect(() => replay(f)).toThrow();
    }
  );
});
async function persistedFixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'engineering-verifier-'));
  directories.push(root);
  const base = resolve(root, 'output/engineering'),
    run = resolve(base, 'episode-v2');
  await mkdir(resolve(root, 'src'), { recursive: true });
  await writeFile(resolve(root, 'src/synthetic.ts'), '/** invented source */');
  const sources = { 'src/synthetic.ts': sha('/** invented source */') };
  const f = fixture();
  const files: Record<string, { path: string; sha256: string }> = {};
  for (const [name, file] of Object.entries({
    'run-protocol': 'callback-collection/run-protocol.json',
    verification: 'collector-complete-verification.json',
    'raw-manifest': 'callback-raw-manifest.json',
    'blocks-development': 'callback-development-blocks.json',
  })) {
    const path = resolve(base, file),
      saved = await save(path, name === 'blocks-development' ? f.blocks : { synthetic: name });
    files[name] = { path, sha256: saved.sha256 };
  }
  const exposureAudit: Record<string, unknown> = { qualificationEligible: false };
  for (const [name, path] of Object.entries({
    previousPreparationFailureSha256: 'episode-v1/preparation-failed.json',
    previousProtocolSha256: 'episode-v1/protocol.json',
    openingPreflightSha256: 'opening-preflight-v1/complete.json',
    engineeringMetadataProtocolSha256: 'protocol.json',
  })) {
    exposureAudit[name] = (await save(resolve(base, path), { synthetic: name })).sha256;
  }
  const manifest = {
    sourceId: 'synthetic',
    genesisHash: GOAL_EXACT_POLICY.genesisHash,
    protocol: 'goal-qualification-archive-source-v2',
    accessAuditSha256: digest(exposureAudit),
  };
  const plan: GoalQualificationPlan = {
    protocol: 'finalized-xyk-qualification-v2',
    studyId: 'synthetic',
    policy: GOAL_QUALIFICATION_POLICY_V2,
    source: {
      sourceId: 'synthetic',
      manifestSha256: digest(manifest),
      evaluatorSha256: sha(canonical(sources)),
      collectorSha256: files['run-protocol'].sha256,
    },
    candidates: [f.candidate],
    runtimeProfiles: f.profiles,
    arrivalModel: f.model,
    training: { identitySha256: f.request.partitionIdentitySha256, startAtMs: START, endAtMs: END },
    validation: { identitySha256: '1'.repeat(64), startAtMs: END, endAtMs: END },
  };
  f.request.planSha256 = digest(plan);
  f.trace.requestSha256 = digest(f.request);
  f.trace.dataSha256 = digest(manifest);
  const protocol = {
    kind: 'already-exposed-goal-engineering-protocol-v2',
    input: { plan, request: f.request, manifest },
    sources,
    files,
    exposureAudit,
    network: { maximumStarts: 2500, minimumIntervalMs: 125 },
  };
  const protocolReceipt = await save(resolve(run, 'protocol.json'), protocol);
  await save(resolve(run, 'prepared.json'), {
    ready: true,
    marketDataRead: false,
    qualificationEligible: false,
    protocolSha256: protocolReceipt.sha256,
    sourceFiles: 1,
    checks: f.clock.checks.length,
    cancelledChecks: f.clock.checks.filter((c) => 'cancelledAtMs' in c),
    clockTraceSha256: sha(JSON.stringify(f.trace.clock)),
  });
  await save(resolve(run, 'access.json'), {
    kind: 'already-exposed-engineering-access-v1',
    protocolSha256: protocolReceipt.sha256,
    qualificationEligible: false,
    transactionSubmitted: false,
  });
  const engineeringReceipt = {
    kind: 'already-exposed-engineering-run-v1',
    planSha256: f.request.planSha256,
    requestSha256: digest(f.request),
    manifestSha256: digest(manifest),
    exposureAuditSha256: digest(exposureAudit),
    protocolRecordedBeforeRunSha256: protocolReceipt.sha256,
  };
  const sourceReceipt = await save(resolve(run, 'raw/source.json'), {
    kind: 'already-exposed-engineering-source-v1',
    qualificationEligible: false,
    observedHistoricalArrivals: false,
    observedFill: false,
    transactionSubmitted: false,
    engineeringReceipt,
    request: f.request,
    manifest,
  });
  const evidenceReceipt = await save(resolve(run, 'raw/synthetic.json'), { synthetic: true });
  f.trace.opening.evidenceSha256 = f.trace.terminal.evidenceSha256 = evidenceReceipt.sha256;
  for (const event of f.trace.events) {
    if (event.kind === 'valuation') event.evidenceSha256 = evidenceReceipt.sha256;
    else event.quoteEvidenceSha256 = event.feeEvidenceSha256 = evidenceReceipt.sha256;
  }
  const traceSha256 = digest(f.trace);
  await save(resolve(run, 'result.json'), {
    kind: 'goal-archive-engineering-result-v1',
    qualificationEligible: false,
    exposure: 'already-exposed',
    engineeringReceipt,
    trace: f.trace,
    traceSha256,
  });
  const rows = [
    { name: 'source.json', ...sourceReceipt },
    { name: 'synthetic.json', ...evidenceReceipt },
  ];
  await save(resolve(run, 'raw-manifest.json'), {
    complete: true,
    rows,
    bytes: sourceReceipt.bytes + evidenceReceipt.bytes,
    httpStarts: 0,
  });
  await save(resolve(run, 'complete.json'), {
    complete: true,
    qualificationEligible: false,
    transactionSubmitted: false,
    traceSha256,
    events: f.trace.events.length,
    signals: f.trace.signals.length,
    rawReceipts: rows.length,
    rawBytes: sourceReceipt.bytes + evidenceReceipt.bytes,
    httpStarts: 0,
  });
  return { base, root, run };
}
describe('completed engineering integrity gate', () => {
  it('verifies retained bytes and replay, never contacts a network, and publishes without clobbering', async () => {
    const f = await persistedFixture(),
      fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const verification = await verifyEngineeringDirectory(f.base, f.root);
    expect(verification).toMatchObject({
      verified: true,
      qualificationEligible: false,
      actualTransactions: 0,
      networkRequests: 0,
    });
    expect(verification.summary.netReturn).toEqual({ numerator: '-9', denominator: '4400' });
    await save(resolve(f.run, 'verification.json'), verification);
    await expect(save(resolve(f.run, 'verification.json'), verification)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['source', 'raw', 'ineligible', 'access', 'complete'] as const)(
    'rejects changed %s evidence',
    async (kind) => {
      const f = await persistedFixture();
      if (kind === 'source') await writeFile(resolve(f.root, 'src/synthetic.ts'), 'changed');
      else if (kind === 'raw') await writeFile(resolve(f.run, 'raw/synthetic.json'), '{}');
      else if (kind === 'complete') await rm(resolve(f.run, 'complete.json'));
      else {
        const path = resolve(f.run, kind === 'access' ? 'access.json' : 'result.json');
        const value = JSON.parse(await readFile(path, 'utf8'));
        if (kind === 'access') value.protocolSha256 = '0'.repeat(64);
        else value.qualificationEligible = true;
        await writeFile(path, canonical(value));
      }
      await expect(verifyEngineeringDirectory(f.base, f.root)).rejects.toBeTruthy();
    }
  );
});
