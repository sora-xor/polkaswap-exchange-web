/** Durable research journal storage for one cooperative writer.
 * Records remain claims until the separate replay/evidence verifiers check them.
 * No acquisition, admission, wallet, transaction or automatic crash recovery.
 */
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const MAX_JOURNAL = 1024 * 1024;
const MAX_RECORD = 384 * 1024;
const MAX_RECORDS = 512;
const MAX_ARTIFACT = 2 * 1024 * 1024;
const MAX_EVIDENCE = 64 * 1024 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9_-]{1,96}$/;
const EMPTY_SHA = digest(new Uint8Array());
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Io = Pick<typeof fs, 'mkdir' | 'open' | 'lstat' | 'realpath' | 'readdir' | 'rename' | 'unlink'>;

export interface AccumulationJournalHead {
  kind: 'accumulation-journal-head-v1';
  episodeId: string;
  registrationSha256: string;
  recordCount: number;
  headSha256: string | null;
  prefixSha256: string;
}
export interface AccumulationJournalRegistration {
  episodeId: string;
  /** Expected independently by the trusted parent, never learned from journal claims. */
  sha256: string;
  bytes: Uint8Array;
}
export interface AccumulationEvidenceReference {
  purpose: string;
  artifactId: string;
  sha256: string;
}
export interface AccumulationJournalSnapshot {
  head: AccumulationJournalHead;
  journalJsonl: string;
  /** Storage consistency does not authenticate native prices, receipts or coverage. */
  evidenceAuthentication: 'registered-bytes-only';
  financialActions: false;
  qualificationAuthority: false;
}

/** Storage has an explicit recovery state; failed writes never become a fresh opening. */
export class AccumulationJournalStoreError extends Error {
  constructor(
    readonly reason: string,
    readonly recoveryRequired = false
  ) {
    super(`accumulation-journal:${reason}`);
  }
}
function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new AccumulationJournalStoreError(reason);
}
function digest(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}
/** Exact ASCII JSON matches the Python worker, including escaped non-ASCII values. */
export function canonicalAccumulationJournalJson(value: unknown): string {
  let count = 0,
    stringBytes = 0;
  const active = new Set<object>();
  const encode = (item: unknown, depth: number): string => {
    check(++count <= 20000 && depth <= 24, 'json-bound');
    if (item === null || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      check(Number.isSafeInteger(item), 'json-integer');
      return JSON.stringify(item);
    }
    if (typeof item === 'string') {
      stringBytes += Buffer.byteLength(item);
      check(stringBytes <= MAX_RECORD, 'json-string-bound');
      return JSON.stringify(item).replace(
        /[\u007f-\uffff]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
      );
    }
    check(item && typeof item === 'object' && !active.has(item), 'json-data-only');
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(descriptors);
    check(
      keys.every((key) => typeof key === 'string' && 'value' in descriptors[key]),
      'json-accessor'
    );
    active.add(item);
    let result: string;
    if (Array.isArray(item)) {
      check(
        Object.getPrototypeOf(item) === Array.prototype && item.length <= 1024 && keys.length === item.length + 1,
        'json-array'
      );
      result =
        '[' +
        Array.from({ length: item.length }, (_, i) => {
          check(descriptors[i]?.enumerable, 'json-sparse');
          return encode(descriptors[i].value, depth + 1);
        }).join(',') +
        ']';
    } else {
      check(
        Object.getPrototypeOf(item) === Object.prototype &&
          keys.every(
            (key) => typeof key === 'string' && /^[\x20-\x7e]{1,192}$/.test(key) && descriptors[key].enumerable
          ),
        'json-object'
      );
      result =
        '{' +
        (keys as string[])
          .sort()
          .map((key) => `${JSON.stringify(key)}:${encode(descriptors[key].value, depth + 1)}`)
          .join(',') +
        '}';
    }
    active.delete(item);
    return result;
  };
  const result = encode(value, 0);
  check(Buffer.byteLength(result) <= MAX_RECORD, 'json-byte-bound');
  return result;
}
function decode(bytes: Uint8Array): Json {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value: unknown = JSON.parse(text);
  check(canonicalAccumulationJournalJson(value) + '\n' === text, 'noncanonical-json');
  return value as Json;
}
function object(value: Json): Record<string, Json> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'object-required');
  return value;
}
function exactKeys(value: Record<string, Json>, keys: string[]): void {
  check(
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)),
    'unexpected-fields'
  );
}
function sameHead(a: AccumulationJournalHead, b: AccumulationJournalHead): boolean {
  return canonicalAccumulationJournalJson(a) === canonicalAccumulationJournalJson(b);
}

