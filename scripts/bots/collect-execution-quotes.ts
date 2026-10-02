/** Bounded CLI for public execution evidence; no wallet or trading action is available. */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalEvidenceJson } from './execution-evidence';
import { EXECUTION_ESTIMATION_ASSUMPTIONS, openExecutionReader } from './execution-rpc';
import {
  createExecutionManifest,
  validateExecutionManifest,
  openExecutionStore,
  collectExecutionSlot,
  executionReverseLot,
  loadFrozenExecutionLot,
  type ExecutionManifest,
} from './execution-store';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Hash the collector, schema, custom RPC types, dependency lock and package versions before any connection. */
export async function executionSourceHashes(root = ROOT): Promise<Record<string, string>> {
  const files = [
    'package.json',
    'yarn.lock',
    'scripts/bots/collect-execution-quotes.ts',
    'scripts/bots/execution-evidence.ts',
    'scripts/bots/execution-reader.ts',
    'scripts/bots/execution-rpc.ts',
    'scripts/bots/execution-store.ts',
  ];
  const visit = async (directory: string): Promise<void> => {
    for (const item of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${item.name}`;
      if (item.isDirectory()) await visit(path);
      else if (item.isFile() && /\.(ts|json)$/.test(item.name)) files.push(path);
      else throw new Error('Unexpected custom-type source entry');
    }
  };
  await visit('src/lib/substrate/type-definitions');
  const hashes: Record<string, string> = {};
  for (const path of files.sort())
    hashes[path] = createHash('sha256')
      .update(await readFile(join(root, path)))
      .digest('hex');
  return hashes;
}

/** Require an explicit output and either a future frozen schedule or an unchanged resume. */
export function parseExecutionArguments(args: string[]): {
  directory: string;
  resume: boolean;
  startAt?: number;
  slots?: number;
  cadenceMs?: number;
  lotSource?: { directory: string; slot: number };
} {
  const values = new Map<string, string>();
  let resume = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--resume' && !resume) {
      resume = true;
      continue;
    }
    if (
      !['--out', '--start', '--slots', '--cadence-ms', '--lot-from', '--lot-slot'].includes(key) ||
      values.has(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    ) {
      throw new Error(
        'Usage: --out DIRECTORY --start UTC_ISO --slots 1..1440 --cadence-ms 30000..3600000 [--lot-from DATASET --lot-slot INDEX]; or --out DIRECTORY --resume'
      );
    }
    values.set(key, args[++i]);
  }
  const out = values.get('--out');
  const lotDirectory = values.get('--lot-from');
  const lotSlot = values.get('--lot-slot');
  const hasLot = lotDirectory !== undefined || lotSlot !== undefined;
  if (!out || (resume ? values.size !== 1 : values.size !== (hasLot ? 6 : 4)))
    throw new Error('Explicit output and frozen schedule required');
  if (
    hasLot &&
    (resume ||
      !lotDirectory ||
      lotSlot === undefined ||
      !/^(0|[1-9]\d*)$/.test(lotSlot) ||
      !Number.isSafeInteger(Number(lotSlot)) ||
      Number(lotSlot) > 1439 ||
      resolve(lotDirectory) === resolve(out))
  )
    throw new Error('Explicit prior dataset and zero-based lot slot required');
  const start = values.get('--start');
  if (
    !resume &&
    (!start ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(start) ||
      !Number.isFinite(Date.parse(start)) ||
      new Date(start).toISOString() !== start ||
      !/^\d+$/.test(values.get('--slots')!) ||
      !/^\d+$/.test(values.get('--cadence-ms')!))
  )
    throw new Error('Invalid UTC schedule');
  return {
    directory: resolve(out),
    resume,
    ...(!resume
      ? {
          startAt: Date.parse(start!),
          slots: Number(values.get('--slots')),
          cadenceMs: Number(values.get('--cadence-ms')),
          ...(hasLot ? { lotSource: { directory: resolve(lotDirectory!), slot: Number(lotSlot) } } : {}),
        }
      : {}),
  };
}

/** Freeze once, then append every scheduled slot; resuming never replaces an existing outcome. */
export async function runExecutionCollector(args: string[]): Promise<void> {
  const options = parseExecutionArguments(args);
  const sourceHashes = await executionSourceHashes();
  let manifest: ExecutionManifest;
  if (options.resume) {
    manifest = validateExecutionManifest(JSON.parse(await readFile(join(options.directory, 'manifest.json'), 'utf8')));
    if (
      canonicalEvidenceJson(manifest.sourceHashes) !== canonicalEvidenceJson(sourceHashes) ||
      canonicalEvidenceJson(manifest.feeAssumptions) !== canonicalEvidenceJson(EXECUTION_ESTIMATION_ASSUMPTIONS)
    ) {
      throw new Error('Source or fee assumptions changed; retain this dataset and start a new development dataset');
    }
  } else {
    const frozenAt = Date.now();
    const fixedLot = options.lotSource
      ? await loadFrozenExecutionLot(options.lotSource.directory, options.lotSource.slot, frozenAt)
      : undefined;
    manifest = createExecutionManifest(
      { startAt: options.startAt!, slots: options.slots!, cadenceMs: options.cadenceMs! },
      sourceHashes,
      EXECUTION_ESTIMATION_ASSUMPTIONS,
      frozenAt,
      fixedLot
    );
  }
  const store = await openExecutionStore(options.directory, manifest);
  try {
    console.log(
      JSON.stringify({
        event: 'frozen',
        directory: relative(ROOT, options.directory),
        manifest,
        retainedSlots: store.records.length,
      })
    );
    for (let index = store.records.length; index < manifest.slots; index++) {
      const slotAt = manifest.startAt + index * manifest.cadenceMs;
      while (Date.now() < slotAt) await new Promise((done) => setTimeout(done, Math.min(1000, slotAt - Date.now())));
      const outcome =
        Date.now() > slotAt + manifest.maxStartDelayMs
          ? { status: 'missed' as const, reason: 'start-deadline-exceeded' as const }
          : await collectExecutionSlot(
              slotAt,
              manifest.deadlineMs,
              openExecutionReader,
              Date.now,
              executionReverseLot(manifest),
              manifest.fixedReverseLot
            );
      const record = await store.append(slotAt, outcome);
      console.log(
        JSON.stringify({
          event: 'slot',
          index,
          slotAt,
          status: record.status,
          recordHash: record.recordHash,
          ...(record.status === 'error'
            ? { code: record.code, stage: record.progress.stage, message: record.message }
            : {}),
        })
      );
    }
    const records = store.records;
    console.log(
      JSON.stringify({
        event: 'finished',
        slots: records.length,
        complete: records.filter((r) => r.status === 'complete').length,
        errors: records.filter((r) => r.status === 'error').length,
        missed: records.filter((r) => r.status === 'missed').length,
        noTransactionsSubmitted: true,
      })
    );
  } finally {
    await store.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runExecutionCollector(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
