import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData, fetchNetworkCounts, readNetworkPeriodCounts } from '@/indexer/queries/network/volume';
import { SnapshotTypes } from '@/lib/soraneo-wallet/src/services/indexer/types';

const { fetchEntities, request } = vi.hoisted(() => ({ fetchEntities: vi.fn(), request: vi.fn() }));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    services: { explorer: { fetchEntities, request, captureNetworkOnly: () => ({ fetchEntities, request }) } },
  }),
}));
vi.mock('@/indexer/queries/retry', () => ({
  retryOnEmptyResult: async <T>(read: () => Promise<T>, empty: (result: T) => boolean) => {
    const result = await read();
    return empty(result) ? read() : result;
  },
}));

const hour = 3600,
  day = 24 * hour;
const page = (nodes: object[], more = false, cursor = '') => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { hasNextPage: more, endCursor: cursor },
});
const row = (start: number, end: number, volumeUSD = '0', fees = '0') => ({
  id: 'network-' + start,
  timestamp: start,
  flowAggregation: 'CALENDAR',
  flowBucketStart: start,
  flowBucketEnd: end + 1,
  volumeUSD,
  fees,
});
const block = (height: number, timestamp: number, volumeUSD = '0', fees = '0') => ({
  id: 'block-' + height,
  timestamp,
  volumeUSD,
  fees,
});
const anchors = (low: number, high: number, start: number, end: number) => ({
  before: { nodes: [block(low, start - 1)] },
  after: { nodes: [block(high, end + 1)] },
});
const calls = () => fetchEntities.mock.calls.map(([, variables]) => variables);
const values = (points: Awaited<ReturnType<typeof fetchData>>) => points.map(({ value }) => value?.toString() ?? null);

