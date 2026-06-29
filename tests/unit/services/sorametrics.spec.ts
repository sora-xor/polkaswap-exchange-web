import { FPNumber } from '@sora-substrate/math';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchSorametricsLatestBlock,
  fetchSorametricsTokenPrices,
  parseSorametricsLatestBlock,
  parseSorametricsTokenPrices,
  resolveSorametricsApiEndpoint,
} from '@/services/sorametrics';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('sorametrics service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('normalizes optional API endpoints', () => {
    expect(resolveSorametricsApiEndpoint(' https://sorametrics.org/// ')).toBe('https://sorametrics.org');
    expect(resolveSorametricsApiEndpoint(null)).toBe('');
  });

  it('parses positive token prices by asset id', () => {
    expect(
      parseSorametricsTokenPrices({
        data: [
          { assetId: 'xor', price: 4.5 },
          { assetId: 'val', price: '0.25' },
          { assetId: 'zero', price: 0 },
          { assetId: '', price: 1 },
          { assetId: 'bad', price: 'nope' },
        ],
      })
    ).toEqual({
      xor: new FPNumber('4.5').toCodecString(),
      val: new FPNumber('0.25').toCodecString(),
    });
  });

  it('returns null when token payload has no usable prices', () => {
    expect(parseSorametricsTokenPrices({ data: [{ assetId: 'xor', price: 0 }] })).toBeNull();
    expect(parseSorametricsTokenPrices({ data: null })).toBeNull();
  });

  it('parses the newest recent block number', () => {
    expect(parseSorametricsLatestBlock({ blocks: [{ number: '26731267' }, { number: 26731266 }] })).toBe(26731267);
    expect(parseSorametricsLatestBlock({ blocks: [{ number: '12.3' }] })).toBeNull();
  });

  it('fetches token prices from the Sorametrics REST endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ assetId: 'xor', price: 4.5 }] }),
    });

    await expect(fetchSorametricsTokenPrices('https://sorametrics.org/')).resolves.toEqual({
      xor: new FPNumber('4.5').toCodecString(),
    });
    expect(fetchMock).toHaveBeenCalledWith('https://sorametrics.org/tokens', {
      headers: { Accept: 'application/json' },
    });
  });

  it('fetches the latest block from the Sorametrics REST endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ blocks: [{ number: 26731267 }] }),
    });

    await expect(fetchSorametricsLatestBlock('https://sorametrics.org')).resolves.toBe(26731267);
    expect(fetchMock).toHaveBeenCalledWith('https://sorametrics.org/staking/recent-blocks', {
      headers: { Accept: 'application/json' },
    });
  });

  it('throws when Sorametrics returns a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(fetchSorametricsLatestBlock('https://sorametrics.org')).rejects.toThrow('HTTP 503');
  });
});
