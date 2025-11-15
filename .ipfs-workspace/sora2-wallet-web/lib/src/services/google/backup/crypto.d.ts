/** Encrypts arbitrary text using the extension-compatible scrypt + nacl flow. */
export declare const encryptToHex: (message: string, passphrase: string) => string;
/** Decrypts strings produced by {@link encryptToHex}. */
export declare const decryptFromHex: (encryptedMessage: string, passphrase: string) => string;
/** Converts a mnemonic to its mini secret seed representation. */
export declare const generateSeed: (mnemonic: string) => string;
/** Normalizes raw seed strings to the expected hex format. */
export declare const prepareSeed: (rawSeed: string) => string;
