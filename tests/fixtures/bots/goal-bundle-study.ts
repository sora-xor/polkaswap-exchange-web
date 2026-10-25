/** Original store/export fixture with invented evaluator traces; never claims real chain evidence or profit. */
import { mkdtemp, readFile, readdir, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  bundleFixtureFiles,
  completeBundleFixture,
  bundleEpisode,
  bundleCanonical,
} from '../../unit/scripts/bots/goal-study-bundle-fixtures';
import { exportGoalStudyBundle, type GoalStudyBundleIndex } from '../../../scripts/bots/goal-study-bundle-export';
import { createGoalStudyBundleReader } from '../../../src/features/bot-trading/goal-study-bundle-reader';
import {
  createGoalBundleStudy,
  type GoalBundleStudyEpisodeContext,
} from '../../../src/features/bot-trading/goal-bundle-study';
import { goalRawBytesSha256 } from '../../../src/features/bot-trading/goal-raw-envelope';
import type { GoalQualificationEpisodeEvidence } from '../../../src/features/bot-trading/goal-qualification';
const ROOT = 'https://bundle-fixture.example.org/study/';
const encode = (value: unknown) => new TextEncoder().encode(bundleCanonical(value) + '\n');
/** Uses the actual journal, qualification boundary, exporter and browser reader against synthetic static bytes. */
export async function createGoalBundleStudyFixture(
  configure?: (files: Awaited<ReturnType<typeof bundleFixtureFiles>>) => Promise<void>
) {
  const temp = await realpath(await mkdtemp(join(tmpdir(), 'browser-study-fixture-')));
  try {
    const files = await bundleFixtureFiles(temp);
    await configure?.(files);
    const certificate = await completeBundleFixture(files);
    await exportGoalStudyBundle({
      studyRoot: files.studyRoot,
      runDirectory: files.runDirectory,
      outputDirectory: files.outputDirectory,
      protocolSha256: files.protocolSha256,
    });
    const objects = new Map<string, Uint8Array>();
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await walk(path);
        else
          objects.set(
            ROOT + relative(files.outputDirectory, path).split('\\').join('/'),
            new Uint8Array(await readFile(path))
          );
      }
    };
    await walk(files.outputDirectory);
    const baseIndex = JSON.parse(new TextDecoder().decode(objects.get(ROOT + 'index.json')!)) as GoalStudyBundleIndex;
    return {
      plan: files.plan,
      manifest: files.protocol.manifest,
      certificate,
      fork() {
        const content = new Map([...objects].map(([name, value]) => [name, new Uint8Array(value)])),
          index = JSON.parse(JSON.stringify(baseIndex)) as GoalStudyBundleIndex;
        const requests: string[] = [];
        let beforeFetch: ((url: string, init: RequestInit | undefined) => Promise<void>) | undefined;
        const fetcher = async (url: RequestInfo | URL, init?: RequestInit) => {
          const name = String(url);
          requests.push(name);
          await beforeFetch?.(name, init);
          const bytes = content.get(name);
          if (!bytes) throw Error('missing synthetic bundle file');
          const response = new Response(new Uint8Array(bytes));
          Object.defineProperty(response, 'url', { value: name });
          return response;
        };
        const rootValue = (name: string) => {
          const item = index.artifacts.find((item) => item.name === name)!;
          return JSON.parse(new TextDecoder().decode(content.get(ROOT + 'objects/' + item.sha256 + '.bin')!));
        };
        const editRoot = (name: string, edit: (value: any) => void) => {
          const item = index.artifacts.find((item) => item.name === name)!;
          const value = rootValue(name);
          edit(value);
          const bytes = encode(value);
          Object.assign(item, { sha256: goalRawBytesSha256(bytes), bytes: bytes.length });
          content.set(ROOT + 'objects/' + item.sha256 + '.bin', bytes);
        };
        const open = async () => {
          const bytes = encode(index);
          content.set(ROOT + 'index.json', bytes);
          return createGoalStudyBundleReader(
            { rootUrl: ROOT, indexSha256: goalRawBytesSha256(bytes) },
            { fetch: fetcher }
          );
        };
        const evidence = async (context: Readonly<GoalBundleStudyEpisodeContext>) => {
          for (const receipt of context.receipts) await context.reader.read(receipt.name);
          return bundleEpisode(context.request, context.plan);
        };
        const create = async (
          evaluateEpisode: (
            context: Readonly<GoalBundleStudyEpisodeContext>
          ) => Promise<GoalQualificationEpisodeEvidence> = evidence
        ) => {
          const reader = await open();
          return { reader, study: await createGoalBundleStudy({ reader, evaluateEpisode }) };
        };
        return {
          index,
          content,
          requests,
          root: ROOT,
          rootValue,
          editRoot,
          open,
          evidence,
          create,
          setBeforeFetch(callback: typeof beforeFetch) {
            beforeFetch = callback;
          },
        };
      },
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
