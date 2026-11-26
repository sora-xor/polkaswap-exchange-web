import { beforeEach, describe, expect, it, vi } from 'vitest';

const excludePoolXYKAssetsMock = vi.hoisted(() => vi.fn((assets) => assets.slice(0, 1)));
vi.mock('@sora-substrate/sdk/build/assets', () => ({
  excludePoolXYKAssets: excludePoolXYKAssetsMock,
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
    expect(parseAssetFiatPrice({ id: 'xor', priceUSD: '1.23' } as never)).toEqual({ xor: '1230000000000000000' });
  });

  it('omits non-finite asset fiat prices', () => {
    expect(parseAssetFiatPrice({ id: 'xor', priceUSD: 'Infinity' } as never)).toEqual({});
  });

  it('reads the full exact map including small and zero quotes and never falls back on a missing mark', () => {
    const map = { tiny: '0.000000000340941693', zero: '0', bad: '-1' };
    for (const pricesExact of [map, JSON.stringify(map)]) {
      expect(parsePriceStreamUpdate({ pricesExact, data: '{"stale":"42"}' } as never)).toEqual({
        tiny: '340941693',
        zero: '0',
      });
    }
    expect(parsePriceStreamUpdate({ pricesExact: null, data: '{"stale":"42"}' } as never)).toBeNull();
    expect(parsePriceStreamUpdate({ pricesExact: {}, data: '{"stale":"42"}' } as never)).toEqual({});
    expect(parsePriceStreamUpdate({ pricesExact: 'broken', data: '{"stale":"42"}' } as never)).toBeNull();
  });

  it('returns null when a price stream update has no payload', () => {
    expect(parsePriceStreamUpdate(null as never)).toBeNull();
    expect(parsePriceStreamUpdate({ data: '' } as never)).toBeNull();
  });

  it('filters non-finite prices out of stream updates', () => {
    const payload = { data: JSON.stringify({ xor: '1.23', val: 'Infinity', dai: '0' }) };

    expect(parsePriceStreamUpdate(payload as never)).toEqual({
      xor: '1230000000000000000',
    });
  });

  it.each(['not-json', '[]', 'null'])(
    'treats malformed or wrong-shape price stream payload %j as an empty update',
    (data) => {
      expect(parsePriceStreamUpdate({ data } as never)).toEqual({});
    }
  );

  it('parses asset registration updates and normalizes decimals before filtering', () => {
    const assetA = JSON.stringify({
      address: '0x01',
      symbol: 'AAA',
      name: 'Asset A',
      decimals: '18',
      isMintable: true,
    });
    const assetB = JSON.stringify({
      address: '0x02',
      symbol: 'BBB',
      name: 'Asset B',
      decimals: '8',
      isMintable: false,
    });

    const result = parseAssetRegistrationStreamUpdate({
      data: JSON.stringify({
        a: assetA,
        b: assetB,
      }),
    } as never);

    expect(excludePoolXYKAssetsMock).toHaveBeenCalledWith([
      { address: '0x01', symbol: 'AAA', name: 'Asset A', decimals: 18, isMintable: true },
      { address: '0x02', symbol: 'BBB', name: 'Asset B', decimals: 8, isMintable: false },
    ]);
    expect(result).toEqual([{ address: '0x01', symbol: 'AAA', name: 'Asset A', decimals: 18, isMintable: true }]);
  });

  it('handles empty asset registration payloads', () => {
    expect(parseAssetRegistrationStreamUpdate({ data: '' } as never)).toEqual([]);
    expect(excludePoolXYKAssetsMock).toHaveBeenCalledWith([]);
  });

  it('drops malformed and incomplete asset registration entries without rejecting the update', () => {
    const validAsset = JSON.stringify({
      address: '0x01',
      symbol: 'AAA',
      name: 'Asset A',
      decimals: '18',
      isMintable: true,
    });

    expect(
      parseAssetRegistrationStreamUpdate({
        data: JSON.stringify({ malformed: 'not-json', wrongShape: '[]', incomplete: '{}', validAsset }),
      } as never)
    ).toEqual([{ address: '0x01', symbol: 'AAA', name: 'Asset A', decimals: 18, isMintable: true }]);
  });

  it.each(['not-json', '[]', 'null'])(
    'treats malformed or wrong-shape asset stream payload %j as an empty update',
    (data) => {
      expect(parseAssetRegistrationStreamUpdate({ data } as never)).toEqual([]);
    }
  );
});
