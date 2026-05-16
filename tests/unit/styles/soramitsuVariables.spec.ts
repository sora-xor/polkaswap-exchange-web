// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const variablesPath = path.resolve(__dirname, '../../../src/styles/soramitsu-variables.scss');
const urduFontPath = path.resolve(__dirname, '../../../src/assets/fonts/NotoNastaliqUrdu-wght.ttf');

describe('soramitsu variables', () => {
  it('keeps noir primary button text aligned with production palette', async () => {
    const variablesSource = await readFile(variablesPath, 'utf8');

    expect(variablesSource).toContain('$polkaswap-dark-token-overrides');
    expect(variablesSource).toContain('content-on-background-inverted: #391057');
    expect(variablesSource).toContain('primary-hover: #f754a3');
  });

  it('uses a Nastaliq-first font stack for Urdu', async () => {
    const variablesSource = await readFile(variablesPath, 'utf8');
    const fontAsset = await readFile(urduFontPath);

    expect(fontAsset.length).toBeGreaterThan(0);
    expect(variablesSource).toContain("@font-face");
    expect(variablesSource).toContain("url('@/assets/fonts/NotoNastaliqUrdu-wght.ttf')");
    expect(variablesSource).toContain("html[lang='ur']");
    expect(variablesSource).toContain("'Noto Nastaliq Urdu'");
    expect(variablesSource).toContain("'Jameel Noori Nastaleeq'");
    expect(variablesSource).toContain('--s-font-family-mono: var(--s-font-family-default);');
  });
});
