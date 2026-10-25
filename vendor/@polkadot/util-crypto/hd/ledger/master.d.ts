/**
 * Gets an xprv from a mnemonic
 *
 * @param mnemonic - The BIP-39 mnemonic phrase to derive the secret from.
 * @param password - Optional: password to secure the seed (default: empty string).
 * @param wordlist - Optional custom wordlist for mnemonic.
 * @param onlyJs - Optional: If `true`, forces use of the JavaScript implementation instead of WASM.
 * @param rounds - Optional: Number of PBKDF2 iterations to run (default: 210000).
 */
export declare function ledgerMaster(mnemonic: string, password?: string, rounds?: number): Uint8Array;
