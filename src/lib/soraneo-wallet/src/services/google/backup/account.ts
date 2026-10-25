import { encryptToHex, decryptFromHex } from './crypto';

import type { DecryptedBackupAccount, EncryptedBackupAccount } from './types';

/**
 * Handles the encryption/decryption of backup account payloads using the same
 * primitives as the Polkadot JS extension.
 */
export class BackupAccountCrypto {
  private static decrypt = decryptFromHex;
  private static encrypt = encryptToHex;

  private static encryptOrNull(value: Nullable<string>, password: string) {
    return value ? this.encrypt(value, password) : null;
  }

  private static decryptOrNull(value: Nullable<string>, password: string) {
    return value ? this.decrypt(value, password) : null;
  }

  /**
   * Encrypts the sensitive fields of the backup account with the provided
   * password, returning a transport-safe payload.
   */
  public static encryptAccount(
    decryptedBackupAccount: DecryptedBackupAccount,
    password: string
  ): EncryptedBackupAccount {
    const encryptedSubstrateDerivationPath = this.encryptOrNull(
      decryptedBackupAccount.substrateDerivationPath,
      password
    );
    const encryptedEthDerivationPath = this.encryptOrNull(decryptedBackupAccount.ethDerivationPath, password);
    const encryptedMnemonicPhrase = this.encryptOrNull(decryptedBackupAccount.mnemonicPhrase, password);
    const encryptedEthSeed = this.encryptOrNull(decryptedBackupAccount.seed?.ethSeed, password);
    const encryptedSubstrateSeed = this.encryptOrNull(decryptedBackupAccount.seed?.substrateSeed, password);
    const encryptedSeed =
      encryptedEthSeed || encryptedSubstrateSeed
        ? { ethSeed: encryptedEthSeed, substrateSeed: encryptedSubstrateSeed }
        : null;

    return {
      name: decryptedBackupAccount.name,
      address: decryptedBackupAccount.address,
      cryptoType: decryptedBackupAccount.cryptoType,
      backupAccountType: decryptedBackupAccount.backupAccountType,
      encryptedMnemonicPhrase,
      encryptedEthDerivationPath,
      encryptedSubstrateDerivationPath,
      encryptedSeed,
      json: decryptedBackupAccount.json,
    };
  }

  /**
   * Reverses {@link encryptAccount}, returning the decrypted account ready for
   * import flows.
   */
  public static decryptAccount(
    encryptedBackupAccount: EncryptedBackupAccount,
    password: string
  ): DecryptedBackupAccount {
    const substrateSeed = this.decryptOrNull(encryptedBackupAccount.encryptedSeed?.substrateSeed, password);
    const ethSeed = this.decryptOrNull(encryptedBackupAccount.encryptedSeed?.ethSeed, password);
    const seed = substrateSeed || ethSeed ? { substrateSeed, ethSeed } : null;
    const passphrase = this.decryptOrNull(encryptedBackupAccount.encryptedMnemonicPhrase, password);
    const ethDerivationPath = this.decryptOrNull(encryptedBackupAccount.encryptedEthDerivationPath, password);
    const substrateDerivationPath = this.decryptOrNull(
      encryptedBackupAccount.encryptedSubstrateDerivationPath,
      password
    );

    return {
      name: encryptedBackupAccount.name,
      address: encryptedBackupAccount.address,
      cryptoType: encryptedBackupAccount.cryptoType,
      backupAccountType: encryptedBackupAccount.backupAccountType,
      mnemonicPhrase: passphrase,
      substrateDerivationPath,
      ethDerivationPath,
      seed,
      json: encryptedBackupAccount.json,
    };
  }
}
