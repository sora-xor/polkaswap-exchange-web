import { keccak256, toUtf8Bytes } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@polkadot/util-crypto');

import { cryptoWaitReady } from '@polkadot/util-crypto';

import { getTsContextHash } from '@/features/misc/lib/getTsContextHash';

// Drafts persisted by earlier releases were hashed with ethers; the new helper must match bit for bit.
const ethersHash = (context: string): string => keccak256(toUtf8Bytes(context));

const CONTEXTS = [
  JSON.stringify([
    'xor',
    '0xabc',
    '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
    '0x' + '11'.repeat(32),
    '0x0200060000000000000000000000000000000000000000000000000000000000',
    '0x0200000000000000000000000000000000000000000000000000000000000000',
    '12.5',
  ]),
  JSON.stringify(['bridge', 'id', 'EthBridgeIncoming', 1, '0x02', '0xAbC', '0xdef', '1000000000000000000']),
  JSON.stringify(['unicode', 'Ünïcødé ✓', '日本語', '🚀 emoji pair', 'العربية']),
  // JSON.stringify escapes lone surrogates, so the hashed string is always well-formed.
  JSON.stringify(['lone', '\ud800', '\udc00']),
  JSON.stringify(['looks-like-hex']).replace('[', '0x1234['),
  '0x1234',
  JSON.stringify(['long', 'x'.repeat(5_000)]),
];

describe('getTsContextHash', () => {
  it.each(CONTEXTS)('matches ethers keccak256(toUtf8Bytes()) for %#', (context) => {
    expect(getTsContextHash(context)).toBe(ethersHash(context));
  });

  it('returns 0x-prefixed lowercase hex of 32 bytes', () => {
    expect(getTsContextHash('[]')).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('hashes 0x-prefixed text as UTF-8, never as hex bytes', () => {
    expect(getTsContextHash('0x1234')).toBe(ethersHash('0x1234'));
    expect(getTsContextHash('0x1234')).not.toBe(keccak256('0x1234'));
  });

  it('matches ethers once the WASM hasher is initialised too', async () => {
    await cryptoWaitReady();

    for (const context of CONTEXTS) {
      expect(getTsContextHash(context)).toBe(ethersHash(context));
    }
  });
});
