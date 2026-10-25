'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ledgerMaster = ledgerMaster;
const util_1 = require('@polkadot/util');
const index_js_1 = require('../../hmac/index.js');
const bip39_js_1 = require('../../mnemonic/bip39.js');
const ED25519_CRYPTO = 'ed25519 seed';
/**
 * Gets an xprv from a mnemonic
 *
 * @param mnemonic - The BIP-39 mnemonic phrase to derive the secret from.
 * @param password - Optional: password to secure the seed (default: empty string).
 * @param wordlist - Optional custom wordlist for mnemonic.
 * @param onlyJs - Optional: If `true`, forces use of the JavaScript implementation instead of WASM.
 * @param rounds - Optional: Number of PBKDF2 iterations to run (default: 210000).
 */
function ledgerMaster(mnemonic, password, rounds) {
  const seed = (0, bip39_js_1.mnemonicToSeedSync)(mnemonic, password, rounds);
  const chainCode = (0, index_js_1.hmacShaAsU8a)(ED25519_CRYPTO, new Uint8Array([1, ...seed]), 256);
  let priv;
  while (!priv || priv[31] & 0b0010_0000) {
    priv = (0, index_js_1.hmacShaAsU8a)(ED25519_CRYPTO, priv || seed, 512);
  }
  priv[0] &= 0b1111_1000;
  priv[31] &= 0b0111_1111;
  priv[31] |= 0b0100_0000;
  return (0, util_1.u8aConcat)(priv, chainCode);
}
