import { beforeEach, describe, expect, it, vi } from 'vitest';

const excludePoolXYKAssetsMock = vi.hoisted(() => vi.fn((assets) => assets.slice(0, 1)));
const formatStringNumberMock = vi.hoisted(() =>
  vi.fn((value: Nullable<string>) => ({
    isFinity: () => value !== 'Infinity',
    toCodecString: () => `codec:${value}`,
  }))
);

vi.mock('@sora-substrate/sdk/build/assets', () => ({
  excludePoolXYKAssets: excludePoolXYKAssetsMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatStringNumber: formatStringNumberMock,
}));

import {
  parseAssetFiatPrice,
  parseAssetRegistrationStreamUpdate,
  parsePriceStreamUpdate,
} from '@/lib/soraneo-wallet/src/services/indexer/explorer/utils';

describe('indexer explorer utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses finite asset fiat prices into codec values', () => {
    expect(parseAssetFiatPrice({ id: 'xor', priceUSD: '1.23' } as never)).toEqual({ xor: 'codec:1.23' });
    expect(formatStringNumberMock).toHaveBeenCalledWith('1.23');
  });

  it('omits non-finite asset fiat prices', () => {
    expect(parseAssetFiatPrice({ id: 'xor', priceUSD: 'Infinity' } as never)).toEqual({});
  });

  it('returns null when a price stream update has no payload', () => {
    expect(parsePriceStreamUpdate(null as never)).toBeNull();
    expect(parsePriceStreamUpdate({ data: '' } as never)).toBeNull();
  });

  it('filters non-finite prices out of stream updates', () => {
    const payload = { data: JSON.stringify({ xor: '1.23', val: 'Infinity', dai: '0' }) };

    expect(parsePriceStreamUpdate(payload as never)).toEqual({
      xor: 'codec:1.23',
      dai: 'codec:0',
    });
  });

  it('parses asset registration updates and normalizes decimals before filtering', () => {
    const assetA = JSON.stringify({ address: '0x01', symbol: 'AAA', decimals: '18' });
    const assetB = JSON.stringify({ address: '0x02', symbol: 'BBB', decimals: '8' });

    const result = parseAssetRegistrationStreamUpdate({
      data: JSON.stringify({
        a: assetA,
        b: assetB,
      }),
    } as never);

    expect(excludePoolXYKAssetsMock).toHaveBeenCalledWith([
      { address: '0x01', symbol: 'AAA', decimals: 18 },
      { address: '0x02', symbol: 'BBB', decimals: 8 },
    ]);
    expect(result).toEqual([{ address: '0x01', symbol: 'AAA', decimals: 18 }]);
  });

  it('handles empty asset registration payloads', () => {
    expect(parseAssetRegistrationStreamUpdate({ data: '' } as never)).toEqual([]);
    expect(excludePoolXYKAssetsMock).toHaveBeenCalledWith([]);
  });
});
