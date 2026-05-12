import { describe, expect, it } from 'vitest';
import {
  createNftStorage,
  loadNftStorageConstructor,
  resetNftStorageConstructorCache,
} from '@/stores/wallet/nftStorage';

describe('wallet NFT.Storage loader', () => {
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
});
