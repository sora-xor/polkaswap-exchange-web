import { describe, expect, it } from 'vitest';

import { isSelectableAsset } from '@/components/shared/SelectAsset/utils';

describe('select asset utils', () => {
  it('accepts asset-like payloads with a non-empty address', () => {
    expect(
      isSelectableAsset({
        address: '0xasset',
        symbol: 'VAL',
      })
    ).toBe(true);
  });

  it('rejects non-asset payloads such as click events', () => {
    expect(
      isSelectableAsset({
        type: 'click',
        target: {},
      })
    ).toBe(false);
  });

  it('rejects assets without a valid address', () => {
    expect(isSelectableAsset({ address: '' })).toBe(false);
    expect(isSelectableAsset(null)).toBe(false);
    expect(isSelectableAsset('token')).toBe(false);
  });
});
