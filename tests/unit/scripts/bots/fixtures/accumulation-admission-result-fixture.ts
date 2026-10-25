/** Invented byte/receipt fixture. Declared production pins are not a claim that this synthetic child ran. */
import { createHash } from 'node:crypto';
import { canonicalAccumulationJournalJson as canonical } from '../../../../../scripts/bots/accumulation-journal-store';
import type { AccumulationAdmissionResultTrust } from '../../../../../scripts/bots/accumulation-admission-result';
import type {
  AccumulationSubprocessReceipt,
  SubprocessStreamReceipt,
} from '../../../../../scripts/bots/accumulation-subprocess';
import type { AccumulationVerifiedPacket } from '../../../../../scripts/bots/accumulation-evidence-bridge';

export const ADMISSION_FIXTURE_H = 1785265200000;
export const admissionResultSha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export function admissionResultStream(bytes: Uint8Array): SubprocessStreamReceipt {
  const raw = Buffer.from(bytes),
    sha = admissionResultSha(raw);
  return {
    observedSha256: sha,
    observedBytes: raw.length,
    retainedSha256: sha,
    retainedBase64: raw.toString('base64'),
    retainedBytes: raw.length,
    truncated: false,
  };
}
const sources = [
  {
    path: 'scripts/bots/accumulation_admission_runner.py',
    sha256: '25de2ff4e4e9dbe6b7e57d0d444ad5d1a6f4ff16ba78b3455cd7975bc7bd3e16',
  },
  {
    path: 'scripts/bots/accumulation_admission_policy.py',
    sha256: '899d66482c90348684faca6f557224fddf4118ef8932a36b735bd4c935a4d44d',
  },
  {
    path: 'scripts/bots/accumulation_stopping_model.py',
    sha256: '26f2d6bc93490338da6488d081271a83bf3d24203fc26b4c2e216abbb234e7a6',
  },
];
/** One active partial-buy candidate and eight genuine synthetic unavailable outcomes; no model evaluation. */
export function createAccumulationAdmissionResultFixture(
  options: { decisionAtMs?: number; finishedAtMs?: number } = {}
) {
  const H = ADMISSION_FIXTURE_H,
    decisionAtMs = options.decisionAtMs ?? H + 3000,
    finishedAtMs = options.finishedAtMs ?? decisionAtMs + 200;
  const packet: AccumulationVerifiedPacket = {
    status: 'verified',
    packetSha256: 'a'.repeat(64),
    genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
    denominator: '100000000000000000000000000000000000000',
    block: { hash: '0x' + 'c'.repeat(64), height: 100, timestampMs: H + 1000 },
    contextReceivedAtMs: H + 2000,
    decisionAtMs,
    currentPrice: { numerator: '1', denominator: '1' },
    latestCompletedClose: {
      timestampMs: H,
      availableAtMs: H + 1500,
      price: { numerator: '1', denominator: '1' },
      evidenceSha256: 'd'.repeat(64),
    },
    candidates: Array.from({ length: 9 }, (_, i) => ({
      inputKusd: i + 1,
      status: i === 0 ? 'ready' : 'unavailable',
      reason: i === 0 ? null : 'synthetic-no-route',
      evidenceSha256: ['e'.repeat(64)],
      quote:
        i === 0
          ? {
              quotedOutputXorCodec: '2000000000000000000',
              minimumOutputXorCodec: '1990000000000000000',
              networkFeeXorCodec: '100000000000000000',
              priceImpact: { numerator: '0', denominator: '1' },
              quoteReceivedAtMs: H + 2200,
              feeReceivedAtMs: H + 2500,
              expiresAtMs: H + 6000,
            }
          : null,
    })),
  };
  const episode = {
    episodeId: 'synthetic-admission',
    journalPrefixSha256: 'f'.repeat(64),
    journalRevision: 2,
    openingAtMs: H,
    deadlineMs: H + 86400000,
    lastAtMs: H + 2000,
    opening: {
      capitalKusdCodec: '10000000000000000000',
      feeReserveXorCodec: '1000000000000000000',
      price: { numerator: '1', denominator: '1' },
    },
    current: {
      kusdCodec: '10000000000000000000',
      xorCodec: '1000000000000000000',
      feesPaidXorCodec: '0',
      peakXor: { numerator: '11', denominator: '1' },
      markBlockHash: packet.block.hash,
    },
    attemptCommitted: false,
    successfulPurchase: false,
    orderPhase: 'none',
    goalStopped: false,
    targetReached: false,
  };
  const request = { kind: 'accumulation-admission-request-v1', packet, episode };
  const inputBytes = Buffer.from(JSON.stringify(request));
  const trust: AccumulationAdmissionResultTrust = {
    repositoryRoot: '/synthetic/accumulation',
    pythonExecutable: '/synthetic/python3',
    registrationSha256: '1'.repeat(64),
    pythonSha256: '2'.repeat(64),
    sourceBindings: sources.map((row) => ({ ...row })),
    modelSha256: '59c55ea8eb27b9efcf6e14cff95f3a56f73f2e65d9e66c82bad7b1a5b5fff355',
    expectedInputSha256: admissionResultSha(inputBytes),
    expectedEpisode: {
      episodeId: episode.episodeId,
      journalPrefixSha256: episode.journalPrefixSha256,
      journalRevision: episode.journalRevision,
      projectionSha256: admissionResultSha(canonical(episode)),
    },
    expectedPacketSha256: packet.packetSha256,
    limits: { timeoutMs: 30000, maxInputBytes: 256 * 1024, maxStdoutBytes: 256 * 1024, maxStderrBytes: 64 * 1024 },
  };
  const output: Record<string, any> = {
    kind: 'accumulation-admission-result-v1',
    status: 'evaluated',
    inputSha256: trust.expectedInputSha256,
    modelSha256: trust.modelSha256,
    packetSha256: packet.packetSha256,
    episodeId: episode.episodeId,
    journalPrefixSha256: episode.journalPrefixSha256,
    journalRevision: episode.journalRevision,
    evidenceAuthentication: 'external-verifier-and-trusted-journal-required',
    dependencySha256: Object.fromEntries(sources.slice(1).map((s) => [s.path.split('/').at(-1), s.sha256])),
    policyCalled: true,
    candidateOutcomes: JSON.parse(JSON.stringify(packet.candidates)),
    decision: {
      action: 'buy',
      selected_input_kusd: 1,
      reason: 'myopic_model_admission_only',
      expected_wait_terminal_xor: '11',
      candidates: [
        {
          input_kusd: 1,
          admitted: true,
          reasons: [],
          post_entry_value_xor: { numerator: '1189', denominator: '100' },
          expected_terminal_xor: '11.89',
          expected_growth_xor: '0.89',
          expected_excess_xor: '0.89',
          passing_paths: 1024,
          ambiguous_paths: 0,
          failed_attempt_value_xor: { numerator: '109', denominator: '10' },
        },
      ],
      scenario_count: 1024,
      wait_passing_paths: 1024,
      wait_ambiguous_paths: 0,
      seed: 20260926,
    },
    financialActions: false,
    qualificationAuthority: false,
  };
  const checks = [
    { path: trust.pythonExecutable, sha256: trust.pythonSha256 },
    ...sources.map((s) => ({ path: trust.repositoryRoot + '/' + s.path, sha256: s.sha256 })),
  ].map((s) => ({
    path: s.path,
    expectedSha256: s.sha256,
    actualSha256: s.sha256,
    status: 'match' as const,
    reason: null,
  }));
  const started = { wallMs: decisionAtMs + 10, monotonicNs: '10000000' },
    spawned = { wallMs: decisionAtMs + 20, monotonicNs: '20000000' },
    finished = { wallMs: finishedAtMs, monotonicNs: String(BigInt(finishedAtMs - decisionAtMs) * 1000000n) };
  const receipt: AccumulationSubprocessReceipt = {
    kind: 'accumulation-subprocess-v1',
    runner: 'admission',
    registrationSha256: trust.registrationSha256,
    executable: trust.pythonExecutable,
    argv: ['-I', '-S', '-B', trust.repositoryRoot + '/scripts/bots/accumulation_admission_runner.py'],
    cwd: trust.repositoryRoot,
    environment: { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
    input: { bytes: inputBytes.length, sha256: trust.expectedInputSha256, writeCompleted: true },
    limits: { ...trust.limits },
    started,
    spawned,
    finished,
    elapsedNs: String(BigInt(finished.monotonicNs) - BigInt(started.monotonicNs)),
    before: checks.map((x) => ({ ...x })),
    after: checks.map((x) => ({ ...x })),
    stdout: admissionResultStream(Buffer.from(canonical(output) + '\n')),
    stderr: admissionResultStream(Buffer.alloc(0)),
    spawnAttempted: true,
    pid: 123456,
    exitObserved: true,
    exitCode: 0,
    exitSignal: null,
    closeObserved: true,
    terminationUnconfirmed: false,
    outcomeUnknown: false,
    timedOut: false,
    terminationRequests: [],
    errors: [],
    outcome: 'completed',
    resultAuthority: false,
  };
  return { request, inputBytes, receipt, trust, output };
}
/** Deliberate synthetic mutation only; production callers must independently obtain immutable bindings. */
export function repinAccumulationAdmissionResultFixture(
  f: ReturnType<typeof createAccumulationAdmissionResultFixture>
) {
  f.inputBytes = Buffer.from(JSON.stringify(f.request));
  const sha = admissionResultSha(f.inputBytes);
  f.trust.expectedInputSha256 = sha;
  f.receipt.input = { bytes: f.inputBytes.length, sha256: sha, writeCompleted: true };
  f.trust.expectedEpisode = {
    episodeId: f.request.episode.episodeId,
    journalPrefixSha256: f.request.episode.journalPrefixSha256,
    journalRevision: f.request.episode.journalRevision,
    projectionSha256: admissionResultSha(canonical(f.request.episode)),
  };
  f.trust.expectedPacketSha256 = f.request.packet.packetSha256;
  Object.assign(f.output, {
    inputSha256: sha,
    packetSha256: f.request.packet.packetSha256,
    episodeId: f.request.episode.episodeId,
    journalPrefixSha256: f.request.episode.journalPrefixSha256,
    journalRevision: f.request.episode.journalRevision,
    candidateOutcomes: JSON.parse(JSON.stringify(f.request.packet.candidates)),
  });
  f.receipt.stdout = admissionResultStream(Buffer.from(canonical(f.output) + '\n'));
  return f;
}
