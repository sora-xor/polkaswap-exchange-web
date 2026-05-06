// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const componentPath = path.resolve(__dirname, '../../../../src/components/shared/ResponsiveTabs.vue');

describe('ResponsiveTabs source', () => {
  it('keeps header dropdown labels aligned with the live large-title treatment', async () => {
    const source = await readFile(componentPath, 'utf8');

    expect(source).toContain('margin: 0;');
    expect(source).toContain('font-size: var(--s-font-size-large);');
    expect(source).toContain('line-height: 1.3;');
  });

  it('keeps desktop rounded tabs aligned with live tab weight and border states', async () => {
    const source = await readFile(componentPath, 'utf8');

    expect(source).toContain('border-color: var(--s-color-base-content-primary);');
    expect(source).toContain('font-weight: 600;');
    expect(source).toContain('&.is-active {\n        border-color: var(--s-color-theme-accent);');
  });
});
