// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const viewPath = path.resolve(__dirname, '../../../src/views/Rewards.vue');

describe('Rewards source', () => {
  it('keeps the public rewards hint on the live inline text treatment', async () => {
    const source = await readFile(viewPath, 'utf8');

    expect(source).toContain('@include rewards-hint(46px, true);');
    expect(source).not.toContain('background: var(--s-color-utility-surface);');
    expect(source).not.toContain('box-shadow: var(--s-shadow-dialog);');
    expect(source).not.toContain(':global([design-system-theme=\'dark\']) .rewards-hint');
  });
});
