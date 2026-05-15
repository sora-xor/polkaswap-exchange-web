// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const pointSystemV2Path = path.resolve(__dirname, '../../../src/features/rewards/pages/PointSystemV2Page.vue');

describe('PointSystemV2 page styles', () => {
  it('keeps the points card depth and background aligned with the live site', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toContain('box-shadow: unset !important;');
    expect(source).not.toContain('background-color: unset;');
    expect(source).not.toContain('background-size: 100% 214px;');
    expect(source).not.toContain('background-size: 100% 196px;');
    expect(source).toContain('.points.s-card {');
    expect(source).toContain('background-color: var(--s-color-base-background);');
    expect(source).toContain('background-position: top right;');
    expect(source).toContain('background-size: auto 214px;');
    expect(source).toContain('background-size: auto 196px;');
  });

  it('keeps points tab overrides scoped to the points tabs instance', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toMatch(/^\s*\.s-tabs \.el-tabs__header \.el-tabs__item \{\n\s*font-weight: 400 !important;/m);
    expect(source).toContain('.points__tabs.s-tabs .el-tabs__header .el-tabs__item {');
  });

  it('keeps the Soratopia banner selector single-scoped', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toContain('&__soratopia,\n  &__soratopia');
    expect(source).toContain('&__soratopia {');
  });

  it('keeps the logged-out connect state compact and centered', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toContain('height: 350px;');
    expect(source).toContain('min-height: 264px;');
    expect(source).toContain('align-items: center;');
  });
});
