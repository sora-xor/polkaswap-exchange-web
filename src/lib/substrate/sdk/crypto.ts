import crypto, { AES, HmacSHA256, enc } from 'crypto-js';
import { Cosigners, EncryptedKeyForCosigner, FinalEncryptedStructure } from '@sora-substrate/sdk';
import { u8aToHex } from '@polkadot/util';
import { sr25519Agreement } from '@polkadot/util-crypto';

type StorageNamespaces = {
  current: string;
  legacy: string[];
};

const LEGACY_KEY = 'U2FsdGVkX18ZUVvShFSES21qHsQEqZXMxQ9zgHy';
const MASTER_KEY_STORAGE = 'sora.crypto.masterKey';
const SECRET_LENGTH = 32;
const ENCRYPTION_PREFIX = 'psk1:';

/**
 * IMPORTANT SECURITY NOTE
 *
 * The persisted "master key" is used for:
 * - HMAC namespaces for localStorage keys (to avoid leaking raw account addresses in plain text)
 * - encrypting non-critical local values (legacy support)
 *
 * Because the key is stored client-side (localStorage), it is NOT a security boundary:
 * any JS running in this origin (XSS, compromised third-party script, malicious extension) can read/use it.
 * Do not use this mechanism to protect private keys, seeds, or other high-value secrets.
 */
let cachedMasterKey: string | null = null;

const isBrowserStorageAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

const toBase64 = (bytes: Uint8Array): string => crypto.enc.Base64.stringify(crypto.lib.WordArray.create(bytes));

const wordArrayToUint8Array = (wordArray: crypto.lib.WordArray): Uint8Array => {
  const { words, sigBytes } = wordArray;
  const result = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i += 1) {
    const word = words[i >>> 2];
    result[i] = (word >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return result;
};

const generateSecret = (): string => {
  const bytes =
    typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues
      ? (() => {
          const array = new Uint8Array(SECRET_LENGTH);
          globalThis.crypto.getRandomValues(array);
          return array;
        })()
      : wordArrayToUint8Array(crypto.lib.WordArray.random(SECRET_LENGTH));

  return toBase64(bytes);
};

const readStoredSecret = (): string | null => {
  if (!isBrowserStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(MASTER_KEY_STORAGE);
  } catch {
    return null;
  }
};

const persistSecret = (secret: string): void => {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(MASTER_KEY_STORAGE, secret);
  } catch {
    // Swallow quota/security errors – the secret will be regenerated next time.
  }
};

const getMasterKey = (): string => {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  const stored = readStoredSecret();
  if (stored) {
    cachedMasterKey = stored;
    return stored;
  }

  const generated = generateSecret();
  persistSecret(generated);
  cachedMasterKey = generated;
  return generated;
};

const encryptWithKey = (message: string, key: string): string => AES.encrypt(message, key).toString();

const decryptWithKey = (message: string, key: string): string => {
  const decrypted = AES.decrypt(message, key);
  if (!decrypted || typeof decrypted.sigBytes !== 'number' || decrypted.sigBytes <= 0) {
    return '';
  }

  try {
    return decrypted.toString(enc.Utf8);
  } catch {
    return '';
  }
};

const hmacWithKey = (message: string, key: string): string => HmacSHA256(message, key).toString();

export const encrypt = (message: string): string => {
  const cipher = encryptWithKey(message, getMasterKey());
  return `${ENCRYPTION_PREFIX}${cipher}`;
};

export const decrypt = (message: string): string => {
  if (!message) return '';

  const isReadable = (value: string): boolean => /^[\x20-\x7E]*$/.test(value);

  if (message.startsWith(ENCRYPTION_PREFIX)) {
    const payload = message.slice(ENCRYPTION_PREFIX.length);
    return decryptWithKey(payload, getMasterKey());
  }

  try {
    const primary = decryptWithKey(message, getMasterKey());
    if (primary && isReadable(primary)) {
      return primary;
    }
  } catch {
    // fall through to legacy key
  }

  return decryptWithKey(message, LEGACY_KEY);
};

