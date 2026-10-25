/** Reproducible, offline comparison of fixed development controls. No model search or network access. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FPNumber } from '../../src/lib/substrate/math';
import { canonicalEvidenceJson, hashEvidence } from './execution-evidence';
import { validateExecutionJournal, type ExecutionManifest, type ExecutionRecord } from './execution-store';
import {
  replayExecutionEpisode,
  EXECUTION_EPISODE_DURATION_MS,
  type ExecutionEpisodePolicy,
  type ExecutionEpisodeScenario,
} from './execution-replay';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const EXECUTION_EPISODE_CONTROLS: ReadonlyArray<readonly [ExecutionEpisodePolicy, ExecutionEpisodeScenario]> = [
  ['idle', 'quoted-minimum-success'],
  ['seed-once', 'quoted-minimum-success'],
  ['seed-once', 'fee-only-failure'],
  ['improved-net-acquisition-once', 'quoted-minimum-success'],
  ['improved-net-acquisition-once', 'fee-only-failure'],
];

/** Reject implicit datasets, tunable policies, output overwrites and unknown command switches. */
export function parseEpisodeReplayArguments(args: string[]): { directory: string; output: string } {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--dataset', '--out'].includes(args[i]) ||
      values.has(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error('Usage: --dataset DIRECTORY --out NEW_REPORT_JSON');
    values.set(args[i], args[i + 1]);
  }
  if (values.size !== 2) throw new Error('Explicit dataset and new output file required');
  const directory = resolve(values.get('--dataset')!);
  const output = resolve(values.get('--out')!);
  if ([directory, join(directory, 'manifest.json'), join(directory, 'observations.jsonl')].includes(output))
    throw new Error('The report cannot replace source evidence');
  return { directory, output };
}

/** Fingerprint the evaluator and its actual runtime accounting dependencies; tests are not market evidence. */
export async function executionEpisodeSourceHashes(root = ROOT): Promise<Record<string, string>> {
  const files = [
    'package.json',
    'yarn.lock',
    'scripts/bots/replay-execution-episode.ts',
    'scripts/bots/execution-replay.ts',
    'scripts/bots/execution-store.ts',
    'scripts/bots/execution-reader.ts',
    'scripts/bots/execution-evidence.ts',
    'src/lib/substrate/math/index.ts',
    'src/features/bot-trading/amounts.ts',
    'src/features/bot-trading/allocation.ts',
    'src/features/bot-trading/engine.ts',
    'src/features/bot-trading/goals.ts',
    'src/features/bot-trading/goalAdmission.ts',
    'src/features/bot-trading/strategy-rules.ts',
    'src/features/bot-trading/types.ts',
  ];
  const hashes: Record<string, string> = {};
  for (const file of files.sort())
    hashes[file] = createHash('sha256')
      .update(await readFile(join(root, file)))
      .digest('hex');
  return hashes;
}

/** Read the complete existing journal offline, evaluate every fixed control and create an immutable comparison report. */
export async function runEpisodeReplay(args: string[]): Promise<void> {
  const { directory, output } = parseEpisodeReplayArguments(args);
  const sourceHashes = await executionEpisodeSourceHashes();
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')) as ExecutionManifest;
  const journal = await readFile(join(directory, 'observations.jsonl'), 'utf8');
  if (journal && !journal.endsWith('\n')) throw new Error('Incomplete journal tail; never repair or truncate evidence');
  const records: ExecutionRecord[] = journal
    ? journal
        .slice(0, -1)
        .split('\n')
        .map((line) => JSON.parse(line))
    : [];
  validateExecutionJournal(manifest, records);
  const runs = EXECUTION_EPISODE_CONTROLS.map(([policy, scenario]) =>
    replayExecutionEpisode(manifest, records, policy, scenario)
  );
  const comparisons = runs.flatMap((run) => {
    if (!run.performance || !runs[0].performance) return [];
    const control = runs.find((r) => r.policy === 'seed-once' && r.scenario === run.scenario);
    return [
      {
        policy: run.policy,
        scenario: run.scenario,
        excessVsIdlePercent: new FPNumber(run.performance.returnPercent, 36)
          .sub(new FPNumber(runs[0].performance.returnPercent, 36))
          .toString(),
        excessVsSeedScenarioPercent: control?.performance
          ? new FPNumber(run.performance.returnPercent, 36)
              .sub(new FPNumber(control.performance.returnPercent, 36))
              .toString()
          : null,
      },
    ];
  });
  const opening = records[0]?.status === 'complete' ? records[0].snapshot : undefined;
  const natural = (codec: string) => new FPNumber(FPNumber.fromCodecValue(codec, 18).toString(), 36);
  const threshold = opening
    ? natural(opening.buy.amountWithoutImpactCodec).mul(new FPNumber('0.05', 36)).add(new FPNumber('0.025', 36))
    : null;
  const fee = opening ? natural(opening.buy.fee.partialFeeCodec) : null;
  const report = {
    schemaVersion: 1,
    purpose: 'development',
    generatedAt: Date.now(),
    manifestHash: hashEvidence(manifest),
    journalHash: createHash('sha256').update(journal).digest('hex'),
    sourceHashes,
    protocol: {
      fundingSlot: 0,
      durationMs: EXECUTION_EPISODE_DURATION_MS,
      initialKusd: '10',
      separateXorFeeReserve: '1',
      orderKusd: '5',
      maxEntryDecisions: 1,
      maxLossPercent: '5',
      maxPriceImpactPercent: '3',
      targetPercent: '5',
      controls: EXECUTION_EPISODE_CONTROLS,
      closing:
        'First observed receipt at/after 24 hours; missing scheduled closing observation is incomplete; no interpolation',
      quoteFreshness: 'Less than 5000 ms from buy request start to validated snapshot receipt',
      knowledge:
        'Current complete observation only; next frozen slot only for entry; funding quote is a reference, not a fill',
    },
    originalPrincipalBasedH6: {
      implementedAsTradingPolicy: false,
      feeThresholdXor: threshold?.toString() ?? null,
      observedFundingFeeXor: fee?.toString() ?? null,
      targetOccludedUnderFundingCostScenario: !!(
        opening &&
        threshold &&
        fee &&
        fee.gte(threshold) &&
        BigInt(opening.buy.minimumCodec) <= BigInt(opening.buy.amountWithoutImpactCodec)
      ),
      limitation:
        'Conditional on this cost/mark scenario and nonnegative impact/slippage; not a proof about future fees. The improved-net-acquisition policy is a different hypothesis.',
    },
    comparisons,
    runs,
    qualifiedStrategy: false,
    actualTransactions: 0,
  };
  if (canonicalEvidenceJson(sourceHashes) !== canonicalEvidenceJson(await executionEpisodeSourceHashes()))
    throw new Error('Evaluator sources changed during replay');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, canonicalEvidenceJson(report) + '\n', { flag: 'wx' });
  console.log(
    JSON.stringify({
      report: output,
      runs: runs.map((r) => ({
        policy: r.policy,
        scenario: r.scenario,
        status: r.status,
        decisions: r.decisions,
        scenarioBuys: r.scenarioBuys,
        scenarioFailures: r.scenarioFailures,
        performance: r.performance ?? null,
      })),
      qualifiedStrategy: false,
      actualTransactions: 0,
    })
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runEpisodeReplay(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
