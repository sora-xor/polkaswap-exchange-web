import { Keyring } from '@polkadot/keyring';
import { DEV_PHRASE } from '@polkadot/keyring/defaults';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@polkadot/util-crypto', async (original) => original());

const formatAccountAddressMock = vi.hoisted(() => vi.fn((address: string) => `formatted:${address}`));
const decryptAccountMock = vi.hoisted(() => vi.fn());
const encryptAccountMock = vi.hoisted(() => vi.fn((account) => ({ encrypted: true, ...account })));
const generateSeedMock = vi.hoisted(() => vi.fn((mnemonic: string) => `seed:${mnemonic}`));
const prepareSeedMock = vi.hoisted(() => vi.fn((seed: string) => (seed.startsWith('0x') ? seed : `0x${seed}`)));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatAccountAddress: formatAccountAddressMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/backup/account', () => ({
  BackupAccountCrypto: {
    decryptAccount: decryptAccountMock,
    encryptAccount: encryptAccountMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/backup/crypto', () => ({
  generateSeed: generateSeedMock,
  prepareSeed: prepareSeedMock,
}));

import { BackupAccountMapper } from '@/lib/soraneo-wallet/src/services/google/backup/mapper';
import { BackupAccountType } from '@/lib/soraneo-wallet/src/services/google/backup/types';
import type { DecryptedBackupAccount } from '@/lib/soraneo-wallet/src/services/google/backup/types';

const password = 'synthetic-test-password';
// All recovery identities derive from Polkadot's public development phrase.
const keyring = new Keyring({ type: 'sr25519' });
beforeAll(async () => {
  await cryptoWaitReady();
});

/** Supplies the decrypted boundary while retaining actual key derivation and JSON cryptography. */
function backup(overrides: Partial<DecryptedBackupAccount> = {}): DecryptedBackupAccount {
  return {
    name: 'Alice',
    address: keyring.createFromUri(DEV_PHRASE).address,
    mnemonicPhrase: DEV_PHRASE,
    cryptoType: 'SR25519',
    substrateDerivationPath: null,
    ethDerivationPath: null,
    seed: null,
    json: null,
    backupAccountType: [BackupAccountType.PASSHRASE],
    ...overrides,
  };
}

