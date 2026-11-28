// @vitest-environment node

import { mnemonicToEntropy } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@polkadot/util-crypto');

import {
  deriveLegacySoraNexusAddressFromPhrase,
  deriveSoraNexusAddressFromPhrase,
  generateSoraNexusAccount,
  recoverSoraNexusAccount,
  SORA_NEXUS_WALLET_RECOVERY_FORMATS,
  type SoraNexusTargetWallet,
} from '@/features/misc/lib/nexusAccountGenerator';
import { normalizeSoraNexusAccountId } from '@/utils/soraNexusAccount';

const fixturePhrase =
  'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
const legacyAddress = 'sorauﾛ1PaQｽGh1ｴ6pAﾜnqｸfJuｿMﾑVqﾏvQﾐﾚｼｾﾋaﾈｳﾊc1ｺﾊ1GGM2D';
// Independently calculated with Node crypto PBKDF2, HMAC and Ed25519 PKCS8 keys.
const canonicalAddress = 'sorauﾛ1Pﾍmobrﾗﾚuヱ5wvp43L2rﾆzXJK3Z4gFCｶﾋuｶｵ2ヰヰ3XAAHM1';

// Fearless Android Universal Wallet V2's published default24 vector:
// https://github.com/soramitsu/fearless-Android/blob/master/common/src/test/resources/universal-wallet-v2-vectors.json
const walletPhrase =
  'abandon amount liar amount expire adjust cage candy arch gather drum bullet absurd math era live bid rhythm alien crouch range attend journey unaware';
const walletAddress = 'sorauﾛ1Pn4Z3ﾁeｸZzXmﾆWdhﾌyｾﾓTﾐTﾆaUﾚSﾙ1ｶﾛｹCｷe8ｳﾋ154C93';

