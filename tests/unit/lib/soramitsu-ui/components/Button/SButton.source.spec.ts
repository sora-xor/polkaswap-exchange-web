// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const sourcePath = path.resolve(process.cwd(), 'src/lib/soramitsu-ui/components/Button/SButton.vue');

describe('SButton source', () => {
  it('keeps loading spinners centered within large action buttons', async () => {
    const source = await readFile(sourcePath, 'utf8');

    expect(source).toContain('.s-button .s-button__spinner');
    expect(source).toContain('inset: 0;');
    expect(source).toContain('margin: auto;');
    expect(source).toContain('transform: none;');
    expect(source).toContain('line-height: 0;');
  });
});
