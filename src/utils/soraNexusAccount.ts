const BASE58_ALPHABET = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
] as const;

const IROHA_POEM_KANA_HALFWIDTH = [
  'ｲ',
  'ﾛ',
  'ﾊ',
  'ﾆ',
  'ﾎ',
  'ﾍ',
  'ﾄ',
  'ﾁ',
  'ﾘ',
  'ﾇ',
  'ﾙ',
  'ｦ',
  'ﾜ',
  'ｶ',
  'ﾖ',
  'ﾀ',
  'ﾚ',
  'ｿ',
  'ﾂ',
  'ﾈ',
  'ﾅ',
  'ﾗ',
  'ﾑ',
  'ｳ',
  'ヰ',
  'ﾉ',
  'ｵ',
  'ｸ',
  'ﾔ',
  'ﾏ',
  'ｹ',
  'ﾌ',
  'ｺ',
  'ｴ',
  'ﾃ',
  'ｱ',
  'ｻ',
  'ｷ',
  'ﾕ',
  'ﾒ',
  'ﾐ',
  'ｼ',
  'ヱ',
  'ﾋ',
  'ﾓ',
  'ｾ',
  'ｽ',
] as const;

const I105_ALPHABET = [...BASE58_ALPHABET, ...IROHA_POEM_KANA_HALFWIDTH] as const;
const I105_VALUE_BY_CHAR = new Map<string, number>(I105_ALPHABET.map((char, index) => [char, index]));
const I105_BASE = 105;
const I105_CHECKSUM_LEN = 6;
const I105_SENTINEL_SORA = 'sora';
const BECH32M_CONST = 0x2bc8_30a3;
const ADDRESS_CLASS_SINGLE_KEY = 0;
const ADDRESS_CLASS_MULTISIG = 1;
const CONTROLLER_SINGLE_KEY_TAG = 0x00;
const CONTROLLER_MULTISIG_TAG = 0x01;
const CONTROLLER_SINGLE_KEY_EXTENDED_TAG = 0x02;
const KNOWN_CURVE_IDS = new Set([1, 2, 4, 10, 11, 12, 13, 14, 15]);

export const SORA_NEXUS_XOR_BURN_REMARK_TYPE = 'soraNexusXorClaim';

export type SoraNexusXorBurnRemark = {
  type: typeof SORA_NEXUS_XOR_BURN_REMARK_TYPE;
  version: 1;
  recipient: string;
};

function decodeModernI105Digits(value: string): number[] | null {
  const digits: number[] = [];
  for (const char of value) {
    const digit = I105_VALUE_BY_CHAR.get(char);
    if (digit === undefined) return null;
    digits.push(digit);
  }
  return digits;
}

function decodeBaseNDigits(digits: readonly number[], base: number): Uint8Array | null {
  if (base < 2 || digits.length === 0) return null;
  const bytes: number[] = [0];
  for (const digit of digits) {
    if (!Number.isInteger(digit) || digit < 0 || digit >= base) return null;
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index]! * base + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingZeroCount = 0;
  while (leadingZeroCount < digits.length && digits[leadingZeroCount] === 0) {
    leadingZeroCount += 1;
  }
  const out = new Uint8Array(leadingZeroCount + bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    out[out.length - 1 - index] = bytes[index]!;
  }
  return out;
}

function convertToBase32Digits(bytes: Uint8Array): number[] {
  let accumulator = 0;
  let bits = 0;
  const out: number[] = [];
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((accumulator >> bits) & 0x1f);
    }
  }
  if (bits > 0) {
    out.push((accumulator << (5 - bits)) & 0x1f);
  }
  return out;
}

function expandHrp(value: string): number[] {
  const out: number[] = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    out.push(code >> 5);
  }
  out.push(0);
  for (const char of value) {
    out.push(char.charCodeAt(0) & 0x1f);
  }
  return out;
}

function bech32Polymod(values: Iterable<number>): number {
  const generators = [0x3b6a_57b2, 0x2650_8e6d, 0x1ea1_19fa, 0x3d42_33dd, 0x2a14_62b3];
  let checksum = 1;
  for (const value of values) {
    const top = checksum >>> 25;
    checksum = (((checksum & 0x1ff_ffff) << 5) ^ value) >>> 0;
    for (let index = 0; index < generators.length; index += 1) {
      if (((top >>> index) & 1) === 1) {
        checksum = (checksum ^ generators[index]!) >>> 0;
      }
    }
  }
  return checksum >>> 0;
}

function i105ChecksumDigits(canonical: Uint8Array): number[] {
  const values = expandHrp('snx');
  values.push(...convertToBase32Digits(canonical));
  values.push(...new Array<number>(I105_CHECKSUM_LEN).fill(0));
  const polymod = (bech32Polymod(values) ^ BECH32M_CONST) >>> 0;
  const result: number[] = [];
  for (let index = 0; index < I105_CHECKSUM_LEN; index += 1) {
    const shift = 5 * (I105_CHECKSUM_LEN - 1 - index);
    result.push((polymod >>> shift) & 0x1f);
  }
  return result;
}

