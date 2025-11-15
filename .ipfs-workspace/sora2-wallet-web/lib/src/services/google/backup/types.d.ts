/** Enumerates the backup sources we support for Drive snapshots. */
export declare enum BackupAccountType {
  PASSHRASE = 'passphrase',
  JSON = 'json',
  SEED = 'seed',
}
export type Json = {
  substrateJson: Nullable<string>;
  ethJson: Nullable<string>;
};
export type Seed = {
  substrateSeed: Nullable<string>;
  ethSeed: Nullable<string>;
};
/** Structure used after decrypting a Drive backup. */
export type DecryptedBackupAccount = {
  name: string;
  address: string;
  mnemonicPhrase: Nullable<string>;
  cryptoType: string;
  substrateDerivationPath: Nullable<string>;
  ethDerivationPath: Nullable<string>;
  backupAccountType: BackupAccountType[];
  seed: Nullable<Seed>;
  json: Nullable<Json>;
};
/** Payload persisted in Drive with all secrets encrypted. */
export type EncryptedBackupAccount = {
  name: string;
  address: string;
  encryptedMnemonicPhrase: Nullable<string>;
  encryptedEthDerivationPath: Nullable<string>;
  encryptedSubstrateDerivationPath: Nullable<string>;
  cryptoType: string;
  backupAccountType: BackupAccountType[];
  encryptedSeed: Nullable<Seed>;
  json: Nullable<Json>;
};