describe('calendar fee and volume history', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    request.mockResolvedValue({ before: { nodes: [] }, after: { nodes: [] } });
  });

  it('uses exact codec fees, natural USD and a real observed zero for fully covered UTC buckets', async () => {
    fetchEntities.mockResolvedValue(page([row(day, 2 * day - 8, '0', '1'), row(8, day - 1, '123.12345678', '0')]));
    expect(values(await fetchData(false, 2 * day - 8, 7, SnapshotTypes.DAY))).toEqual(['123.12345678', '0']);
    expect(values(await fetchData(true, 2 * day - 8, 7, SnapshotTypes.MONTH))).toEqual(['0', '0.000000000000000001']);
    expect(calls()).toEqual(Array(2).fill({ type: 'DAY', start: 7, end: 2 * day - 8, after: null }));
    expect(request).not.toHaveBeenCalled();
  });

  it('clips boundary gaps, merges adjacent missing days and never reads a known day during recovery', async () => {
    fetchEntities.mockImplementation(async (_, v) =>
      page(v.type === 'DAY' ? [row(2 * day, 3 * day - 1, '3'), row(4 * day, 5 * day - 1, '4')] : [])
    );
    const points = await fetchData(false, 5 * day + 4, 19, SnapshotTypes.DAY);
    expect(values(points)).toEqual([null, null, '3', null, '4', null]);
    expect(calls().slice(1)).toEqual([
      { type: 'HOUR', start: 19, end: 2 * day - 1, after: null },
      { type: 'HOUR', start: 3 * day - 1, end: 4 * day - 1, after: null },
      { type: 'HOUR', start: 5 * day - 1, end: 5 * day + 4, after: null },
    ]);
    expect(request.mock.calls.map(([, v]) => v)).toEqual([
      { start: 20, end: 2 * day - 1 },
      { start: 3 * day, end: 4 * day - 1 },
      { start: 5 * day, end: 5 * day + 4 },
    ]);
  });

  it('uses complete hourly amounts and only reads BLOCK inside a missing hour, including both boundary seconds', async () => {
    fetchEntities.mockImplementation(async (_, v) => {
      if (v.type === 'DAY') return page([]);
      if (v.type === 'HOUR') return page([row(5, hour - 1, '1'), row(2 * hour, 2 * hour + 13, '0')]);
      return page([block(11, 2 * hour - 1, '0.00000002'), block(10, hour, '0.00000001')]);
    });
    request.mockResolvedValue(anchors(9, 12, hour, 2 * hour - 1));
    expect(values(await fetchData(false, 2 * hour + 13, 4, SnapshotTypes.DAY))).toEqual(['1.00000003']);
    expect(calls().at(-1)).toEqual({ start: hour, end: 2 * hour - 1, after: null });
  });

  it('reports genuine zero only when adjacent canonical heights straddle the entire gap', async () => {
    fetchEntities.mockResolvedValue(page([]));
    request.mockResolvedValue(anchors(42, 43, 5, 190));
    expect(values(await fetchData(false, 190, 4, SnapshotTypes.HOUR))).toEqual(['0']);
    request.mockResolvedValue(anchors(42, 44, 5, 190));
    expect(values(await fetchData(false, 190, 4, SnapshotTypes.HOUR))).toEqual([null]);
  });

  it('refuses duplicate heights and partial page results and retries failed pages without publishing a partial sum', async () => {
    fetchEntities.mockImplementation(async (_, v) =>
      v.type ? page([]) : page([block(10, 12, '7'), block(10, 13, '7')])
    );
    request.mockResolvedValue(anchors(9, 12, 5, 190));
    expect(values(await fetchData(false, 190, 4, SnapshotTypes.HOUR))).toEqual([null]);
    fetchEntities.mockImplementation(async (_, v) =>
      v.type ? page([]) : v.after ? null : page([block(10, 12, '7')], true, 'next')
    );
    expect(values(await fetchData(false, 190, 4, SnapshotTypes.HOUR))).toEqual([null]);
    expect(calls().filter((v) => v.after === 'next')).toHaveLength(2);
  });

  it('rejects malformed amounts, incomplete primary pagination and repeated continuation cursors', async () => {
    for (const invalid of [null, '-1', 'NaN', '1.123456789']) {
      fetchEntities.mockResolvedValue(page([{ ...row(2, 20), volumeUSD: invalid }]));
      await expect(fetchData(false, 20, 1, SnapshotTypes.HOUR)).rejects.toThrow('Invalid network flow amount');
    }
    fetchEntities.mockResolvedValueOnce(page([row(2, 20)], true, 'next')).mockResolvedValue(null);
    await expect(fetchData(false, 20, 1, SnapshotTypes.HOUR)).rejects.toThrow('Incomplete network flow page');
    fetchEntities.mockResolvedValue(page([row(2, 20)], true, 'loop'));
    await expect(fetchData(false, 20, 1, SnapshotTypes.HOUR)).rejects.toThrow('Invalid network flow cursor');
  });

  it('retains missing markers for legacy rolling, partial historical coverage and unsupported source heights', async () => {
    fetchEntities.mockResolvedValue(
      page([{ ...row(1, hour - 1), flowAggregation: 'LEGACY_ROLLING' }, row(hour, 2 * hour - 50)])
    );
    request.mockResolvedValue(anchors(1, 10000, 1, 2 * hour - 1));
    expect(values(await fetchData(true, 2 * hour - 1, 0, SnapshotTypes.HOUR))).toEqual([null, null]);
    expect(fetchEntities).toHaveBeenCalledTimes(1);
  });

  it('publishes real bars before optional reads and caps a year of fragmented missing coverage', async () => {
    const days = Array.from({ length: 182 }, (_, i) => row((2 * i + 1) * day, (2 * i + 2) * day - 1, '3'));
    const progress = vi.fn();
    fetchEntities.mockImplementation(async (_, v) => {
      if (v.type === 'DAY') return v.after ? page(days.slice(100)) : page(days.slice(0, 100), true, 'next');
      expect(progress).toHaveBeenCalledTimes(1);
      return page([]);
    });
    const result = await fetchData(false, 365 * day - 1, 0, SnapshotTypes.DAY, progress);
    expect(result).toHaveLength(365);
    expect(values(result).filter((value) => value === '3')).toHaveLength(182);
    expect(fetchEntities.mock.calls.length + request.mock.calls.length).toBeLessThanOrEqual(26);
  });

  it('permits a fresh open current bucket but rejects the same incomplete historical selection or stale checkpoint', async () => {
    const date = vi.spyOn(Date, 'now').mockReturnValue((day + 900) * 1000);
    try {
      fetchEntities.mockResolvedValue(page([row(day + 1, day + 875, '8')]));
      expect(values(await fetchData(false, day + 900, day, SnapshotTypes.HOUR))).toEqual(['8']);
      expect(values(await fetchData(false, day + 890, day, SnapshotTypes.HOUR))).toEqual([null]);
      fetchEntities.mockResolvedValue(page([row(day + 1, day + 200, '8')]));
      expect(values(await fetchData(false, day + 900, day, SnapshotTypes.HOUR))).toEqual([null]);
    } finally {
      date.mockRestore();
    }
  });

  it('updates a still-mounted range after the new hour gains an outside anchor, retaining exact original dates and prior observations', async () => {
    const end = 12 * hour + 29,
      start = 11 * hour - 1;
    vi.useFakeTimers({ now: end * 1000 });
    try {
      fetchEntities.mockImplementation(async (_, v) =>
        v.type
          ? page([row(start + 1, 12 * hour - 1, '7')])
          : page([
              block(105, 12 * hour + 24, '0.00000012'),
              block(104, 12 * hour + 18),
              block(103, 12 * hour + 12),
              block(102, 12 * hour + 6),
              block(101, 12 * hour, '1.00000001'),
            ])
      );
      const adjacent = { before: { nodes: [block(100, 12 * hour - 6)] }, after: { nodes: [block(106, end + 1)] } };
      request.mockResolvedValueOnce({ before: adjacent.before, after: { nodes: [] } }).mockResolvedValue(adjacent);
      const painted = vi.fn();
      const pending = fetchData(false, end, start, SnapshotTypes.HOUR, painted);
      await vi.advanceTimersByTimeAsync(0);
      expect(values(painted.mock.calls[0][0])).toEqual(['7', null]);
      await vi.advanceTimersByTimeAsync(6000);
      expect(values(await pending)).toEqual(['7', '1.00000013']);
      expect(request.mock.calls.map(([, v]) => v)).toEqual(Array(2).fill({ start: 12 * hour, end }));
      expect(calls()).toEqual([
        { type: 'HOUR', start, end, after: null },
        { start: 12 * hour, end, after: null },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending live tail timer immediately without fetching after navigation', async () => {
    const end = 12 * hour + 29;
    vi.useFakeTimers({ now: end * 1000 });
    try {
      const controller = new AbortController();
      fetchEntities.mockResolvedValue(page([]));
      request.mockResolvedValue({ before: { nodes: [block(100, 12 * hour - 6)] }, after: { nodes: [] } });
      const pending = fetchData(false, end, 12 * hour - 1, SnapshotTypes.HOUR, undefined, controller.signal);
      await vi.advanceTimersByTimeAsync(0);
      expect(vi.getTimerCount()).toBe(1);
      controller.abort();
      expect(values(await pending)).toEqual([null]);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(100000);
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the trailing value unknown if the anchor never arrives, then stops retrying', async () => {
    const end = 12 * hour + 29;
    vi.useFakeTimers({ now: end * 1000 });
    try {
      fetchEntities.mockResolvedValue(page([]));
      request.mockResolvedValue({ before: { nodes: [block(100, 12 * hour - 6)] }, after: { nodes: [] } });
      const pending = fetchData(false, end, 12 * hour - 1, SnapshotTypes.HOUR);
      await vi.runAllTimersAsync();
      expect(values(await pending)).toEqual([null]);
      expect(request).toHaveBeenCalledTimes(5);
      expect(fetchEntities).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops optional reads after a filter change and rejects invalid or unbounded ranges', async () => {
    fetchEntities.mockResolvedValue(page([]));
    const controller = new AbortController();
    await fetchData(
      false,
      day,
      0,
      SnapshotTypes.HOUR,
      () => {
        controller.abort();
      },
      controller.signal
    );
    expect(fetchEntities).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    await expect(fetchData(false, day, day, SnapshotTypes.HOUR)).rejects.toThrow('Invalid network flow range');
    await expect(fetchData(false, day * 400, 0, SnapshotTypes.DAY)).rejects.toThrow('Invalid network flow range');
  });
});

describe('period network counters', () => {
  const counts = { transactions: 3, accounts: 2, bridgeIncomingTransactions: 0, bridgeOutgoingTransactions: 1 };

  it('adds complete calendar and recovered block counts and preserves unknown per-field counts', async () => {
    fetchEntities.mockReset();
    request.mockReset();
    fetchEntities
      .mockResolvedValueOnce(page([{ ...row(1, hour - 1), ...counts }]))
      .mockResolvedValueOnce(page([{ ...block(23, hour + 2), ...counts, accounts: null }]));
    request.mockResolvedValue(anchors(22, 24, hour, 2 * hour - 1));
    const result = await fetchNetworkCounts(2 * hour - 1, 0, SnapshotTypes.HOUR);
    expect(result?.transactions?.toString()).toBe('6');
    expect(result?.bridgeIncomingTransactions?.toString()).toBe('0');
    expect(result?.bridgeOutgoingTransactions?.toString()).toBe('2');
    expect(result?.accounts).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('withholds the whole-period sum when the only remaining row is an unverified rolling observation', async () => {
    fetchEntities.mockReset();
    request.mockReset();
    fetchEntities.mockResolvedValueOnce(
      page([
        { ...row(1, hour - 1), ...counts },
        { ...row(hour, 2 * hour - 1), ...counts, flowAggregation: 'LEGACY_ROLLING' },
      ])
    );
    request.mockResolvedValue({ before: { nodes: [] }, after: { nodes: [] } });
    await expect(fetchNetworkCounts(2 * hour - 1, 0, SnapshotTypes.HOUR)).resolves.toBeNull();
  });

  it('validates nullable, fractional and negative event counts separately from real zero', async () => {
    fetchEntities.mockReset();
    fetchEntities.mockResolvedValueOnce(
      page([{ ...row(1, hour - 1), ...counts, transactions: -1, accounts: 1.5, bridgeOutgoingTransactions: null }])
    );
    const result = await fetchNetworkCounts(hour - 1, 0, SnapshotTypes.HOUR);
    expect(result?.bridgeIncomingTransactions?.toString()).toBe('0');
    expect(result?.transactions).toBeNull();
    expect(result?.accounts).toBeNull();
    expect(result?.bridgeOutgoingTransactions).toBeNull();
  });
});

describe('verified historical calendar counts', () => {
  it('uses the archived query on the frozen endpoint when the calendar lacks a bridge counter', async () => {
    const { APPROVED_RECOVERY_POLICY, RECOVERY_MAINNET_GENESIS } = await import('@/indexer/queries/capabilities');
    fetchEntities.mockReset();
    request.mockReset();
    fetchEntities.mockResolvedValueOnce(
      page([
        {
          ...row(day, 2 * day - 1),
          accounts: null,
          transactions: 144,
          bridgeIncomingTransactions: null,
          bridgeOutgoingTransactions: 0,
        },
      ])
    );
    request.mockResolvedValueOnce({
      indexerCapabilities: {
        genesisHash: RECOVERY_MAINNET_GENESIS,
        policyHash: APPROVED_RECOVERY_POLICY,
        mode: 'canonical-stats-history',
        statsReady: true,
        historyReady: true,
        indexedBlock: 28_312_900,
      },
      days: [
        { start: day, end: 2 * day, transactions: 144, bridgeIncomingTransactions: 6, bridgeOutgoingTransactions: 0 },
      ],
    });
    const { counts, archivedDays, retainedTransactionsComplete } = await readNetworkPeriodCounts(
      2 * day - 1,
      day - 1,
      SnapshotTypes.DAY
    );
    expect(archivedDays).toEqual([
      { date: '1970-01-02', transactions: '144', bridgeIncomingTransactions: '6', bridgeOutgoingTransactions: '0' },
    ]);
    expect(retainedTransactionsComplete).toBe(true);
    expect(counts?.transactions?.toString()).toBe('144');
    expect(counts?.bridgeIncomingTransactions?.toString()).toBe('6');
    expect(counts?.accounts).toBeNull();
    expect(request.mock.calls.at(-1)?.[1]).toEqual({ start: day, end: 2 * day });
  });

  it('restores a clipped UTC day, preserves unknown accounts, and refuses inconsistent evidence', async () => {
    const { mergeArchivedCountDays } = await import('@/indexer/queries/network/archivedCounts');
    const { APPROVED_RECOVERY_POLICY, RECOVERY_MAINNET_GENESIS } = await import('@/indexer/queries/capabilities');
    const proof = {
      indexerCapabilities: {
        genesisHash: RECOVERY_MAINNET_GENESIS,
        policyHash: APPROVED_RECOVERY_POLICY,
        mode: 'canonical-stats-history',
        statsReady: true,
        historyReady: true,
        indexedBlock: 28_312_900,
      },
      days: [{ start: 12, end: day, transactions: 144, bridgeIncomingTransactions: 6, bridgeOutgoingTransactions: 0 }],
    };
    const input = [
      { timestamp: 12000, value: null },
      { timestamp: day * 1000, value: null },
    ];
    const merged = mergeArchivedCountDays(input, 12, day + 1, proof);
    expect(merged[0].value?.transactions?.toString()).toBe('144');
    expect(merged[0].value?.bridgeOutgoingTransactions?.toString()).toBe('0');
    expect(merged[0].value?.accounts).toBeNull();
    expect(merged[1]).toBe(input[1]);
    const conflict = { ...proof, days: [{ ...proof.days[0], transactions: 145 }] };
    expect(mergeArchivedCountDays(merged, 12, day + 1, conflict)[0].value?.transactions).toBeNull();
    for (const spec of [
      { ...proof, days: [{ ...proof.days[0], end: day - 1 }] },
      { ...proof, days: [...proof.days, ...proof.days] },
      { ...proof, days: [{ ...proof.days[0], bridgeOutgoingTransactions: -1 }] },
      { ...proof, indexerCapabilities: { ...proof.indexerCapabilities, historyReady: false } },
      { ...proof, indexerCapabilities: { ...proof.indexerCapabilities, policyHash: 'another-policy' } },
    ])
      expect(mergeArchivedCountDays(input, 12, day + 1, spec)).toBe(input);
  });
});