/** Opened only by the factories; holds an exclusive lock until explicitly closed. */
export class AccumulationJournalStore {
  private poisoned = false;
  private closed = false;
  private busy = false;
  private constructor(
    readonly directory: string,
    private readonly registration: AccumulationJournalRegistration,
    private readonly io: Io,
    private readonly lock: Awaited<ReturnType<typeof fs.open>>,
    private readonly lockIdentity: { dev: number; ino: number },
    private current: AccumulationJournalHead
  ) {}

  /** Create new storage or reopen against an independently retained expected head. */
  static async acquire(
    directory: string,
    supplied: AccumulationJournalRegistration,
    expected: AccumulationJournalHead | null,
    io: Io
  ): Promise<AccumulationJournalStore> {
    check(
      ID.test(supplied.episodeId) &&
        SHA.test(supplied.sha256) &&
        supplied.bytes.byteLength > 0 &&
        supplied.bytes.byteLength <= 256 * 1024 &&
        digest(supplied.bytes) === supplied.sha256,
      'registration-binding'
    );
    const registration = { ...supplied, bytes: Uint8Array.from(supplied.bytes) };
    const expectedSnapshot =
      expected === null ? null : (JSON.parse(canonicalAccumulationJournalJson(expected)) as AccumulationJournalHead);
    const root = path.resolve(directory);
    check((await io.realpath(path.dirname(root))) === path.dirname(root), 'noncanonical-parent');
    if (expectedSnapshot === null) await io.mkdir(root, { mode: 0o700 });
    check(
      (await io.realpath(root)) === root &&
        (await io.lstat(root)).isDirectory() &&
        !(await io.lstat(root)).isSymbolicLink(),
      'noncanonical-directory'
    );
    const lockPath = path.join(root, 'LOCK');
    const lock = await io.open(
      lockPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600
    );
    const identity = await lock.stat();
    const empty: AccumulationJournalHead = {
      kind: 'accumulation-journal-head-v1',
      episodeId: registration.episodeId,
      registrationSha256: registration.sha256,
      recordCount: 0,
      headSha256: null,
      prefixSha256: EMPTY_SHA,
    };
    const store = new AccumulationJournalStore(root, registration, io, lock, identity, empty);
    try {
      await lock.writeFile(canonicalAccumulationJournalJson({ owner: randomUUID(), pid: process.pid }) + '\n');
      await lock.sync();
      if (expectedSnapshot === null) {
        await io.mkdir(path.join(root, 'records'), { mode: 0o700 });
        await io.mkdir(path.join(root, 'evidence'), { mode: 0o700 });
        await store.writeExclusive('registration.bytes', registration.bytes);
        await store.writeExclusive('HEAD.json', Buffer.from(canonicalAccumulationJournalJson(empty) + '\n'));
        await store.syncDirectory(root);
        await store.syncDirectory(path.dirname(root));
      } else {
        check(
          expectedSnapshot.episodeId === registration.episodeId &&
            expectedSnapshot.registrationSha256 === registration.sha256,
          'expected-registration'
        );
        store.current = expectedSnapshot;
        await store.syncDirectory(root);
      }
      await store.readSnapshot();
      return store;
    } catch (error) {
      store.poisoned = true;
      // Leave the lock as explicit recovery evidence; never guess that an owner
      // or a half-written initial opening is safe to discard.
      await lock.close();
      throw new AccumulationJournalStoreError(
        error instanceof AccumulationJournalStoreError ? error.reason : 'open-failed',
        true
      );
    }
  }

