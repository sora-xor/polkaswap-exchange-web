import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formatAccountAddressMock = vi.hoisted(() => vi.fn((address: string, withPrefix = true) => `${address}|${withPrefix}`));
const createFromPairJsonMock = vi.hoisted(() => vi.fn());
const changeNameMock = vi.hoisted(() => vi.fn());
const getPairJsonMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const getAllMock = vi.hoisted(() => vi.fn());
const getMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatAccountAddress: formatAccountAddressMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/backup/mapper', () => ({
  BackupAccountMapper: {
    createFromPairJson: createFromPairJsonMock,
    changeName: changeNameMock,
    getPairJson: getPairJsonMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/index', () => ({
  GDriveStorage: {
    create: createMock,
    update: updateMock,
    delete: deleteMock,
    getAll: getAllMock,
    get: getMock,
  },
}));

import Accounts from '@/lib/soraneo-wallet/src/services/google/wallet/accounts';

describe('Google Drive wallet accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    getAllMock.mockResolvedValue([]);
    createMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps Drive file metadata into injected accounts', async () => {
    getAllMock.mockResolvedValue([
      { id: '1', name: 'alice.json', description: 'Alice' },
      { id: '2', name: 'bob.json', description: 'Bob' },
    ]);

    const accounts = new Accounts();

    await expect(accounts.get()).resolves.toEqual([
      { id: '1', address: 'alice|false', name: 'Alice' },
      { id: '2', address: 'bob|false', name: 'Bob' },
    ]);
    expect(formatAccountAddressMock).toHaveBeenNthCalledWith(1, 'alice', false);
    expect(formatAccountAddressMock).toHaveBeenNthCalledWith(2, 'bob', false);
  });

  it('creates a new encrypted backup and refreshes the local cache', async () => {
    const pairJson = { address: 'addr', meta: { name: 'Alice' } };
    const encryptedAccount = {
      address: 'encoded-address',
      name: 'Alice',
      json: { substrateJson: '{"address":"addr"}', ethJson: null },
    };

    createFromPairJsonMock.mockReturnValue(encryptedAccount);
    getAllMock.mockResolvedValue([{ id: '1', name: 'encoded-address.json', description: 'Alice' }]);

    const accounts = new Accounts();

    await accounts.add(pairJson as never, 'password', 'mnemonic');

    expect(createFromPairJsonMock).toHaveBeenCalledWith(pairJson, 'password', 'mnemonic');
    expect(createMock).toHaveBeenCalledWith({
      name: 'encoded-address.json',
      description: 'Alice',
      json: JSON.stringify(encryptedAccount),
    });
    expect(getAllMock).toHaveBeenCalledTimes(1);
  });

  it('does not add an account when the formatted address already exists locally', async () => {
    const accounts = new Accounts();
    (accounts as any)._list = [{ id: '1', address: 'addr|false', name: 'Alice' }];

    await accounts.add({ address: 'addr' } as never, 'password');

    expect(createFromPairJsonMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('updates the stored name and patches the local cache without a second fetch', async () => {
    const encryptedAccount = { address: 'addr', name: 'Alice' };
    const renamedAccount = { address: 'addr', name: 'Alice 2' };

    getAllMock.mockResolvedValue([{ id: '1', name: 'addr.json', description: 'Alice' }]);
    getMock.mockResolvedValue(encryptedAccount);
    changeNameMock.mockReturnValue(renamedAccount);

    const accounts = new Accounts();

    await accounts.changeName('addr', 'Alice 2');

    expect(getAllMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith('1');
    expect(changeNameMock).toHaveBeenCalledWith(encryptedAccount, 'Alice 2');
    expect(updateMock).toHaveBeenCalledWith('1', {
      name: 'addr.json',
      description: 'Alice 2',
      json: JSON.stringify(renamedAccount),
    });
    expect((accounts as any)._list).toEqual([{ id: '1', address: 'addr|false', name: 'Alice 2' }]);
  });

  it('deletes the stored account and removes it from the local cache', async () => {
    getAllMock.mockResolvedValue([{ id: '1', name: 'addr.json', description: 'Alice' }]);

    const accounts = new Accounts();

    await accounts.delete('addr');

    expect(deleteMock).toHaveBeenCalledWith('1');
    expect((accounts as any)._list).toEqual([]);
  });

  it('decrypts an account export through the mapper', async () => {
    const encryptedAccount = { address: 'addr', name: 'Alice' };
    const pairJson = { address: 'addr', meta: { name: 'Alice' } };

    getAllMock.mockResolvedValue([{ id: '1', name: 'addr.json', description: 'Alice' }]);
    getMock.mockResolvedValue(encryptedAccount);
    getPairJsonMock.mockReturnValue(pairJson);

    const accounts = new Accounts();

    await expect(accounts.getAccount('addr', 'password')).resolves.toEqual(pairJson);
    expect(getMock).toHaveBeenCalledWith('1');
    expect(getPairJsonMock).toHaveBeenCalledWith(encryptedAccount, 'password');
  });

  it('polls through subscribe and stops after unsubscribe', async () => {
    vi.useFakeTimers();
    getAllMock.mockResolvedValue([{ id: '1', name: 'addr.json', description: 'Alice' }]);

    const accounts = new Accounts();
    const callback = vi.fn();
    const getSpy = vi.spyOn(accounts, 'get').mockResolvedValue([]);

    const unsubscribe = accounts.subscribe(callback);

    expect(typeof unsubscribe).toBe('function');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(getSpy).toHaveBeenCalledTimes(1);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect((accounts as any).accountsCallback).toBeNull();
  });
});
