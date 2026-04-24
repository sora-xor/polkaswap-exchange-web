// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const pointSystemV2Path = path.resolve(__dirname, '../../../src/features/rewards/pages/PointSystemV2Page.vue');

describe('PointSystemV2 page styles', () => {
  it('keeps the points card depth and background aligned with the live site', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toContain('box-shadow: unset !important;');
    expect(source).toContain('.points.s-card {');
    expect(source).toContain('background-color: var(--s-color-base-background);');
  });
});
