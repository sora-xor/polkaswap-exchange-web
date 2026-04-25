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

  it('keeps shared card and tab effects aligned with the live site', async () => {
    const commonStylesSource = await readFile(commonStylesPath, 'utf8');

    expect(commonStylesSource).toContain(`.s-card,
.el-card.s-card {
  position: static;
  transition: all 0.3s ease;
}`);
    expect(commonStylesSource).toContain('.s-tabs {');
    expect(commonStylesSource).toContain('position: static;');
    expect(commonStylesSource).toContain('&.s-card {');
    expect(commonStylesSource).toContain('position: static !important;');
    expect(commonStylesSource).toContain('transition: all;');
    expect(commonStylesSource).toContain('.s-tabs .el-tabs__nav-wrap .el-tabs__item {');
    expect(commonStylesSource).toContain('border-color: var(--s-color-base-content-primary);');
    expect(commonStylesSource).toContain('border-style: none;');
    expect(commonStylesSource).toContain('border-color: var(--s-color-theme-accent);');
    expect(commonStylesSource).toContain('text-transform: uppercase;');
    expect(commonStylesSource).toContain('box-shadow: var(--neu-tab-shadow, var(--s-shadow-element-pressed));');
    expect(commonStylesSource).toContain('.el-skeleton__item {');
  });

  it('keeps legacy loading masks overlayed and centered like production widgets', async () => {
    const commonStylesSource = await readFile(commonStylesPath, 'utf8');

    expect(commonStylesSource).toMatch(
      /\.el-loading-mask \{[\s\S]*position: absolute;[\s\S]*top: 0;[\s\S]*right: 0;[\s\S]*bottom: 0;[\s\S]*left: 0;/
    );
    expect(commonStylesSource).toContain('&:not(.app-loading-overlay) .el-loading-spinner,');
    expect(commonStylesSource).toContain('&.app-loading-overlay .el-loading-spinner {');
    expect(commonStylesSource).toContain('text-align: center;');
    expect(commonStylesSource).toContain('top: 50%;');
    expect(commonStylesSource).toContain('margin-top: calc(var(--s-size-medium) / -2);');
    expect(commonStylesSource).toContain('height: var(--s-size-medium);');
    expect(commonStylesSource).toContain('width: var(--s-size-medium);');
    expect(commonStylesSource).toMatch(
      /\.s-skeleton \{[\s\S]*\.el-skeleton__circle \{[\s\S]*height: var\(--s-size-medium\);[\s\S]*line-height: 36px;[\s\S]*width: var\(--s-size-medium\);/
    );
  });

  it('keeps shared input transitions and autofill hooks aligned with production', async () => {
    const commonStylesSource = await readFile(commonStylesPath, 'utf8');

    expect(commonStylesSource).toContain('.el-input__inner {');
    expect(commonStylesSource).toContain(
      'transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1) !important;'
    );
    expect(commonStylesSource).toContain('animation-name: onAutoFillCancel;');
    expect(commonStylesSource).toContain('@keyframes onAutoFillCancel');
  });
});
