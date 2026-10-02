/** Invented state and tiny WASM only; actual131 vectors use the installed pinned artifact offline. */
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
const require = createRequire(import.meta.url);
const sourcePath = resolve('scripts/bots/goal-target-runtime-host.cjs');
const host = require(sourcePath);
const PREFIX = host.GOAL_TARGET_XST_PREFIX;
// Reach the unchanged private kernel only in this test VM; the production module exports no bypass.
const isolated = { exports: {} as any };
runInThisContext(
  `(function(require,module,exports){${readFileSync(sourcePath, 'utf8')}\nmodule.exports.testKernel=invokeReadOnly;})`,
  { filename: sourcePath }
)(require, isolated, isolated.exports);
const kernel = isolated.exports.testKernel;
const limits = { ...host.GOAL_TARGET_RUNTIME_LIMITS, memoryBytes: 65536 };
interface HostState {
  entries: Record<string, string | null>;
  prefix: { prefix: string; complete: true; entries: Record<string, string>; after: string | null };
}
const empty = (): HostState => ({ entries: {}, prefix: { prefix: PREFIX, complete: true, entries: {}, after: null } });

/** Small deterministic WASM encoder; no compiler dependency or fetched modules. */
function leb(value: number | bigint, signed = false): number[] {
  let n = BigInt(value);
  const out: number[] = [];
  for (;;) {
    let byte = Number(n & 127n);
    n >>= 7n;
    const done = signed ? (n === 0n && !(byte & 64)) || (n === -1n && Boolean(byte & 64)) : n === 0n;
    if (!done) byte |= 128;
    out.push(byte);
    if (done) return out;
  }
}
const vector = (b: number[]) => [...leb(b.length), ...b];
const text = (s: string) => vector([...Buffer.from(s)]);
const section = (id: number, b: number[]) => [id, ...vector(b)];
/** Export exactly one selected operation, with its lookup cursor embedded as invented bytes. */
function tiny({
  name = '',
  key = '0x01',
  mode = 'get',
  repeat = 1,
  size = 1,
  heap = 4096,
  resultPointer = 128,
  resultLength = 1,
}: {
  name?: string;
  key?: string;
  mode?: string;
  repeat?: number;
  size?: number;
  heap?: number;
  resultPointer?: number;
  resultLength?: number;
} = {}) {
  const packed = (pointer: number, length: number) => (BigInt(length) << 32n) | BigInt(pointer);
  const data = [...Buffer.from(key.slice(2), 'hex')];
  const api = 'LiquidityProxyAPI_quote';
  const i32 = (n: number) => [0x41, ...leb(n, true)];
  const i64 = (n: bigint) => [0x42, ...leb(n, true)];
  let params: number[] = [],
    returns: number[] = [],
    code: number[] = [];
  if (mode === 'get') {
    params = [0x7e];
    returns = [0x7e];
    code = [...i64(packed(128, data.length)), 0x10, 0];
  }
  if (mode === 'exists') {
    params = [0x7e];
    returns = [0x7f];
    code = [...i32(1024), ...i64(packed(128, data.length)), 0x10, 0, 0x3a, 0, 0, ...i64(packed(1024, 1))];
  }
  if (mode === 'void') {
    code = [0x10, 0, ...i64(packed(128, 1))];
  }
  if (mode === 'calls') {
    returns = [0x7f];
    code = Array.from({ length: repeat }, () => [0x10, 0, 0x1a])
      .flat()
      .concat(i64(packed(128, 1)));
  }
  if (mode === 'allocate') {
    params = [0x7f];
    returns = [0x7f];
    code = Array.from({ length: repeat }, () => [...i32(size), 0x10, 0, 0x1a])
      .flat()
      .concat(i64(packed(128, 1)));
  }
  if (mode === 'return') code = i64(packed(resultPointer, resultLength));
  const imported = name ? 1 : 0;
  const signature = [0x60, ...vector(params), ...vector(returns)];
  const apiSignature = [0x60, 2, 0x7f, 0x7f, 1, 0x7e];
  const imports = [...text('env'), ...text('memory'), 2, 0, 1];
  if (name) imports.push(...text('env'), ...text(name), 0, 0);
  return new WebAssembly.Module(
    Buffer.from([
      0,
      97,
      115,
      109,
      1,
      0,
      0,
      0,
      ...section(1, [2, ...signature, ...apiSignature]),
      ...section(2, [1 + imported, ...imports]),
      ...section(3, [1, 1]),
      ...section(6, [1, 0x7f, 0, ...i32(heap), 0x0b]),
      ...section(7, [2, ...text('__heap_base'), 3, 0, ...text(api), 0, imported]),
      ...section(10, [1, ...vector([0, ...code, 0x0b])]),
      ...section(11, [1, 0, ...i32(128), 0x0b, ...vector(data)]),
    ])
  );
}
const run = (module: WebAssembly.Module, state = empty(), extra = {}) =>
  kernel(module, 'LiquidityProxyAPI_quote', Buffer.alloc(0), state, { ...limits, ...extra });

