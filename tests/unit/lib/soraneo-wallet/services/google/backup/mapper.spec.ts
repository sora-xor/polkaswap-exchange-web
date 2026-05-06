import { beforeEach, describe, expect, it, vi } from 'vitest';

const createAccountPairMock = vi.hoisted(() => vi.fn());
const formatAccountAddressMock = vi.hoisted(() => vi.fn((address: string) => `formatted:${address}`));
const decryptAccountMock = vi.hoisted(() => vi.fn());
const encryptAccountMock = vi.hoisted(() => vi.fn((account) => ({ encrypted: true, ...account })));
const generateSeedMock = vi.hoisted(() => vi.fn((mnemonic: string) => `seed:${mnemonic}`));
const prepareSeedMock = vi.hoisted(() => vi.fn((seed: string) => `prepared:${seed}`));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    createAccountPair: createAccountPairMock,
  },
}));

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

describe('BackupAccountMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rebuilds pair jsons from mnemonic backups', () => {
    const pairJson = { address: 'addr', meta: { name: 'Alice' } };
    const toJsonMock = vi.fn().mockReturnValue(pairJson);

    decryptAccountMock.mockReturnValue({
      name: 'Alice',
      mnemonicPhrase: 'mnemonic phrase',
      seed: null,
      json: null,
    });
    createAccountPairMock.mockReturnValue({ toJson: toJsonMock });

    expect(BackupAccountMapper.getPairJson({} as never, 'password')).toEqual(pairJson);
    expect(createAccountPairMock).toHaveBeenCalledWith('mnemonic phrase', 'Alice');
    expect(toJsonMock).toHaveBeenCalledWith('password');
  });

  it('uses prepared substrate seeds when mnemonic data is unavailable', () => {
    const pairJson = { address: 'addr', meta: { name: 'Alice' } };
    const toJsonMock = vi.fn().mockReturnValue(pairJson);

    decryptAccountMock.mockReturnValue({
      name: 'Alice',
      mnemonicPhrase: null,
      seed: { substrateSeed: 'raw-seed' },
      json: null,
    });
    createAccountPairMock.mockReturnValue({ toJson: toJsonMock });

    expect(BackupAccountMapper.getPairJson({} as never, 'password')).toEqual(pairJson);
    expect(prepareSeedMock).toHaveBeenCalledWith('raw-seed');
    expect(createAccountPairMock).toHaveBeenCalledWith('prepared:raw-seed', 'Alice');
  });

  it('falls back to substrate json payloads when no mnemonic or seed is present', () => {
    decryptAccountMock.mockReturnValue({
      name: 'Alice',
      mnemonicPhrase: null,
      seed: null,
      json: {
        substrateJson: '{"address":"addr","meta":{"name":"Alice"}}',
      },
    });

    expect(BackupAccountMapper.getPairJson({} as never, 'password')).toEqual({
      address: 'addr',
      meta: { name: 'Alice' },
    });
    expect(createAccountPairMock).not.toHaveBeenCalled();
  });

  it('returns null when there is no recoverable backup material', () => {
    decryptAccountMock.mockReturnValue({
      name: 'Alice',
      mnemonicPhrase: null,
      seed: null,
      json: null,
    });

    expect(BackupAccountMapper.getPairJson({} as never, 'password')).toBeNull();
  });

  it('creates encrypted backups from pair json exports', () => {
    const pairJson = {
      address: 'addr',
      meta: { name: 'Alice' },
    };

    BackupAccountMapper.createFromPairJson(pairJson as never, 'password');

    expect(formatAccountAddressMock).toHaveBeenCalledWith('addr');
    expect(encryptAccountMock).toHaveBeenCalledWith(
      {
        name: 'Alice',
        address: 'formatted:addr',
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
    const pairJson = {
      address: 'addr',
      meta: {},
    };

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
