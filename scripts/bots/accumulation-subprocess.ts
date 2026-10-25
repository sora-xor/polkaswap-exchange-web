/** Bounded offline process transport. Returned bytes are evidence, never a policy or trading authority. */
import { createHash } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { lstat, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const RUNNERS = {
  admission: 'scripts/bots/accumulation_admission_runner.py',
  journal: 'scripts/bots/accumulation_journal_replay.py',
} as const;
const REQUIRED = {
  admission: ['scripts/bots/accumulation_admission_policy.py', 'scripts/bots/accumulation_stopping_model.py'],
  journal: [
    'scripts/bots/accumulation_execution_replay.py',
    'scripts/bots/accumulation_stopping_model.py',
    'scripts/bots/accumulation_admission_policy.py',
    'scripts/bots/accumulation_admission_runner.py',
  ],
} as const;
const SHA = /^[a-f0-9]{64}$/;
const ENVIRONMENT = Object.freeze({ LANG: 'C', LC_ALL: 'C', TZ: 'UTC' });
const GRACE_MS = 250;

/** Expected hashes must come from an already authenticated external registration, never current-file discovery. */
export interface AccumulationSubprocessRequest {
  runner: keyof typeof RUNNERS;
  repositoryRoot: string;
  pythonExecutable: string;
  trusted: { registrationSha256: string; pythonSha256: string; sourceBindings: { path: string; sha256: string }[] };
  input: Uint8Array;
  limits: { timeoutMs: number; maxInputBytes: number; maxStdoutBytes: number; maxStderrBytes: number };
}
export interface SubprocessClock {
  wallMs: number;
  monotonicNs: string;
}
export interface SubprocessBindingCheck {
  path: string;
  expectedSha256: string;
  actualSha256: string | null;
  status: 'match' | 'mismatch' | 'error';
  reason: string | null;
}
export interface SubprocessStreamReceipt {
  /** Digest covers every observed chunk, including bytes beyond the retained prefix. */
  observedSha256: string;
  observedBytes: number;
  retainedSha256: string;
  retainedBase64: string;
  retainedBytes: number;
  truncated: boolean;
}
/** A zero exit is transport success only; the caller still authenticates/parses output and checks freshness. */
export interface AccumulationSubprocessReceipt {
  kind: 'accumulation-subprocess-v1';
  runner: string;
  registrationSha256: string;
  executable: string;
  argv: string[];
  cwd: string;
  environment: typeof ENVIRONMENT;
  input: { bytes: number; sha256: string | null; writeCompleted: boolean };
  limits: AccumulationSubprocessRequest['limits'];
  started: SubprocessClock;
  spawned: SubprocessClock | null;
  finished: SubprocessClock;
  elapsedNs: string;
  before: SubprocessBindingCheck[];
  after: SubprocessBindingCheck[];
  stdout: SubprocessStreamReceipt;
  stderr: SubprocessStreamReceipt;
  spawnAttempted: boolean;
  pid: number | null;
  exitObserved: boolean;
  exitCode: number | null;
  exitSignal: string | null;
  closeObserved: boolean;
  /** A signal request alone does not prove the child ended. */
  terminationUnconfirmed: boolean;
  outcomeUnknown: boolean;
  timedOut: boolean;
  terminationRequests: { signal: 'SIGTERM' | 'SIGKILL'; accepted: boolean; at: SubprocessClock }[];
  errors: { phase: string; code: string; message: string }[];
  outcome: 'rejected-before-spawn' | 'completed' | 'failed';
  resultAuthority: false;
}

/** Injection exists only on the explicitly named test factory; production calls cannot override spawn or clocks. */
export interface AccumulationSubprocessTestDependencies {
  spawn: (executable: string, argv: string[], options: Parameters<typeof spawn>[2]) => ChildProcessWithoutNullStreams;
  wallNow?: () => number;
  monotonicNow?: () => bigint;
}
const nativeDependencies: AccumulationSubprocessTestDependencies = {
  spawn: (executable, argv, options) => spawn(executable, argv, options) as ChildProcessWithoutNullStreams,
};
function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}
function sha(raw: Uint8Array): string {
  return createHash('sha256').update(raw).digest('hex');
}
function streamCollector(maximum: number) {
  const hash = createHash('sha256');
  const chunks: Buffer[] = [];
  let observedBytes = 0,
    retainedBytes = 0;
  return {
    add(raw: Buffer): boolean {
      hash.update(raw);
      observedBytes += raw.length;
      const count = Math.max(0, Math.min(raw.length, maximum - retainedBytes));
      if (count) chunks.push(Buffer.from(raw.subarray(0, count)));
      retainedBytes += count;
      return observedBytes > maximum;
    },
    finish(): SubprocessStreamReceipt {
      const raw = Buffer.concat(chunks);
      return {
        observedSha256: hash.digest('hex'),
        observedBytes,
        retainedSha256: sha(raw),
        retainedBase64: raw.toString('base64'),
        retainedBytes,
        truncated: observedBytes > maximum,
      };
    },
  };
}

