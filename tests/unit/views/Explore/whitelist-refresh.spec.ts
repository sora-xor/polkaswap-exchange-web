// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const booksViewPath = path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'ExploreBooksPage.vue');
const tokensViewPath = path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'ExploreTokensPage.vue');

const readSource = (filePath: string) => readFile(filePath, 'utf8');

describe('Explore whitelist refresh', () => {
  it('refetches tokens and books when whitelist assets arrive after mount', async () => {
    const [booksSource, tokensSource] = await Promise.all([readSource(booksViewPath), readSource(tokensViewPath)]);

    for (const source of [booksSource, tokensSource]) {
      expect(source).toContain("const whitelistSignature = computed(() => whitelistAssets.value.map((asset) => asset.address).join(';'));");
      expect(source).toContain('() => whitelistSignature.value');
      expect(source).toContain('{ immediate: true }');
      expect(source).not.toContain('onMounted(() => {');
    }
  });
});
