import { describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import { encodeAddress } from '@polkadot/util-crypto';
import { botAccountKey, sameBotAccount } from '@/features/bot-trading/account-identity';

describe('bot account identity', () => {
  it('uses the decoded 32-byte key across SS58 prefixes without rewriting the address', () => {
    const key = new Uint8Array(32).fill(17);
    const account69 = encodeAddress(key, 69);
    const account42 = encodeAddress(key, 42);
    const other = encodeAddress(new Uint8Array(32).fill(18), 69);
    expect(account69).not.toBe(account42);
    expect(botAccountKey(account69)).toBe(botAccountKey(account42));
    expect(botAccountKey(account42)).toBe(account69);
    expect(sameBotAccount(account69, account42)).toBe(true);
    expect(sameBotAccount(account69, other)).toBe(false);
    expect(account69).toBe(encodeAddress(key, 69));
  });

  it('keeps non-address legacy identities distinct', () => {
    expect(sameBotAccount('cn-account', 'cn-account')).toBe(true);
    expect(sameBotAccount('cn-account', 'other-account')).toBe(false);
    expect(botAccountKey('cn-account')).toBe('cn-account');
  });
});
