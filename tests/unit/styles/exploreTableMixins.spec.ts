// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const mixinsPath = path.resolve(__dirname, '../../../src/styles/_mixins.scss');

describe('explore-table mixin', () => {
  it('keeps s-table explore surfaces aligned with production table spacing and type scale', async () => {
    const mixinsSource = await readFile(mixinsPath, 'utf8');

    expect(mixinsSource).toContain('.explore-table.s-table');
    expect(mixinsSource).toContain('.s-table__th {');
    expect(mixinsSource).toContain('height: 49px;');
    expect(mixinsSource).toContain('.s-table__td {');
    expect(mixinsSource).toContain('height: 70px;');
    expect(mixinsSource).toContain('.s-table__header-cell {');
    expect(mixinsSource).toContain('font-size: 14px;');
    expect(mixinsSource).toContain('line-height: 23px;');
    expect(mixinsSource).toContain('.s-table-cell-default {');
    expect(mixinsSource).toContain('font-size: 16px;');
    expect(mixinsSource).toContain('.s-table-cell-default__content');
    expect(mixinsSource).toContain('word-break: normal;');
  });
});
