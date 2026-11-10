import { describe, expect, it, vi } from 'vitest';

import { fetchByAssetIds } from '@/indexer/queries/asset/batches';

describe('market asset filters', () => {
  it('reads every distinct asset in disjoint stable batches within the public limit', async () => {
    const ids = Array.from({ length: 273 }, (_, i) => String(i).padStart(3, '0'));
    const readAllPages = vi.fn(async (batch: string[]) => batch.map((id) => 'asset-' + id));
    const rows = await fetchByAssetIds([...ids].reverse().concat(ids.slice(0, 10)), readAllPages);

    expect(readAllPages.mock.calls.map(([batch]) => batch.length)).toEqual([100, 100, 73]);
    expect(readAllPages.mock.calls.flatMap(([batch]) => batch)).toEqual(ids);
    expect(rows).toEqual(ids.map((id) => 'asset-' + id));
  });

  it('keeps unfiltered reads and valid empty results', async () => {
    const read = vi.fn(async (batch: string[]) => batch);
    await expect(fetchByAssetIds([], read)).resolves.toEqual([]);
    expect(read).toHaveBeenCalledWith([]);
  });

  it('discards incomplete data if a later batch fails', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    const read = vi
      .fn<(_: string[]) => Promise<string[] | null>>()
      .mockResolvedValueOnce(['earlier'])
      .mockResolvedValueOnce(null);
    await expect(fetchByAssetIds(ids, read)).resolves.toBeNull();
  });
});