/** Check a canonical regular file without following a final-component symlink; reject changes during its read. */
async function binding(path: string, expectedSha256: string, maximum: number): Promise<SubprocessBindingCheck> {
  const result: SubprocessBindingCheck = { path, expectedSha256, actualSha256: null, status: 'error', reason: null };
  try {
    check((await realpath(path)) === path && (await lstat(path)).isFile(), 'noncanonical-or-nonregular-file');
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await file.stat();
      check(before.isFile() && before.size > 0 && before.size <= maximum, 'file-size');
      const buffer = Buffer.alloc(before.size + 1);
      let count = 0;
      while (count < buffer.length) {
        const read = await file.read(buffer, count, buffer.length - count, null);
        if (!read.bytesRead) break;
        count += read.bytesRead;
      }
      const raw = buffer.subarray(0, count);
      const after = await file.stat();
      check(
        raw.length === before.size &&
          before.ino === after.ino &&
          before.size === after.size &&
          before.mtimeMs === after.mtimeMs &&
          before.ctimeMs === after.ctimeMs,
        'file-changed-during-read'
      );
      result.actualSha256 = sha(raw);
      result.status = result.actualSha256 === expectedSha256 ? 'match' : 'mismatch';
      if (result.status !== 'match') result.reason = 'sha256-mismatch';
    } finally {
      await file.close();
    }
  } catch (error) {
    result.reason = error instanceof Error ? error.message.slice(0, 256) : 'file-check-error';
  }
  return result;
}

