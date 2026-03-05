import { describe, expect, it } from 'vitest';

import { resolveAppMainRouteClass } from '@/views/utils/resolveAppMainRouteClass';

describe('resolveAppMainRouteClass', () => {
  it('returns null for non-string and empty route names', () => {
    expect(resolveAppMainRouteClass(undefined)).toBeNull();
    expect(resolveAppMainRouteClass(null)).toBeNull();
    expect(resolveAppMainRouteClass('')).toBeNull();
    expect(resolveAppMainRouteClass(123)).toBeNull();
  });

  it('normalizes route names to lowercase by default', () => {
    expect(resolveAppMainRouteClass('Swap')).toBe('swap');
    expect(resolveAppMainRouteClass('AssetOwnerDetails')).toBe('assetownerdetails');
  });

  it('maps staking validator route variants to a single class token', () => {
    expect(resolveAppMainRouteClass('ValidatorsType')).toBe('selectvalidators');
    expect(resolveAppMainRouteClass('ValidatorsSelect')).toBe('selectvalidators');
    expect(resolveAppMainRouteClass('SelectValidators')).toBe('selectvalidators');
  });
});
