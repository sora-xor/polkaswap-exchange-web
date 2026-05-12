import type { NFTStorage as NFTStorageInstance } from 'nft.storage';

type NftStorageOptions = ConstructorParameters<typeof import('nft.storage').NFTStorage>[0];
type NftStorageConstructor = new (options: NftStorageOptions) => NFTStorageInstance;

let nftStorageConstructorPromise: Promise<NftStorageConstructor> | null = null;

/**
 * Loads the NFT.Storage client only when NFT minting needs IPFS uploads.
 */
export const loadNftStorageConstructor = async (): Promise<NftStorageConstructor> => {
  nftStorageConstructorPromise ??= import('nft.storage').then(({ NFTStorage }) => NFTStorage);
  return nftStorageConstructorPromise;
};

/**
 * Creates an NFT.Storage client without pulling the library into app startup.
 */
export const createNftStorage = async (options: NftStorageOptions): Promise<NFTStorageInstance> => {
  const NFTStorage = await loadNftStorageConstructor();
  return new NFTStorage(options);
};

/**
 * Clears the cached loader for isolated unit tests.
 */
export const resetNftStorageConstructorCache = (): void => {
  nftStorageConstructorPromise = null;
};
