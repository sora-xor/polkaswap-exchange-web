import { DecryptedBackupAccount, EncryptedBackupAccount } from './types';

/**
 * Handles the encryption/decryption of backup account payloads using the same
 * primitives as the Polkadot JS extension.
 */
export declare class BackupAccountCrypto {
  private static decrypt;
  private static encrypt;
  private static encryptOrNull;
  private static decryptOrNull;
  /**
   * Encrypts the sensitive fields of the backup account with the provided
   * password, returning a transport-safe payload.
   */
  static encryptAccount(decryptedBackupAccount: DecryptedBackupAccount, password: string): EncryptedBackupAccount;
  /**
   * Reverses {@link encryptAccount}, returning the decrypted account ready for
   * import flows.
   */
  static decryptAccount(encryptedBackupAccount: EncryptedBackupAccount, password: string): DecryptedBackupAccount;
}
