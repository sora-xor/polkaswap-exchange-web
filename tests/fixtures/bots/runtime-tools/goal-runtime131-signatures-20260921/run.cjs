/** Exact runtime-131 signature/nonce/era vectors under OS network denial. No live authority. */
'use strict';
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { PROFILES, loadBinary } = require('../goal-runtime-wasm-offline-20260921/runtime-host.cjs');
const { assertNetworkDenied } = require('../goal-runtime-wasm-offline-20260921/run.cjs');
const { storageCodec, decodeFees } = require('../goal-runtime-wasm-offline-20260921/fixture.cjs');
const { invokeSynthetic } = require('./runtime-signatures.cjs');
const { CASES, GENESIS, signedFixture } = require('./fixture.cjs');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const base = resolve(__dirname, '../../../../..');
const sources = [
  'tests/fixtures/bots/runtime-tools/goal-runtime-wasm-offline-20260921/runtime-host.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime-wasm-offline-20260921/runtime-synthetic.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime-wasm-offline-20260921/run.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime-wasm-offline-20260921/fixture.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime-wasm-offline-20260921/network-deny.sb',
  'tests/fixtures/bots/runtime-tools/goal-runtime131-signatures-20260921/runtime-signatures.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime131-signatures-20260921/fixture.cjs',
  'tests/fixtures/bots/runtime-tools/goal-runtime131-signatures-20260921/run.cjs',
];
/** Read actual effects; prove conservation and inclusion/nonce/fee distinctions without assuming event success. */
function inspect(f, actual) {
  assert(actual.success, actual.error);
  const decode = (p, n, keys, state) => {
    const c = storageCodec(f.registry, f.metadata, p, n, keys);
    const bytes = Buffer.from(state[c.key].slice(2), 'hex');
    const v = f.registry.createType(c.type, bytes);
    assert(Buffer.from(v.toU8a()).equals(bytes), 'storage-roundtrip');
    return v;
  };
  const xor = { code: '0x020000' + '00'.repeat(29) },
    kusd = { code: '0x02000c' + '00'.repeat(29) };
  const balances = (state) => ({
    payerXor: decode('System', 'Account', [f.payer], state).data.free.toString(),
    payerKusd: decode('Tokens', 'Accounts', [f.payer, kusd], state).free.toString(),
    poolXor: decode('System', 'Account', [f.pool], state).data.free.toString(),
    poolKusd: decode('Tokens', 'Accounts', [f.pool, kusd], state).free.toString(),
    feeXor: decode('System', 'Account', [f.fee], state).data.free.toString(),
    nonce: decode('System', 'Account', [f.payer], state).nonce.toString(),
    xorIssuance: decode('Balances', 'TotalIssuance', [], state).toString(),
    kusdIssuance: decode('Tokens', 'TotalIssuance', [kusd], state).toString(),
  });
  const resultBytes = Buffer.from(actual.resultHex.slice(2), 'hex');
  const outcome = f.registry.createType('ApplyExtrinsicResult', resultBytes);
  assert(Buffer.from(outcome.toU8a()).equals(resultBytes), 'outcome-roundtrip');
  const events = decode('System', 'Events', [], actual.postState);
  const before = balances(f.state),
    after = balances(actual.postState);
  const applied = outcome.isOk,
    success = applied && outcome.asOk.isOk;
  const fees = [...events].filter((r) => r.event.section === 'xorFee' && r.event.method === 'FeeWithdrawn');
  const trades = [...events].filter((r) => r.event.section === 'liquidityProxy' && r.event.method === 'Exchange');
  const nativeFee = applied ? fees[0]?.event.data[1].toString() : '0';
  const output = success ? trades[0]?.event.data[5].toString() : '0';
  if (!applied) {
    assert.equal(events.length, 0, 'rejection-events');
    assert.deepEqual(after, before, 'rejection-economic-state');
    const extrinsicKey = storageCodec(f.registry, f.metadata, 'System', 'ExtrinsicData', [0]).key;
    const expected = { ...f.state };
    // CheckNonce pre-dispatch follows System::note_extrinsic; this block-local write is not an included trade.
    if (f.vector.mode === 'stale-nonce') {
      expected[extrinsicKey] = storageCodec(f.registry, f.metadata, 'System', 'ExtrinsicData', [0]).encode(
        '0x' + f.extrinsic.toString('hex')
      );
      assert.equal(actual.writes.length, 1, 'stale-only-note-extrinsic');
      assert.equal(actual.writes[0].key, extrinsicKey);
    } else assert.equal(actual.writes.length, 0, 'rejection-writes');
    assert.deepEqual(actual.postState, expected, 'rejection-state');
  } else {
    assert.equal(fees.length, 1);
    assert.equal(fees[0].event.data[0].toHex(), f.payer);
    assert(BigInt(nativeFee) > 0n);
    assert.equal(after.nonce, (BigInt(before.nonce) + 1n).toString());
    assert.equal(BigInt(after.xorIssuance), BigInt(before.xorIssuance) - BigInt(nativeFee));
    assert.equal(after.kusdIssuance, before.kusdIssuance);
    assert.equal(BigInt(after.payerXor) + BigInt(after.poolXor) + BigInt(after.feeXor), BigInt(after.xorIssuance));
    assert.equal(BigInt(after.payerKusd) + BigInt(after.poolKusd), BigInt(after.kusdIssuance));
    if (success) {
      assert.equal(trades.length, 1);
      assert(BigInt(output) > 0n);
      assert.equal(
        BigInt(after.payerXor),
        BigInt(before.payerXor) + (f.reverse ? -(10n ** 18n) : BigInt(output)) - BigInt(nativeFee)
      );
      assert.equal(BigInt(after.payerKusd), BigInt(before.payerKusd) + (f.reverse ? BigInt(output) : -5n * 10n ** 18n));
    } else {
      assert.equal(trades.length, 0);
      assert.equal(BigInt(after.payerXor), BigInt(before.payerXor) - BigInt(nativeFee));
      for (const k of ['payerKusd', 'poolXor', 'poolKusd', 'feeXor']) assert.equal(after[k], before[k]);
      const reserves = storageCodec(f.registry, f.metadata, 'PoolXYK', 'Reserves', [xor, kusd]).key;
      assert.equal(actual.postState[reserves], f.state[reserves]);
    }
  }
  return {
    applied,
    success,
    nativeFee,
    output,
    before,
    after,
    outcome: outcome.toJSON(),
    eventHex: events.toHex(),
    eventCount: events.length,
  };
}
/** Write a fresh immutable protocol before running the fixed fixture; never overwrite an existing invocation. */
async function main(directory) {
  const networkDenial = await assertNetworkDenied();
  await cryptoWaitReady();
  mkdirSync(directory, { recursive: true });
  const files = {};
  const save = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    assert(bytes.length < 8 * 1024 * 1024, 'artifact-size');
    writeFileSync(join(directory, name), bytes, { flag: 'wx' });
    files[name] = { bytes: bytes.length, sha256: sha(bytes) };
  };
  const sourceHashes = Object.fromEntries(sources.map((p) => [p, sha(readFileSync(join(base, p)))]));
  const profile = PROFILES[1];
  save('protocol.json', {
    protocol: 'runtime131-signature-route-synthetic-v1',
    networkDenial,
    profile,
    sourceHashes,
    cases: CASES,
    genesis: GENESIS,
    fixture: 'previous invented 1000 XOR / 10000 KUSD pool; 3 XOR / 10 KUSD payer; multiplier1',
    key: 'public test seed0x42 repeated32; no wallet',
    signedBirth: 191,
    signedDeath: 255,
    currentBlock: 192,
    currentExpiredControl: 255,
    scope:
      'Only declared artificial execution vectors; no chain finality, real balances, production cost ceiling or admission.',
  });
  const binary = loadBinary(profile, resolve(__dirname, '../../runtime-artifacts/runtime-131.compact.compressed.wasm'));
  const summaries = [];
  for (const vector of CASES) {
    const f = signedFixture(profile, binary, vector, GENESIS);
    if (summaries.length === 0)
      save('metadata.json', {
        binding: f.metadataBinding,
        metadataHex: f.metadata.toHex(),
        actualExport: f.metadataExecution,
      });
    const actual = invokeSynthetic(binary, 'BlockBuilder_apply_extrinsic', f.extrinsic, f.state, f.emptyPrefixes);
    let summary;
    try {
      summary = inspect(f, actual);
    } catch (error) {
      save(vector.id + '-failed-inspection.json', {
        vector,
        payload: f.payload,
        declaredState: f.state,
        actual,
        error: error.message,
      });
      throw error;
    }
    const expectedApplied = !vector.mode || vector.mode === 'minimum-failure';
    assert.equal(summary.applied, expectedApplied, vector.id + ':applied');
    assert.equal(summary.success, !vector.mode, vector.id + ':success');
    let fees = null;
    if (summary.applied) {
      const input = Buffer.concat([f.extrinsic, Buffer.from(f.registry.createType('u32', f.extrinsic.length).toU8a())]);
      const info = invokeSynthetic(binary, 'TransactionPaymentApi_query_info', input, f.state, f.emptyPrefixes);
      const details = invokeSynthetic(
        binary,
        'TransactionPaymentApi_query_fee_details',
        input,
        f.state,
        f.emptyPrefixes
      );
      const decoded = decodeFees(f, info, details);
      assert.deepEqual(info.postState, f.state);
      assert.deepEqual(details.postState, f.state);
      assert(BigInt(summary.nativeFee) <= BigInt(decoded.partialFee));
      fees = { inputHex: '0x' + input.toString('hex'), info, details, decoded };
    }
    const record = {
      vector,
      metadataBinding: f.metadataBinding,
      payer: f.payer,
      address: f.address,
      payload: f.payload,
      payloadHex: f.payloadHex,
      extrinsicHex: '0x' + f.extrinsic.toString('hex'),
      encodedLength: f.extrinsic.length,
      minimum: f.minimum,
      declaredState: f.state,
      declarations: f.declarations,
      emptyPrefixes: f.emptyPrefixes,
      actual,
      summary,
      fees,
    };
    save(vector.id + '.json', record);
    summaries.push({ id: vector.id, signatureType: vector.type, encodedLength: f.extrinsic.length, ...summary });
  }
  for (const [p, expected] of Object.entries(sourceHashes))
    assert.equal(sha(readFileSync(join(base, p))), expected, 'changed-source:' + p);
  save('result.json', {
    protocol: 'runtime131-signature-route-result-v1',
    complete: true,
    networkDenial,
    summaries,
    dispatchCalls: summaries.length,
    feeCalls: summaries.filter((x) => x.applied).length * 2,
    remoteStateReads: 0,
    walletCalls: 0,
    networkSubmissions: 0,
    runtimeAdmissionGranted: false,
    economicQualificationGranted: false,
    files,
  });
  return summaries.map(({ id, applied, success }) => ({ id, applied, success }));
}
if (require.main === module)
  main(resolve(process.argv[2]))
    .then((x) => console.log(JSON.stringify(x)))
    .catch((e) => {
      console.error(e.stack);
      process.exitCode = 1;
    });
module.exports = { main, inspect };
