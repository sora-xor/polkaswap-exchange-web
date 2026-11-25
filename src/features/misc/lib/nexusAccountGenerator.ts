import {
  ed25519PairFromSeed,
  hmacSha512AsU8a,
  mnemonicGenerate,
  mnemonicToEntropy,
  pbkdf2Encode,
} from '@polkadot/util-crypto';

import { normalizeSoraNexusAccountId } from '@/utils/soraNexusAccount';

/**
 * SORA Nexus recipient derivations this module can reproduce. Polkaswap only derives and compares the
 * public address: it cannot restore, open or sign for an account in either format.
 * - `bip39-slip10`: used for every new recipient.
 * - `polkaswap-entropy-v1`: recipients made by the earlier generator (BIP39 entropy as the Ed25519 seed).
 *   An ordinary 24-word wallet import yields a different account, so these stay inaccessible until a
 *   wallet app implements this import. Kept only so an existing backup can be checked.
 */
export type SoraNexusRecoveryFormat = 'bip39-slip10' | 'polkaswap-entropy-v1';

/**
 * Wallets whose published source derives SORA Nexus Minamoto accounts with the profile below. This is
 * source-level parity only: no released wallet version has been tested, so the UI must not promise that
 * the selected wallet can restore the account. See docs/sora-nexus-burn-generator.md.
 */
export type SoraNexusTargetWallet = 'sora-wallet' | 'fearless-wallet';

/** Both target wallets' source derives Minamoto with BIP39 and m/44'/617'/0'/0' SLIP-0010. */
export const SORA_NEXUS_WALLET_RECOVERY_FORMATS = Object.freeze({
  'sora-wallet': 'bip39-slip10',
  'fearless-wallet': 'bip39-slip10',
} as const satisfies Readonly<Record<SoraNexusTargetWallet, SoraNexusRecoveryFormat>>);

/** A SORA Nexus account generated in memory for the user to back up manually. */
export type GeneratedSoraNexusAccount = {
  phrase: string;
  address: string;
  targetWallet: SoraNexusTargetWallet;
  recoveryFormat: SoraNexusRecoveryFormat;
};

/** Identifies the derivation that reproduces a user's already recorded recipient. */
export type RecoveredSoraNexusAccount = {
  address: string;
  recoveryFormat: SoraNexusRecoveryFormat;
};

/** The SORA Wallet Minamoto profile, with every SLIP-0010 segment hardened. */
const SORA_NEXUS_DERIVATION_SEGMENTS = [44, 617, 0, 0] as const;

const I105_ALPHABET = [
  ...'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  ...'ｲﾛﾊﾆﾎﾍﾄﾁﾘﾇﾙｦﾜｶﾖﾀﾚｿﾂﾈﾅﾗﾑｳヰﾉｵｸﾔﾏｹﾌｺｴﾃｱｻｷﾕﾒﾐｼヱﾋﾓｾｽ',
] as const;
const I105_BASE = 105n;
const I105_SENTINEL_SORA = 'sora';
const I105_CHECKSUM_LEN = 6;
const BECH32M_CONST = 0x2bc8_30a3;

/** Encodes the canonical account bytes as Iroha's big-endian base-105 digits. */
function encodeBase105(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);

  let encoded = '';
  do {
    const digit = Number(value % I105_BASE);
    encoded = I105_ALPHABET[digit]! + encoded;
    value /= I105_BASE;
  } while (value > 0n);

  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = I105_ALPHABET[0]! + encoded;
  }

  return encoded;
}

/** Expands bytes into five-bit values for the Bech32m checksum. */
function toBase32Digits(bytes: Uint8Array): number[] {
  let accumulator = 0;
  let bits = 0;
  const digits: number[] = [];
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      digits.push((accumulator >> bits) & 0x1f);
    }
  }
  if (bits > 0) digits.push((accumulator << (5 - bits)) & 0x1f);
  return digits;
}

/** Computes the Bech32 polymod used by SORA Nexus i105 checksums. */
function bech32Polymod(values: Iterable<number>): number {
  const generators = [0x3b6a_57b2, 0x2650_8e6d, 0x1ea1_19fa, 0x3d42_33dd, 0x2a14_62b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = (((checksum & 0x1ff_ffff) << 5) ^ value) >>> 0;
    for (let index = 0; index < generators.length; index += 1) {
      if (((top >>> index) & 1) === 1) checksum = (checksum ^ generators[index]!) >>> 0;
    }
  }
  return checksum >>> 0;
}

/** Returns the six i105 characters representing Iroha's snx Bech32m checksum. */
function checksumFor(canonical: Uint8Array): string {
  const hrp = 'snx';
  const values = [...hrp].map((char) => char.charCodeAt(0) >> 5);
  values.push(0, ...[...hrp].map((char) => char.charCodeAt(0) & 0x1f));
  values.push(...toBase32Digits(canonical), ...new Array<number>(I105_CHECKSUM_LEN).fill(0));
  const polymod = (bech32Polymod(values) ^ BECH32M_CONST) >>> 0;
  let checksum = '';
  for (let index = 0; index < I105_CHECKSUM_LEN; index += 1) {
    const shift = 5 * (I105_CHECKSUM_LEN - 1 - index);
    checksum += I105_ALPHABET[(polymod >>> shift) & 0x1f]!;
  }
  return checksum;
}

