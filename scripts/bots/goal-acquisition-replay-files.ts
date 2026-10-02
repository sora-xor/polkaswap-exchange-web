/** Trusted local inventory for a retained failed training prefix. No network, evaluator or wallet surface. */
import { createHash, randomUUID } from 'node:crypto';
import { constants, type BigIntStats } from 'node:fs';
import { link, lstat, open, readdir, unlink, type FileHandle } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import {
  buildGoalAcquisitionReplayManifest,
  prepareGoalAcquisitionReplay,
  type GoalAcquisitionReplayFile,
  type GoalAcquisitionReplayPreparation,
} from './goal-acquisition-replay';

const SHA = /^[0-9a-f]{64}$/;
const MAX_FILE = 32 * 1024 * 1024;
const MAX_TOTAL = 512 * 1024 * 1024;
const MAX_RAW_FILES = 16000;
interface FileSnapshot {
  path: string;
  name: string;
  stat: BigIntStats;
  receipt?: GoalAcquisitionReplayFile;
}
interface DirectorySnapshot {
  path: string;
  handle: FileHandle;
  stat: BigIntStats;
}
export interface GoalAcquisitionReplayFilesInput {
  studyRoot: string;
  parentPlanSha256: string;
  requestSha256: string;
  /** An absent leaf in an existing real directory outside the authoritative study root. */
  manifestPath: string;
  signal?: AbortSignal;
}
export interface GoalAcquisitionReplayFilesResult {
  preparation: GoalAcquisitionReplayPreparation;
  manifest: Readonly<{
    path: string;
    sha256: string;
    bytes: number;
    files: number;
    rawFiles: number;
    sourceBytes: number;
  }>;
}
const fail = (reason: string): never => {
  throw Error(`goal-acquisition-files:${reason}`);
};
function check(value: unknown, reason: string): asserts value {
  if (!value) fail(reason);
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sameObject = (a: BigIntStats, b: BigIntStats) => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode;
const sameFile = (a: BigIntStats, b: BigIntStats) =>
  sameObject(a, b) && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs && a.nlink === b.nlink;
function absolute(path: unknown): asserts path is string {
  check(
    typeof path === 'string' &&
      path.length <= 4096 &&
      !path.includes('\0') &&
      isAbsolute(path) &&
      resolve(path) === path,
    'path'
  );
}
function inputSnapshot(raw: GoalAcquisitionReplayFilesInput): GoalAcquisitionReplayFilesInput {
  check(raw && Object.getPrototypeOf(raw) === Object.prototype, 'input');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const keys = [
    'studyRoot',
    'parentPlanSha256',
    'requestSha256',
    'manifestPath',
    ...(Object.hasOwn(raw, 'signal') ? ['signal'] : []),
  ];
  check(
    Reflect.ownKeys(descriptors).length === keys.length &&
      keys.every((key) => descriptors[key]?.enumerable && 'value' in descriptors[key]),
    'input'
  );
  const value = Object.fromEntries(
    keys.map((key) => [key, descriptors[key].value])
  ) as unknown as GoalAcquisitionReplayFilesInput;
  absolute(value.studyRoot);
  absolute(value.manifestPath);
  check(SHA.test(value.parentPlanSha256) && SHA.test(value.requestSha256), 'digest');
  check(value.signal === undefined || value.signal instanceof AbortSignal, 'signal');
  const location = relative(value.studyRoot, value.manifestPath);
  check(location === '..' || location.startsWith(`..${sep}`), 'manifest-inside-study');
  return value;
}

/**
 * Enumerate every original raw file, bind exact UTF-8 bytes, publish a no-clobber manifest, then
 * invoke the actual owned replay verifier. Parent records and validation claims are never written.
 * A failed verification may leave its immutable manifest as an audit artifact, but returns no preparation.
 */
export async function prepareGoalAcquisitionReplayFiles(
  raw: GoalAcquisitionReplayFilesInput
): Promise<Readonly<GoalAcquisitionReplayFilesResult>> {
  const input = inputSnapshot(raw);
  const signal = input.signal
    ? AbortSignal.any([input.signal, AbortSignal.timeout(60000)])
    : AbortSignal.timeout(60000);
  const active = () => check(!signal.aborted, 'aborted');
  const directories = new Map<string, DirectorySnapshot>();
  const parent = join(input.studyRoot, 'studies', input.parentPlanSha256);
  const rawDirectory = join(parent, `raw-${input.requestSha256}`);
  const parentNames = [
    'registration.json',
    `access-${input.requestSha256}.json`,
    `failed-${input.requestSha256}.json`,
    `raw-${input.requestSha256}`,
  ];
  const allowedParent = new Set([...parentNames, 'continuation-child.json']);
  let originalParentNames: string[] = [],
    originalRawNames: string[] = [];
  const files: FileSnapshot[] = [];

  const directory = async (path: string) => {
    const parts = path.slice(parse(path).root.length).split(sep).filter(Boolean);
    let current = parse(path).root;
    for (const part of ['', ...parts]) {
      if (part) current = join(current, part);
      if (directories.has(current)) continue;
      active();
      const before = await lstat(current, { bigint: true });
      check(before.isDirectory() && !before.isSymbolicLink(), 'directory');
      const handle = await open(current, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        const stat = await handle.stat({ bigint: true });
        check(
          stat.isDirectory() && sameObject(before, stat) && sameObject(stat, await lstat(current, { bigint: true })),
          'directory-changed'
        );
        directories.set(current, { path: current, handle, stat });
      } catch (error) {
        await handle.close();
        throw error;
      }
    }
  };
  const verifyDirectories = async () => {
    active();
    for (const entry of directories.values()) {
      check(
        sameObject(entry.stat, await entry.handle.stat({ bigint: true })) &&
          sameObject(entry.stat, await lstat(entry.path, { bigint: true })),
        'directory-changed'
      );
    }
  };
  const names = async (path: string) => (await readdir(path)).sort();
  const verifyInventory = async () => {
    await verifyDirectories();
    check(
      JSON.stringify(await names(parent)) === JSON.stringify(originalParentNames) &&
        JSON.stringify(await names(rawDirectory)) === JSON.stringify(originalRawNames),
      'inventory-changed'
    );
    for (const file of files) check(sameFile(file.stat, await lstat(file.path, { bigint: true })), 'file-changed');
  };
  const read = async (file: FileSnapshot, callerSignal = signal): Promise<string> => {
    active();
    check(!callerSignal.aborted, 'aborted');
    await verifyDirectories();
    check(sameFile(file.stat, await lstat(file.path, { bigint: true })), 'file-changed');
    const handle = await open(file.path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      check(sameFile(file.stat, await handle.stat({ bigint: true })), 'file-changed');
      await verifyDirectories();
      const bytes = Buffer.alloc(Number(file.stat.size));
      let offset = 0;
      while (offset < bytes.length) {
        active();
        check(!callerSignal.aborted, 'aborted');
        const result = await handle.read(bytes, offset, Math.min(65536, bytes.length - offset), offset);
        check(result.bytesRead > 0, 'file-short-read');
        offset += result.bytesRead;
      }
      check(
        sameFile(file.stat, await handle.stat({ bigint: true })) &&
          sameFile(file.stat, await lstat(file.path, { bigint: true })),
        'file-changed'
      );
      if (file.receipt) check(sha(bytes) === file.receipt.sha256, 'file-hash');
      else file.receipt = { name: file.name, bytes: bytes.length, sha256: sha(bytes) };
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    } finally {
      await handle.close();
    }
  };
  try {
    await directory(rawDirectory);
    await directory(dirname(input.manifestPath));
    await verifyDirectories();
    try {
      await lstat(input.manifestPath);
      fail('manifest-exists');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    originalParentNames = await names(parent);
    check(
      parentNames.every((name) => originalParentNames.includes(name)) &&
        originalParentNames.every((name) => allowedParent.has(name)),
      'parent-layout'
    );
    if (originalParentNames.includes('continuation-child.json')) {
      const child = await lstat(join(parent, 'continuation-child.json'), { bigint: true });
      check(
        child.isFile() && !child.isSymbolicLink() && child.size > 0n && child.size <= BigInt(MAX_FILE),
        'parent-layout'
      );
    }
    originalRawNames = await names(rawDirectory);
    check(originalRawNames.length > 0 && originalRawNames.length <= MAX_RAW_FILES, 'raw-file-count');
    const paths = [
      ['registration', join(parent, 'registration.json')],
      ['access', join(parent, `access-${input.requestSha256}.json`)],
      ['failed', join(parent, `failed-${input.requestSha256}.json`)],
      ...originalRawNames.map((name) => {
        check(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/.test(name), 'raw-file-name');
        return [`raw/${name.slice(0, -5)}`, join(rawDirectory, name)];
      }),
    ];
    let sourceBytes = 0;
    for (const [name, path] of paths) {
      active();
      const stat = await lstat(path, { bigint: true });
      check(
        stat.isFile() && !stat.isSymbolicLink() && stat.size > 0n && stat.size <= BigInt(MAX_FILE),
        'file-type-or-size'
      );
      sourceBytes += Number(stat.size);
      check(sourceBytes <= MAX_TOTAL, 'source-size');
      files.push({ name, path, stat });
    }
    for (const file of files) await read(file);
    await verifyInventory();
    const manifest = buildGoalAcquisitionReplayManifest(
      input.requestSha256,
      files.map((file) => file.receipt!)
    );
    const body = `${JSON.stringify(manifest)}\n`;
    const manifestBytes = Buffer.from(body, 'utf8');
    const manifestSha256 = sha(manifestBytes);
    const outputDirectory = directories.get(dirname(input.manifestPath))!;
    const temporary = join(dirname(input.manifestPath), `.pending-${randomUUID()}`);
    const handle = await open(
      temporary,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    try {
      await verifyDirectories();
      const opened = await handle.stat({ bigint: true });
      check(opened.isFile() && sameFile(opened, await lstat(temporary, { bigint: true })), 'manifest-file');
      await handle.writeFile(manifestBytes);
      await handle.sync();
      check((await handle.stat()).size === manifestBytes.length, 'manifest-size');
      await verifyInventory();
      await link(temporary, input.manifestPath);
      await outputDirectory.handle.sync();
    } finally {
      await handle.close();
      await unlink(temporary);
      await outputDirectory.handle.sync();
    }
    const manifestStat = await lstat(input.manifestPath, { bigint: true });
    check(manifestStat.isFile() && !manifestStat.isSymbolicLink(), 'manifest-file');
    const manifestFile: FileSnapshot = {
      path: input.manifestPath,
      name: 'manifest',
      stat: manifestStat,
      receipt: { name: 'manifest', sha256: manifestSha256, bytes: manifestBytes.length },
    };
    const allowlist = new Map(files.map((file) => [file.name, file]));
    allowlist.set('manifest', manifestFile);
    const preparation = await prepareGoalAcquisitionReplay(
      { requestSha256: input.requestSha256, rawManifestSha256: manifestSha256 },
      {
        signal,
        readArtifact: async (name, callerSignal) => {
          const file = allowlist.get(name);
          check(file, 'artifact-name');
          return read(file, callerSignal);
        },
      }
    );
    check(
      preparation.bindings.parentPlanSha256 === input.parentPlanSha256 &&
        preparation.bindings.requestSha256 === input.requestSha256,
      'parent-binding'
    );
    await verifyInventory();
    check(sameFile(manifestStat, await lstat(input.manifestPath, { bigint: true })), 'manifest-changed');
    active();
    return Object.freeze({
      preparation,
      manifest: Object.freeze({
        path: input.manifestPath,
        sha256: manifestSha256,
        bytes: manifestBytes.length,
        files: files.length,
        rawFiles: originalRawNames.length,
        sourceBytes,
      }),
    });
  } finally {
    await Promise.allSettled([...directories.values()].map((entry) => entry.handle.close()));
  }
}
