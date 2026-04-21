import { beforeEach, describe, expect, it, vi } from 'vitest';

const stringToU8aMock = vi.hoisted(() => vi.fn((value: string) => new TextEncoder().encode(value)));
const u8aConcatMock = vi.hoisted(
  () =>
    vi.fn((...items: Uint8Array[]) => {
      const total = items.reduce((sum, item) => sum + item.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;

      for (const item of items) {
        result.set(item, offset);
        offset += item.length;
      }

      return result;
    })
);
const u8aToHexMock = vi.hoisted(() => vi.fn((value: Uint8Array) => `0x${Buffer.from(value).toString('hex')}`));
const hexToU8aMock = vi.hoisted(() => vi.fn((value: string) => Uint8Array.from(Buffer.from(value.slice(2), 'hex'))));
const u8aFixLengthMock = vi.hoisted(() => vi.fn((value: Uint8Array) => value));
const u8aToStringMock = vi.hoisted(() => vi.fn((value: Uint8Array) => new TextDecoder().decode(value)));
const isHexMock = vi.hoisted(() => vi.fn((value: string) => value.startsWith('0x')));

const naclEncryptMock = vi.hoisted(() =>
  vi.fn((encoded: Uint8Array) => ({
    encrypted: encoded,
    nonce: new Uint8Array([9, 9]),
  }))
);
const naclDecryptMock = vi.hoisted(() => vi.fn(() => new TextEncoder().encode('decoded')));
const scryptEncodeMock = vi.hoisted(() =>
  vi.fn((passphrase: string, salt?: Uint8Array, params?: Record<string, number>) => ({
    params: params ?? { N: 1 },
    password: new TextEncoder().encode(`pw:${passphrase}`),
    salt: salt ?? new Uint8Array([7, 7]),
  }))
);
const scryptToU8aMock = vi.hoisted(() => vi.fn(() => new Uint8Array([1, 2, 3, 4])));
const scryptFromU8aMock = vi.hoisted(() => vi.fn(() => ({ params: { N: 1 }, salt: new Uint8Array([7, 7]) })));
const mnemonicToMiniSecretMock = vi.hoisted(() => vi.fn(() => new Uint8Array([4, 5, 6])));

vi.mock('@polkadot/util', () => ({
  stringToU8a: stringToU8aMock,
  u8aConcat: u8aConcatMock,
  u8aToHex: u8aToHexMock,
  hexToU8a: hexToU8aMock,
  u8aFixLength: u8aFixLengthMock,
  u8aToString: u8aToStringMock,
  isHex: isHexMock,
}));

vi.mock('@polkadot/util-crypto', () => ({
  naclEncrypt: naclEncryptMock,
  naclDecrypt: naclDecryptMock,
  scryptEncode: scryptEncodeMock,
  scryptToU8a: scryptToU8aMock,
  scryptFromU8a: scryptFromU8aMock,
  mnemonicToMiniSecret: mnemonicToMiniSecretMock,
}));

vi.mock('@polkadot/util-crypto/json/constants', () => ({
  SCRYPT_LENGTH: 4,
  NONCE_LENGTH: 2,
}));

import {
  decryptFromHex,
  encryptToHex,
  generateSeed,
  prepareSeed,
} from '@/lib/soraneo-wallet/src/services/google/backup/crypto';

describe('google backup crypto helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts text into the expected hex envelope', () => {
    expect(encryptToHex('hello', 'password')).toBe('0x01020304090968656c6c6f');
    expect(stringToU8aMock).toHaveBeenCalledWith('hello');
    expect(scryptEncodeMock).toHaveBeenCalledWith('password');
    expect(naclEncryptMock).toHaveBeenCalled();
    expect(scryptToU8aMock).toHaveBeenCalled();
    expect(u8aConcatMock).toHaveBeenCalled();
    expect(u8aToHexMock).toHaveBeenCalled();
  });

  it('decrypts hex payloads back into strings', () => {
    expect(decryptFromHex('0x01020304090968656c6c6f', 'password')).toBe('decoded');
    expect(hexToU8aMock).toHaveBeenCalledWith('0x01020304090968656c6c6f', -1);
    expect(scryptFromU8aMock).toHaveBeenCalled();
    expect(scryptEncodeMock).toHaveBeenCalledWith('password', new Uint8Array([7, 7]), { N: 1 });
    expect(u8aFixLengthMock).toHaveBeenCalled();
    expect(naclDecryptMock).toHaveBeenCalled();
    expect(u8aToStringMock).toHaveBeenCalled();
  });

  it('throws when the passphrase cannot decrypt the payload', () => {
    naclDecryptMock.mockReturnValueOnce(null);

    expect(() => decryptFromHex('0x01020304090968656c6c6f', 'password')).toThrow(
      'Unable to decode using the supplied passphrase'
    );
    expect(u8aToStringMock).not.toHaveBeenCalled();
  });

  it('converts mnemonics to mini-secret seeds', () => {
    expect(generateSeed('mnemonic phrase')).toBe('0x040506');
    expect(mnemonicToMiniSecretMock).toHaveBeenCalledWith('mnemonic phrase');
  });

  it('normalizes non-hex seed values and preserves hex ones', () => {
    expect(prepareSeed('abcd')).toBe('0xabcd');
    expect(prepareSeed('0xabcd')).toBe('0xabcd');
    expect(isHexMock).toHaveBeenNthCalledWith(1, 'abcd');
    expect(isHexMock).toHaveBeenNthCalledWith(2, '0xabcd');
  });
});
