// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../../src/views/Explore/Container.vue');

describe('Explore container source', () => {
  it('keeps the desktop search field at the live fixed width', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain('width: $explore-search-input-max-width;');
    expect(source).not.toContain('width: auto;');
  });
});
