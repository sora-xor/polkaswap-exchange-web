import { describe, expect, it, vi, beforeEach } from 'vitest';
import { print } from 'graphql';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  request: vi.fn(),
  fetchEntities: vi.fn(),
  fetchSorametricsLatestBlock: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
}));

vi.mock('@/services/sorametrics', () => ({
  fetchSorametricsLatestBlock: indexerMocks.fetchSorametricsLatestBlock,
}));

import {
  fetchLatestIndexedBlock,
  parseIndexerBlock,
  parseLatestIndexedBlock,
} from '@/indexer/queries/latestIndexedBlock';

const createIndexer = (type: string) => ({
  type,
  services: {
    explorer: {
      request: indexerMocks.request,
      fetchEntities: indexerMocks.fetchEntities,
    },
  },
});

describe('latest indexed block query', () => {
  beforeEach(() => {
    indexerMocks.currentIndexer = undefined;
    indexerMocks.request.mockReset();
    indexerMocks.fetchEntities.mockReset();
    indexerMocks.fetchSorametricsLatestBlock.mockReset();
  });

  it('parses a safe block height from the latest history edge', () => {
    expect(
      parseLatestIndexedBlock({
        edges: [{ cursor: 'cursor', node: { blockHeight: '123456' } }],
      })
    ).toBe(123456);
  });

  it('rejects invalid block heights', () => {
    expect(
      parseLatestIndexedBlock({
        edges: [{ cursor: 'cursor', node: { blockHeight: '123.4' } }],
      })
    ).toBeNull();
    expect(parseLatestIndexedBlock(null)).toBeNull();
  });

  it.each(
    [
      null,
      undefined,
      '',
      '   ',
      true,
      false,
      -1,
      1.5,
      '1.5',
      '-1',
      '0x10',
      '1e3',
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      '9007199254740992',
      [],
      {},
      { valueOf: () => 44 },
    ].map((value) => ({ value }))
  )('rejects unavailable or invalid block inputs: $value', ({ value }) => {
    expect(parseIndexerBlock(value)).toBeNull();
  });

  it.each([
    [0, 0],
    ['0', 0],
    [41, 41],
    ['123456', 123456],
    [' 42 ', 42],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ])('accepts a safe integer block input: %s', (value, expected) => {
    expect(parseIndexerBlock(value)).toBe(expected);
  });

  it('fetches the latest block from the Polkaswap stream state first', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValue({ data: { block: '41' } });

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).resolves.toEqual({
      block: 41,
      source: 'polkaswap',
    });
    expect(indexerMocks.request).toHaveBeenCalledTimes(1);
    expect(print(indexerMocks.request.mock.calls[0][0])).toContain('updatesStream(id: "price")');
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchSorametricsLatestBlock).not.toHaveBeenCalled();
  });

  it('uses the bounded Polkaswap checkpoint when price stream state is empty', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { block: '42' } });

    await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 42, source: 'polkaswap' });
    expect(indexerMocks.request).toHaveBeenCalledTimes(2);
    expect(print(indexerMocks.request.mock.calls[1][0])).toContain('updatesStream(id: "chainState")');
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
  });

  it.each([null, undefined, '', '   ', false, '123.4', -1])(
    'tries the checkpoint when the price block is unavailable or invalid: %s',
    async (block) => {
      indexerMocks.currentIndexer = createIndexer('polkaswap');
      indexerMocks.request.mockResolvedValueOnce({ data: { block } }).mockResolvedValueOnce({ data: { block: 42 } });

      await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 42, source: 'polkaswap' });
      expect(indexerMocks.request).toHaveBeenCalledTimes(2);
      expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    }
  );

  it('keeps a real price-stream block zero without falling back', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValueOnce({ data: { block: 0 } });

    await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 0, source: 'polkaswap' });
    expect(indexerMocks.request).toHaveBeenCalledTimes(1);
  });

  it('accepts a real checkpoint block zero after missing price state', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { block: '0' } });

    await expect(fetchLatestIndexedBlock()).resolves.toEqual({ block: 0, source: 'polkaswap' });
  });

  it('still tries the checkpoint when the price request rejects', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request
      .mockRejectedValueOnce(new Error('price stream unavailable'))
      .mockResolvedValueOnce({ data: { block: 42 } });

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).resolves.toEqual({
      block: 42,
      source: 'polkaswap',
    });
    expect(indexerMocks.request).toHaveBeenCalledTimes(2);
    expect(indexerMocks.fetchEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchSorametricsLatestBlock).not.toHaveBeenCalled();
  });

  it('preserves the first request error when both indexer requests reject', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const priceError = new Error('price stream unavailable');
    indexerMocks.request.mockRejectedValueOnce(priceError).mockRejectedValueOnce(new Error('checkpoint unavailable'));

    await expect(fetchLatestIndexedBlock()).rejects.toBe(priceError);
    expect(indexerMocks.request).toHaveBeenCalledTimes(2);
  });

  it('preserves the price error when the checkpoint has no valid block', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const priceError = new Error('price stream unavailable');
    indexerMocks.request.mockRejectedValueOnce(priceError).mockResolvedValueOnce({ data: { block: null } });

    await expect(fetchLatestIndexedBlock()).rejects.toBe(priceError);
  });

  it('preserves the checkpoint error when price state is missing', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const checkpointError = new Error('checkpoint unavailable');
    indexerMocks.request.mockResolvedValueOnce({ data: null }).mockRejectedValueOnce(checkpointError);

    await expect(fetchLatestIndexedBlock()).rejects.toBe(checkpointError);
  });

  it('returns null when both stream records are unavailable without request errors', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValue({ data: null });

    await expect(fetchLatestIndexedBlock()).resolves.toBeNull();
    expect(indexerMocks.request).toHaveBeenCalledTimes(2);
  });

  it('preserves a falsy request error instead of turning it into missing data', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockRejectedValueOnce(0).mockResolvedValueOnce({ data: null });

    await expect(fetchLatestIndexedBlock()).rejects.toBe(0);
  });

  it('uses Sorametrics when the Polkaswap indexer is unavailable and Sorametrics is configured', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockRejectedValue(new Error('502'));
    indexerMocks.fetchSorametricsLatestBlock.mockResolvedValue(43);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).resolves.toEqual({
      block: 43,
      source: 'sorametrics',
    });
    expect(indexerMocks.fetchSorametricsLatestBlock).toHaveBeenCalledWith('https://sorametrics.org');
    expect(indexerMocks.request).toHaveBeenCalledTimes(2);
  });

  it('preserves the indexer error when configured Sorametrics also has no block', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const priceError = new Error('price stream unavailable');
    indexerMocks.request.mockRejectedValueOnce(priceError).mockResolvedValueOnce({ data: null });
    indexerMocks.fetchSorametricsLatestBlock.mockResolvedValue(null);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).rejects.toBe(priceError);
  });

  it('returns null when indexer and configured Sorametrics records are all empty', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    indexerMocks.request.mockResolvedValue({ data: null });
    indexerMocks.fetchSorametricsLatestBlock.mockResolvedValue(null);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).resolves.toBeNull();
  });

  it('preserves the Sorametrics rejection after empty indexer stream responses', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const sorametricsError = new Error('Sorametrics unavailable');
    indexerMocks.request.mockResolvedValue({ data: null });
    indexerMocks.fetchSorametricsLatestBlock.mockRejectedValue(sorametricsError);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).rejects.toBe(sorametricsError);
  });

  it('preserves the Sorametrics rejection after an earlier indexer error', async () => {
    indexerMocks.currentIndexer = createIndexer('polkaswap');
    const sorametricsError = new Error('Sorametrics unavailable');
    indexerMocks.request
      .mockRejectedValueOnce(new Error('price stream unavailable'))
      .mockResolvedValueOnce({ data: null });
    indexerMocks.fetchSorametricsLatestBlock.mockRejectedValue(sorametricsError);

    await expect(fetchLatestIndexedBlock('https://sorametrics.org')).rejects.toBe(sorametricsError);
  });
});
