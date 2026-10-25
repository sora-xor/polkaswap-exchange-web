/** Minimal offline runtime loader, not a Substrate state executor or compatibility certificate. */
'use strict';
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { zstdDecompressSync } = require('node:zlib');
const { TypeRegistry } = require('@polkadot/types');
const { xxhashAsU8a } = require('@polkadot/util-crypto');
const PROFILES = Object.freeze([
  Object.freeze({
    package: '4.8.8',
    version: 130,
    sha256: '0ac7b85d845d56d450df99ab7166014897be57a7a1f66437d92e6949b56f49c0',
    codeHash: '0x2b33b01ba3f9e58e269b0e9619d25bedf3f60cdd6ed0ec519dacc75259c85d1e',
    wasmBytes: 13180316,
  }),
  Object.freeze({
    package: '4.8.9',
    version: 131,
    sha256: 'db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447',
    codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
    wasmBytes: 13268578,
  }),
]);
const MEMORY_BYTES = 64 * 1024 * 1024;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** Hash-pin and bounded-decompress exact compressed binaries; no source or network lookup. */
function loadBinary(profile, path) {
  assert(PROFILES.includes(profile), 'unsupported-profile');
  const compressed = readFileSync(path);
  assert(compressed.length < 4 * 1024 * 1024, 'compressed-size');
  assert.equal(sha(compressed), profile.sha256, 'binary-hash');
  assert.equal(compressed.subarray(0, 8).toString('hex'), '52bc537646db8e05');
  const wasm = zstdDecompressSync(compressed.subarray(8), { maxOutputLength: 16 * 1024 * 1024 });
  assert.equal(wasm.length, profile.wasmBytes);
  return Object.freeze({ profile, compressedBytes: compressed.length, wasmSha256: sha(wasm), wasm });
}
/** Execute one export with fresh bounded linear memory; every unimplemented host import traps. */
function invoke(binary, api, input = Buffer.alloc(0)) {
  assert(['Core_version', 'Metadata_metadata', 'LiquidityProxyAPI_quote'].includes(api), 'unapproved-export');
  assert(Buffer.isBuffer(input) && input.length <= 4096, 'input-size');
  const module = new WebAssembly.Module(binary.wasm);
  const memory = new WebAssembly.Memory({ initial: 1024, maximum: 1024 });
  const calls = [],
    env = { memory };
  let heap = 0;
  const record = (name) => {
    assert(calls.length < 4096, 'host-call-budget');
    calls.push({ name });
  };
  const span = (packed) => {
    assert.equal(typeof packed, 'bigint');
    const pointer = Number(packed & 0xffffffffn),
      length = Number(packed >> 32n);
    assert(pointer >= 0 && length >= 0 && pointer + length <= MEMORY_BYTES, 'host-memory-span');
    return Buffer.from(memory.buffer, pointer, length);
  };
  for (const item of WebAssembly.Module.imports(module)) {
    assert.equal(item.module, 'env');
    if (item.kind === 'memory') {
      assert.equal(item.name, 'memory');
      continue;
    }
    assert.equal(item.kind, 'function', 'unsupported-import-kind');
    env[item.name] = (...args) => {
      record(item.name);
      if (item.name.startsWith('ext_storage_') && typeof args[0] === 'bigint')
        calls[calls.length - 1].keyHex = `0x${span(args[0]).toString('hex')}`;
      throw Error(`unsupported-host:${item.name}`);
    };
  }
  // The return buffer is copied before this fresh instance is discarded. Free is an arena no-op;
  // this allocator is not a production runtime allocator and grants no state-execution evidence.
  const allocate = (size) => {
    assert(Number.isInteger(size) && size >= 0 && size <= 16 * 1024 * 1024 && heap > 0, 'allocation-size');
    const pointer = heap;
    heap = Math.ceil((heap + Math.max(size, 1)) / 8) * 8;
    assert(heap <= MEMORY_BYTES, 'memory-budget');
    return pointer;
  };
  env.ext_allocator_malloc_version_1 = (size) => {
    record('ext_allocator_malloc_version_1');
    return allocate(size);
  };
  env.ext_allocator_free_version_1 = () => record('ext_allocator_free_version_1');
  env.ext_logging_max_level_version_1 = () => {
    record('ext_logging_max_level_version_1');
    return 0;
  };
  // A standard pure hash lets the quote reach its first missing fixture key; no missing state is invented.
  for (const bits of [64, 128]) {
    const name = `ext_hashing_twox_${bits}_version_1`;
    // The runtime-interface fixed-byte return ABI is a host-allocated i32 pointer, not an out parameter.
    env[name] = (data) => {
      record(name);
      const outputPointer = allocate(bits / 8);
      new Uint8Array(memory.buffer, outputPointer, bits / 8).set(xxhashAsU8a(span(data), bits));
      return outputPointer;
    };
  }
  try {
    const instance = new WebAssembly.Instance(module, { env });
    assert(instance.exports.__heap_base instanceof WebAssembly.Global);
    heap = Number(instance.exports.__heap_base.value);
    assert(Number.isSafeInteger(heap) && heap > 0 && heap < MEMORY_BYTES);
    const pointer = input.length ? allocate(input.length) : 0;
    if (input.length) new Uint8Array(memory.buffer, pointer, input.length).set(input);
    const fn = instance.exports[api];
    assert.equal(typeof fn, 'function');
    const returned = span(fn(pointer, input.length));
    assert(returned.length > 0 && returned.length <= 2 * 1024 * 1024, 'result-size');
    return {
      api,
      inputHex: `0x${input.toString('hex')}`,
      success: true,
      resultHex: `0x${Buffer.from(returned).toString('hex')}`,
      hostCalls: calls,
    };
  } catch (error) {
    return { api, inputHex: `0x${input.toString('hex')}`, success: false, error: error.message, hostCalls: calls };
  }
}
/** Decode the executed result with full SCALE round-trip; never substitute the runtime_version custom section. */
function checkCoreVersion(binary) {
  const result = invoke(binary, 'Core_version');
  assert(result.success, result.error);
  const bytes = Buffer.from(result.resultHex.slice(2), 'hex');
  const decoded = new TypeRegistry().createType('RuntimeVersion', bytes);
  assert(Buffer.from(decoded.toU8a()).equals(bytes), 'version-scale-round-trip');
  assert.equal(decoded.specName.toString(), 'sora-substrate');
  assert.equal(decoded.specVersion.toNumber(), binary.profile.version);
  assert.equal(decoded.transactionVersion.toNumber(), binary.profile.version);
  assert(
    result.hostCalls.every((call) =>
      ['ext_logging_max_level_version_1', 'ext_allocator_malloc_version_1', 'ext_allocator_free_version_1'].includes(
        call.name
      )
    )
  );
  return { ...result, decoded: decoded.toJSON() };
}
/** Exact API-v3 input layout from runtime source; fixed codec lot, native DEX0 XYK-only desired input. */
function quoteInput(reverse = false) {
  assert.equal(typeof reverse, 'boolean');
  const xor = Buffer.from('020000' + '00'.repeat(29), 'hex'),
    kusd = Buffer.from('02000c' + '00'.repeat(29), 'hex');
  const amount = Buffer.alloc(16);
  amount.writeBigUInt64LE(reverse ? 1000000000000000000n : 5000000000000000000n);
  // dex:u32, input/output:AssetId32, amount:u128, WithDesiredInput:0, Vec[XYKPool]:04 00, AllowSelected:2.
  return Buffer.concat([
    Buffer.alloc(4),
    reverse ? xor : kusd,
    reverse ? kusd : xor,
    amount,
    Buffer.from([0, 4, 0, 2]),
  ]);
}
module.exports = { PROFILES, loadBinary, invoke, checkCoreVersion, quoteInput };
