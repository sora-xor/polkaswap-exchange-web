// @vitest-environment node

import { mnemonicToEntropy } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@polkadot/util-crypto');

import { deriveSoraNexusAddressFromPhrase, generateSoraNexusAccount } from '@/features/misc/lib/nexusAccountGenerator';
import { normalizeSoraNexusAccountId } from '@/utils/soraNexusAccount';

const fixturePhrase =
  'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
const fixtureAddress = 'sorauﾛ1PaQｽGh1ｴ6pAﾜnqｸfJuｿMﾑVqﾏvQﾐﾚｼｾﾋaﾈｳﾊc1ｺﾊ1GGM2D';

describe('SORA Nexus account generator', () => {
  it('derives the Iroha Ed25519 and i105 fixture using this generator’s BIP39 entropy mapping', () => {
    expect(mnemonicToEntropy(fixturePhrase)).toEqual(new Uint8Array(32).fill(1));
    expect(deriveSoraNexusAddressFromPhrase(fixturePhrase)).toBe(fixtureAddress);
    expect(normalizeSoraNexusAccountId(fixtureAddress)).toBe(fixtureAddress);
  });

  it('generates a recoverable 24-word account accepted by the burn recipient validator', () => {
    const account = generateSoraNexusAccount();

    expect(account.phrase.split(' ')).toHaveLength(24);
    expect(deriveSoraNexusAddressFromPhrase(account.phrase)).toBe(account.address);
    expect(normalizeSoraNexusAccountId(account.address)).toBe(account.address);
  });

  it('refuses to generate an account when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    try {
      expect(() => generateSoraNexusAccount()).toThrow('Secure random generation is unavailable');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('accepts harmless spacing when verifying a manually backed-up phrase', () => {
    expect(deriveSoraNexusAddressFromPhrase(`  ${fixturePhrase.replace(/ /g, '   ')}  `)).toBe(fixtureAddress);
  });

  it('rejects invalid or incomplete recovery phrases', () => {
    expect(() => deriveSoraNexusAddressFromPhrase('')).toThrow('24-word');
    expect(() => deriveSoraNexusAddressFromPhrase(fixturePhrase.split(' ').slice(0, 23).join(' '))).toThrow('24-word');
    expect(() => deriveSoraNexusAddressFromPhrase(fixturePhrase.replace('comic', 'amount'))).toThrow('Invalid BIP39');
  });
});
