import { describe, expect, it } from 'vitest';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';

import { buildRouteTokens, routeIsValid, resolveRouteAddress } from '@/composables/useSelectedTokensRoute';
import { PageNames } from '@/consts';

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

  it('resolves core trade symbols even when whitelist lookup is unavailable', () => {
    expect(resolveRouteAddress('DAI', {}, {})).toBe(DAI.address);
  });

  it('falls back to assets table symbol lookup when whitelist symbol map is incomplete', () => {
    const pswapAddress = '0x0200050000000000000000000000000000000000000000000000000000000000';
    const assetsTable = {
      [pswapAddress]: { address: pswapAddress, symbol: 'PSWAP' },
    } as unknown as Parameters<typeof resolveRouteAddress>[1];

    expect(resolveRouteAddress('PSWAP', assetsTable, {})).toBe(pswapAddress);
  });

  it('ignores empty whitelist symbol entries and still resolves from assets table', () => {
    const pswapAddress = '0x0200050000000000000000000000000000000000000000000000000000000000';
    const assetsTable = {
      [pswapAddress]: { address: pswapAddress, symbol: 'PSWAP' },
    } as unknown as Parameters<typeof resolveRouteAddress>[1];
    const whitelistBySymbol = { PSWAP: '' } as unknown as Parameters<typeof resolveRouteAddress>[2];

    expect(resolveRouteAddress('PSWAP', assetsTable, whitelistBySymbol)).toBe(pswapAddress);
  });
});

describe('routeIsValid', () => {
  it('accepts non-XOR order-book pairs when both addresses are present', () => {
    const isValid = routeIsValid({ first: 'DAI', second: 'KUSD' }, PageNames.OrderBook, '0x01', '0x02');
    expect(isValid).toBe(true);
  });
});

describe('buildRouteTokens', () => {
  const token = { symbol: 'DAI', address: '0xdai' } as const;

  it('falls back to address when symbol mapping is unavailable', () => {
    expect(buildRouteTokens(token as any, {} as any)).toBe('0xdai');
  });

  it('uses symbol when symbol lookup resolves to the token address', () => {
    expect(buildRouteTokens(token as any, { DAI: '0xdai' } as any)).toBe('DAI');
  });

  it('falls back to address when token symbol cannot be safely resolved', () => {
    expect(buildRouteTokens(token as any, { DAI: '0xother' } as any)).toBe('0xdai');
  });

  it('uses stable symbol shortcuts for core route assets', () => {
    expect(buildRouteTokens({ address: DAI.address, symbol: '' } as any, {} as any)).toBe('DAI');
  });

  it('keeps address fallback on order-book routes when symbol resolution is unsafe', () => {
    expect(buildRouteTokens({ address: '0xabc', symbol: 'AAA' } as any, { AAA: '0xother' } as any)).toBe('0xabc');
  });
});
