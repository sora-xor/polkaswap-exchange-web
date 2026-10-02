/**
 * Exact runtime131 read-only hypothetical API host. This is neither a historical fill
 * executor nor an admission capability. Supplied state provenance belongs to its verifier.
 */
'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { zstdDecompressSync } = require('node:zlib');
const { TypeRegistry } = require('@polkadot/types');
const { xxhashAsU8a, blake2AsU8a } = require('@polkadot/util-crypto');

const PROFILE = Object.freeze({
  specVersion: 131,
  transactionVersion: 131,
  compressedSha256: 'db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447',
  codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
  metadataSha256: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
  wasmBytes: 13268578,
});
const LIMITS = Object.freeze({
  memoryBytes: 128 * 1024 * 1024,
  allocationBytes: 16 * 1024 * 1024,
  inputBytes: 4096,
  resultBytes: 2 * 1024 * 1024,
  pointKeys: 128,
  prefixKeys: 256,
  keyBytes: 1024,
  stateBytes: 2 * 1024 * 1024,
  hostCalls: 100000,
  retainedCalls: 4096,
});
const PREFIX = '0x94106571e04fc4fb4133da54a111ec64f0f8da9ca61ee022314c44009224fe9a';
const APIS = Object.freeze([
  'Core_version',
  'Metadata_metadata',
  'LiquidityProxyAPI_quote',
  'TransactionPaymentApi_query_info',
  'TransactionPaymentApi_query_fee_details',
]);
const HEX = /^0x(?:[0-9a-f]{2})*$/;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Read own data properties only; rejected accessors are never executed. */
function own(value, keys) {
  assert(value && Object.getPrototypeOf(value) === Object.prototype, 'plain-data-object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(descriptors);
  assert(
    names.every((key) => typeof key === 'string'),
    'symbol-field'
  );
  if (keys) assert(names.length === keys.length && keys.every((key) => names.includes(key)), 'data-fields');
  assert(
    Object.values(descriptors).every((d) => d.enumerable && 'value' in d),
    'data-accessor'
  );
  return Object.fromEntries(names.map((key) => [key, descriptors[key].value]));
}

/** Snapshot explicit point values and a complete prefix with a real global successor. */
function declaredState(raw, limits) {
  const copied = own(raw, ['entries', 'prefix']);
  const points = own(copied.entries);
  const prefix = own(copied.prefix, ['prefix', 'complete', 'entries', 'after']);
  assert(prefix.prefix === PREFIX && prefix.complete === true, 'complete-xst-prefix-required');
  const members = own(prefix.entries);
  assert(
    Object.keys(points).length <= limits.pointKeys && Object.keys(members).length <= limits.prefixKeys,
    'state-key-budget'
  );
  let bytes = 0;
  const key = (value) => {
    assert(
      typeof value === 'string' && value.length > 2 && value.length <= 2 + 2 * limits.keyBytes && HEX.test(value),
      'storage-key'
    );
    return value;
  };
  const entries = new Map();
  const add = (k, value) => {
    key(k);
    assert(
      value === null || (typeof value === 'string' && value.length <= 2 + 2 * limits.stateBytes),
      'storage-value-size'
    );
    bytes += (k.length - 2) / 2 + (value === null ? 0 : (value.length - 2) / 2);
    assert(bytes <= limits.stateBytes, 'state-byte-budget');
    assert(value === null || HEX.test(value), 'storage-value');
    if (entries.has(k)) assert(entries.get(k) === value, 'conflicting-state');
    entries.set(k, value);
  };
  for (const k of Object.keys(points).sort()) add(k, points[k]);
  const memberKeys = Object.keys(members).sort();
  for (const k of memberKeys) {
    assert(k.startsWith(PREFIX) && k.length > PREFIX.length && members[k] !== null, 'prefix-member');
    add(k, members[k]);
  }
  for (const [k, value] of entries) {
    if (k.startsWith(PREFIX) && value !== null) assert(Object.hasOwn(members, k), 'incomplete-prefix-declaration');
  }
  assert(prefix.after === null || (key(prefix.after) > PREFIX && !prefix.after.startsWith(PREFIX)), 'global-successor');
  if (prefix.after !== null && entries.has(prefix.after))
    assert(entries.get(prefix.after) !== null, 'absent-successor');
  const last = memberKeys.at(-1) ?? PREFIX;
  for (const [k, value] of entries) {
    if (value !== null && k > last) assert(prefix.after !== null && k >= prefix.after, 'inconsistent-global-successor');
  }
  const snapshot = {
    entries: Object.fromEntries(
      Object.keys(points)
        .sort()
        .map((k) => [k, points[k]])
    ),
    prefix: {
      prefix: PREFIX,
      complete: true,
      entries: Object.fromEntries(memberKeys.map((k) => [k, members[k]])),
      after: prefix.after,
    },
  };
  return { entries, memberKeys, after: prefix.after, stateSha256: sha(JSON.stringify(snapshot)), declaredBytes: bytes };
}

/** Private generic kernel: only the public hash-pinned factory can reach it in shipped code. */
function invokeReadOnly(module, api, input, rawState, limits = LIMITS) {
  assert(APIS.includes(api), 'unapproved-export');
  assert(Buffer.isBuffer(input) && input.length <= limits.inputBytes, 'input-size');
  const needsState = !['Core_version', 'Metadata_metadata'].includes(api);
  assert(!needsState || rawState !== undefined, 'explicit-state-required');
  const state = rawState === undefined ? undefined : declaredState(rawState, limits);
  const memory = new WebAssembly.Memory({ initial: limits.memoryBytes / 65536, maximum: limits.memoryBytes / 65536 });
  const calls = [],
    counts = {};
  let totalCalls = 0,
    heap = 0;
  const record = (name, fields = {}) => {
    assert(++totalCalls <= limits.hostCalls, 'host-call-budget');
    counts[name] = (counts[name] ?? 0) + 1;
    if (!name.startsWith('ext_allocator_')) {
      assert(calls.length < limits.retainedCalls, 'retained-host-call-budget');
      calls.push(Object.freeze({ name, ...fields }));
    }
  };
  const span = (packed) => {
    assert.equal(typeof packed, 'bigint', 'packed-span');
    const pointer = Number(packed & 0xffffffffn),
      length = Number(packed >> 32n);
    assert(pointer >= 0 && length >= 0 && pointer + length <= limits.memoryBytes, 'memory-span');
    return Buffer.from(memory.buffer, pointer, length);
  };
  const allocate = (size) => {
    assert(Number.isInteger(size) && size >= 0 && size <= limits.allocationBytes && heap > 0, 'allocation-size');
    const pointer = heap + 8;
    // Audited fresh-instance arena; no allocator reuse or production allocator equivalence is claimed.
    heap += 8 + 2 ** Math.ceil(Math.log2(Math.max(size, 8)));
    assert(heap <= limits.memoryBytes, 'memory-budget');
    return pointer;
  };
  const returnBytes = (bytes) => {
    const pointer = allocate(bytes.length);
    new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
    return (BigInt(bytes.length) << 32n) | BigInt(pointer);
  };
  const registry = new TypeRegistry();
  const optionBytes = (value) =>
    value === null
      ? Buffer.from([0])
      : Buffer.concat([
          Buffer.from([1]),
          Buffer.from(registry.createType('Compact<u32>', value.length).toU8a()),
          value,
        ]);
  const env = { memory };
  for (const item of WebAssembly.Module.imports(module)) {
    assert.equal(item.module, 'env', 'import-module');
    if (item.kind === 'memory') {
      assert.equal(item.name, 'memory');
      continue;
    }
    assert.equal(item.kind, 'function', 'import-kind');
    env[item.name] = () => {
      record(item.name);
      throw new Error(`forbidden-or-unsupported-host:${item.name}`);
    };
  }
  env.ext_allocator_malloc_version_1 = (size) => {
    record('ext_allocator_malloc_version_1');
    return allocate(size);
  };
  env.ext_allocator_free_version_1 = () => record('ext_allocator_free_version_1');
  env.ext_logging_max_level_version_1 = () => {
    record('ext_logging_max_level_version_1');
    return 0;
  };
  env.ext_logging_log_version_1 = (level, target, message) => {
    assert(span(target).length <= 4096 && span(message).length <= 4096, 'log-size');
    record('ext_logging_log_version_1', {
      level,
      targetBytes: span(target).length,
      messageBytes: span(message).length,
    });
  };
  for (const [name, bits, hash] of [
    ['ext_hashing_twox_64_version_1', 64, xxhashAsU8a],
    ['ext_hashing_twox_128_version_1', 128, xxhashAsU8a],
    ['ext_hashing_blake2_128_version_1', 128, blake2AsU8a],
    ['ext_hashing_blake2_256_version_1', 256, blake2AsU8a],
  ])
    env[name] = (packed) => {
      record(name);
      const pointer = allocate(bits / 8);
      new Uint8Array(memory.buffer, pointer, bits / 8).set(hash(span(packed), bits));
      return pointer;
    };
  const lookup = (name, packed) => {
    const key = '0x' + span(packed).toString('hex');
    record(name, { keyHex: key, declared: Boolean(state?.entries.has(key)) });
    assert(state?.entries.has(key), 'undeclared-storage:' + key);
    const value = state.entries.get(key);
    return value === null ? null : Buffer.from(value.slice(2), 'hex');
  };
  env.ext_storage_get_version_1 = (packed) => returnBytes(optionBytes(lookup('ext_storage_get_version_1', packed)));
  env.ext_storage_exists_version_1 = (packed) => (lookup('ext_storage_exists_version_1', packed) === null ? 0 : 1);
  env.ext_storage_next_key_version_1 = (packed) => {
    const cursor = '0x' + span(packed).toString('hex');
    record('ext_storage_next_key_version_1', { keyHex: cursor });
    assert(state && (cursor === PREFIX || state.memberKeys.includes(cursor)), 'undeclared-prefix-cursor');
    const next = state.memberKeys.find((key) => key > cursor) ?? state.after;
    return returnBytes(optionBytes(next === null ? null : Buffer.from(next.slice(2), 'hex')));
  };
  const finish = (value) =>
    Object.freeze({
      kind: 'hypothetical-target-runtime-read-only-v1',
      api,
      ...value,
      stateSha256: state?.stateSha256 ?? null,
      declaredStateBytes: state?.declaredBytes ?? 0,
      hostCalls: Object.freeze(calls.slice()),
      hostCallCounts: Object.freeze({ ...counts }),
      totalHostCalls: totalCalls,
      memoryBytes: limits.memoryBytes,
      storageWrites: 0,
      transactionExecution: false,
      historicalFill: false,
      admissionGranted: false,
    });
  try {
    const instance = new WebAssembly.Instance(module, { env });
    assert(instance.exports.__heap_base instanceof WebAssembly.Global, 'heap-export');
    heap = Number(instance.exports.__heap_base.value);
    assert(Number.isSafeInteger(heap) && heap > 0 && heap < limits.memoryBytes, 'heap-base');
    assert.equal(typeof instance.exports[api], 'function', 'api-export');
    const pointer = input.length ? allocate(input.length) : 0;
    if (input.length) new Uint8Array(memory.buffer, pointer, input.length).set(input);
    const returned = span(instance.exports[api](pointer, input.length));
    assert(returned.length > 0 && returned.length <= limits.resultBytes, 'result-size');
    return finish({ success: true, resultHex: '0x' + returned.toString('hex') });
  } catch (error) {
    return finish({ success: false, error: error instanceof Error ? error.message : 'runtime-trap' });
  }
}

/**
 * Load only the exact pinned compressed131 artifact, without filesystem/network access.
 * Byte copies and private compiled module prevent later caller mutation of the runtime.
 */
function createGoalTargetRuntimeHost(compressedBytes) {
  assert(Buffer.isBuffer(compressedBytes) && compressedBytes.length <= 4 * 1024 * 1024, 'compressed-size');
  const compressed = Buffer.from(compressedBytes);
  assert.equal(sha(compressed), PROFILE.compressedSha256, 'target-binary-hash');
  assert.equal('0x' + Buffer.from(blake2AsU8a(compressed, 256)).toString('hex'), PROFILE.codeHash, 'target-code-hash');
  assert.equal(compressed.subarray(0, 8).toString('hex'), '52bc537646db8e05', 'compressed-format');
  const wasm = zstdDecompressSync(compressed.subarray(8), { maxOutputLength: 16 * 1024 * 1024 });
  assert.equal(wasm.length, PROFILE.wasmBytes, 'target-wasm-size');
  const module = new WebAssembly.Module(wasm);
  const core = invokeReadOnly(module, 'Core_version', Buffer.alloc(0));
  assert(core.success, core.error);
  const registry = new TypeRegistry(),
    coreBytes = Buffer.from(core.resultHex.slice(2), 'hex');
  const version = registry.createType('RuntimeVersion', coreBytes);
  assert(Buffer.from(version.toU8a()).equals(coreBytes), 'runtime-version-roundtrip');
  assert.equal(version.specName.toString(), 'sora-substrate');
  assert.equal(version.specVersion.toNumber(), PROFILE.specVersion);
  assert.equal(version.transactionVersion.toNumber(), PROFILE.transactionVersion);
  const output = invokeReadOnly(module, 'Metadata_metadata', Buffer.alloc(0));
  assert(output.success, output.error);
  const encoded = Buffer.from(output.resultHex.slice(2), 'hex'),
    metadata = registry.createType('Bytes', encoded);
  assert(Buffer.from(metadata.toU8a()).equals(encoded), 'metadata-roundtrip');
  const metadataHex = metadata.toHex();
  assert.equal(sha(Buffer.from(metadataHex.slice(2), 'hex')), PROFILE.metadataSha256, 'target-metadata-hash');
  const profile = Object.freeze({ ...PROFILE, wasmSha256: sha(wasm) });
  return Object.freeze({
    profile,
    metadataHex,
    /** Only explicitly allowed read-only APIs; storage provenance is not authenticated by this call. */
    invoke(value) {
      const descriptors = own(value);
      assert(
        Object.keys(descriptors).every((key) => ['api', 'inputHex', 'state'].includes(key)),
        'invoke-fields'
      );
      assert(Object.hasOwn(descriptors, 'api') && Object.hasOwn(descriptors, 'inputHex'), 'invoke-fields');
      assert(
        typeof descriptors.inputHex === 'string' &&
          HEX.test(descriptors.inputHex) &&
          descriptors.inputHex.length <= 2 + 2 * LIMITS.inputBytes,
        'input-hex'
      );
      return invokeReadOnly(
        module,
        descriptors.api,
        Buffer.from(descriptors.inputHex.slice(2), 'hex'),
        descriptors.state
      );
    },
  });
}
module.exports = {
  createGoalTargetRuntimeHost,
  GOAL_TARGET_RUNTIME_PROFILE: PROFILE,
  GOAL_TARGET_RUNTIME_LIMITS: LIMITS,
  GOAL_TARGET_XST_PREFIX: PREFIX,
};