describe('BackupAccountMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rebuilds root and derived mnemonic backups without changing their identity', () => {
    for (const path of ['', '//derived', '/soft']) {
      const expected = keyring.createFromUri(`${DEV_PHRASE}${path}`);
      decryptAccountMock.mockReturnValue(backup({ address: expected.address, substrateDerivationPath: path }));
      const restored = BackupAccountMapper.getPairJson({} as never, password);
      expect(restored?.address).toBe(expected.address);
      const recovered = keyring.createFromJson(restored!);
      recovered.decodePkcs8(password);
      expect(recovered.address).toBe(expected.address);
    }
  });

  it('accepts the selected account in another SS58 prefix', () => {
    const expected = keyring.createFromUri(DEV_PHRASE);
    decryptAccountMock.mockReturnValue(backup());
    expect(BackupAccountMapper.getPairJson({} as never, password, encodeAddress(expected.publicKey, 69))?.address).toBe(
      expected.address
    );
  });

  it.each(['sr25519', 'ed25519', 'ecdsa'] as const)('honors %s seed derivation metadata', (type) => {
    const seed = '42'.repeat(32); // Synthetic public test seed, never an operator key.
    const expected = new Keyring({ type }).createFromUri(`0x${seed}//derived`);
    decryptAccountMock.mockReturnValue(
      backup({
        address: expected.address,
        mnemonicPhrase: null,
        cryptoType: type.toUpperCase(),
        seed: { substrateSeed: seed, ethSeed: null },
        substrateDerivationPath: '//derived',
      })
    );
    const restored = BackupAccountMapper.getPairJson({} as never, password)!;
    const recovered = new Keyring().createFromJson(restored);
    recovered.decodePkcs8(password);
    expect(recovered.address).toBe(expected.address);
    expect(recovered.type).toBe(type);
    expect(prepareSeedMock).toHaveBeenCalledWith(seed);
  });

  it('prefers exact keyring JSON over incomplete mnemonic metadata', () => {
    const expected = keyring.createFromUri(`${DEV_PHRASE}//derived`);
    const original = expected.toJson(password);
    decryptAccountMock.mockReturnValue(
      backup({
        address: expected.address,
        json: { substrateJson: JSON.stringify(original), ethJson: null },
      })
    );
    expect(BackupAccountMapper.getPairJson({} as never, password)?.address).toBe(expected.address);
  });

  it('rejects a selected account different from the recovered backup', () => {
    decryptAccountMock.mockReturnValue(backup());
    expect(() =>
      BackupAccountMapper.getPairJson({} as never, password, keyring.createFromUri(`${DEV_PHRASE}//other`).address)
    ).toThrow('polkadotjs.noAccount');
  });

  it('rejects backup metadata different from the derived key', () => {
    decryptAccountMock.mockReturnValue(backup({ address: keyring.createFromUri(`${DEV_PHRASE}//other`).address }));
    expect(() => BackupAccountMapper.getPairJson({} as never, password)).toThrow('polkadotjs.noAccount');
  });

  it('checks the decoded key rather than trusting a forged JSON address header', () => {
    const wrongPair = keyring.createFromUri(`${DEV_PHRASE}//other`);
    const forged = { ...wrongPair.toJson(password), address: backup().address };
    decryptAccountMock.mockReturnValue(backup({ json: { substrateJson: JSON.stringify(forged), ethJson: null } }));
    expect(() => BackupAccountMapper.getPairJson({} as never, password)).toThrow('polkadotjs.noAccount');
  });

  it('rejects an incorrect JSON password without falling back to the mnemonic', () => {
    const json = keyring.createFromUri(DEV_PHRASE).toJson(password);
    decryptAccountMock.mockReturnValue(backup({ json: { substrateJson: JSON.stringify(json), ethJson: null } }));
    expect(() => BackupAccountMapper.getPairJson({} as never, 'incorrect')).toThrow();
  });

  it('rejects unsupported key types instead of silently restoring as sr25519', () => {
    decryptAccountMock.mockReturnValue(backup({ cryptoType: 'unknown' }));
    expect(() => BackupAccountMapper.getPairJson({} as never, password)).toThrow('polkadotjs.noAccount');
  });

  it('returns null when there is no recoverable backup material', () => {
    decryptAccountMock.mockReturnValue(backup({ mnemonicPhrase: null }));
    expect(BackupAccountMapper.getPairJson({} as never, password)).toBeNull();
  });

  it('creates encrypted backups from pair json exports', () => {
    const pairJson = keyring.createFromUri(DEV_PHRASE, { name: 'Alice' }).toJson();

    BackupAccountMapper.createFromPairJson(pairJson as never, 'password');

    expect(formatAccountAddressMock).toHaveBeenCalledWith(pairJson.address);
    expect(encryptAccountMock).toHaveBeenCalledWith(
      {
        name: 'Alice',
        address: `formatted:${pairJson.address}`,
        cryptoType: 'SR25519',
        backupAccountType: [BackupAccountType.JSON],
        mnemonicPhrase: undefined,
        substrateDerivationPath: null,
        ethDerivationPath: null,
        seed: null,
        json: {
          substrateJson: JSON.stringify(pairJson),
          ethJson: null,
        },
      },
      'password'
    );
    expect(generateSeedMock).not.toHaveBeenCalled();
  });

  it('adds passphrase and seed metadata when mnemonic data is provided', () => {
    const pairJson = keyring.createFromUri(DEV_PHRASE).toJson();

    BackupAccountMapper.createFromPairJson(pairJson as never, 'password', 'mnemonic phrase');

    expect(generateSeedMock).toHaveBeenCalledWith('mnemonic phrase');
    expect(encryptAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '',
        backupAccountType: [BackupAccountType.JSON, BackupAccountType.PASSHRASE, BackupAccountType.SEED],
        mnemonicPhrase: 'mnemonic phrase',
        seed: { substrateSeed: 'seed:mnemonic phrase', ethSeed: null },
      }),
      'password'
    );
  });

  it('records an ECDSA export with its canonical account identity and key type', () => {
    const pair = new Keyring({ type: 'ecdsa' }).createFromUri(DEV_PHRASE);
    const json = pair.toJson();
    BackupAccountMapper.createFromPairJson(json, password);
    expect(formatAccountAddressMock).toHaveBeenCalledWith(pair.address);
    expect(encryptAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        address: `formatted:${pair.address}`,
        cryptoType: 'ECDSA',
      }),
      password
    );
  });

  it('updates both the root name and serialized substrate json metadata', () => {
    const account = {
      name: 'Alice',
      json: {
        substrateJson: JSON.stringify({
          address: 'addr',
          meta: {},
        }),
      },
    };

    expect(BackupAccountMapper.changeName(account as never, 'Alice 2')).toEqual({
      name: 'Alice 2',
      json: {
        substrateJson: JSON.stringify({
          address: 'addr',
          meta: { name: 'Alice 2' },
        }),
      },
    });
  });
});
