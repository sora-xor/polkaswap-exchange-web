import { describe, expect, it } from 'vitest';

import { isSelectOptions } from '@/lib/soramitsu-ui/components/Select/utils';

describe('isSelectOptions', () => {
  it('treats empty arrays as flat option lists', () => {
    expect(isSelectOptions([])).toBe(true);
  });

  it('returns true for flat select options with labels', () => {
    expect(isSelectOptions([{ label: 'One', value: '1' }] as never)).toBe(true);
  });

  it('returns false for grouped select options', () => {
    expect(isSelectOptions([{ title: 'Group', options: [{ label: 'One', value: '1' }] }] as never)).toBe(false);
  });
});
