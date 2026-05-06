import { describe, expect, it } from 'vitest';

import { validateHorizontalPlacement, validateVerticalPlacement } from '@/lib/soramitsu-ui/components/Toasts/util';

describe('toast placement validators', () => {
  it('accepts supported vertical placements only', () => {
    expect(validateVerticalPlacement('top')).toBe(true);
    expect(validateVerticalPlacement('bottom')).toBe(true);
    expect(validateVerticalPlacement('left')).toBe(false);
    expect(validateVerticalPlacement(undefined)).toBe(false);
  });

  it('accepts supported horizontal placements only', () => {
    expect(validateHorizontalPlacement('left')).toBe(true);
    expect(validateHorizontalPlacement('center')).toBe(true);
    expect(validateHorizontalPlacement('right')).toBe(true);
    expect(validateHorizontalPlacement('top')).toBe(false);
    expect(validateHorizontalPlacement(null)).toBe(false);
  });
});
