// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const booksViewPath = path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'ExploreBooksPage.vue');
const poolsViewPath = path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'ExplorePoolsPage.vue');
const tokensViewPath = path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'ExploreTokensPage.vue');

const readSource = (filePath: string) => readFile(filePath, 'utf8');

describe('Explore whitelist refresh', () => {
  it('refetches tokens and books when whitelist assets arrive after mount', async () => {
    const [booksSource, tokensSource] = await Promise.all([readSource(booksViewPath), readSource(tokensViewPath)]);

    for (const source of [booksSource, tokensSource]) {
      expect(source).toContain(
        "const whitelistSignature = computed(() => whitelistAssets.value.map((asset) => asset.address).join(';'));"
      );
      expect(source).toContain('() => whitelistSignature.value');
      expect(source).toContain('{ immediate: true }');
      expect(source).not.toContain('onMounted(() => {');
    }
  });

  it('refetches indexer-backed tables when the indexer endpoint becomes available after mount', async () => {
    const [booksSource, poolsSource, tokensSource] = await Promise.all([
      readSource(booksViewPath),
      readSource(poolsViewPath),
      readSource(tokensViewPath),
    ]);

    for (const source of [booksSource, poolsSource, tokensSource]) {
      expect(source).toContain('const indexerEndpoint = computed(() => {');
      expect(source).toContain('const type = settingsStore.indexerType;');
      expect(source).toContain("return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';");
      expect(source).toContain('watch(indexerEndpoint, (endpoint, previousEndpoint) => {');
      expect(source).toContain('if (!endpoint || endpoint === previousEndpoint) return;');
      expect(source).toContain('updateExploreData();');
    }
  });
});
