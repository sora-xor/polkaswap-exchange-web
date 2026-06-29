import { describe, expect, it } from 'vitest';

import {
  WALLET_EXTENSION_FIXTURES,
  extensionIdFromPublicKey,
  manifestKeyForExtensionId,
  parseCrxPayload,
} from '@/../scripts/playwright/ensure-wallet-extensions.mjs';

function encodeVarint(value: number): Buffer {
  const bytes: number[] = [];
  let next = value;

  while (next >= 0x80) {
    bytes.push((next & 0x7f) | 0x80);
    next >>= 7;
  }

  bytes.push(next);
  return Buffer.from(bytes);
}

function field(fieldNumber: number, value: Buffer): Buffer {
  return Buffer.concat([encodeVarint((fieldNumber << 3) | 2), encodeVarint(value.length), value]);
}

function crx3WithPublicKeys(publicKeys: Buffer[], zipPayload: Buffer): Buffer {
  const proofs = publicKeys.map((publicKey) => field(2, field(1, publicKey)));
  const header = Buffer.concat(proofs);
  const prefix = Buffer.alloc(12);
  prefix.write('Cr24', 0, 'ascii');
  prefix.writeUInt32LE(3, 4);
  prefix.writeUInt32LE(header.length, 8);
  return Buffer.concat([prefix, header, zipPayload]);
}

describe('wallet extension fixture restore helpers', () => {
  it('keeps wallet Chrome Web Store fixture ids explicit', () => {
    expect(WALLET_EXTENSION_FIXTURES.map((fixture) => fixture.key)).toEqual([
      'polkadot-js',
      'fearless-wallet',
      'subwallet-js',
      'talisman',
    ]);
    expect(WALLET_EXTENSION_FIXTURES.every((fixture) => /^[a-p]{32}$/.test(fixture.id))).toBe(true);
  });

  it('derives Chrome extension ids from public keys', () => {
    const publicKey = Buffer.from('stable-test-public-key');
    expect(extensionIdFromPublicKey(publicKey)).toMatch(/^[a-p]{32}$/);
    expect(extensionIdFromPublicKey(publicKey)).toBe(extensionIdFromPublicKey(publicKey));
  });

  it('parses CRX3 public keys and embedded zip payloads', () => {
    const publicKey = Buffer.from('public-key-for-crx3');
    const zipPayload = Buffer.from('PK\x03\x04zip');
    const parsed = parseCrxPayload(crx3WithPublicKeys([Buffer.from('other-key'), publicKey], zipPayload));

    expect(parsed.publicKeys.map((key) => key.toString())).toEqual(['other-key', 'public-key-for-crx3']);
    expect(parsed.zipBuffer).toEqual(zipPayload);
  });

  it('selects the manifest key that preserves the Web Store extension id', () => {
    const wrongKey = Buffer.from('wrong-public-key');
    const expectedKey = Buffer.from('expected-public-key');
    const extensionId = extensionIdFromPublicKey(expectedKey);

    expect(manifestKeyForExtensionId([wrongKey, expectedKey], extensionId)).toBe(expectedKey.toString('base64'));
    expect(() => manifestKeyForExtensionId([wrongKey], extensionId)).toThrow(extensionId);
  });
});
