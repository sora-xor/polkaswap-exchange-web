import type { EncryptedBackupAccount } from './types';
import type { KeyringPair$Json } from '@polkadot/keyring/types';
/**
 * Converts between encrypted backup payloads and the keyring JSON format used
 * across the wallet.
 */
export declare class BackupAccountMapper {
  /**
   * Decrypts the backup account and returns a keyring JSON representation that
   * can be imported into the wallet.
   */
  static getPairJson(encryptedAccount: EncryptedBackupAccount, password: string): Nullable<KeyringPair$Json>;
  /**
   * Produces an encrypted backup from a keyring JSON export, optionally
   * including mnemonic metadata for full restorations.
   */
  static createFromPairJson(
    pairJson: KeyringPair$Json,
    password: string,
    mnemonicPhrase?: string
  ): EncryptedBackupAccount;
  /** Updates both the plaintext and JSON metadata names in an encrypted backup. */
  static changeName(encryptedAccount: EncryptedBackupAccount, name: string): EncryptedBackupAccount;
}