/** Validates the generator's 24 English words; callers must erase the returned entropy. */
function readRecoveryPhrase(phrase: string): { normalized: string; entropy: Uint8Array } {
  const normalized = phrase.normalize('NFKD').trim().replace(/\s+/g, ' ');
  if (normalized.split(' ').length !== 24) throw new Error('Expected a 24-word BIP39 recovery phrase');

  let entropy: Uint8Array;
  try {
    entropy = mnemonicToEntropy(normalized);
  } catch {
    throw new Error('Invalid BIP39 recovery phrase');
  }
  if (entropy.length !== 32) {
    entropy.fill(0);
    throw new Error('Expected 256-bit BIP39 entropy');
  }

  return { normalized, entropy };
}

/** Encodes the public account without returning or retaining the private seed. */
function addressFromEd25519Seed(seed: Uint8Array): string {
  const pair = ed25519PairFromSeed(seed, true);
  try {
    if (pair.publicKey.length !== 32) throw new Error('Invalid Ed25519 public key');
    // Header 0x02, single-key controller 0x00, Ed25519 curve 0x01, key length 0x20.
    const canonical = new Uint8Array(36);
    canonical.set([0x02, 0x00, 0x01, 0x20]);
    canonical.set(pair.publicKey, 4);
    return `${I105_SENTINEL_SORA}${encodeBase105(canonical)}${checksumFor(canonical)}`;
  } finally {
    pair.secretKey.fill(0);
  }
}

/**
 * Derives the SORA Nexus Minamoto account using SORA Wallet's BIP39 / SLIP-0010
 * profile: PBKDF2-HMAC-SHA512 (2048 rounds, empty passphrase), then Ed25519 at
 * m/44'/617'/0'/0'. Substrate's mnemonicToMiniSecret and HDKD are not this format.
 */
export function deriveSoraNexusAddressFromPhrase(phrase: string): string {
  const { normalized, entropy } = readRecoveryPhrase(phrase);
  entropy.fill(0);
  const password = new TextEncoder().encode(normalized);
  const salt = new TextEncoder().encode('mnemonic');
  let seed: Uint8Array | undefined;
  let node: Uint8Array | undefined;
  try {
    seed = pbkdf2Encode(password, salt, 2048, true).password;
    node = hmacSha512AsU8a('ed25519 seed', seed, true);
    for (const segment of SORA_NEXUS_DERIVATION_SEGMENTS) {
      const data = new Uint8Array(37);
      try {
        data.set(node.subarray(0, 32), 1);
        new DataView(data.buffer).setUint32(33, segment + 0x8000_0000, false);
        const child = hmacSha512AsU8a(node.subarray(32), data, true);
        node.fill(0);
        node = child;
      } finally {
        data.fill(0);
      }
    }
    return addressFromEd25519Seed(node.subarray(0, 32));
  } finally {
    password.fill(0);
    seed?.fill(0);
    node?.fill(0);
  }
}

/**
 * Reproduces recipients created by Polkaswap's original burn generator. Their
 * original BIP39 entropy is the Ed25519 seed; never reinterpret them as SLIP-0010.
 */
export function deriveLegacySoraNexusAddressFromPhrase(phrase: string): string {
  const { entropy } = readRecoveryPhrase(phrase);
  try {
    return addressFromEd25519Seed(entropy);
  } finally {
    entropy.fill(0);
  }
}

/**
 * Matches either supported recovery format to the exact saved mainnet recipient.
 * The address is mandatory: the same words identify different accounts in each
 * format, so recovering one must never silently substitute the other.
 */
export function recoverSoraNexusAccount(phrase: string, expectedAddress: string): RecoveredSoraNexusAccount {
  const address = normalizeSoraNexusAccountId(expectedAddress);
  if (!address) throw new Error('Invalid saved SORA Nexus address');

  if (deriveSoraNexusAddressFromPhrase(phrase) === address) {
    return { address, recoveryFormat: 'bip39-slip10' };
  }
  if (deriveLegacySoraNexusAddressFromPhrase(phrase) === address) {
    return { address, recoveryFormat: 'polkaswap-entropy-v1' };
  }
  throw new Error('Recovery phrase does not match the saved SORA Nexus address');
}

/** Generates a 24-word Minamoto account using the selected wallet's verified recovery profile. */
export function generateSoraNexusAccount(targetWallet: SoraNexusTargetWallet): GeneratedSoraNexusAccount {
  if (targetWallet !== 'sora-wallet' && targetWallet !== 'fearless-wallet') {
    throw new Error('Unsupported SORA Nexus target wallet');
  }
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable');
  }
  const recoveryFormat = SORA_NEXUS_WALLET_RECOVERY_FORMATS[targetWallet];
  const phrase = mnemonicGenerate(24);
  const address = deriveSoraNexusAddressFromPhrase(phrase);
  return { phrase, address, targetWallet, recoveryFormat };
}
