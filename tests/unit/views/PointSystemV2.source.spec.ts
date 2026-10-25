// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const pointSystemV2Path = path.resolve(__dirname, '../../../src/features/rewards/pages/PointSystemV2Page.vue');
const taskCardPath = path.resolve(
  __dirname,
  '../../../src/features/rewards/components/point-system/TaskCard.vue'
);
const pointCardPath = path.resolve(
  __dirname,
  '../../../src/features/rewards/components/point-system/PointCard.vue'
);
const firstTxCardPath = path.resolve(
  __dirname,
  '../../../src/features/rewards/components/point-system/FirstTxCard.vue'
);
const progressCardPath = path.resolve(
  __dirname,
  '../../../src/features/rewards/components/point-system/ProgressCard.vue'
);

describe('PointSystemV2 page styles', () => {
  it('keeps the points card depth and background aligned with the live site', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toContain('box-shadow: unset !important;');
    expect(source).not.toContain('background-color: unset;');
    expect(source).not.toContain('background-color: rgba(255, 255, 255, 0.1);');
    expect(source).not.toContain('background-size: 100% 214px;');
    expect(source).not.toContain('background-size: 100% 196px;');
    expect(source).toContain('.points.s-card {');
    expect(source).toContain('background-color: var(--s-color-base-background);');
    expect(source).toContain('background-color: var(--s-color-utility-surface);');
    expect(source).toContain('border: 1px solid var(--s-color-base-border-secondary);');
    expect(source).toContain('background-position: top right;');
    expect(source).toContain('background-size: auto 214px;');
    expect(source).toContain('background-size: auto 196px;');
    expect(source).toContain('max-width: calc(100% - $inner-spacing-large * 2);');
    expect(source).toContain('font-size: var(--s-heading1-font-size);');
  });

  it('keeps points tab overrides scoped to the points tabs instance', async () => {
    const source = await readFile(pointSystemV2Path, 'utf8');

    expect(source).not.toMatch(/^\s*\.s-tabs \.el-tabs__header \.el-tabs__item \{\n\s*font-weight: 400 !important;/m);
    expect(source).toContain('.points__tabs.s-tabs .el-tabs__header .el-tabs__item {');
    expect(source).toContain('background-color: var(--s-color-theme-accent) !important;');
    expect(source).toContain('color: var(--s-color-base-on-accent) !important;');
  });

  it('keeps point-system child cards on readable design-system tokens', async () => {
    const [taskCard, pointCard, firstTxCard, progressCard] = await Promise.all(
      [taskCardPath, pointCardPath, firstTxCardPath, progressCardPath].map((sourcePath) => readFile(sourcePath, 'utf8'))
    );

    expect(taskCard).toContain('color: var(--s-color-base-content-primary);');
    expect(taskCard).toContain('background-color: var(--s-color-theme-accent);');
    expect(pointCard).not.toContain('background-color: rgba(35, 7, 53, 0.64);');
    expect(pointCard).toContain('color: var(--s-color-base-content-primary);');
    expect(firstTxCard).toContain('color: var(--s-color-base-content-primary);');
    expect(progressCard).toContain('background: var(--s-color-base-background);');
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
