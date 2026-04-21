import { describe, expect, it } from 'vitest';
import { DAI, XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

import {
  buildRouteTokens,
  routeIsValid,
  resolveRouteAddress,
  useSelectedTokensRoute as legacyUseSelectedTokensRoute,
} from '@/composables/useSelectedTokensRoute';
import { PageNames } from '@/consts';
import { useSelectedTokensRoute } from '@/shared/navigation/useSelectedTokensRoute';

const PSWAP_ADDRESS = '0x0200050000000000000000000000000000000000000000000000000000000000';

describe('useSelectedTokensRoute compatibility', () => {
  it('keeps the legacy composable entrypoint aligned with the shared implementation', () => {
    expect(legacyUseSelectedTokensRoute).toBe(useSelectedTokensRoute);
  });
});

describe('resolveRouteAddress', () => {
  it('resolves bundled whitelist symbols even when lookup tables are unavailable', () => {
    expect(resolveRouteAddress('XOR', undefined, undefined)).toBe(XOR.address);
    expect(resolveRouteAddress('XSTUSD', undefined, undefined)).toBe(XSTUSD.address);
    expect(resolveRouteAddress('DAI', undefined, undefined)).toBe(DAI.address);
    expect(resolveRouteAddress('PSWAP', undefined, undefined)).toBe(PSWAP_ADDRESS);
  });

  it('returns empty string for unknown values when lookup tables are unavailable', () => {
    expect(resolveRouteAddress('UNKNOWN', undefined, undefined)).toBe('');
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
    expect(buildRouteTokens({ address: XOR.address, symbol: '' } as any, {} as any)).toBe('XOR');
    expect(buildRouteTokens({ address: XSTUSD.address, symbol: '' } as any, {} as any)).toBe('XSTUSD');
  });

  it('uses bundled whitelist symbols when runtime whitelist lookup is unavailable', () => {
    expect(buildRouteTokens({ address: PSWAP_ADDRESS, symbol: 'PSWAP' } as any, {} as any)).toBe('PSWAP');
  });

  it('keeps address fallback on order-book routes when symbol resolution is unsafe', () => {
    expect(buildRouteTokens({ address: '0xabc', symbol: 'AAA' } as any, { AAA: '0xother' } as any)).toBe('0xabc');
  });
});
