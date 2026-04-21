import { beforeEach, describe, expect, it, vi } from 'vitest';

const encryptToHexMock = vi.hoisted(() => vi.fn((value: string, password: string) => `enc:${value}:${password}`));
const decryptFromHexMock = vi.hoisted(() => vi.fn((value: string, password: string) => `dec:${value}:${password}`));

vi.mock('@/lib/soraneo-wallet/src/services/google/backup/crypto', () => ({
  encryptToHex: encryptToHexMock,
  decryptFromHex: decryptFromHexMock,
}));

import { BackupAccountCrypto } from '@/lib/soraneo-wallet/src/services/google/backup/account';
import { BackupAccountType } from '@/lib/soraneo-wallet/src/services/google/backup/types';

describe('BackupAccountCrypto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts all populated sensitive fields while preserving nullable values', () => {
    const result = BackupAccountCrypto.encryptAccount(
      {
        name: 'Alice',
        address: 'addr',
        cryptoType: 'SR25519',
        backupAccountType: [BackupAccountType.JSON, BackupAccountType.SEED],
        mnemonicPhrase: 'mnemonic',
        substrateDerivationPath: '//substrate',
        ethDerivationPath: null,
        seed: {
          substrateSeed: 'substrate-seed',
          ethSeed: null,
        },
        json: {
          substrateJson: '{"address":"addr"}',
          ethJson: null,
        },
      },
      'password'
    );

    expect(encryptToHexMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      name: 'Alice',
      address: 'addr',
      cryptoType: 'SR25519',
      backupAccountType: [BackupAccountType.JSON, BackupAccountType.SEED],
      encryptedMnemonicPhrase: 'enc:mnemonic:password',
      encryptedEthDerivationPath: null,
      encryptedSubstrateDerivationPath: 'enc://substrate:password',
      encryptedSeed: {
        ethSeed: null,
        substrateSeed: 'enc:substrate-seed:password',
      },
      json: {
        substrateJson: '{"address":"addr"}',
        ethJson: null,
      },
    });
  });

  it('returns a null encrypted seed when no seed material is present', () => {
    const result = BackupAccountCrypto.encryptAccount(
      {
        name: 'Bob',
        address: 'addr',
        cryptoType: 'SR25519',
        backupAccountType: [BackupAccountType.JSON],
        mnemonicPhrase: null,
        substrateDerivationPath: null,
        ethDerivationPath: null,
        seed: null,
        json: null,
      },
      'password'
    );

    expect(result.encryptedMnemonicPhrase).toBeNull();
    expect(result.encryptedEthDerivationPath).toBeNull();
    expect(result.encryptedSubstrateDerivationPath).toBeNull();
    expect(result.encryptedSeed).toBeNull();
  });

  it('decrypts populated fields and rebuilds the nullable seed shape', () => {
    const result = BackupAccountCrypto.decryptAccount(
      {
        name: 'Alice',
        address: 'addr',
        cryptoType: 'SR25519',
        backupAccountType: [BackupAccountType.JSON, BackupAccountType.SEED],
        encryptedMnemonicPhrase: 'encrypted-mnemonic',
        encryptedEthDerivationPath: null,
        encryptedSubstrateDerivationPath: 'encrypted-substrate-path',
        encryptedSeed: {
          substrateSeed: 'encrypted-substrate-seed',
          ethSeed: null,
        },
        json: {
          substrateJson: '{"address":"addr"}',
          ethJson: null,
        },
      },
      'password'
    );

    expect(decryptFromHexMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      name: 'Alice',
      address: 'addr',
      cryptoType: 'SR25519',
      backupAccountType: [BackupAccountType.JSON, BackupAccountType.SEED],
      mnemonicPhrase: 'dec:encrypted-mnemonic:password',
      ethDerivationPath: null,
      substrateDerivationPath: 'dec:encrypted-substrate-path:password',
      seed: {
        substrateSeed: 'dec:encrypted-substrate-seed:password',
        ethSeed: null,
      },
      json: {
        substrateJson: '{"address":"addr"}',
        ethJson: null,
      },
    });
  });

  it('returns a null decrypted seed when there are no encrypted seeds', () => {
    const result = BackupAccountCrypto.decryptAccount(
      {
        name: 'Bob',
        address: 'addr',
        cryptoType: 'SR25519',
        backupAccountType: [BackupAccountType.JSON],
        encryptedMnemonicPhrase: null,
        encryptedEthDerivationPath: null,
        encryptedSubstrateDerivationPath: null,
        encryptedSeed: null,
        json: null,
      },
      'password'
    );

    expect(result.mnemonicPhrase).toBeNull();
    expect(result.ethDerivationPath).toBeNull();
    expect(result.substrateDerivationPath).toBeNull();
    expect(result.seed).toBeNull();
  });
});