describe('strict read-only target runtime host', () => {
  it('does not export a generic binary kernel and rejects non-pinned compressed binaries', () => {
    expect(Object.keys(host).sort()).toEqual(
      [
        'GOAL_TARGET_RUNTIME_LIMITS',
        'GOAL_TARGET_RUNTIME_PROFILE',
        'GOAL_TARGET_XST_PREFIX',
        'createGoalTargetRuntimeHost',
      ].sort()
    );
    expect(() => host.createGoalTargetRuntimeHost(Buffer.from([0, 97, 115, 109]))).toThrow('target-binary-hash');
    expect(() =>
      kernel(tiny({ mode: 'return' }), 'BlockBuilder_apply_extrinsic', Buffer.alloc(0), empty(), limits)
    ).toThrow('unapproved-export');
  });

  it('distinguishes declared absence, empty value and unknown storage', () => {
    const module = tiny({ name: 'ext_storage_get_version_1' });
    expect(run(module)).toMatchObject({ success: false, error: 'undeclared-storage:0x01' });
    expect(run(module, { ...empty(), entries: { '0x01': null } })).toMatchObject({ success: true, resultHex: '0x00' });
    expect(run(module, { ...empty(), entries: { '0x01': '0x' } })).toMatchObject({
      success: true,
      resultHex: '0x0100',
    });
    const exists = tiny({ name: 'ext_storage_exists_version_1', mode: 'exists' });
    expect(run(exists, { ...empty(), entries: { '0x01': null } }).resultHex).toBe('0x00');
    expect(run(exists, { ...empty(), entries: { '0x01': '0x' } }).resultHex).toBe('0x01');
  });

  it('traverses genuine nonempty prefix members then returns the exact declared global successor', () => {
    const first = PREFIX + '01',
      second = PREFIX + '0203',
      after = '0xa0';
    const state: HostState = {
      entries: {},
      prefix: { prefix: PREFIX, complete: true, entries: { [second]: '0x0405', [first]: '0x06' }, after },
    };
    const decode = (hex: string) => {
      const { TypeRegistry } = require('@polkadot/types');
      return new TypeRegistry()
        .createType('Option<Bytes>', Buffer.from(hex.slice(2), 'hex'))
        .unwrap()
        .toHex();
    };
    for (const [cursor, expected] of [
      [PREFIX, first],
      [first, second],
      [second, after],
    ]) {
      const value = run(tiny({ name: 'ext_storage_next_key_version_1', key: cursor }), state);
      expect(value.success).toBe(true);
      expect(decode(value.resultHex)).toBe(expected);
    }
    expect(run(tiny({ name: 'ext_storage_get_version_1', key: second }), state).resultHex).toBe('0x01080405');
    expect(run(tiny({ name: 'ext_storage_next_key_version_1', key: after }), state)).toMatchObject({
      success: false,
      error: 'undeclared-prefix-cursor',
    });
    const exhausted = { ...state, prefix: { ...state.prefix, after: null } };
    expect(run(tiny({ name: 'ext_storage_next_key_version_1', key: second }), exhausted).resultHex).toBe('0x00');
  });

  it('requires explicit complete inventory and consistent state; never invokes accessors', () => {
    const module = tiny({ mode: 'return' }),
      member = PREFIX + '01';
    expect(() => run(module, { ...empty(), prefix: { prefix: PREFIX, entries: {}, after: null } } as any)).toThrow(
      'data-fields'
    );
    expect(() => run(module, { ...empty(), entries: { [member]: '0x01' } })).toThrow('incomplete-prefix-declaration');
    expect(() =>
      run(module, {
        entries: { [member]: '0x02' },
        prefix: { prefix: PREFIX, complete: true, entries: { [member]: '0x01' }, after: null },
      })
    ).toThrow('conflicting-state');
    expect(() => run(module, { ...empty(), prefix: { ...empty().prefix, after: member } })).toThrow('global-successor');
    expect(() => run(module, { ...empty(), entries: { '0xa0': '0x01' } })).toThrow('inconsistent-global-successor');
    expect(() => run(module, { entries: { '0xa0': '0x01' }, prefix: { ...empty().prefix, after: '0xb0' } })).toThrow(
      'inconsistent-global-successor'
    );
    expect(() => run(module, { entries: { '0xa0': null }, prefix: { ...empty().prefix, after: '0xa0' } })).toThrow(
      'absent-successor'
    );
    let getterCalls = 0;
    const entries = Object.defineProperty({}, '0x01', {
      enumerable: true,
      get() {
        getterCalls++;
        return '0x00';
      },
    });
    expect(() => run(module, { ...empty(), entries })).toThrow('data-accessor');
    expect(getterCalls).toBe(0);
  });

  it.each([
    'ext_storage_set_version_1',
    'ext_storage_clear_version_1',
    'ext_storage_append_version_1',
    'ext_storage_clear_prefix_version_2',
    'ext_storage_start_transaction_version_1',
    'ext_storage_commit_transaction_version_1',
    'ext_storage_rollback_transaction_version_1',
    'ext_offchain_submit_transaction_version_1',
    'ext_crypto_sr25519_sign_version_1',
  ])('traps forbidden host %s without effects', (name) => {
    expect(run(tiny({ name, mode: 'void' }))).toMatchObject({
      success: false,
      error: `forbidden-or-unsupported-host:${name}`,
      storageWrites: 0,
      transactionExecution: false,
      admissionGranted: false,
    });
  });

  it('enforces input/state/key, host-call, retained-call, allocation, linear-memory and result bounds', () => {
    const plain = tiny({ mode: 'return' });
    expect(() => kernel(plain, 'LiquidityProxyAPI_quote', Buffer.alloc(4097), empty(), limits)).toThrow('input-size');
    expect(() => run(plain, { ...empty(), entries: { '0x01': '0x0203' } }, { stateBytes: 2 })).toThrow(
      'state-byte-budget'
    );
    expect(() => run(plain, { ...empty(), entries: { '0x0102': null } }, { keyBytes: 1 })).toThrow('storage-key');
    expect(() => run(plain, { ...empty(), entries: { '0x01': null, '0x02': null } }, { pointKeys: 1 })).toThrow(
      'state-key-budget'
    );
    expect(() =>
      run(
        plain,
        { entries: {}, prefix: { ...empty().prefix, entries: { [PREFIX + '01']: '0x00', [PREFIX + '02']: '0x00' } } },
        { prefixKeys: 1 }
      )
    ).toThrow('state-key-budget');
    expect(
      run(tiny({ name: 'ext_logging_max_level_version_1', mode: 'calls', repeat: 4 }), empty(), { hostCalls: 3 })
    ).toMatchObject({ success: false, error: 'host-call-budget' });
    expect(
      run(tiny({ name: 'ext_logging_max_level_version_1', mode: 'calls', repeat: 3 }), empty(), { retainedCalls: 2 })
    ).toMatchObject({ success: false, error: 'retained-host-call-budget' });
    expect(
      run(tiny({ name: 'ext_allocator_malloc_version_1', mode: 'allocate', size: 65 }), empty(), {
        allocationBytes: 64,
      })
    ).toMatchObject({ success: false, error: 'allocation-size' });
    expect(
      run(tiny({ name: 'ext_allocator_malloc_version_1', mode: 'allocate', size: 32768, repeat: 2 }))
    ).toMatchObject({ success: false, error: 'memory-budget' });
    expect(run(tiny({ mode: 'return', resultPointer: 65536 }))).toMatchObject({ success: false, error: 'memory-span' });
    expect(run(tiny({ mode: 'return', resultLength: 17 }), empty(), { resultBytes: 16 })).toMatchObject({
      success: false,
      error: 'result-size',
    });
    expect(run(tiny({ mode: 'return', heap: 65536 }))).toMatchObject({ success: false, error: 'heap-base' });
  });
});