export const toHmacSHA256 = (message: string): string => hmacWithKey(message, getMasterKey());

export const deriveAddressNamespaces = (message: string): StorageNamespaces => {
  const current = toHmacSHA256(message);
  const legacyHash = hmacWithKey(message, LEGACY_KEY);
  const legacy = legacyHash !== current ? [legacyHash] : [];

  return { current, legacy };
};

export class CryptoModule {
  combineSharedSecret(publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return sr25519Agreement(secretKey, publicKey);
  }

  _encryptMessage(keyHex: string, message: string): { encryptedData: string; iv: string } {
    const iv = crypto.lib.WordArray.random(16);
    const encrypted = crypto.AES.encrypt(message, crypto.enc.Hex.parse(keyHex), {
      iv: iv,
      mode: crypto.mode.CBC,
      padding: crypto.pad.Pkcs7,
    });

    return {
      encryptedData: encrypted.toString(),
      iv: iv.toString(crypto.enc.Hex),
    };
  }

  _decryptMessage(keyHex: string, encryptedData: string, iv: string): string {
    const decrypted = crypto.AES.decrypt(encryptedData, crypto.enc.Hex.parse(keyHex), {
      iv: crypto.enc.Hex.parse(iv),
      mode: crypto.mode.CBC,
      padding: crypto.pad.Pkcs7,
    });
    return decrypted.toString(crypto.enc.Utf8);
  }

  encryptBySigner(callDataStr: string, cosigners: Cosigners, secretKeyOfSigner: Uint8Array) {
    const symmetricKey = crypto.lib.WordArray.random(32).toString(crypto.enc.Hex);

    // Encrypt callData with symmetricKey
    const { encryptedData: encryptedCallData, iv: dataIv } = this._encryptMessage(symmetricKey, callDataStr);
    const encryptedKeys: { [cosignerAddress: string]: EncryptedKeyForCosigner } = {};
    for (const [address, cosignerPublicKey] of Object.entries(cosigners)) {
      const sharedSecret = this.combineSharedSecret(cosignerPublicKey, secretKeyOfSigner);
      const sharedSecretHex = u8aToHex(sharedSecret).replace(/^0x/, '');

      const { encryptedData: encryptedSymKey, iv: symKeyIv } = this._encryptMessage(sharedSecretHex, symmetricKey);

      encryptedKeys[address] = {
        encryptedKey: encryptedSymKey,
        iv: symKeyIv,
      };
    }
    const finalEncrypted: FinalEncryptedStructure = {
      encryptedData: encryptedCallData,
      dataIv: dataIv,
      encryptedKeys: encryptedKeys,
    };
    return finalEncrypted;
  }

  decryptForCosigner(
    cosignerAddress: string,
    encryptorPublicKey: Uint8Array,
    finalEncrypted: FinalEncryptedStructure,
    secretKeyOfSigner: Uint8Array
  ): any {
    const cosignerData = finalEncrypted.encryptedKeys[cosignerAddress];

    if (!cosignerData) {
      throw new Error(`No encrypted data found for cosigner: ${cosignerAddress}`);
    }

    // Generate the shared secret using the cosigner's secret key and the encryptor's public key
    const sharedSecret = this.combineSharedSecret(encryptorPublicKey, secretKeyOfSigner);
    const sharedSecretHex = u8aToHex(sharedSecret).replace(/^0x/, '');

    // Decrypt the symmetric key for the cosigner
    const symmetricKey = this._decryptMessage(sharedSecretHex, cosignerData.encryptedKey, cosignerData.iv);

    // Decrypt the main call data
    const decryptedCallDataStr = this._decryptMessage(
      symmetricKey,
      finalEncrypted.encryptedData,
      finalEncrypted.dataIv
    );

    // Parse and return the decrypted call data
    return JSON.parse(decryptedCallDataStr);
  }
}
