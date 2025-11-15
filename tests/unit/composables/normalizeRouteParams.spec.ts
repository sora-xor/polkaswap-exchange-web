import { describe, expect, it } from 'vitest';

import { normalizeRouteParams } from '@/composables/utils/normalizeRouteParams';

describe('normalizeRouteParams', () => {
  it('returns undefined params when input is nullish or non-object', () => {
    expect(normalizeRouteParams(undefined)).toEqual({ first: undefined, second: undefined });
    expect(normalizeRouteParams(null)).toEqual({ first: undefined, second: undefined });
    expect(normalizeRouteParams('invalid' as unknown as Record<string, unknown>)).toEqual({
      first: undefined,
      second: undefined,
    });
  });

  it('extracts string values and ignores other types', () => {
    expect(normalizeRouteParams({ first: 'AAA', second: 'BBB' })).toEqual({ first: 'AAA', second: 'BBB' });
    expect(normalizeRouteParams({ first: 1, second: {} })).toEqual({ first: undefined, second: undefined });
  });
});
