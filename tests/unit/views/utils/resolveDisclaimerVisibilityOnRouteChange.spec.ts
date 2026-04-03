import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { resolveDisclaimerVisibilityOnRouteChange } from '@/views/utils/resolveDisclaimerVisibilityOnRouteChange';

describe('resolveDisclaimerVisibilityOnRouteChange', () => {
  it('keeps the disclaimer auto-visible on swap until the user accepts it', () => {
    expect(resolveDisclaimerVisibilityOnRouteChange(false, false, PageNames.Swap)).toBe(true);
    expect(resolveDisclaimerVisibilityOnRouteChange(true, false, PageNames.Swap)).toBe(true);
  });

  it('hides the disclaimer automatically away from swap until accepted', () => {
    expect(resolveDisclaimerVisibilityOnRouteChange(true, false, PageNames.Wallet)).toBe(false);
    expect(resolveDisclaimerVisibilityOnRouteChange(true, false, PageNames.Kensetsu)).toBe(false);
  });

  it('preserves the current visibility after the user accepts the disclaimer', () => {
    expect(resolveDisclaimerVisibilityOnRouteChange(false, true, PageNames.Wallet)).toBe(false);
    expect(resolveDisclaimerVisibilityOnRouteChange(true, true, PageNames.Wallet)).toBe(true);
  });
});
