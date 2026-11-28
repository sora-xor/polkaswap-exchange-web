import { Keyring } from '@polkadot/keyring';
import { u8aEq } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

import { formatAccountAddress } from '../../../util';

import { BackupAccountCrypto } from './account';
import { generateSeed, prepareSeed } from './crypto';
import { BackupAccountType } from './types';

import type { DecryptedBackupAccount, EncryptedBackupAccount } from './types';
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import type { KeypairType } from '@polkadot/util-crypto/types';

/** Accepts the Substrate key types supported by the backup format without changing their meaning. */
const getBackupKeyType = (cryptoType?: string): KeypairType => {
  const type = cryptoType?.toLowerCase() || 'sr25519';
  if (type !== 'sr25519' && type !== 'ed25519' && type !== 'ecdsa') throw new Error('polkadotjs.noAccount');
  return type;
};

/** Compares decoded identities so another SS58 prefix cannot hide or manufacture an account mismatch. */
const assertBackupIdentity = (pair: KeyringPair, address: string): void => {
  if (!address || !u8aEq(decodeAddress(pair.address), decodeAddress(address))) {
    throw new Error('polkadotjs.noAccount');
  }
};

/**
 * Converts between encrypted backup payloads and the keyring JSON format used
 * across the wallet.
 */
export class BackupAccountMapper {
  /**
   * Decrypts the backup account and returns a keyring JSON representation that
   * can be imported into the wallet. Stored JSON takes precedence because it
   * retains the exact key; mnemonic/seed-only backups retain their derivation.
   * Both the backup metadata and the selected Drive account must match the key.
   */
  public static getPairJson(
    encryptedAccount: EncryptedBackupAccount,
    password: string,
    expectedAddress?: string
  ): Nullable<KeyringPair$Json> {
    const decryptedAccount = BackupAccountCrypto.decryptAccount(encryptedAccount, password);
    const keyring = new Keyring({ type: getBackupKeyType(decryptedAccount.cryptoType) });
    let pair: KeyringPair | undefined;

    try {
      if (decryptedAccount.json?.substrateJson) {
        pair = keyring.createFromJson(JSON.parse(decryptedAccount.json.substrateJson) as KeyringPair$Json);
        // Decode before comparing: a JSON address header is not proof of the encrypted key's identity.
        pair.decodePkcs8(password);
      } else {
        const secret =
          decryptedAccount.mnemonicPhrase ||
          (decryptedAccount.seed?.substrateSeed ? prepareSeed(decryptedAccount.seed.substrateSeed) : null);
        if (!secret) return null;
        pair = keyring.createFromUri(`${secret}${decryptedAccount.substrateDerivationPath || ''}`, {
          name: decryptedAccount.name,
        });
      }

      assertBackupIdentity(pair, decryptedAccount.address);
      if (expectedAddress) assertBackupIdentity(pair, expectedAddress);
      return pair.toJson(password);
    } finally {
      pair?.lock();
    }
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
      address: formatAccountAddress(new Keyring().createFromJson(pairJson).address),
      cryptoType: (pairJson.encoding?.content?.[1] || 'sr25519').toUpperCase(),
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
