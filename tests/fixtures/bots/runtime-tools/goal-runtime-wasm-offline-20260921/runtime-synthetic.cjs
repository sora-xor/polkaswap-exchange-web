/** Strict synthetic state executor for a bounded exact-runtime probe; never a live signer or admission grant. */
'use strict';
const assert = require('node:assert/strict');
const { xxhashAsU8a, blake2AsU8a } = require('@polkadot/util-crypto');
const { TypeRegistry, Metadata } = require('@polkadot/types');
const { createPublicKey, verify } = require('node:crypto');
const MEMORY_BYTES = 128 * 1024 * 1024;
const HEX = /^0x(?:[0-9a-f]{2})*$/;
/** Every allowed key has an explicit value or null (declared absence); unknown reads always trap. */
function invokeSynthetic(binary, api, input = Buffer.alloc(0), declared = {}, emptyPrefixes = []) {
  assert(
    [
      'Core_version',
      'Metadata_metadata',
      'LiquidityProxyAPI_quote',
      'BlockBuilder_apply_extrinsic',
      'TransactionPaymentApi_query_info',
      'TransactionPaymentApi_query_fee_details',
    ].includes(api),
    'unapproved-export'
  );
  assert(Buffer.isBuffer(input) && input.length <= 4096, 'input-size');
  assert(Object.getPrototypeOf(declared) === Object.prototype, 'declared-state');
  const descriptors = Object.getOwnPropertyDescriptors(declared);
  assert(
    Reflect.ownKeys(descriptors).length <= 128 && Reflect.ownKeys(descriptors).every((key) => typeof key === 'string'),
    'fixture-size'
  );
  let state = new Map();
  let fixtureBytes = 0;
  const transactions = [],
    writes = [];
  for (const [key, value] of Object.entries(descriptors)) {
    assert(key.length <= 2050 && HEX.test(key) && value.enumerable && 'value' in value, 'declared-key');
    assert(value.value === null || (typeof value.value === 'string' && HEX.test(value.value)), 'declared-value');
    fixtureBytes += value.value === null ? 0 : (value.value.length - 2) / 2;
    assert(fixtureBytes <= 2 * 1024 * 1024, 'fixture-bytes');
    state.set(key, value.value === null ? null : Buffer.from(value.value.slice(2), 'hex'));
  }
  assert(state.size <= 128, 'fixture-size');
  assert(Array.isArray(emptyPrefixes) && emptyPrefixes.length <= 16, 'empty-prefixes');
  const scans = new Set(emptyPrefixes);
  assert(scans.size === emptyPrefixes.length, 'duplicate-empty-prefix');
  for (const prefix of scans) {
    assert(typeof prefix === 'string' && /^0x[0-9a-f]{64}$/.test(prefix), 'empty-prefix');
    assert(
      [...state].every(([key, value]) => value === null || !key.startsWith(prefix)),
      'nonempty-prefix'
    );
  }
  const memory = new WebAssembly.Memory({ initial: MEMORY_BYTES / 65536, maximum: MEMORY_BYTES / 65536 });
  const module = new WebAssembly.Module(binary.wasm);
  const calls = [],
    counts = {};
  let totalCalls = 0,
    heap = 0;
  const record = (name, extra) => {
    assert(++totalCalls <= 100000, 'host-call-budget');
    counts[name] = (counts[name] ?? 0) + 1;
    if (!name.startsWith('ext_allocator_')) {
      assert(calls.length < 4096, 'retained-host-call-budget');
      calls.push({ name, ...extra });
    }
  };
  const span = (packed) => {
    assert.equal(typeof packed, 'bigint');
    const pointer = Number(packed & 0xffffffffn),
      length = Number(packed >> 32n);
    assert(pointer >= 0 && length >= 0 && pointer + length <= MEMORY_BYTES, 'memory-span');
    return Buffer.from(memory.buffer, pointer, length);
  };
  const allocate = (size) => {
    assert(Number.isInteger(size) && size >= 0 && size <= 16 * 1024 * 1024 && heap > 0, 'allocation-size');
    const pointer = heap + 8;
    // Padded, non-reusing arena blocks. Free is intentionally a no-op for one bounded fresh instance.
    heap += 8 + 2 ** Math.ceil(Math.log2(Math.max(size, 8)));
    assert(heap <= MEMORY_BYTES, 'memory-budget');
    return pointer;
  };
  const returnBytes = (bytes) => {
    const pointer = allocate(bytes.length);
    new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
    return (BigInt(bytes.length) << 32n) | BigInt(pointer);
  };
  const env = { memory };
  for (const item of WebAssembly.Module.imports(module)) {
    assert.equal(item.module, 'env');
    if (item.kind === 'memory') {
      assert.equal(item.name, 'memory');
      continue;
    }
    assert.equal(item.kind, 'function');
    env[item.name] = (...args) => {
      record(
        item.name,
        item.name.startsWith('ext_storage_') && typeof args[0] === 'bigint'
          ? { keyHex: '0x' + span(args[0]).toString('hex') }
          : undefined
      );
      throw Error('unsupported-host:' + item.name);
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
    const targetBytes = span(target),
      messageBytes = span(message);
    assert(targetBytes.length <= 4096 && messageBytes.length <= 4096, 'log-size');
    record('ext_logging_log_version_1', {
      level,
      target: targetBytes.toString('utf8'),
      message: messageBytes.toString('utf8'),
    });
  };
  for (const [name, bits, fn] of [
    ['ext_hashing_twox_64_version_1', 64, xxhashAsU8a],
    ['ext_hashing_twox_128_version_1', 128, xxhashAsU8a],
    ['ext_hashing_blake2_128_version_1', 128, blake2AsU8a],
    ['ext_hashing_blake2_256_version_1', 256, blake2AsU8a],
  ])
    env[name] = (data) => {
      record(name);
      const pointer = allocate(bits / 8);
      new Uint8Array(memory.buffer, pointer, bits / 8).set(fn(span(data), bits));
      return pointer;
    };
  const lookup = (name, packed) => {
    const key = '0x' + span(packed).toString('hex');
    record(name, { keyHex: key, declared: state.has(key) });
    assert(state.has(key), 'undeclared-storage:' + key);
    return state.get(key);
  };
  env.ext_storage_get_version_1 = (key) => {
    const value = lookup('ext_storage_get_version_1', key);
    const encoded =
      value === null
        ? Buffer.from([0])
        : Buffer.concat([
            Buffer.from([1]),
            Buffer.from(new TypeRegistry().createType('Compact<u32>', value.length).toU8a()),
            value,
          ]);
    return returnBytes(encoded);
  };
  env.ext_storage_exists_version_1 = (key) => (lookup('ext_storage_exists_version_1', key) === null ? 0 : 1);
  env.ext_storage_next_key_version_1 = (packed) => {
    const key = '0x' + span(packed).toString('hex');
    record('ext_storage_next_key_version_1', { keyHex: key, declaredEmptyPrefix: scans.has(key) });
    assert(scans.has(key), 'undeclared-prefix:' + key);
    const next = [...state]
      .filter(([k, v]) => v !== null && k > key)
      .map(([k]) => k)
      .sort()[0];
    const value = next ? Buffer.from(next.slice(2), 'hex') : null;
    return returnBytes(
      value === null
        ? Buffer.from([0])
        : Buffer.concat([
            Buffer.from([1]),
            Buffer.from(new TypeRegistry().createType('Compact<u32>', value.length).toU8a()),
            value,
          ])
    );
  };
  const mutate = (name, packed, value) => {
    const key = '0x' + span(packed).toString('hex');
    record(name, { keyHex: key, declared: state.has(key) });
    assert(state.has(key), 'undeclared-write:' + key);
    assert(value === null || value.length <= 1024 * 1024, 'storage-write-size');
    assert(writes.length < 1024, 'storage-write-budget');
    writes.push({
      key,
      before: state.get(key) === null ? null : '0x' + state.get(key).toString('hex'),
      after: value === null ? null : '0x' + value.toString('hex'),
    });
    state.set(key, value === null ? null : Buffer.from(value));
  };
  env.ext_storage_set_version_1 = (key, value) => mutate('ext_storage_set_version_1', key, span(value));
  env.ext_storage_clear_version_1 = (key) => mutate('ext_storage_clear_version_1', key, null);
  env.ext_storage_append_version_1 = (packed, value) => {
    const key = '0x' + span(packed).toString('hex');
    assert.equal(key, '0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7', 'unsupported-append-key');
    assert(state.has(key), 'undeclared-append');
    const old = state.get(key) ?? Buffer.from([0]),
      registry = new TypeRegistry();
    const length = registry.createType('Compact<u32>', old),
      n = length.toNumber();
    assert(
      n < 1024 && Buffer.from(length.toU8a()).equals(old.subarray(0, length.encodedLength)),
      'invalid-vector-length'
    );
    mutate(
      'ext_storage_append_version_1',
      packed,
      Buffer.concat([
        Buffer.from(registry.createType('Compact<u32>', n + 1).toU8a()),
        old.subarray(length.encodedLength),
        span(value),
      ])
    );
  };
  env.ext_storage_start_transaction_version_1 = () => {
    record('ext_storage_start_transaction_version_1');
    assert(transactions.length < 16, 'transaction-depth');
    transactions.push(new Map(state));
  };
  env.ext_storage_rollback_transaction_version_1 = () => {
    record('ext_storage_rollback_transaction_version_1');
    assert(transactions.length, 'no-transaction');
    state = transactions.pop();
  };
  env.ext_storage_commit_transaction_version_1 = () => {
    record('ext_storage_commit_transaction_version_1');
    assert(transactions.length, 'no-transaction');
    transactions.pop();
  };
  env.ext_crypto_ed25519_verify_version_1 = (signaturePointer, message, publicPointer) => {
    const ptr = (pointer, size) => {
      assert(Number.isInteger(pointer) && pointer >= 0 && pointer + size <= MEMORY_BYTES, 'crypto-span');
      return Buffer.from(memory.buffer, pointer, size);
    };
    const publicKey = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), ptr(publicPointer, 32)]),
      format: 'der',
      type: 'spki',
    });
    const valid = verify(null, span(message), publicKey, ptr(signaturePointer, 64));
    record('ext_crypto_ed25519_verify_version_1', { valid });
    return valid ? 1 : 0;
  };
  try {
    const instance = new WebAssembly.Instance(module, { env });
    assert(instance.exports.__heap_base instanceof WebAssembly.Global);
    heap = Number(instance.exports.__heap_base.value);
    assert(Number.isSafeInteger(heap) && heap > 0 && heap < MEMORY_BYTES);
    const pointer = input.length ? allocate(input.length) : 0;
    if (input.length) new Uint8Array(memory.buffer, pointer, input.length).set(input);
    const returned = Buffer.from(span(instance.exports[api](pointer, input.length)));
    assert(returned.length > 0 && returned.length <= 4 * 1024 * 1024, 'result-size');
    assert.equal(transactions.length, 0, 'unclosed-transaction');
    return {
      api,
      success: true,
      resultHex: '0x' + returned.toString('hex'),
      hostCalls: calls,
      hostCallCounts: counts,
      writes,
      postState: Object.fromEntries([...state].map(([k, v]) => [k, v === null ? null : '0x' + v.toString('hex')])),
    };
  } catch (error) {
    return { api, success: false, error: error.message, hostCalls: calls, hostCallCounts: counts };
  }
}
/** Decode metadata produced by this exact WASM, with a complete OpaqueMetadata SCALE round trip. */
function metadataFromBinary(binary) {
  const result = invokeSynthetic(binary, 'Metadata_metadata');
  assert(result.success, result.error);
  const registry = new TypeRegistry();
  const encoded = Buffer.from(result.resultHex.slice(2), 'hex');
  const opaque = registry.createType('Bytes', encoded);
  assert(Buffer.from(opaque.toU8a()).equals(encoded), 'metadata-round-trip');
  const metadata = new Metadata(registry, opaque.toHex());
  registry.setMetadata(metadata);
  return { registry, metadata, result };
}
module.exports = { invokeSynthetic, metadataFromBinary };
