// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const commonStylesPath = path.resolve(__dirname, '../../../src/styles/common.scss');

describe('common button styles', () => {
  it('does not override production neumorphic primary hover states', async () => {
    const commonStylesSource = await readFile(commonStylesPath, 'utf8');

    expect(commonStylesSource).not.toContain("button.el-button.neumorphic.s-primary {");
    expect(commonStylesSource).not.toContain("[design-system-theme='light'] button.el-button.neumorphic.s-primary:hover");
    expect(commonStylesSource).not.toContain("[design-system-theme='dark'] button.el-button.neumorphic.s-primary:hover");
    expect(commonStylesSource).not.toContain('1px 1px 5px 0px #ffffff');
    expect(commonStylesSource).not.toContain('1px 1px 5px 0px #391057');
    expect(commonStylesSource).toContain('button.el-button.neumorphic.s-action:not(.s-primary) {');
  });
});
