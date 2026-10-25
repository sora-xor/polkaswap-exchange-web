import { encodeAddress } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

import { areBridgeExternalAccountsEqual } from '@/utils/bridge/common/account';

vi.mock('@polkadot/util-crypto', async (importOriginal) => {
  return await importOriginal<typeof import('@polkadot/util-crypto')>();
});

describe('bridge external account identity', () => {
  it('matches EVM accounts case-insensitively', () => {
    expect(areBridgeExternalAccountsEqual(`0x${'a'.repeat(40)}`, `0x${'A'.repeat(40)}`)).toBe(true);
  });

  it('matches AccountId32 addresses by public key across SS58 prefixes', () => {
    const publicKey = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const genericAddress = encodeAddress(publicKey, 42);
    const networkAddress = encodeAddress(publicKey, 0);

    expect(areBridgeExternalAccountsEqual(genericAddress, networkAddress)).toBe(true);
  });

  it('rejects different, missing, and malformed accounts', () => {
    const firstPublicKey = new Uint8Array(32).fill(1);
    const secondPublicKey = new Uint8Array(32).fill(2);

    expect(areBridgeExternalAccountsEqual(encodeAddress(firstPublicKey, 42), encodeAddress(secondPublicKey, 42))).toBe(
      false
    );
    expect(areBridgeExternalAccountsEqual('', encodeAddress(firstPublicKey, 42))).toBe(false);
    expect(areBridgeExternalAccountsEqual('not-an-address', 'not-an-address')).toBe(false);
  });
});
