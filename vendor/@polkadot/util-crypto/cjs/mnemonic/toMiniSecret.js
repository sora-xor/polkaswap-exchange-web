'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.mnemonicToMiniSecret = mnemonicToMiniSecret;
const util_1 = require('@polkadot/util');
const wasm_crypto_1 = require('@polkadot/wasm-crypto');
const index_js_1 = require('../pbkdf2/index.js');
const toEntropy_js_1 = require('./toEntropy.js');
const validate_js_1 = require('./validate.js');
/**
 * @param mnemonic - The BIP-39 mnemonic phrase to derive the secret from.
 * @param password - Optional: password to secure the seed (default: empty string).
 * @param wordlist - Optional custom wordlist for mnemonic.
 * @param onlyJs - Optional: If `true`, forces use of the JavaScript implementation instead of WASM.
 * @param rounds - Optional: Number of PBKDF2 iterations to run (default: 210000 (when onlyJS = true) or 2048 (when onlyJS = false).
 */
function mnemonicToMiniSecret(mnemonic, password = '', wordlist, onlyJs, rounds) {
  if (!(0, validate_js_1.mnemonicValidate)(mnemonic, wordlist, onlyJs)) {
    throw new Error('Invalid bip39 mnemonic specified');
  } else if (!wordlist && !onlyJs && (0, wasm_crypto_1.isReady)()) {
    return (0, wasm_crypto_1.bip39ToMiniSecret)(mnemonic, password);
  }
  const entropy = (0, toEntropy_js_1.mnemonicToEntropy)(mnemonic, wordlist);
  const salt = (0, util_1.stringToU8a)(`mnemonic${password}`);
  // return the first 32 bytes as the seed
  return (0, index_js_1.pbkdf2Encode)(entropy, salt, rounds).password.slice(0, 32);
}
