// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../../src/features/explore/pages/ExploreContainerPage.vue');

describe('Explore container source', () => {
  it('keeps the desktop search field at the live fixed width', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain('width: $explore-search-input-max-width;');
    expect(source).not.toContain('width: auto;');
  });

  it('keeps the desktop search field aligned with live neumorphic surface tokens', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain('border: 0 solid var(--s-color-base-border-primary);');
    expect(source).toContain('background-color: var(--s-color-base-background);');
    expect(source).toContain('box-shadow: var(--s-shadow-element);');
    expect(source).toContain('height: 21px;');
    expect(source).toContain('border: 0 none var(--s-color-base-content-primary);');
    expect(source).toContain(':deep(.explore-search.s-input .s-input__prefix) {');
    expect(source).toContain('position: absolute;');
    expect(source).not.toContain('border: 1px solid rgba(163, 164, 168, 0.6);');
    expect(source).not.toContain('1px 1px 5px rgb(255, 255, 255)');
  });
});
