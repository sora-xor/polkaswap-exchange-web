/** Additive public-key fixtures from exact runtime metadata; all state and keys are invented. */
'use strict';
const assert = require('node:assert/strict');
const { Keyring } = require('@polkadot/keyring');
const { decodeAddress } = require('@polkadot/util-crypto');
const { makeSwapFixture, storageCodec } = require('../goal-runtime-wasm-offline-20260921/fixture.cjs');
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const CHECKPOINT = '0x' + '22'.repeat(32);
const CASES = Object.freeze([
  { id: 'sr63-phase63-buy', type: 'sr25519', nonce: 63, reverse: false },
  { id: 'sr64-phase63-sell', type: 'sr25519', nonce: 64, reverse: true },
  { id: 'sr16384-four-byte', type: 'sr25519', nonce: 16384, reverse: false },
  { id: 'sr1073741824-five-byte', type: 'sr25519', nonce: 1073741824, reverse: true },
  { id: 'ecdsa-largest-width', type: 'ecdsa', nonce: 4294967294, reverse: false },
  { id: 'sr-included-failure', type: 'sr25519', nonce: 64, reverse: false, mode: 'minimum-failure' },
  { id: 'sr-bad-signature', type: 'sr25519', nonce: 64, reverse: false, mode: 'bad-signature' },
  { id: 'ecdsa-bad-signature', type: 'ecdsa', nonce: 64, reverse: true, mode: 'bad-signature' },
  { id: 'sr-stale-nonce', type: 'sr25519', nonce: 64, reverse: true, mode: 'stale-nonce' },
  { id: 'sr-wrong-runtime', type: 'sr25519', nonce: 64, reverse: false, mode: 'wrong-runtime' },
  { id: 'sr-wrong-checkpoint', type: 'sr25519', nonce: 64, reverse: true, mode: 'wrong-checkpoint' },
  { id: 'sr-expired-era', type: 'sr25519', nonce: 64, reverse: false, mode: 'expired-era' },
]);
/** Remap only the payer, native genesis, nonce and mortal checkpoint in the previous declared route. */
function signedFixture(profile, binary, vector, genesis) {
  assert(CASES.includes(vector), 'undeclared-vector');
  assert(/^0x[0-9a-f]{64}$/.test(genesis), 'genesis');
  const minimum = vector.mode === 'minimum-failure' ? ((1n << 128n) - 1n).toString() : '1';
  const f = makeSwapFixture(profile, binary, vector.reverse, minimum);
  const { registry, metadata } = f;
  const pair = new Keyring({ type: vector.type, ss58Format: 69 }).addFromSeed(new Uint8Array(32).fill(0x42));
  const payer = '0x' + Buffer.from(decodeAddress(pair.address)).toString('hex');
  const originalPayer = f.payer;
  f.declarations = f.declarations.map((d) => {
    if (!d.keys.includes(originalPayer)) return d;
    const keys = d.keys.map((key) => (key === originalPayer ? payer : key));
    const key = storageCodec(registry, metadata, d.pallet, d.item, keys).key;
    const value = f.state[d.key];
    delete f.state[d.key];
    f.state[key] = value;
    return { ...d, keys, key, value };
  });
  const set = (pallet, item, keys, value) => {
    const c = storageCodec(registry, metadata, pallet, item, keys);
    const encoded = value === null ? null : c.encode(value);
    f.state[c.key] = encoded;
    const d = { pallet, item, keys, key: c.key, value: encoded };
    const index = f.declarations.findIndex((old) => old.key === c.key);
    if (index < 0) f.declarations.push(d);
    else f.declarations[index] = d;
  };
  const c = storageCodec(registry, metadata, 'System', 'Account', [payer]);
  const account = c.decode(f.state[c.key]);
  account.nonce = vector.nonce + (vector.mode === 'stale-nonce' ? 1 : 0);
  set('System', 'Account', [payer], account);
  set('System', 'BlockHash', [0], genesis);
  set('System', 'BlockHash', [191], vector.mode === 'wrong-checkpoint' ? '0x' + '33'.repeat(32) : CHECKPOINT);
  set('System', 'Number', [], vector.mode === 'expired-era' ? 255 : 192);
  if (vector.mode === 'expired-era') set('System', 'BlockHash', [255], '0x' + '44'.repeat(32));
  const payload = {
    address: pair.address,
    blockHash: CHECKPOINT,
    blockNumber: '0x000000bf',
    era: registry.createType('ExtrinsicEra', { current: 191, period: 64 }).toHex(),
    genesisHash: genesis,
    method: f.callHex,
    nonce: '0x' + vector.nonce.toString(16).padStart(8, '0'),
    specVersion: vector.mode === 'wrong-runtime' ? '0x00000082' : '0x00000083',
    transactionVersion: vector.mode === 'wrong-runtime' ? '0x00000082' : '0x00000083',
    tip: '0x00',
    signedExtensions: [...registry.signedExtensions],
    version: 4,
  };
  const encoded = registry.createType('ExtrinsicPayload', payload, { version: 4 });
  let signature = encoded.sign(pair).signature;
  if (vector.mode === 'bad-signature') {
    const bytes = Buffer.from(signature.slice(2), 'hex');
    bytes[1] ^= 1;
    signature = '0x' + bytes.toString('hex');
  }
  const signed = registry.createType('Extrinsic', registry.createType('Call', f.callHex), { version: 4 });
  signed.addSignature(pair.address, signature, encoded.toHex());
  const extrinsic = Buffer.from(signed.toU8a());
  assert(extrinsic.length <= 215, 'maximum-supported-envelope');
  assert.equal(signed.era.asMortalEra.birth(192), 191, 'phase-wrap');
  return {
    ...f,
    payer,
    address: pair.address,
    payload,
    payloadHex: '0x' + Buffer.from(encoded.toU8a({ method: true })).toString('hex'),
    extrinsic,
    vector,
  };
}
module.exports = { CASES, GENESIS, signedFixture };
