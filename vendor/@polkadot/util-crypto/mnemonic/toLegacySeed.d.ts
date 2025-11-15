/**
 * @name mnemonicToLegacySeed
 * @summary Creates a valid Ethereum/Bitcoin-compatible seed from a mnemonic input
 * @example
 * <BR>
 *
 * ```javascript
 * import { mnemonicGenerate, mnemonicToLegacySeed, mnemonicValidate } from '@polkadot/util-crypto';
 *
 * const mnemonic = mnemonicGenerate(); // => string
 * const isValidMnemonic = mnemonicValidate(mnemonic); // => boolean
 *
 * if (isValidMnemonic) {
 *   console.log(`Seed generated from mnemonic: ${mnemonicToLegacySeed(mnemonic)}`); => u8a
 * }
 * ```
 *
 * @param mnemonic - The BIP-39 mnemonic phrase to derive the secret from.
 * @param password - Optional: password to secure the seed (default: empty string).
 * @param onlyJs - Optional: If `true`, forces use of the JavaScript implementation instead of WASM.
 * @param byteLength - Optional: Either 32 or 64. Default is 32
 * @param rounds - Optional: Number of PBKDF2 iterations to run (default: 210000).
 */
export declare function mnemonicToLegacySeed(
  mnemonic: string,
  password?: string,
  onlyJs?: boolean,
  byteLength?: 32 | 64,
  rounds?: number
): Uint8Array;
