import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNftStorage,
  loadNftStorageConstructor,
  resetNftStorageConstructorCache,
} from '@/stores/wallet/nftStorage';

const constructClient = vi.hoisted(() => vi.fn());

vi.mock('nft.storage', () => ({
  NFTStorage: class NFTStorage {
    constructor(options: unknown) {
      constructClient(options);
    }

    store = vi.fn();
  },
}));

describe('wallet NFT.Storage loader', () => {
  beforeEach(() => {
    constructClient.mockClear();
    resetNftStorageConstructorCache();
  });

  it('loads the constructor through the shared async boundary', async () => {
    resetNftStorageConstructorCache();

    const Constructor = await loadNftStorageConstructor();

    expect(Constructor.name).toBe('NFTStorage');
  });

  it('creates NFT.Storage clients after loading the constructor', async () => {
    resetNftStorageConstructorCache();

    const client = await createNftStorage({ token: 'token' });

    expect(client.constructor.name).toBe('NFTStorage');
    expect(client.store).toEqual(expect.any(Function));
  });

  it.each([undefined, '', '  \t\n'])(
    'rejects missing upload credentials without constructing a client',
    async (token) => {
      await expect(createNftStorage({ token })).rejects.toThrow('unknownErrorText');
      expect(constructClient).not.toHaveBeenCalled();
    }
  );
});