describe('SORA Nexus account generator', () => {
  it('matches the published Fearless SORA Nexus BIP39 / SLIP-0010 address exactly', () => {
    expect(deriveSoraNexusAddressFromPhrase(walletPhrase)).toBe(walletAddress);
    expect(normalizeSoraNexusAccountId(walletAddress)).toBe(walletAddress);
  });

  it('matches an independently derived Minamoto account and does not use the old entropy seed', () => {
    expect(deriveSoraNexusAddressFromPhrase(fixturePhrase)).toBe(canonicalAddress);
    expect(canonicalAddress).not.toBe(legacyAddress);
  });

  it('preserves already issued recipients using the original Iroha Ed25519 fixture', () => {
    expect(mnemonicToEntropy(fixturePhrase)).toEqual(new Uint8Array(32).fill(1));
    expect(deriveLegacySoraNexusAddressFromPhrase(fixturePhrase)).toBe(legacyAddress);
    expect(normalizeSoraNexusAccountId(legacyAddress)).toBe(legacyAddress);
  });

  it('generates a recoverable 24-word account accepted by the burn recipient validator', () => {
    const account = generateSoraNexusAccount('sora-wallet');

    expect(account.phrase.split(' ')).toHaveLength(24);
    expect(account.targetWallet).toBe('sora-wallet');
    expect(account.recoveryFormat).toBe('bip39-slip10');
    expect(deriveSoraNexusAddressFromPhrase(account.phrase)).toBe(account.address);
    expect(deriveLegacySoraNexusAddressFromPhrase(account.phrase)).not.toBe(account.address);
    expect(normalizeSoraNexusAccountId(account.address)).toBe(account.address);
    expect(recoverSoraNexusAccount(account.phrase, account.address)).toEqual({
      address: account.address,
      recoveryFormat: 'bip39-slip10',
    });
  });

  it.each(['sora-wallet', 'fearless-wallet'] as const)(
    'generates and identifies the explicitly selected %s wallet profile',
    (targetWallet) => {
      const account = generateSoraNexusAccount(targetWallet);
      const expectedAddress = deriveSoraNexusAddressFromPhrase(account.phrase);

      expect(account.phrase.split(' ')).toHaveLength(24);
      expect(account.address).toBe(expectedAddress);
      expect(account.targetWallet).toBe(targetWallet);
      expect(account.recoveryFormat).toBe('bip39-slip10');
      expect(recoverSoraNexusAccount(account.phrase, account.address)).toEqual({
        address: account.address,
        recoveryFormat: 'bip39-slip10',
      });
    }
  );

  it('keeps the verified wallet profiles immutable', () => {
    expect(SORA_NEXUS_WALLET_RECOVERY_FORMATS).toEqual({
      'sora-wallet': 'bip39-slip10',
      'fearless-wallet': 'bip39-slip10',
    });
    expect(Object.isFrozen(SORA_NEXUS_WALLET_RECOVERY_FORMATS)).toBe(true);
  });

  it.each(['', 'unknown', 'polkaswap-entropy-v1', '__proto__', undefined, null, 1])(
    'rejects unsupported wallet %s before accessing randomness',
    (targetWallet) => {
      vi.stubGlobal('crypto', undefined);
      try {
        expect(() => generateSoraNexusAccount(targetWallet as SoraNexusTargetWallet)).toThrow(
          'Unsupported SORA Nexus target wallet'
        );
      } finally {
        vi.unstubAllGlobals();
      }
    }
  );

  it('refuses to generate an account when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    try {
      expect(() => generateSoraNexusAccount('sora-wallet')).toThrow('Secure random generation is unavailable');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('accepts harmless spacing when verifying a manually backed-up phrase', () => {
    const spaced = `  ${fixturePhrase.replace(/ /g, ' \n\t ')}  `;
    expect(deriveSoraNexusAddressFromPhrase(spaced)).toBe(canonicalAddress);
    expect(deriveLegacySoraNexusAddressFromPhrase(spaced)).toBe(legacyAddress);
  });

  it.each([deriveSoraNexusAddressFromPhrase, deriveLegacySoraNexusAddressFromPhrase])(
    'rejects invalid words, checksum and incomplete phrases for %s',
    (derive) => {
      expect(() => derive('')).toThrow('24-word');
      expect(() => derive(fixturePhrase.split(' ').slice(0, 23).join(' '))).toThrow('24-word');
      expect(() => derive(`${fixturePhrase} comic`)).toThrow('24-word');
      expect(() => derive(fixturePhrase.replace('comic', 'amount'))).toThrow('Invalid BIP39');
      expect(() => derive(fixturePhrase.replace('comic', 'invalid-word'))).toThrow('Invalid BIP39');
      expect(() => derive('abandon '.repeat(11) + 'about')).toThrow('24-word');
    }
  );

  it('recovers the exact legacy recipient without replacing it with the canonical account', () => {
    expect(recoverSoraNexusAccount(fixturePhrase, ` ${legacyAddress}\n`)).toEqual({
      address: legacyAddress,
      recoveryFormat: 'polkaswap-entropy-v1',
    });
    expect(recoverSoraNexusAccount(fixturePhrase, canonicalAddress)).toEqual({
      address: canonicalAddress,
      recoveryFormat: 'bip39-slip10',
    });
  });

  it('refuses a valid phrase belonging to a different saved recipient', () => {
    expect(() => recoverSoraNexusAccount(fixturePhrase, walletAddress)).toThrow(
      'Recovery phrase does not match the saved SORA Nexus address'
    );
  });

  it.each(['', 'invalid', walletAddress.replace(/^sora/, 'test'), walletAddress.slice(0, -1) + '1'])(
    'refuses an absent, invalid or wrong-network expected address (%s)',
    (expectedAddress) => {
      expect(() => recoverSoraNexusAccount(fixturePhrase, expectedAddress)).toThrow('Invalid saved SORA Nexus address');
    }
  );

  it('does not return account data for a malformed recovery phrase', () => {
    expect(() => recoverSoraNexusAccount(fixturePhrase.replace('comic', 'amount'), legacyAddress)).toThrow(
      'Invalid BIP39 recovery phrase'
    );
  });

  it('returns public recovery metadata only', () => {
    const recovered = recoverSoraNexusAccount(fixturePhrase, legacyAddress);
    expect(Object.keys(recovered).sort()).toEqual(['address', 'recoveryFormat']);
    expect(JSON.stringify(recovered)).not.toContain(fixturePhrase);
  });
});
