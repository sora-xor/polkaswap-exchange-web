/** Fresh, durable prospective capture artifacts; no acquisition, recovery, goal journal or financial authority. */
import * as fs from 'node:fs/promises';
import { constants, type Stats } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const FILE_LIMIT = 8 * 1024 * 1024;
const SEAL_RESERVE = 64 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const ATTEMPT = /^[a-z0-9][a-z0-9-]{0,95}$/;
const NAME = /^[a-z][a-z0-9-]{0,119}\.json$/;
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export interface AccumulationCaptureStoreOptions {
  /** Existing canonical absolute directory. No directory or parent may be a symlink. */
  baseDirectory: string;
  attemptName: string;
  registrationBytes: Uint8Array;
  /** Independently retained expected digest, not derived by this store from untrusted claims. */
  expectedRegistrationSha256: string;
  maximumBytes: number;
  maximumRecords?: number;
}
export interface AccumulationCaptureFile {
  readonly name: string;
  readonly sha256: string;
  readonly bytes: number;
}
export interface AccumulationCaptureTerminal {
  status: 'complete' | 'failed';
  /** Bounded diagnostic code only; no exception text or credentials. */
  reason: string | null;
}
/** Uncertain I/O permanently poisons this owner. Remnants are never reset, removed or reopened. */
export class AccumulationCaptureStoreError extends Error {
  constructor(
    readonly reason: string,
    readonly recoveryRequired = false
  ) {
    super(`accumulation-capture-store:${reason}`);
  }
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new AccumulationCaptureStoreError(reason);
}
function own(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'data-object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every(
      (k) => typeof k === 'string' && allowed.includes(k) && descriptors[k].enumerable && 'value' in descriptors[k]
    ),
    'data-fields'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([k, d]) => [k, d.value]));
}
function integer(value: unknown, low: number, high: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= low && Number(value) <= high;
}
async function canonicalDirectory(directory: string): Promise<Stats> {
  const stat = await fs.lstat(directory);
  check(
    stat.isDirectory() && !stat.isSymbolicLink() && (await fs.realpath(directory)) === directory,
    'unsafe-directory'
  );
  return stat;
}
async function syncDirectory(directory: string): Promise<void> {
  const handle = await fs.open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Creates one exclusive attempt, copying registration bytes before the first await.
 * Retain operations serialize only filesystem writes; no acquisition is scheduled.
 * The caller must await every acknowledgement and owns independent registration.
 */
export async function createAccumulationCaptureStore(value: AccumulationCaptureStoreOptions) {
  const input = own(value, [
    'baseDirectory',
    'attemptName',
    'registrationBytes',
    'expectedRegistrationSha256',
    'maximumBytes',
    'maximumRecords',
  ]);
  const { baseDirectory, attemptName, expectedRegistrationSha256, maximumBytes } = input;
  const maximumRecords = input.maximumRecords === undefined ? 128 : input.maximumRecords;
  check(
    typeof baseDirectory === 'string' &&
      path.isAbsolute(baseDirectory) &&
      path.resolve(baseDirectory) === baseDirectory,
    'base-directory'
  );
  check(typeof attemptName === 'string' && ATTEMPT.test(attemptName), 'attempt-name');
  check(typeof expectedRegistrationSha256 === 'string' && SHA.test(expectedRegistrationSha256), 'registration-digest');
  check(
    input.registrationBytes instanceof Uint8Array &&
      input.registrationBytes.byteLength > 0 &&
      input.registrationBytes.byteLength <= FILE_LIMIT,
    'registration-bytes'
  );
  const registrationBytes = Buffer.from(input.registrationBytes);
  check(digest(registrationBytes) === expectedRegistrationSha256, 'registration-binding');
  check(
    integer(maximumRecords, 2, 128) && integer(maximumBytes, registrationBytes.length + SEAL_RESERVE, 64 * 1024 * 1024),
    'limits'
  );
  const directory = path.join(baseDirectory, attemptName);
  let created = false,
    poisoned = false,
    sealing = false,
    sealed = false;
  let retainedBytes = 0,
    plannedBytes = registrationBytes.length;
  const reserved = new Set(['registration.json', 'seal.json']);
  const files = new Map<string, AccumulationCaptureFile>();
  let pending: Promise<unknown> = Promise.resolve();
  let identity: { dev: number; ino: number };
  const unavailable = () => {
    if (poisoned) throw new AccumulationCaptureStoreError('owner-poisoned', true);
    check(!sealed, 'owner-unavailable');
  };
  const poison = (reason: string): never => {
    poisoned = true;
    throw new AccumulationCaptureStoreError(reason, true);
  };
  const validateDirectory = async () => {
    await canonicalDirectory(baseDirectory);
    const stat = await canonicalDirectory(directory);
    check(stat.dev === identity.dev && stat.ino === identity.ino, 'directory-replaced');
  };
  const write = async (name: string, bytes: Buffer): Promise<AccumulationCaptureFile> => {
    await validateDirectory();
    const handle = await fs.open(
      path.join(directory, name),
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await syncDirectory(directory);
    const entry = Object.freeze({ name, sha256: digest(bytes), bytes: bytes.length });
    files.set(name, entry);
    retainedBytes += bytes.length;
    return entry;
  };
  try {
    await canonicalDirectory(baseDirectory);
    await fs.mkdir(directory, { mode: 0o700 });
    created = true;
    const stat = await canonicalDirectory(directory);
    identity = { dev: stat.dev, ino: stat.ino };
    await write('registration.json', registrationBytes);
    await syncDirectory(baseDirectory);
  } catch (error) {
    if (created) return poison('create-uncertain');
    throw error instanceof AccumulationCaptureStoreError ? error : new AccumulationCaptureStoreError('create-failed');
  }
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = pending.then(async () => {
      unavailable();
      try {
        return await work();
      } catch {
        return poison('io-or-inventory-uncertain');
      }
    });
    pending = result.catch(() => undefined);
    return result;
  };
  /** Durable exact UTF-8 callback compatible with both quote and bootstrap recorders. */
  const retain = (name: string, text: string): Promise<{ sha256: string; bytes: number }> => {
    try {
      unavailable();
      check(!sealing, 'seal-started');
      check(typeof name === 'string' && NAME.test(name) && !reserved.has(name), 'record-name-or-reuse');
      check(typeof text === 'string' && text.length > 0 && text.length <= FILE_LIMIT, 'record-text');
      const bytes = Buffer.from(text, 'utf8');
      check(bytes.length <= FILE_LIMIT && bytes.toString('utf8') === text, 'record-byte-bound');
      // One slot and 64 KiB remain available for a terminal failure seal.
      check(
        reserved.size < maximumRecords && plannedBytes + bytes.length <= maximumBytes - SEAL_RESERVE,
        'capture-budget'
      );
      reserved.add(name);
      plannedBytes += bytes.length;
      return enqueue(async () => {
        const entry = await write(name, bytes);
        return Object.freeze({ sha256: entry.sha256, bytes: entry.bytes });
      });
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const verifyInventory = async () => {
    await validateDirectory();
    const names = (await fs.readdir(directory)).sort(),
      expected = [...files.keys()].sort();
    check(JSON.stringify(names) === JSON.stringify(expected), 'unexpected-file-inventory');
    for (const name of names) {
      const entry = files.get(name)!;
      const filename = path.join(directory, name),
        before = await fs.lstat(filename);
      check(
        before.isFile() && !before.isSymbolicLink() && before.size === entry.bytes && before.size <= FILE_LIMIT,
        'changed-file'
      );
      const handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await handle.stat();
        check(stat.dev === before.dev && stat.ino === before.ino && stat.size === entry.bytes, 'changed-file-identity');
        const bytes = Buffer.alloc(entry.bytes + 1);
        let offset = 0;
        while (offset < bytes.length) {
          const result = await handle.read(bytes, offset, bytes.length - offset, offset);
          if (!result.bytesRead) break;
          offset += result.bytesRead;
        }
        const after = await handle.stat();
        check(
          offset === entry.bytes &&
            after.size === stat.size &&
            after.mtimeMs === stat.mtimeMs &&
            digest(bytes.subarray(0, offset)) === entry.sha256,
          'changed-file-bytes'
        );
      } finally {
        await handle.close();
      }
    }
  };
  /** Complete capture is not admission; failed captures bind their retained partial inventory too. */
  const seal = (value: AccumulationCaptureTerminal): Promise<{ path: string; sha256: string; bytes: number }> => {
    try {
      unavailable();
      check(!sealing, 'seal-started');
      const terminal = own(value, ['status', 'reason']);
      check(
        Object.keys(terminal).length === 2 && (terminal.status === 'complete' || terminal.status === 'failed'),
        'terminal-status'
      );
      check(
        terminal.reason === null || (typeof terminal.reason === 'string' && /^[a-z0-9-]{1,96}$/.test(terminal.reason)),
        'terminal-reason'
      );
      check(terminal.status !== 'failed' || terminal.reason !== null, 'failed-reason-required');
      sealing = true;
      return enqueue(async () => {
        await verifyInventory();
        const inventory = [...files.keys()].sort().map((name) => files.get(name)!);
        const body = Buffer.from(
          JSON.stringify({
            kind: 'accumulation-capture-seal-v1',
            attemptName,
            registrationSha256: expectedRegistrationSha256,
            terminal,
            files: inventory,
            inventoriedBytes: retainedBytes,
            inventoriedRecords: inventory.length,
          }) + '\n'
        );
        check(
          body.length <= SEAL_RESERVE &&
            retainedBytes + body.length <= maximumBytes &&
            files.size + 1 <= maximumRecords,
          'seal-budget'
        );
        const entry = await write('seal.json', body);
        sealed = true;
        return Object.freeze({ path: path.join(directory, 'seal.json'), sha256: entry.sha256, bytes: entry.bytes });
      });
    } catch (error) {
      return Promise.reject(error);
    }
  };
  return Object.freeze({
    directory,
    retain,
    seal,
    inspection: () =>
      Object.freeze({
        state: poisoned ? 'poisoned' : sealed ? 'sealed' : sealing ? 'sealing' : 'open',
        retainedRecords: files.size,
        retainedBytes,
        reservedRecords: reserved.size,
        maximumRecords,
        maximumBytes,
      }),
  });
}
