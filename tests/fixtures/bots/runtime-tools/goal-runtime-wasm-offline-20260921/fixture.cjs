/** Fully invented DEX0 XOR/KUSD balances, encoded from each exact WASM metadata export; no remote reads. */
'use strict';
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { xxhashAsU8a, blake2AsU8a } = require('@polkadot/util-crypto');
const { PROFILES, loadBinary } = require('./runtime-host.cjs');
const { metadataFromBinary } = require('./runtime-synthetic.cjs');
const META = [
  {
    metadata: '726c0dcdc748164be3ed3cc65c149e936e08380ef99c1b3991a0db6c1d7d127b',
  },
  {
    metadata: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
  },
];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const hex = (b) => '0x' + Buffer.from(b).toString('hex');
const asset = (index) => ({ code: hex(Buffer.from([2, 0, index, ...new Array(29).fill(0)])) });
/** Execute exact-WASM metadata and require the independently observed profile hash. */
function loadMetadata(profile, suppliedBinary) {
  const index = PROFILES.indexOf(profile);
  assert(index >= 0, 'profile');
  const binding = META[index];
  const binary =
    suppliedBinary ??
    loadBinary(
      profile,
      resolve(__dirname, '../../runtime-artifacts', `runtime-${profile.version}.compact.compressed.wasm`)
    );
  assert.equal(binary.profile, profile, 'binary-profile');
  const { registry, metadata, result } = metadataFromBinary(binary);
  assert.equal(sha(metadata.toU8a()), binding.metadata, 'metadata-profile');
  return {
    registry,
    metadata,
    binding: { version: profile.version, codeHash: profile.codeHash, metadataSha256: binding.metadata },
    metadataExecution: result,
  };
}
/** Derive exact metadata storage keys; no guessed hashes or key layouts. */
function storageCodec(registry, metadata, palletName, itemName, keys = []) {
  const p = metadata.asLatest.pallets.find((p) => p.name.toString() === palletName);
  assert(p?.storage.isSome, 'pallet');
  const s = p.storage.unwrap().items.find((s) => s.name.toString() === itemName);
  assert(s, 'item');
  const prefix = Buffer.concat([
    Buffer.from(xxhashAsU8a(p.storage.unwrap().prefix.toString(), 128)),
    Buffer.from(xxhashAsU8a(itemName, 128)),
  ]);
  let parts = [],
    value;
  if (s.type.isMap) {
    const m = s.type.asMap,
      hashers = m.hashers.map((h) => h.toString());
    const k = registry.createType('Lookup' + m.key.toString(), hashers.length === 1 ? keys[0] : keys);
    const encoded = hashers.length === 1 ? [Buffer.from(k.toU8a())] : [...k].map((v) => Buffer.from(v.toU8a()));
    assert.equal(keys.length, hashers.length, 'storage-keys');
    parts = hashers.map((h, i) => {
      const b = encoded[i];
      if (h === 'Identity') return b;
      if (h === 'Twox64Concat') return Buffer.concat([Buffer.from(xxhashAsU8a(b, 64)), b]);
      if (h === 'Blake2_128Concat') return Buffer.concat([Buffer.from(blake2AsU8a(b, 128)), b]);
      throw Error('unsupported-storage-hasher:' + h);
    });
    value = m.value;
  } else {
    assert.equal(keys.length, 0);
    value = s.type.asPlain;
  }
  return {
    key: hex(Buffer.concat([prefix, ...parts])),
    encode: (v) => hex(registry.createType('Lookup' + value.toString(), v).toU8a()),
    decode: (v) => registry.createType('Lookup' + value.toString(), Buffer.from(v.slice(2), 'hex')).toJSON(),
    type: 'Lookup' + value.toString(),
  };
}
/** Fixed artificial pool: 1,000 XOR and 10,000 KUSD; amounts are exact codec integers. */
function makeFixture(profile, binary) {
  const { registry, metadata, binding, metadataExecution } = loadMetadata(profile, binary),
    state = {},
    declarations = [];
  const put = (p, n, keys, value) => {
    const c = storageCodec(registry, metadata, p, n, keys);
    assert(!Object.hasOwn(state, c.key), 'duplicate-key');
    state[c.key] = value === null ? null : c.encode(value);
    declarations.push({ pallet: p, item: n, keys, key: c.key, value: state[c.key] });
    return c;
  };
  const xor = asset(0),
    kusd = asset(12),
    xst = asset(9);
  const tech = (purpose) =>
    registry
      .createType('CommonPrimitivesTechAccountId', {
        Pure: [0, { [purpose]: { baseAssetId: { Wrapped: 'XOR' }, targetAssetId: { Wrapped: 'KUSD' } } }],
      })
      .toU8a();
  const account = (bytes) =>
    hex(
      Buffer.concat([
        Buffer.from([84, 115, 79, 144, 249, 113, 160, 44, 96, 155, 45, 104, 78, 97, 181, 87]),
        Buffer.from(xxhashAsU8a(bytes, 128)),
      ])
    );
  const pool = account(tech('XykLiquidityKeeper')),
    fee = account(tech('FeeCollectorForPair'));
  put('DEXManager', 'DEXInfos', [0], { baseAssetId: xor, syntheticBaseAssetId: xst, isPublic: true });
  put('DEXAPI', 'EnabledSourceTypes', [], ['XYKPool']);
  put('TradingPair', 'LockedLiquiditySources', [], []);
  put('TradingPair', 'EnabledSources', [0, { baseAssetId: xor, targetAssetId: kusd }], ['XYKPool']);
  put('PoolXYK', 'Properties', [xor, kusd], [pool, fee]);
  put('System', 'Account', [pool], {
    nonce: 0,
    consumers: 0,
    providers: 1,
    sufficients: 0,
    data: { free: '1000000000000000000000', reserved: 0, frozen: 0, flags: '170141183460469231731687303715884105728' },
  });
  put('Tokens', 'Accounts', [pool, kusd], { free: '10000000000000000000000', reserved: 0, frozen: 0 });
  const emptyPrefixes = [storageCodec(registry, metadata, 'XSTPool', 'EnabledSynthetics', [xor]).key.slice(0, 66)];
  return {
    state,
    emptyPrefixes,
    declarations,
    registry,
    metadata,
    metadataBinding: binding,
    metadataExecution,
    pool,
    fee,
  };
}
module.exports = { META, loadMetadata, storageCodec, makeFixture };
/** Decode the source-defined API-v3 XYK response with exact byte consumption and no rewards shortcut. */
function decodeQuote(resultHex, reverse = false) {
  assert(/^0x(?:[0-9a-f]{2})+$/.test(resultHex), 'quote-hex');
  const b = Buffer.from(resultHex.slice(2), 'hex');
  let at = 0;
  const take = (n) => {
    assert(at + n <= b.length, 'quote-truncated');
    const r = b.subarray(at, at + n);
    at += n;
    return r;
  };
  const u128 = () => {
    const x = take(16);
    return (x.readBigUInt64LE(0) + (x.readBigUInt64LE(8) << 64n)).toString();
  };
  const compact = () => {
    const first = take(1)[0];
    assert.equal(first & 3, 0, 'small-collection');
    return first >> 2;
  };
  assert.equal(take(1)[0], 1, 'quote-not-some');
  const amount = u128(),
    amountWithoutImpact = u128(),
    fees = [];
  for (let n = compact(); n; n--) fees.push({ asset: hex(take(32)), amount: u128() });
  assert.equal(fees.length, 1, 'native-single-fee');
  assert.equal(fees[0].asset, asset(0).code, 'native-fee');
  assert.equal(compact(), 0, 'unsupported-rewards');
  assert.equal(compact(), 2, 'direct-route');
  const route = [hex(take(32)), hex(take(32))];
  assert.deepEqual(route, reverse ? [asset(0).code, asset(12).code] : [asset(12).code, asset(0).code]);
  assert.equal(at, b.length, 'quote-trailing');
  return { amount, amountWithoutImpact, fees, rewards: [], route };
}
module.exports.decodeQuote = decodeQuote;
/** Deterministic public test key and genuinely signed mortal64 native swap; no wallet or network authority. */
function makeSwapFixture(profile, binary, reverse = false, minOutput = '1', badSignature = false) {
  const { createPrivateKey, createPublicKey, sign, verify } = require('node:crypto');
  const f = makeFixture(profile, binary),
    { registry, metadata } = f;
  const seed = Buffer.alloc(32, 0x42);
  const privateKey = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKey = createPublicKey(privateKey),
    payer = hex(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32));
  const put = (p, n, keys, value) => {
    const c = storageCodec(registry, metadata, p, n, keys);
    assert(!Object.hasOwn(f.state, c.key), 'duplicate-key');
    f.state[c.key] = value === null ? null : c.encode(value);
    f.declarations.push({ pallet: p, item: n, keys, key: c.key, value: f.state[c.key] });
    return c;
  };
  const xor = asset(0),
    kusd = asset(12),
    genesis = '0x' + '11'.repeat(32),
    checkpoint = '0x' + '22'.repeat(32);
  const account = (free) => ({
    nonce: 0,
    consumers: 0,
    providers: 1,
    sufficients: 0,
    data: { free, reserved: 0, frozen: 0, flags: '170141183460469231731687303715884105728' },
  });
  put('System', 'Account', [payer], account('3000000000000000000'));
  put('System', 'Account', [f.fee], account('1000000000000000000'));
  put('Balances', 'TotalIssuance', [], '1004000000000000000000');
  put('Tokens', 'TotalIssuance', [kusd], '10010000000000000000000');
  put('Tokens', 'Accounts', [payer, kusd], { free: '10000000000000000000', reserved: 0, frozen: 0 });
  put('PoolXYK', 'Reserves', [xor, kusd], ['1000000000000000000000', '10000000000000000000000']);
  put('System', 'Number', [], 129);
  put('System', 'InherentsApplied', [], true);
  put('System', 'ExtrinsicData', [0], null);
  put('System', 'BlockHash', [0], genesis);
  put('System', 'BlockHash', [128], checkpoint);
  put('System', 'BlockWeight', [], {
    normal: { refTime: 0, proofSize: 0 },
    operational: { refTime: 0, proofSize: 0 },
    mandatory: { refTime: 0, proofSize: 0 },
  });
  put('System', 'BlockSize', [], 0);
  put('System', 'ExtrinsicWeightReclaimed', [], { refTime: 0, proofSize: 0 });
  put('System', 'ExecutionPhase', [], { ApplyExtrinsic: 0 });
  put('System', 'Events', [], []);
  put('System', 'EventCount', [], 0);
  const key = hex(Buffer.from(':extrinsic_index'));
  f.state[key] = '0x00000000';
  f.declarations.push({ pallet: 'SystemWellKnown', item: 'extrinsic_index', keys: [], key, value: f.state[key] });
  const txLevel = hex(Buffer.from(':transaction_level:'));
  f.state[txLevel] = null;
  f.declarations.push({ pallet: 'SystemWellKnown', item: 'transaction_level', keys: [], key: txLevel, value: null });
  put('XorFee', 'Multiplier', [], '1000000000000000000');
  for (const item of ['XorToVal', 'XorToBuyBack', 'UnassignedValStakingReward']) put('XorFee', item, [], '0');
  for (const [id, symbol] of [
    [xor, 'XOR'],
    [kusd, 'KUSD'],
  ])
    put('Assets', 'AssetInfosV2', [id], {
      symbol: hex(Buffer.from(symbol)),
      name: hex(Buffer.from('Synthetic ' + symbol)),
      precision: 18,
      isMintable: false,
      assetType: 'Regular',
      contentSource: null,
      description: null,
    });
  for (const id of [xor, kusd]) put('ExtendedAssets', 'SoulboundAsset', [id], null);
  for (const [who, purpose] of [
    [f.pool, 'XykLiquidityKeeper'],
    [f.fee, 'FeeCollectorForPair'],
  ])
    put('Technical', 'TechAccounts', [who], {
      Pure: [0, { [purpose]: { baseAssetId: { Wrapped: 'XOR' }, targetAssetId: { Wrapped: 'KUSD' } } }],
    });
  for (const item of ['PriceInfos', 'FastPriceInfos']) put('PriceTools', item, [kusd], {});
  put('Referrals', 'Referrers', [payer], null);
  const lp = metadata.asLatest.pallets.find((p) => p.name.toString() === 'LiquidityProxy');
  const swap = registry.lookup
    .getSiType(lp.calls.unwrap().type)
    .def.asVariant.variants.find((v) => v.name.toString() === 'swap');
  assert(swap, 'swap-call');
  const amount = registry.createType('u128', reverse ? '1000000000000000000' : '5000000000000000000').toU8a();
  const minimum = registry.createType('u128', minOutput).toU8a();
  const call = Buffer.concat([
    Buffer.from([lp.index.toNumber(), swap.index.toNumber()]),
    Buffer.alloc(4),
    Buffer.from((reverse ? xor : kusd).code.slice(2), 'hex'),
    Buffer.from((reverse ? kusd : xor).code.slice(2), 'hex'),
    Buffer.from([0]),
    Buffer.from(amount),
    Buffer.from(minimum),
    Buffer.from([4, 0, 2]),
  ]);
  const era = registry.createType('ExtrinsicEra', { current: 128, period: 64 }).toU8a();
  const payload = Buffer.concat([
    call,
    Buffer.from(era),
    Buffer.from([0, 0]),
    Buffer.from(registry.createType('u32', profile.version).toU8a()),
    Buffer.from(registry.createType('u32', profile.version).toU8a()),
    Buffer.from(genesis.slice(2), 'hex'),
    Buffer.from(checkpoint.slice(2), 'hex'),
  ]);
  assert(payload.length <= 256, 'payload-hash-required');
  const signature = sign(null, payload, privateKey);
  assert(verify(null, payload, publicKey, signature), 'test-signature');
  if (badSignature) signature[0] ^= 1;
  const body = Buffer.concat([
    Buffer.from([0x84]),
    Buffer.from(payer.slice(2), 'hex'),
    Buffer.from([0]),
    signature,
    Buffer.from(era),
    Buffer.from([0, 0]),
    call,
  ]);
  const extrinsic = Buffer.concat([Buffer.from(registry.createType('Compact<u32>', body.length).toU8a()), body]);
  const decoded = registry.createType('Extrinsic', extrinsic);
  assert(Buffer.from(decoded.toU8a()).equals(extrinsic), 'extrinsic-round-trip');
  return {
    ...f,
    payer,
    callHex: hex(call),
    payloadHex: hex(payload),
    extrinsic,
    signatureVerified: !badSignature,
    minimum: minOutput,
    reverse,
  };
}
module.exports.makeSwapFixture = makeSwapFixture;
/** Read exact local post-state and check economic conservation/failed-dispatch rollback independently of events. */
function inspectSwap(f, result, quote) {
  assert(result.success, result.error);
  const bytes = Buffer.from(result.resultHex.slice(2), 'hex');
  const outcome = f.registry.createType('ApplyExtrinsicResult', bytes);
  assert(Buffer.from(outcome.toU8a()).equals(bytes), 'apply-result-round-trip');
  const codec = (p, n, keys, after) => {
    const c = storageCodec(f.registry, f.metadata, p, n, keys),
      value = (after ? result.postState : f.state)[c.key];
    assert(value !== undefined && value !== null, 'required-summary-value');
    const b = Buffer.from(value.slice(2), 'hex'),
      v = f.registry.createType(c.type, b);
    assert(Buffer.from(v.toU8a()).equals(b), 'storage-round-trip');
    return v;
  };
  const totals = (after) => ({
    payerXor: codec('System', 'Account', [f.payer], after).data.free.toString(),
    payerKusd: codec('Tokens', 'Accounts', [f.payer, asset(12)], after).free.toString(),
    poolXor: codec('System', 'Account', [f.pool], after).data.free.toString(),
    poolKusd: codec('Tokens', 'Accounts', [f.pool, asset(12)], after).free.toString(),
    feeXor: codec('System', 'Account', [f.fee], after).data.free.toString(),
    xorIssuance: codec('Balances', 'TotalIssuance', [], after).toString(),
    kusdIssuance: codec('Tokens', 'TotalIssuance', [asset(12)], after).toString(),
    payerNonce: codec('System', 'Account', [f.payer], after).nonce.toString(),
  });
  const before = totals(false),
    after = totals(true),
    eventKey = storageCodec(f.registry, f.metadata, 'System', 'Events', []).key;
  const eventBytes = Buffer.from(result.postState[eventKey].slice(2), 'hex'),
    records = f.registry.createType('Vec<EventRecord>', eventBytes);
  assert(Buffer.from(records.toU8a()).equals(eventBytes), 'event-round-trip');
  records.forEach((r) => {
    assert(r.phase.isApplyExtrinsic && r.phase.asApplyExtrinsic.toNumber() === 0, 'event-phase');
  });
  const events = records.map((r) => ({
    section: r.event.section,
    method: r.event.method,
    data: r.event.data.toJSON(),
    encodedHex: r.toHex(),
  }));
  const fees = records.filter((r) => r.event.section === 'xorFee' && r.event.method === 'FeeWithdrawn');
  const exchanges = records.filter((r) => r.event.section === 'liquidityProxy' && r.event.method === 'Exchange');
  const applied = outcome.isOk,
    dispatchSuccess = applied && outcome.asOk.isOk;
  let nativeFee = '0';
  if (!applied) {
    assert.deepEqual(result.postState, f.state, 'rejected-state-change');
    assert.equal(records.length, 0);
  } else {
    assert.equal(fees.length, 1, 'native-fee-event');
    nativeFee = fees[0].event.data[1].toString();
    assert(BigInt(nativeFee) > 0n);
    assert.equal(after.payerNonce, '1', 'nonce-consumed');
    const fee = BigInt(nativeFee),
      out = BigInt(quote.amount),
      liquidityFee = BigInt(quote.fees[0].amount),
      get = (v, k) => BigInt(v[k]);
    assert.equal(get(after, 'xorIssuance'), get(before, 'xorIssuance') - fee, 'native-issuance');
    assert.equal(after.kusdIssuance, before.kusdIssuance, 'token-issuance');
    assert.equal(
      get(after, 'payerXor') + get(after, 'poolXor') + get(after, 'feeXor'),
      get(after, 'xorIssuance'),
      'native-conservation'
    );
    assert.equal(get(after, 'payerKusd') + get(after, 'poolKusd'), get(after, 'kusdIssuance'), 'token-conservation');
    if (dispatchSuccess) {
      assert.equal(exchanges.length, 1);
      const exchange = exchanges[0].event.data;
      assert.equal(exchange[4].toString(), f.reverse ? '1000000000000000000' : '5000000000000000000');
      assert.equal(exchange[5].toString(), quote.amount);
      assert.equal(get(after, 'payerXor'), get(before, 'payerXor') + (f.reverse ? -1000000000000000000n : out) - fee);
      assert.equal(get(after, 'payerKusd'), get(before, 'payerKusd') + (f.reverse ? out : -5000000000000000000n));
      assert.equal(
        get(after, 'poolXor'),
        get(before, 'poolXor') + (f.reverse ? 1000000000000000000n - liquidityFee : -out - liquidityFee)
      );
      assert.equal(get(after, 'poolKusd'), get(before, 'poolKusd') + (f.reverse ? -out : 5000000000000000000n));
      assert.equal(get(after, 'feeXor'), get(before, 'feeXor') + liquidityFee);
      assert(events.some((e) => e.section === 'system' && e.method === 'ExtrinsicSuccess'));
    } else {
      assert.equal(exchanges.length, 0);
      assert.equal(get(after, 'payerXor'), get(before, 'payerXor') - fee);
      for (const key of ['payerKusd', 'poolXor', 'poolKusd', 'feeXor'])
        assert.equal(after[key], before[key], 'failed-dispatch-balance');
      const reserves = storageCodec(f.registry, f.metadata, 'PoolXYK', 'Reserves', [asset(0), asset(12)]).key;
      assert.equal(result.postState[reserves], f.state[reserves], 'failed-reserve-rollback');
      assert(events.some((e) => e.section === 'system' && e.method === 'ExtrinsicFailed'));
      assert(result.hostCallCounts.ext_storage_rollback_transaction_version_1 > 0, 'rollback-not-executed');
    }
  }
  return {
    applied,
    dispatchSuccess,
    nativeFee,
    before,
    after,
    eventCount: events.length,
    events,
    outcome: outcome.toJSON(),
    rollbackCount: result.hostCallCounts.ext_storage_rollback_transaction_version_1 ?? 0,
  };
}
module.exports.inspectSwap = inspectSwap;
/** Decode both runtime fee methods with exact consumption and require native inclusion-fee agreement. */
function decodeFees(f, info, details) {
  assert(info.success, info.error);
  assert(details.success, details.error);
  const weight = storageCodec(f.registry, f.metadata, 'System', 'ExtrinsicWeightReclaimed', []).type;
  f.registry.register({
    FixtureRuntimeDispatchInfo: { weight, class: 'DispatchClass', partialFee: 'u128' },
    FixtureInclusionFee: { baseFee: 'u128', lenFee: 'u128', adjustedWeightFee: 'u128' },
    FixtureFeeDetails: { inclusionFee: 'Option<FixtureInclusionFee>', tip: 'u128' },
  });
  const decode = (type, hexValue) => {
    const bytes = Buffer.from(hexValue.slice(2), 'hex'),
      value = f.registry.createType(type, bytes);
    assert(Buffer.from(value.toU8a()).equals(bytes), 'fee-round-trip');
    return value;
  };
  const a = decode('FixtureRuntimeDispatchInfo', info.resultHex),
    b = decode('FixtureFeeDetails', details.resultHex);
  assert(b.inclusionFee.isSome, 'missing-inclusion-fee');
  assert.equal(b.tip.toString(), '0');
  const fee = b.inclusionFee.unwrap(),
    baseFee = fee.baseFee.toString(),
    lenFee = fee.lenFee.toString(),
    adjustedWeightFee = fee.adjustedWeightFee.toString();
  const total = BigInt(baseFee) + BigInt(lenFee) + BigInt(adjustedWeightFee);
  assert(total < 1n << 128n, 'fee-overflow');
  assert.equal(a.partialFee.toString(), total.toString(), 'fee-disagreement');
  return {
    partialFee: total.toString(),
    baseFee,
    lenFee,
    adjustedWeightFee,
    tip: '0',
    weight: { refTime: a.weight.refTime.toString(), proofSize: a.weight.proofSize.toString() },
  };
}
module.exports.decodeFees = decodeFees;
