// @vitest-environment node
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccumulationSubprocessForTests,
  runAccumulationSubprocess,
  type AccumulationSubprocessRequest,
} from '../../../../scripts/bots/accumulation-subprocess';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
/** All bytes and files are synthetic; no model file, wallet or service is used. */
function fixture(runner: 'admission' | 'journal' = 'admission'): AccumulationSubprocessRequest {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'accumulation-subprocess-')));
  roots.push(root);
  mkdirSync(join(root, 'scripts/bots'), { recursive: true });
  const files = [
    'accumulation_admission_runner.py',
    'accumulation_admission_policy.py',
    'accumulation_stopping_model.py',
  ];
  if (runner === 'journal') files.push('accumulation_journal_replay.py', 'accumulation_execution_replay.py');
  const sourceBindings = files.map((file) => {
    const path = 'scripts/bots/' + file;
    writeFileSync(join(root, path), '# synthetic ' + file + '\n');
    return { path, sha256: sha(readFileSync(join(root, path))) };
  });
  const executable = join(root, 'python');
  writeFileSync(executable, 'synthetic interpreter');
  return {
    runner,
    repositoryRoot: root,
    pythonExecutable: executable,
    trusted: { registrationSha256: 'a'.repeat(64), pythonSha256: sha(readFileSync(executable)), sourceBindings },
    input: Buffer.from('{"synthetic":true}\n'),
    limits: { timeoutMs: 1000, maxInputBytes: 256 * 1024, maxStdoutBytes: 4096, maxStderrBytes: 1024 },
  };
}
class FakeChild extends EventEmitter {
  pid = 987654;
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  received: Buffer[] = [];
  kill = vi.fn((_signal: string) => true);
  unref = vi.fn();
  constructor() {
    super();
    this.stdin.on('data', (data) => this.received.push(Buffer.from(data)));
  }
  close(code: number | null = 0, signal: string | null = null) {
    this.emit('exit', code, signal);
    this.emit('close', code, signal);
  }
}
function setup(
  action: (child: FakeChild) => void = (child) => {
    child.stdout.write('result\n');
    child.close();
  }
) {
  const child = new FakeChild();
  let wall = 1000,
    mono = 2000n;
  const spawn = vi.fn(() => {
    setImmediate(() => {
      child.emit('spawn');
      action(child);
    });
    return child as unknown as ChildProcessWithoutNullStreams;
  });
  const run = createAccumulationSubprocessForTests({ spawn, wallNow: () => wall++, monotonicNow: () => mono++ });
  return { run, child, spawn };
}
describe('bounded accumulation subprocess transport', () => {
  it('pins before and after, snapshots input, and retains exact bytes plus independent clocks', async () => {
    const request = fixture(),
      original = Buffer.from(request.input),
      { run, spawn, child } = setup();
    const pending = run(request);
    request.input.fill(0);
    const result = await pending;
    expect(result.outcome).toBe('completed');
    expect(result.before.every((x) => x.status === 'match')).toBe(true);
    expect(result.after).toEqual(result.before);
    expect(result.input.sha256).toBe(sha(original));
    expect(Buffer.concat(child.received)).toEqual(original);
    expect(result.stdout).toMatchObject({
      observedBytes: 7,
      retainedBytes: 7,
      observedSha256: sha('result\n'),
      retainedSha256: sha('result\n'),
      truncated: false,
    });
    expect(Buffer.from(result.stdout.retainedBase64, 'base64').toString()).toBe('result\n');
    expect(result.finished.wallMs).toBeGreaterThan(result.started.wallMs);
    expect(BigInt(result.elapsedNs)).toBeGreaterThan(0n);
    expect(result).toMatchObject({
      closeObserved: true,
      terminationUnconfirmed: false,
      outcomeUnknown: false,
      resultAuthority: false,
    });
    expect(spawn.mock.calls[0]).toEqual([
      request.pythonExecutable,
      ['-I', '-S', '-B', join(request.repositoryRoot, 'scripts/bots/accumulation_admission_runner.py')],
      {
        cwd: request.repositoryRoot,
        env: { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
        shell: false,
        stdio: 'pipe',
        windowsHide: true,
      },
    ]);
  });
  it('rejects changed interpreter, missing/duplicate/extra source pins, malformed hashes and traversal before spawn', async () => {
    const edits = [
      (r: AccumulationSubprocessRequest) => {
        r.trusted.pythonSha256 = '0'.repeat(64);
      },
      (r: AccumulationSubprocessRequest) => {
        r.trusted.sourceBindings.pop();
      },
      (r: AccumulationSubprocessRequest) => {
        r.trusted.sourceBindings.push({ ...r.trusted.sourceBindings[0] });
      },
      (r: AccumulationSubprocessRequest) => {
        r.trusted.sourceBindings.push({ path: 'extra.py', sha256: 'a'.repeat(64) });
      },
      (r: AccumulationSubprocessRequest) => {
        r.trusted.sourceBindings[0].path = '../escape.py';
      },
      (r: AccumulationSubprocessRequest) => {
        r.trusted.registrationSha256 = ['a'.repeat(64)] as unknown as string;
      },
      (r: AccumulationSubprocessRequest) => {
        r.runner = 'other' as 'admission';
      },
    ];
    for (const edit of edits) {
      const request = fixture(),
        { run, spawn } = setup();
      edit(request);
      const result = await run(request);
      expect(result.outcome).toBe('rejected-before-spawn');
      expect(spawn).not.toHaveBeenCalled();
    }
  });
  it('refuses symlinked interpreter and source files even when bytes match the expected digest', async () => {
    for (const kind of ['interpreter', 'source']) {
      const request = fixture(),
        { run, spawn } = setup();
      const path =
        kind === 'interpreter'
          ? request.pythonExecutable
          : join(request.repositoryRoot, request.trusted.sourceBindings[0].path);
      const other = join(request.repositoryRoot, 'actual');
      writeFileSync(other, readFileSync(path));
      rmSync(path);
      symlinkSync(other, path);
      const result = await run(request);
      expect(result.outcome).toBe('rejected-before-spawn');
      expect(spawn).not.toHaveBeenCalled();
    }
  });
  it('bounds the source list before copying any oversized-list element and rejects nonarrays', async () => {
    const request = fixture(),
      { run, spawn } = setup();
    const read = vi.fn(() => {
      throw new Error('must not copy invalid list');
    });
    request.trusted.sourceBindings = new Array(65);
    Object.defineProperty(request.trusted.sourceBindings, 0, { get: read });
    const oversized = await run(request);
    expect(oversized.outcome).toBe('rejected-before-spawn');
    expect(read).not.toHaveBeenCalled();
    request.trusted.sourceBindings = {} as AccumulationSubprocessRequest['trusted']['sourceBindings'];
    expect((await run(request)).outcome).toBe('rejected-before-spawn');
    expect(spawn).not.toHaveBeenCalled();
  });
  it('requires the exact five-file journal closure and permits its separately bounded 2MiB request', async () => {
    const request = fixture('journal');
    request.input = Buffer.alloc(300000, 32);
    request.limits.maxInputBytes = 2 * 1024 * 1024;
    const { run } = setup();
    const result = await run(request);
    expect(result.outcome).toBe('completed');
    expect(result.before).toHaveLength(6);
    expect(result.argv.at(-1)).toBe(join(request.repositoryRoot, 'scripts/bots/accumulation_journal_replay.py'));
  });
  it('retains source changes after exit and never promotes zero exit to completed', async () => {
    const request = fixture(),
      { run } = setup((child) => {
        writeFileSync(join(request.repositoryRoot, request.trusted.sourceBindings[1].path), 'changed');
        child.close();
      });
    const result = await run(request);
    expect(result.exitCode).toBe(0);
    expect(result.outcome).toBe('failed');
    expect(result.after.some((x) => x.status === 'mismatch')).toBe(true);
  });
  it('records thrown spawn errors without retry', async () => {
    const spawn = vi.fn(() => {
      throw Object.assign(new Error('spawn fixture'), { code: 'ENOENT' });
    });
    const result = await createAccumulationSubprocessForTests({ spawn })(fixture());
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe('failed');
    expect(result.errors[0]).toMatchObject({ phase: 'spawn', code: 'ENOENT' });
  });
  it('retains nonzero exit, stderr and close facts without interpreting JSON', async () => {
    const { run } = setup((child) => {
      child.stdout.write('{"success":true}');
      child.stderr.write('failure');
      child.close(2);
    });
    const result = await run(fixture());
    expect(result).toMatchObject({ outcome: 'failed', exitCode: 2, closeObserved: true, resultAuthority: false });
    expect(result.stderr.observedSha256).toBe(sha('failure'));
  });
  it('records a stdin error and a child error, then settles exactly once on close', async () => {
    const { run, child } = setup((child) => {
      child.stdin.emit('error', Object.assign(new Error('pipe closed'), { code: 'EPIPE' }));
      child.emit('error', new Error('child fixture'));
      child.close(null, 'SIGTERM');
      child.emit('close', 0, null);
    });
    const result = await run(fixture());
    expect(result.outcome).toBe('failed');
    expect(result.errors.some((e) => e.phase === 'stdin')).toBe(true);
    expect(result.errors.some((e) => e.phase === 'spawn')).toBe(true);
    expect(result.exitSignal).toBe('SIGTERM');
    expect(child.kill).toHaveBeenCalledTimes(1);
  });
  it.each(['stdout', 'stderr'] as const)(
    'caps retained %s, hashes all observed bytes and stops only its child',
    async (stream) => {
      const { run, child } = setup((child) => {
        child[stream].write('123456789');
        child.close(null, 'SIGTERM');
      });
      const request = fixture();
      request.limits[stream === 'stdout' ? 'maxStdoutBytes' : 'maxStderrBytes'] = 4;
      const result = await run(request);
      expect(result.outcome).toBe('failed');
      expect(result[stream]).toMatchObject({
        observedBytes: 9,
        retainedBytes: 4,
        truncated: true,
        observedSha256: sha('123456789'),
        retainedSha256: sha('1234'),
      });
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    }
  );
  it('bounds timeout and two kill graces without inventing a close when the child refuses termination', async () => {
    const { run, child } = setup(() => {});
    child.kill.mockReturnValue(false);
    const request = fixture();
    request.limits.timeoutMs = 5;
    const result = await run(request);
    expect(result).toMatchObject({
      outcome: 'failed',
      timedOut: true,
      closeObserved: false,
      terminationUnconfirmed: true,
      outcomeUnknown: true,
    });
    expect(result.terminationRequests.map((x) => [x.signal, x.accepted])).toEqual([
      ['SIGTERM', false],
      ['SIGKILL', false],
    ]);
    expect(child.unref).toHaveBeenCalledOnce();
  });
  it('handles timeout followed by confirmed termination and captures the signal', async () => {
    const { run, child } = setup(() => {});
    child.kill.mockImplementation((signal) => {
      setImmediate(() => child.close(null, signal));
      return true;
    });
    const request = fixture();
    request.limits.timeoutMs = 5;
    const result = await run(request);
    expect(result).toMatchObject({
      timedOut: true,
      closeObserved: true,
      terminationUnconfirmed: false,
      exitSignal: 'SIGTERM',
      outcome: 'failed',
    });
  });
  it('does not schedule a late kill after a synchronous close from its first termination request', async () => {
    const { run, child } = setup((child) => child.stdout.write('too much'));
    child.kill.mockImplementation((signal) => {
      child.close(null, signal);
      return true;
    });
    const request = fixture();
    request.limits.maxStdoutBytes = 1;
    const timers = vi.spyOn(globalThis, 'setTimeout');
    try {
      const result = await run(request);
      expect(result.closeObserved).toBe(true);
      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(timers.mock.calls.map((call) => call[1])).toEqual([request.limits.timeoutMs]);
    } finally {
      timers.mockRestore();
    }
  });
  it('rejects oversized input and invalid limits with no invocation', async () => {
    for (const change of [
      (r: AccumulationSubprocessRequest) => {
        r.input = Buffer.alloc(256 * 1024 + 1);
      },
      (r: AccumulationSubprocessRequest) => {
        r.limits.timeoutMs = 60001;
      },
    ]) {
      const request = fixture(),
        { run, spawn } = setup();
      change(request);
      expect((await run(request)).outcome).toBe('rejected-before-spawn');
      expect(spawn).not.toHaveBeenCalled();
    }
  });
  it('uses the real default spawn on a pinned Python and fixed synthetic repository runner, without a model', async () => {
    const request = fixture();
    const path = join(request.repositoryRoot, 'scripts/bots/accumulation_admission_runner.py');
    writeFileSync(path, 'import sys\nsys.stdout.buffer.write(sys.stdin.buffer.read())\n');
    request.trusted.sourceBindings[0].sha256 = sha(readFileSync(path));
    request.pythonExecutable = realpathSync('/usr/bin/python3');
    request.trusted.pythonSha256 = sha(readFileSync(request.pythonExecutable));
    const result = await runAccumulationSubprocess(request);
    expect(result.outcome).toBe('completed');
    expect(result.stdout.observedSha256).toBe(result.input.sha256);
    expect(result.closeObserved).toBe(true);
  });
});