function readU16BE(bytes: Uint8Array, offset: number): Nullable<number> {
  if (offset + 1 >= bytes.length) return null;
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function decodeAddressHeader(byte: number): Nullable<number> {
  const hasExtension = (byte & 1) === 1;
  if (hasExtension) return null;
  const addressClass = (byte >> 3) & 0b11;
  return addressClass === ADDRESS_CLASS_SINGLE_KEY || addressClass === ADDRESS_CLASS_MULTISIG ? addressClass : null;
}

function isKnownCurveId(value: number): boolean {
  return KNOWN_CURVE_IDS.has(value);
}

function isValidSingleKeyPayload(bytes: Uint8Array, cursor: number): boolean {
  const tag = bytes[cursor];
  if (tag === undefined) return false;
  cursor += 1;

  const curve = bytes[cursor];
  if (curve === undefined || !isKnownCurveId(curve)) return false;
  cursor += 1;

  if (tag === CONTROLLER_SINGLE_KEY_TAG) {
    const length = bytes[cursor];
    if (length === undefined || length === 0) return false;
    cursor += 1;
    return cursor + length === bytes.length;
  }

  if (tag === CONTROLLER_SINGLE_KEY_EXTENDED_TAG) {
    const length = readU16BE(bytes, cursor);
    if (length === null || length <= 0xff) return false;
    cursor += 2;
    return cursor + length === bytes.length;
  }

  return false;
}

function isValidMultisigPayload(bytes: Uint8Array, cursor: number): boolean {
  if (bytes[cursor] !== CONTROLLER_MULTISIG_TAG) return false;
  cursor += 2; // tag + multisig version

  const threshold = readU16BE(bytes, cursor);
  if (threshold === null) return false;
  cursor += 2;

  const memberCount = readU16BE(bytes, cursor);
  if (memberCount === null) return false;
  cursor += 2;

  for (let index = 0; index < memberCount; index += 1) {
    const curve = bytes[cursor];
    if (curve === undefined || !isKnownCurveId(curve)) return false;
    cursor += 1;

    const weight = readU16BE(bytes, cursor);
    if (weight === null) return false;
    cursor += 2;

    const keyLength = readU16BE(bytes, cursor);
    if (keyLength === null || keyLength === 0) return false;
    cursor += 2 + keyLength;
    if (cursor > bytes.length) return false;
  }

  return cursor === bytes.length;
}

function isValidCanonicalAccountAddress(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false;
  const addressClass = decodeAddressHeader(bytes[0]!);
  if (addressClass === ADDRESS_CLASS_SINGLE_KEY) return isValidSingleKeyPayload(bytes, 1);
  if (addressClass === ADDRESS_CLASS_MULTISIG) return isValidMultisigPayload(bytes, 1);
  return false;
}

/**
 * Validates and normalizes production SORA Nexus i105 account literals.
 *
 * The decoding, base-105 alphabet, and Bech32m checksum mirror Iroha's
 * `AccountAddress::from_i105_for_discriminant` implementation.
 */
export function normalizeSoraNexusAccountId(value: string): Nullable<string> {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith(I105_SENTINEL_SORA)) return null;

  const payload = trimmed.slice(I105_SENTINEL_SORA.length);
  const digits = decodeModernI105Digits(payload);
  if (!digits || digits.length <= I105_CHECKSUM_LEN) return null;

  const canonicalDigits = digits.slice(0, -I105_CHECKSUM_LEN);
  const checksumDigits = digits.slice(-I105_CHECKSUM_LEN);
  const canonical = decodeBaseNDigits(canonicalDigits, I105_BASE);
  if (!canonical) return null;

  const expectedChecksum = i105ChecksumDigits(canonical);
  if (expectedChecksum.some((digit, index) => digit !== checksumDigits[index])) return null;
  if (!isValidCanonicalAccountAddress(canonical)) return null;

  return trimmed;
}

/**
 * Builds the compact public remark stored atomically with a SORA 2 XOR burn.
 */
export function createSoraNexusXorBurnRemark(recipient: string): string {
  const normalizedRecipient = normalizeSoraNexusAccountId(recipient);
  if (!normalizedRecipient) {
    throw new Error('Invalid SORA Nexus account');
  }

  const payload: SoraNexusXorBurnRemark = {
    type: SORA_NEXUS_XOR_BURN_REMARK_TYPE,
    version: 1,
    recipient: normalizedRecipient,
  };

  return JSON.stringify(payload);
}

export function parseSoraNexusXorBurnRemark(value: string): Nullable<SoraNexusXorBurnRemark> {
  try {
    const payload = JSON.parse(value) as Partial<SoraNexusXorBurnRemark>;
    if (
      payload.type !== SORA_NEXUS_XOR_BURN_REMARK_TYPE ||
      payload.version !== 1 ||
      typeof payload.recipient !== 'string'
    ) {
      return null;
    }

    const recipient = normalizeSoraNexusAccountId(payload.recipient);
    return recipient ? { type: payload.type, version: payload.version, recipient } : null;
  } catch {
    return null;
  }
}
