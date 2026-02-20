import { describe, expect, it } from 'vitest';

import { resolveRouteAddress } from '@/composables/useSelectedTokensRoute';

describe('resolveRouteAddress', () => {
  it('returns empty string when lookup tables are unavailable', () => {
    expect(resolveRouteAddress('XOR', undefined, undefined)).toBe('');
    expect(
      resolveRouteAddress('0x0200000000000000000000000000000000000000000000000000000000000000', undefined, undefined)
    ).toBe('');
  });

  it('resolves symbol and address values from available lookup tables', () => {
    const assetAddress = '0x0200000000000000000000000000000000000000000000000000000000000000';
    const assetsTable = {
      [assetAddress]: { address: assetAddress },
    } as unknown as Parameters<typeof resolveRouteAddress>[1];
    const whitelistBySymbol = { XOR: '0x02' } as unknown as Parameters<typeof resolveRouteAddress>[2];

    expect(resolveRouteAddress('XOR', {}, whitelistBySymbol)).toBe('0x02');
    expect(resolveRouteAddress(assetAddress, assetsTable, {})).toBe(assetAddress);
  });
});
