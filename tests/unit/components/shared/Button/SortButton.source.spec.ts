import { describe, expect, it } from 'vitest';

import sortButtonSource from '@/components/shared/Button/SortButton.vue?raw';

describe('SortButton source', () => {
  it('keeps tooltip-wrapped header controls on a single inline row', () => {
    expect(sortButtonSource).toContain('white-space: nowrap;');
    expect(sortButtonSource).toContain('display: inline-flex;');
    expect(sortButtonSource).toContain('align-items: center;');
  });
});
