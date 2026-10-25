import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formatAccountAddressMock = vi.hoisted(() =>
  vi.fn((address: string, withPrefix = true) => `${address}|${withPrefix}`)
);
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

  it('does not publish a new account after a rejected backup write and refreshes only after retry succeeds', async () => {
    vi.useFakeTimers();
    const accounts = new Accounts();
    const callback = vi.fn();
    const stop = accounts.subscribe(callback);
    const pair = { address: 'addr', meta: { name: 'Wallet' } };
    createFromPairJsonMock.mockReturnValue({ address: 'addr', name: 'Wallet' });
    createMock.mockRejectedValueOnce(new Error('upload failed')).mockResolvedValueOnce(undefined);
    await expect(accounts.add(pair as never, 'synthetic password')).rejects.toThrow('upload failed');
    expect(callback).not.toHaveBeenCalled();
    expect(getAllMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    getAllMock.mockResolvedValueOnce([{ id: 'new-file', name: 'addr.json', description: 'Wallet' }]);
    await accounts.add(pair as never, 'synthetic password');
    expect(callback).toHaveBeenCalledExactlyOnceWith([{ id: 'new-file', address: 'addr|false', name: 'Wallet' }]);
    expect(createMock).toHaveBeenCalledTimes(2);
    stop();
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

    const unsubscribe = accounts.subscribe(callback);

    expect(typeof unsubscribe).toBe('function');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(getAllMock).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([{ id: '1', address: 'addr|false', name: 'Alice' }]);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(getAllMock).toHaveBeenCalledTimes(1);
    expect((accounts as any).accountsCallbacks.size).toBe(0);
  });

  it('shares one poll loop while keeping subscriber teardown independent', async () => {
    vi.useFakeTimers();
    getAllMock.mockResolvedValue([{ id: '1', name: 'addr.json', description: 'Alice' }]);

    const accounts = new Accounts();
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const unsubscribeFirst = accounts.subscribe(firstCallback);
    const unsubscribeSecond = accounts.subscribe(secondCallback);

    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);

    unsubscribeSecond();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let an older Drive response overwrite a newer account list', async () => {
    let resolveFirst!: (files: Array<{ id: string; name: string; description: string }>) => void;
    let resolveSecond!: (files: Array<{ id: string; name: string; description: string }>) => void;

    getAllMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const accounts = new Accounts();
    const firstRequest = accounts.get();
    const secondRequest = accounts.get();

    resolveSecond([{ id: '2', name: 'new.json', description: 'New' }]);
    await expect(secondRequest).resolves.toEqual([{ id: '2', address: 'new|false', name: 'New' }]);

    resolveFirst([{ id: '1', name: 'old.json', description: 'Old' }]);
    await expect(firstRequest).resolves.toEqual([{ id: '1', address: 'old|false', name: 'Old' }]);

    expect((accounts as any)._list).toEqual([{ id: '2', address: 'new|false', name: 'New' }]);
  });

  it('ignores an in-flight poll response after the final subscriber stops', async () => {
    vi.useFakeTimers();
    let resolvePoll!: (files: Array<{ id: string; name: string; description: string }>) => void;
    getAllMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePoll = resolve;
        })
    );

    const accounts = new Accounts();
    const callback = vi.fn();
    const unsubscribe = accounts.subscribe(callback);

    await vi.advanceTimersByTimeAsync(60_000);
    unsubscribe();
    resolvePoll([{ id: '1', name: 'stale.json', description: 'Stale' }]);
    await Promise.resolve();
    await Promise.resolve();

    expect((accounts as any)._list).toEqual([]);
    expect(callback).not.toHaveBeenCalled();
  });
});
