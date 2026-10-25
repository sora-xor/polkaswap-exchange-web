// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const chartSkeletonPath = path.resolve(__dirname, '../../../../../src/components/shared/Chart/ChartSkeleton.vue');

describe('ChartSkeleton source', () => {
  it('keeps chart skeleton line and label thickness aligned with production', async () => {
    const source = await readFile(chartSkeletonPath, 'utf8');

    expect(source).toContain('min-height: unset;');
    expect(source).toContain('min-height: 0;');
    expect(source).toContain('line-height: 36px;');
    expect(source).toContain('&-label.el-skeleton__item.el-skeleton__rect {');
    expect(source).toContain('height: 8px;');
    expect(source).toContain('&-border.el-skeleton__rect {');
    expect(source).toContain('height: 1px;');
  });
});
