import { describe, expect, it } from 'vitest';

import { VISUAL_TEST_MASK_SELECTORS } from '@/../tests/e2e/ui/support/render-assertions';

describe('render assertion masks', () => {
  it('masks dynamic app chrome from visual parity snapshots', () => {
    expect(VISUAL_TEST_MASK_SELECTORS).toContain('.app-menu');
    expect(VISUAL_TEST_MASK_SELECTORS).not.toContain('a[href="#/burn"]');
  });
});