async function run(request: AccumulationSubprocessRequest, dependencies: AccumulationSubprocessTestDependencies) {
  const clock = (): SubprocessClock => ({
    wallMs: (dependencies.wallNow ?? Date.now)(),
    monotonicNs: (dependencies.monotonicNow ?? process.hrtime.bigint)().toString(),
  });
  const started = clock();
  // Snapshot all caller-owned values before the first await; later mutations cannot alter the invocation.
  const runner = request.runner,
    root = request.repositoryRoot,
    executable = request.pythonExecutable;
  const sourceBindingsValid =
    Array.isArray(request.trusted.sourceBindings) &&
    request.trusted.sourceBindings.length > 0 &&
    request.trusted.sourceBindings.length <= 64;
  const trusted = {
    registrationSha256: request.trusted.registrationSha256,
    pythonSha256: request.trusted.pythonSha256,
    sourceBindings: sourceBindingsValid ? request.trusted.sourceBindings.map((item) => ({ ...item })) : [],
  };
  const limits = { ...request.limits };
  const inputSize = request.input.byteLength;
  const inputCap = runner === 'journal' ? 2 * 1024 * 1024 : 256 * 1024;
  const validInput = request.input instanceof Uint8Array && inputSize > 0 && inputSize <= inputCap;
  const input = validInput ? Buffer.from(request.input) : Buffer.alloc(0);
  const stdout = streamCollector(
    Number.isSafeInteger(limits.maxStdoutBytes) ? Math.max(0, Math.min(limits.maxStdoutBytes, 256 * 1024)) : 0
  );
  const stderr = streamCollector(
    Number.isSafeInteger(limits.maxStderrBytes) ? Math.max(0, Math.min(limits.maxStderrBytes, 64 * 1024)) : 0
  );
  const receipt: AccumulationSubprocessReceipt = {
    kind: 'accumulation-subprocess-v1',
    runner,
    registrationSha256: trusted.registrationSha256,
    executable,
    argv: [],
    cwd: root,
    environment: ENVIRONMENT,
    input: { bytes: inputSize, sha256: validInput ? sha(input) : null, writeCompleted: false },
    limits,
    started,
    spawned: null,
    finished: started,
    elapsedNs: '0',
    before: [],
    after: [],
    stdout: null!,
    stderr: null!,
    spawnAttempted: false,
    pid: null,
    exitObserved: false,
    exitCode: null,
    exitSignal: null,
    closeObserved: false,
    timedOut: false,
    terminationUnconfirmed: false,
    outcomeUnknown: false,
    terminationRequests: [],
    errors: [],
    outcome: 'rejected-before-spawn',
    resultAuthority: false,
  };
  const error = (phase: string, value: unknown) => {
    const item = value as { code?: unknown; message?: unknown };
    receipt.errors.push({
      phase,
      code: typeof item?.code === 'string' ? item.code.slice(0, 64) : 'subprocess-error',
      message: typeof item?.message === 'string' ? item.message.slice(0, 256) : String(value).slice(0, 256),
    });
  };
  let paths: { path: string; sha256: string; maximum: number }[] = [];
  try {
    check(Object.hasOwn(RUNNERS, runner), 'unsupported-runner');
    check(isAbsolute(root) && resolve(root) === root && (await realpath(root)) === root, 'noncanonical-root');
    check(isAbsolute(executable) && resolve(executable) === executable, 'noncanonical-interpreter');
    for (const pin of [trusted.registrationSha256, trusted.pythonSha256])
      check(typeof pin === 'string' && SHA.test(pin), 'trusted-pin');
    check(validInput && inputSize <= limits.maxInputBytes, 'input-limit');
    for (const [key, cap] of Object.entries({
      timeoutMs: 60000,
      maxInputBytes: inputCap,
      maxStdoutBytes: 256 * 1024,
      maxStderrBytes: 64 * 1024,
    })) {
      const n = limits[key as keyof typeof limits];
      check(Number.isSafeInteger(n) && n > 0 && n <= cap, 'invalid-limit');
    }
    check(sourceBindingsValid, 'source-binding-count');
    const unique = new Set<string>();
    for (const item of trusted.sourceBindings) {
      check(
        typeof item.path === 'string' &&
          !isAbsolute(item.path) &&
          !item.path.includes('\\') &&
          item.path.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
          typeof item.sha256 === 'string' &&
          SHA.test(item.sha256) &&
          !unique.has(item.path),
        'source-binding'
      );
      unique.add(item.path);
      const path = join(root, item.path);
      check(!relative(root, path).startsWith('..' + sep), 'source-outside-root');
      paths.push({ path, sha256: item.sha256, maximum: 2 * 1024 * 1024 });
    }
    const required = [RUNNERS[runner], ...REQUIRED[runner]];
    check(unique.size === required.length && required.every((path) => unique.has(path)), 'required-source-binding');
    paths = [{ path: executable, sha256: trusted.pythonSha256, maximum: 128 * 1024 * 1024 }, ...paths];
    receipt.before = await Promise.all(paths.map((item) => binding(item.path, item.sha256, item.maximum)));
    check(
      receipt.before.every((item) => item.status === 'match'),
      'pre-spawn-binding-failed'
    );
    receipt.argv = ['-I', '-S', '-B', join(root, RUNNERS[runner])];
    receipt.spawnAttempted = true;
    await new Promise<void>((done) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = dependencies.spawn(executable, receipt.argv, {
          cwd: root,
          env: { ...ENVIRONMENT },
          shell: false,
          stdio: 'pipe',
          windowsHide: true,
        });
      } catch (value) {
        error('spawn', value);
        done();
        return;
      }
      receipt.pid = child.pid ?? null;
      let finished = false,
        stopping = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const finish = () => {
        if (finished) return;
        finished = true;
        for (const timer of timers) clearTimeout(timer);
        child.stdout.removeListener('data', onStdout);
        child.stderr.removeListener('data', onStderr);
        child.stdin.destroy();
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        done();
      };
      const kill = (signal: 'SIGTERM' | 'SIGKILL') => {
        let accepted = false;
        try {
          accepted = child.kill(signal);
        } catch (value) {
          error('kill', value);
        }
        receipt.terminationRequests.push({ signal, accepted, at: clock() });
      };
      const stop = (reason: string) => {
        if (finished || stopping) return;
        stopping = true;
        error('termination', new Error(reason));
        kill('SIGTERM');
        if (finished) return;
        timers.push(
          setTimeout(() => {
            if (finished) return;
            kill('SIGKILL');
            if (finished) return;
            timers.push(
              setTimeout(() => {
                if (!finished) {
                  error('close', new Error('close-not-observed'));
                  finish();
                }
              }, GRACE_MS)
            );
          }, GRACE_MS)
        );
      };
      const onStdout = (chunk: Buffer) => {
        if (!finished && stdout.add(chunk)) stop('stdout-limit');
      };
      const onStderr = (chunk: Buffer) => {
        if (!finished && stderr.add(chunk)) stop('stderr-limit');
      };
      child.stdout.on('data', onStdout);
      child.stderr.on('data', onStderr);
      child.once('spawn', () => {
        if (!finished) {
          receipt.spawned = clock();
          receipt.pid = child.pid ?? null;
        }
      });
      child.on('error', (value) => {
        if (!finished) {
          error('spawn', value);
          stop('child-error');
        }
      });
      child.stdin.on('error', (value) => {
        if (!finished) {
          error('stdin', value);
          stop('stdin-error');
        }
      });
      child.stdout.on('error', (value) => {
        if (!finished) {
          error('stdout', value);
          stop('stdout-error');
        }
      });
      child.stderr.on('error', (value) => {
        if (!finished) {
          error('stderr', value);
          stop('stderr-error');
        }
      });
      child.once('exit', (code, signal) => {
        if (!finished) {
          receipt.exitObserved = true;
          receipt.exitCode = code;
          receipt.exitSignal = signal;
        }
      });
      child.once('close', (code, signal) => {
        if (finished) return;
        receipt.closeObserved = true;
        if (!receipt.exitObserved) {
          receipt.exitCode = code;
          receipt.exitSignal = signal;
        }
        finish();
      });
      timers.push(
        setTimeout(() => {
          if (!finished) {
            receipt.timedOut = true;
            stop('runtime-timeout');
          }
        }, limits.timeoutMs)
      );
      try {
        child.stdin.end(input, (value?: Error | null) => {
          if (finished) return;
          if (value) {
            error('stdin', value);
            stop('stdin-error');
          } else receipt.input.writeCompleted = true;
        });
      } catch (value) {
        error('stdin', value);
        stop('stdin-error');
      }
    });
  } catch (value) {
    error('preflight', value);
  }
  if (receipt.spawnAttempted)
    receipt.after = await Promise.all(paths.map((item) => binding(item.path, item.sha256, item.maximum)));
  receipt.stdout = stdout.finish();
  receipt.stderr = stderr.finish();
  receipt.terminationUnconfirmed = receipt.spawnAttempted && !receipt.closeObserved;
  receipt.outcomeUnknown = receipt.terminationUnconfirmed;
  receipt.finished = clock();
  receipt.elapsedNs = (BigInt(receipt.finished.monotonicNs) - BigInt(started.monotonicNs)).toString();
  if (receipt.spawnAttempted)
    receipt.outcome =
      receipt.closeObserved &&
      receipt.exitCode === 0 &&
      receipt.exitSignal === null &&
      receipt.errors.length === 0 &&
      receipt.input.writeCompleted &&
      receipt.after.every((item) => item.status === 'match')
        ? 'completed'
        : 'failed';
  return receipt;
}

/** Invoke once using real Node spawn; no caller-controlled shell, argv, environment or lifecycle dependencies. */
export function runAccumulationSubprocess(
  request: AccumulationSubprocessRequest
): Promise<AccumulationSubprocessReceipt> {
  return run(request, nativeDependencies);
}
/** Explicit synthetic boundary. Never use this factory in the trusted production orchestrator. */
export function createAccumulationSubprocessForTests(dependencies: AccumulationSubprocessTestDependencies) {
  return (request: AccumulationSubprocessRequest): Promise<AccumulationSubprocessReceipt> => run(request, dependencies);
}