  private assertUsable(): void {
    check(!this.closed && !this.poisoned && !this.busy, 'owner-unavailable');
  }
  private async syncDirectory(directory: string): Promise<void> {
    const handle = await this.io.open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  private async readFile(relative: string, maximum: number): Promise<Buffer> {
    const file = path.join(this.directory, relative);
    const before = await this.io.lstat(file);
    check(before.isFile() && !before.isSymbolicLink() && before.size <= maximum, 'invalid-owned-file');
    const handle = await this.io.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const after = await handle.stat();
      check(after.dev === before.dev && after.ino === before.ino && after.size <= maximum, 'changed-owned-file');
      const bytes = Buffer.alloc(after.size + 1);
      let offset = 0;
      while (offset < bytes.length) {
        const read = await handle.read(bytes, offset, bytes.length - offset, offset);
        if (!read.bytesRead) break;
        offset += read.bytesRead;
      }
      check(offset === after.size, 'changed-owned-size');
      return bytes.subarray(0, offset);
    } finally {
      await handle.close();
    }
  }
  private async writeExclusive(relative: string, bytes: Uint8Array): Promise<void> {
    const handle = await this.io.open(
      path.join(this.directory, relative),
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  private async validateDirectories(): Promise<void> {
    for (const directory of ['records', 'evidence']) {
      const stat = await this.io.lstat(path.join(this.directory, directory));
      check(stat.isDirectory() && !stat.isSymbolicLink(), 'invalid-owned-directory');
    }
    const entries = await this.io.readdir(this.directory);
    check(
      entries.length === 5 &&
        ['LOCK', 'registration.bytes', 'HEAD.json', 'records', 'evidence'].every((name) => entries.includes(name)),
      'orphan-or-unexpected-entry'
    );
    const lock = await this.io.lstat(path.join(this.directory, 'LOCK'));
    check(
      lock.isFile() &&
        !lock.isSymbolicLink() &&
        lock.dev === this.lockIdentity.dev &&
        lock.ino === this.lockIdentity.ino,
      'lock-replaced'
    );
  }
  private async readSnapshot(): Promise<AccumulationJournalSnapshot> {
    await this.validateDirectories();
    check(
      digest(await this.readFile('registration.bytes', 256 * 1024)) === this.registration.sha256,
      'registration-changed'
    );
    const head = object(decode(await this.readFile('HEAD.json', 4096))) as unknown as AccumulationJournalHead;
    exactKeys(head as unknown as Record<string, Json>, [
      'kind',
      'episodeId',
      'registrationSha256',
      'recordCount',
      'headSha256',
      'prefixSha256',
    ]);
    check(sameHead(head, this.current), 'head-changed');
    check(
      head.kind === 'accumulation-journal-head-v1' &&
        Number.isSafeInteger(head.recordCount) &&
        head.recordCount >= 0 &&
        head.recordCount <= MAX_RECORDS,
      'head-shape'
    );
    const names = (await this.io.readdir(path.join(this.directory, 'records'))).sort();
    check(names.length === head.recordCount, 'incomplete-or-orphan-record');
    const lines: Buffer[] = [];
    let previous: string | null = null,
      length = 0;
    for (let index = 0; index < names.length; index++) {
      check(names[index] === `${String(index + 1).padStart(6, '0')}.json`, 'record-sequence');
      const bytes = await this.readFile(`records/${names[index]}`, MAX_RECORD);
      length += bytes.length;
      check(length <= MAX_JOURNAL, 'journal-bound');
      const record = object(decode(bytes));
      this.checkRecord(record, index + 1, previous);
      await this.verifyReferences(record.evidence);
      previous = digest(bytes);
      lines.push(bytes);
    }
    const bytes = Buffer.concat(lines);
    check(previous === head.headSha256 && digest(bytes) === head.prefixSha256, 'prefix-mismatch');
    check(!this.poisoned, 'owner-quarantined');
    return {
      head: { ...head },
      journalJsonl: bytes.toString('utf8'),
      evidenceAuthentication: 'registered-bytes-only',
      financialActions: false,
      qualificationAuthority: false,
    };
  }
  private checkRecord(record: Record<string, Json>, sequence: number, previous: string | null): void {
    exactKeys(record, [
      'kind',
      'episodeId',
      'registrationSha256',
      'sequence',
      'previousRecordSha256',
      'expectedReducerRevision',
      'input',
      'evidence',
      'result',
    ]);
    check(
      typeof record.kind === 'string' &&
        ID.test(record.kind) &&
        record.episodeId === this.registration.episodeId &&
        record.registrationSha256 === this.registration.sha256 &&
        record.sequence === sequence &&
        record.previousRecordSha256 === previous &&
        Number.isSafeInteger(record.expectedReducerRevision) &&
        Number(record.expectedReducerRevision) >= 0,
      'record-binding'
    );
    check(sequence === 1 ? record.kind === 'opening' : record.kind !== 'opening', 'opening-count');
    object(record.input);
    object(record.result);
  }
  private async verifyReferences(raw: Json): Promise<void> {
    check(Array.isArray(raw) && raw.length > 0 && raw.length <= 16, 'evidence-count');
    const ids = new Set<string>();
    for (const value of raw) {
      const ref = object(value);
      exactKeys(ref, ['purpose', 'artifactId', 'sha256']);
      check(
        typeof ref.purpose === 'string' &&
          ID.test(ref.purpose) &&
          typeof ref.artifactId === 'string' &&
          ID.test(ref.artifactId) &&
          typeof ref.sha256 === 'string' &&
          SHA.test(ref.sha256) &&
          !ids.has(ref.artifactId),
        'evidence-reference'
      );
      ids.add(ref.artifactId);
      check(
        digest(await this.readFile(`evidence/${ref.artifactId}.bytes`, MAX_ARTIFACT)) === ref.sha256,
        'evidence-mismatch'
      );
    }
  }

  /** Read the entire immutable prefix, verifying the caller-owned expected head. */
  async snapshot(): Promise<AccumulationJournalSnapshot> {
    this.assertUsable();
    this.busy = true;
    try {
      return await this.readSnapshot();
    } catch {
      this.poisoned = true;
      throw new AccumulationJournalStoreError('snapshot-requires-recovery', true);
    } finally {
      this.busy = false;
    }
  }

  /** Retain exact research evidence once; this does not certify its external source. */
  async retainEvidence(purpose: string, artifactId: string, bytes: Uint8Array): Promise<AccumulationEvidenceReference> {
    this.assertUsable();
    check(
      ID.test(purpose) && ID.test(artifactId) && bytes.byteLength > 0 && bytes.byteLength <= MAX_ARTIFACT,
      'artifact-bound'
    );
    const retained = Uint8Array.from(bytes);
    this.busy = true;
    try {
      await this.readSnapshot();
      let total = 0;
      const entries = await this.io.readdir(path.join(this.directory, 'evidence'));
      check(entries.length < 4096, 'artifact-count');
      for (const name of entries) {
        check(/^[a-zA-Z0-9_-]{1,96}\.bytes$/.test(name), 'artifact-name');
        total += (await this.readFile(`evidence/${name}`, MAX_ARTIFACT)).length;
      }
      check(total + retained.length <= MAX_EVIDENCE, 'evidence-total-bound');
      await this.writeExclusive(`evidence/${artifactId}.bytes`, retained);
      await this.syncDirectory(path.join(this.directory, 'evidence'));
      check(!this.poisoned, 'owner-quarantined');
      return { purpose, artifactId, sha256: digest(retained) };
    } catch {
      this.poisoned = true;
      throw new AccumulationJournalStoreError('evidence-write-requires-recovery', true);
    } finally {
      this.busy = false;
    }
  }

  /** Append an externally replayed proposal only against the same durable prefix.
   * This storage layer checks chain/byte identity; callers must separately replay
   * its transition result and authenticate its source/complete registered schedule.
   */
  async append(expected: AccumulationJournalHead, recordJsonl: string): Promise<AccumulationJournalSnapshot> {
    this.assertUsable();
    check(sameHead(expected, this.current), 'stale-expected-head');
    check(typeof recordJsonl === 'string' && Buffer.byteLength(recordJsonl) <= MAX_RECORD, 'record-bound');
    const bytes = Buffer.from(recordJsonl);
    check(bytes.length > 0 && bytes.length <= MAX_RECORD && this.current.recordCount < MAX_RECORDS, 'record-bound');
    const record = object(decode(bytes));
    this.checkRecord(record, this.current.recordCount + 1, this.current.headSha256);
    this.busy = true;
    try {
      const before = await this.readSnapshot();
      await this.verifyReferences(record.evidence);
      const prefix = Buffer.concat([Buffer.from(before.journalJsonl), bytes]);
      check(prefix.length <= MAX_JOURNAL, 'journal-bound');
      const next: AccumulationJournalHead = {
        ...this.current,
        recordCount: this.current.recordCount + 1,
        headSha256: digest(bytes),
        prefixSha256: digest(prefix),
      };
      await this.writeExclusive(`records/${String(next.recordCount).padStart(6, '0')}.json`, bytes);
      await this.syncDirectory(path.join(this.directory, 'records'));
      await this.writeExclusive('HEAD.pending', Buffer.from(canonicalAccumulationJournalJson(next) + '\n'));
      await this.io.rename(path.join(this.directory, 'HEAD.pending'), path.join(this.directory, 'HEAD.json'));
      await this.syncDirectory(this.directory);
      this.current = next;
      return await this.readSnapshot();
    } catch {
      this.poisoned = true;
      throw new AccumulationJournalStoreError('append-requires-recovery', true);
    } finally {
      this.busy = false;
    }
  }

  /** Retain an unresolved process/protocol failure; a new session cannot erase it. */
  async quarantine(reason: string): Promise<void> {
    check(!this.closed && ID.test(reason), 'owner-unavailable');
    this.poisoned = true;
    check(!this.busy, 'owner-unavailable');
    this.busy = true;
    try {
      await this.writeExclusive(
        'RECOVERY.json',
        Buffer.from(
          canonicalAccumulationJournalJson({
            kind: 'accumulation-journal-recovery-required-v1',
            reason,
            lastConfirmedHead: this.current,
          }) + '\n'
        )
      );
      await this.syncDirectory(this.directory);
    } finally {
      this.busy = false;
    }
  }

  /** Release only this instance's lock after known-good durability; uncertain owners retain it. */
  async close(): Promise<void> {
    check(!this.closed && !this.busy, 'owner-unavailable');
    this.closed = true;
    try {
      if (!this.poisoned) {
        await this.validateDirectories();
        await this.io.unlink(path.join(this.directory, 'LOCK'));
        await this.syncDirectory(this.directory);
      }
    } finally {
      await this.lock.close();
    }
  }
}

/** Create a new journal with exclusive storage, or open a fully verified expected prefix. */
export function openAccumulationJournalStore(
  directory: string,
  registration: AccumulationJournalRegistration,
  expectedHead: AccumulationJournalHead | null
): Promise<AccumulationJournalStore> {
  return AccumulationJournalStore.acquire(directory, registration, expectedHead, fs);
}

/** Explicit test boundary for deterministic crash injection; never selected by serialized input. */
export function openAccumulationJournalStoreForTesting(
  directory: string,
  registration: AccumulationJournalRegistration,
  expectedHead: AccumulationJournalHead | null,
  io: Io
): Promise<AccumulationJournalStore> {
  return AccumulationJournalStore.acquire(directory, registration, expectedHead, io);
}
