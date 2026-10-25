import { api } from '../../../api';
import { formatAccountAddress } from '../../../util';

import { BackupAccountCrypto } from './account';
import { generateSeed, prepareSeed } from './crypto';
import { BackupAccountType } from './types';

import type { DecryptedBackupAccount, EncryptedBackupAccount } from './types';
import type { KeyringPair$Json } from '@polkadot/keyring/types';

/**
 * Converts between encrypted backup payloads and the keyring JSON format used
 * across the wallet.
 */
export class BackupAccountMapper {
  /**
   * Decrypts the backup account and returns a keyring JSON representation that
   * can be imported into the wallet.
   */
  public static getPairJson(encryptedAccount: EncryptedBackupAccount, password: string): Nullable<KeyringPair$Json> {
    const decryptedAccount = BackupAccountCrypto.decryptAccount(encryptedAccount, password);

    if (decryptedAccount.mnemonicPhrase) {
      const pair = api.createAccountPair(decryptedAccount.mnemonicPhrase, decryptedAccount.name);

      return pair.toJson(password);
    }

    if (decryptedAccount.seed?.substrateSeed) {
      const seed = prepareSeed(decryptedAccount.seed.substrateSeed);
      const pair = api.createAccountPair(seed, decryptedAccount.name);

      return pair.toJson(password);
    }

    if (decryptedAccount.json?.substrateJson) {
      return JSON.parse(decryptedAccount.json.substrateJson) as KeyringPair$Json;
    }

    return null;
  }

  /**
   * Produces an encrypted backup from a keyring JSON export, optionally
   * including mnemonic metadata for full restorations.
   */
  public static createFromPairJson(
    pairJson: KeyringPair$Json,
    password: string,
    mnemonicPhrase?: string
  ): EncryptedBackupAccount {
    const decryptedAccount: DecryptedBackupAccount = {
      name: (pairJson.meta?.name as string) || '',
      address: formatAccountAddress(pairJson.address),
      cryptoType: 'sr25519'.toUpperCase(),
      backupAccountType: [BackupAccountType.JSON],
      mnemonicPhrase,
      substrateDerivationPath: null,
      ethDerivationPath: null,
      seed: null,
      json: {
        substrateJson: JSON.stringify(pairJson),
        ethJson: null,
      },
    };

    if (mnemonicPhrase) {
      decryptedAccount.seed = { substrateSeed: generateSeed(mnemonicPhrase), ethSeed: null };
      decryptedAccount.backupAccountType.push(BackupAccountType.PASSHRASE, BackupAccountType.SEED);
    }

    const encryptedAccount = BackupAccountCrypto.encryptAccount(decryptedAccount, password);

    return encryptedAccount;
  }

  /** Updates both the plaintext and JSON metadata names in an encrypted backup. */
  public static changeName(encryptedAccount: EncryptedBackupAccount, name: string): EncryptedBackupAccount {
    // update name in root
    encryptedAccount.name = name;
    // update name in substrateJson
    if (encryptedAccount.json?.substrateJson) {
      const substrateJson = JSON.parse(encryptedAccount.json.substrateJson);
      substrateJson.meta = substrateJson.meta || {};
      substrateJson.meta.name = name;
      encryptedAccount.json.substrateJson = JSON.stringify(substrateJson);
    }

    return encryptedAccount;
  }
}
