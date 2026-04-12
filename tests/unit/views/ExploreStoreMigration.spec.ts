// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');
const exploreRoot = path.join(repoRoot, 'src', 'views', 'Explore');

const exploreFiles = {
  books: path.join(exploreRoot, 'Books.vue'),
  demeter: path.join(exploreRoot, 'Demeter.vue'),
  pools: path.join(exploreRoot, 'Pools.vue'),
  tokens: path.join(exploreRoot, 'Tokens.vue'),
};

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('Explore view store migration', () => {
  it('keeps the Explore views off the root @/store import', async () => {
    const sources = await Promise.all(Object.values(exploreFiles).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('store.');
    }
  });

  it('keeps the pools view on wallet and pool facades', async () => {
    const source = await readSource(exploreFiles.pools);

    expect(source).toContain("from '@/stores/wallet'");
    expect(source).toContain("from '@/stores/pool'");
    expect(source).not.toContain("from '@/utils/app-store'");
    expect(source).not.toContain('walletStore.fiatPriceObject');
    expect(source).toContain('walletStore.isLoggedIn');
    expect(source).toContain('poolStore.accountLiquidity');
  });

  it('keeps asset-heavy Explore views on the assets/settings facades', async () => {
    const [booksSource, tokensSource] = await Promise.all([
      readSource(exploreFiles.books),
      readSource(exploreFiles.tokens),
    ]);

    expect(booksSource).toContain("from '@/stores/assets'");
    expect(booksSource).toContain('assetsStore.assetDataByAddress');
    expect(booksSource).toContain('assetsStore.whitelistAssets');

    expect(tokensSource).toContain("from '@/stores/assets'");
    expect(tokensSource).toContain("from '@/stores/settings'");
    expect(tokensSource).toContain('assetsStore.assetDataByAddress');
    expect(tokensSource).toContain('settingsStore.assetsFilter');
  });

  it('keeps the Demeter Explore view on the wallet facade', async () => {
    const source = await readSource(exploreFiles.demeter);

    expect(source).toContain("from '@/stores/wallet'");
    expect(source).toContain('walletStore.fiatPriceObject');
    expect(source).toContain('walletStore.isLoggedIn');
  });
});
