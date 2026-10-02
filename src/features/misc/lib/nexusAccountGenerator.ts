import { ed25519PairFromSeed, mnemonicGenerate, mnemonicToEntropy } from '@polkadot/util-crypto';

/** A SORA Nexus account generated in memory for the user to back up manually. */
export type GeneratedSoraNexusAccount = {
  phrase: string;
  address: string;
};

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

/** Computes the Bech32 polymod used by Nexus i105 checksums. */
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

/**
 * Derives the SORA mainnet i105 account from a 24-word English BIP39 phrase.
 * This generator defines an explicit mapping: the phrase's original 32 entropy
 * bytes become the Ed25519 seed. This is not the standard BIP39 PBKDF2 seed
 * path or a documented Iroha SDK mnemonic import path.
 */
export function deriveSoraNexusAddressFromPhrase(phrase: string): string {
  const normalized = phrase.trim().replace(/\s+/g, ' ');
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

  try {
    const pair = ed25519PairFromSeed(entropy, true);
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
  } finally {
    entropy.fill(0);
  }
}

/** Generates a new 24-word phrase and its matching SORA Nexus i105 address. */
export function generateSoraNexusAccount(): GeneratedSoraNexusAccount {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable');
  }
  const phrase = mnemonicGenerate(24);
  return { phrase, address: deriveSoraNexusAddressFromPhrase(phrase) };
}
