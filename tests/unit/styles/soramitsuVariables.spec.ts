// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const variablesPath = path.resolve(__dirname, '../../../src/styles/soramitsu-variables.scss');

describe('soramitsu variables', () => {
  it('keeps noir primary button text aligned with production palette', async () => {
    const variablesSource = await readFile(variablesPath, 'utf8');

    expect(variablesSource).toContain('$polkaswap-dark-token-overrides');
    expect(variablesSource).toContain('content-on-background-inverted: #391057');
    expect(variablesSource).toContain('primary-hover: #f754a3');
  });
});