const binaryPath =
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm';
describe.skipIf(!existsSync(binaryPath))('exact131 read-only invented route', () => {
  let current: any, binary: any, profile: any, fixtures: any;
  beforeAll(() => {
    const loader = require('../../../../output/go-history/goal-runtime-wasm-offline-20260921/runtime-host.cjs');
    profile = loader.PROFILES[1];
    binary = loader.loadBinary(profile, binaryPath);
    fixtures = require('../../../../output/go-history/goal-runtime-wasm-offline-20260921/fixture.cjs');
    const bytes = readFileSync(binaryPath);
    current = host.createGoalTargetRuntimeHost(bytes);
    bytes.fill(0);
  }, 30000);

  it('executes the exact version and metadata after caller binary mutation', () => {
    expect(current.profile).toMatchObject(host.GOAL_TARGET_RUNTIME_PROFILE);
    expect(current.invoke({ api: 'Core_version', inputHex: '0x' })).toMatchObject({ success: true, storageWrites: 0 });
    expect(current.invoke({ api: 'Metadata_metadata', inputHex: '0x' })).toMatchObject({
      success: true,
      admissionGranted: false,
    });
    expect(() => current.invoke({ api: 'BlockBuilder_apply_extrinsic', inputHex: '0x' })).toThrow('unapproved-export');
  });

  it.each([false, true])('quotes and queries both fees without writes, direction reverse=%s', (reverse) => {
    const f = fixtures.makeSwapFixture(profile, binary, reverse, '1');
    const allowed = new Set([
      'DEXInfos',
      'EnabledSourceTypes',
      'LockedLiquiditySources',
      'Properties',
      'Account',
      'Accounts',
      'Multiplier',
    ]);
    const entries = Object.fromEntries(
      f.declarations
        .filter(
          (d: any) => allowed.has(d.item) && (!['Account', 'Accounts'].includes(d.item) || d.keys.includes(f.pool))
        )
        .map((d: any) => [d.key, d.value])
    );
    expect(Object.keys(entries)).toHaveLength(7);
    const after = Object.keys(entries)
      .filter((key) => key > PREFIX)
      .sort()[0];
    expect(after).toBeTruthy();
    const state = { entries, prefix: { ...empty().prefix, after } };
    const { quoteInput } = require('../../../../output/go-history/goal-runtime-wasm-offline-20260921/runtime-host.cjs');
    const quote = current.invoke({
      api: 'LiquidityProxyAPI_quote',
      inputHex: '0x' + quoteInput(reverse).toString('hex'),
      state,
    });
    expect(quote).toMatchObject({ success: true, storageWrites: 0, historicalFill: false });
    const decoded = fixtures.decodeQuote(quote.resultHex, reverse);
    expect(decoded.amount).toBe(reverse ? '9930129451325382569' : '496751624187906046');
    const length = Buffer.alloc(4);
    length.writeUInt32LE(f.extrinsic.length);
    const inputHex = '0x' + Buffer.concat([f.extrinsic, length]).toString('hex');
    const info = current.invoke({ api: 'TransactionPaymentApi_query_info', inputHex, state });
    const details = current.invoke({ api: 'TransactionPaymentApi_query_fee_details', inputHex, state });
    expect(info).toMatchObject({ success: true, storageWrites: 0 });
    expect(details).toMatchObject({ success: true, storageWrites: 0 });
    expect(fixtures.decodeFees(f, info, details).partialFee).toBe('721000000000000');

    const synthetic = fixtures.storageCodec(f.registry, f.metadata, 'XSTPool', 'EnabledSynthetics', [
      { code: '0x0200990000000000000000000000000000000000000000000000000000000000' },
    ]);
    const member = synthetic.encode({ referenceSymbol: 'SYN', feeRatio: { inner: '0' } });
    const nonempty = current.invoke({
      api: 'LiquidityProxyAPI_quote',
      inputHex: '0x' + quoteInput(reverse).toString('hex'),
      state: {
        entries,
        prefix: { prefix: PREFIX, complete: true, entries: { [synthetic.key]: member }, after },
      },
    });
    expect(nonempty).toMatchObject({ success: true, resultHex: quote.resultHex, storageWrites: 0 });
    expect(nonempty.hostCalls).toContainEqual({
      name: 'ext_storage_get_version_1',
      keyHex: synthetic.key,
      declared: true,
    });
    expect(nonempty.hostCalls).toContainEqual({ name: 'ext_storage_next_key_version_1', keyHex: synthetic.key });
  });
});
