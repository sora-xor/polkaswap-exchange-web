import { FPNumber } from '@sora-substrate/math';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchSorametricsLiberlandBridgeHistory,
  fetchSorametricsLatestBlock,
  fetchSorametricsTokenPrices,
  parseSorametricsLatestBlock,
  parseSorametricsTokenPrices,
  resolveSorametricsApiEndpoint,
} from '@/services/sorametrics';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

const hashFor = (value: number): string => `0x${value.toString(16).padStart(64, '0')}`;

const createLiberlandBridgeRow = (overrides: Record<string, unknown> = {}) => ({
  timestamp: '1787581298803',
  block: 27_410_636,
  network: 'Substrate: Liberland',
  direction: 'Incoming',
  sender: JSON.stringify({ liberland: '5E57f3YkfbVzZDQAyv2sQuvbzXC7BQYGCnZ7F2pYtD5coDg6' }),
  recipient: 'cnTVhGvdvWxTYdh3e9fFukiTRpobzTj6foUEaFAkWDx5SmyGx',
  asset_id: JSON.stringify({ code: hashFor(5_013) }),
  amount: '1.000000',
  hash: hashFor(1),
  extrinsic_id: hashFor(1),
  ...overrides,
});

const createBridgePage = (data: unknown[], page = 1, totalPages = 1, total = data.length): Record<string, unknown> => ({
  data,
  page,
  totalPages,
  total,
});

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => payload,
});

describe('sorametrics service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('fetches and normalizes strict Liberland incoming bridge candidates', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        createBridgePage([
          createLiberlandBridgeRow({
            hash: hashFor(171).toUpperCase().replace('0X', '0x'),
            extrinsic_id: hashFor(171),
            asset_id: JSON.stringify({ code: hashFor(5_013).toUpperCase().replace('0X', '0x') }),
            sender: JSON.stringify({ liberland: ' 5E57f3YkfbVzZDQAyv2sQuvbzXC7BQYGCnZ7F2pYtD5coDg6 ' }),
            recipient: ' cnTVhGvdvWxTYdh3e9fFukiTRpobzTj6foUEaFAkWDx5SmyGx ',
          }),
        ])
      )
    );

    await expect(
      fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org/', ' account /?value ')
    ).resolves.toEqual([
      {
        hash: hashFor(171),
        block: 27_410_636,
        timestamp: 1_787_581_298_803,
        recipient: 'cnTVhGvdvWxTYdh3e9fFukiTRpobzTj6foUEaFAkWDx5SmyGx',
        sender: '5E57f3YkfbVzZDQAyv2sQuvbzXC7BQYGCnZ7F2pYtD5coDg6',
        assetAddress: hashFor(5_013),
        amount: new FPNumber('1.000000').toString(),
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sorametrics.org/history/bridges/account%20%2F%3Fvalue?page=1&limit=100',
      {
        headers: { Accept: 'application/json' },
        signal: expect.any(Object),
      }
    );
  });

  it('rejects malformed bridge response containers and pagination', async () => {
    for (const payload of [
      null,
      [],
      { data: null, page: 1, totalPages: 1, total: 0 },
      Object.assign(Object.create({ inherited: true }), createBridgePage([], 1, 0, 0)),
      createBridgePage([createLiberlandBridgeRow()], 2, 2, 1),
      createBridgePage([createLiberlandBridgeRow()], 1, 0, 1),
      createBridgePage([createLiberlandBridgeRow()], 1, 1, 0),
      createBridgePage(
        Array.from({ length: 101 }, () => createLiberlandBridgeRow()),
        1,
        2,
        101
      ),
    ]) {
      fetchMock.mockResolvedValueOnce(jsonResponse(payload));
      await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).rejects.toThrow(
        /Malformed Sorametrics bridge history/
      );
    }
  });

  it('filters rows with untrusted network, identity, asset, hash, time, block, or amount fields', async () => {
    const invalidRows = [
      createLiberlandBridgeRow({ network: 'Ethereum' }),
      createLiberlandBridgeRow({ network: ' Substrate: Liberland' }),
      createLiberlandBridgeRow({ direction: 'Outgoing' }),
      createLiberlandBridgeRow({ hash: hashFor(2), extrinsic_id: hashFor(3) }),
      createLiberlandBridgeRow({ hash: '0x1234', extrinsic_id: '0x1234' }),
      createLiberlandBridgeRow({ block: 0 }),
      createLiberlandBridgeRow({ block: Number.MAX_SAFE_INTEGER + 1 }),
      createLiberlandBridgeRow({ timestamp: '1787581298' }),
      createLiberlandBridgeRow({ timestamp: '4102444800001' }),
      createLiberlandBridgeRow({ timestamp: 1_787_581_298_803 }),
      createLiberlandBridgeRow({ recipient: '   ' }),
      createLiberlandBridgeRow({ sender: '{bad json' }),
      createLiberlandBridgeRow({ sender: JSON.stringify({ liberland: 'sender', extra: 'untrusted' }) }),
      createLiberlandBridgeRow({ sender: JSON.stringify({ Liberland: 'sender' }) }),
      createLiberlandBridgeRow({ asset_id: JSON.stringify({ code: hashFor(7), extra: true }) }),
      createLiberlandBridgeRow({ asset_id: JSON.stringify({ code: '0x1234' }) }),
      ...['0', '0.0', '-1', '+1', '1e3', '.5', '01', 'NaN', 'Infinity'].map((amount) =>
        createLiberlandBridgeRow({ amount })
      ),
      Object.assign(Object.create({}), createLiberlandBridgeRow()),
    ];
    const valid = createLiberlandBridgeRow({ hash: hashFor(999), extrinsic_id: hashFor(999), amount: '0.5' });
    fetchMock.mockResolvedValue(jsonResponse(createBridgePage([...invalidRows, valid])));

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toEqual([
      expect.objectContaining({ hash: hashFor(999), amount: new FPNumber('0.5').toString() }),
    ]);
  });

  it('preserves ordinary decimal precision beyond FPNumber defaults for later asset-aware verification', async () => {
    const amount = '0.00000000000000000001';
    fetchMock.mockResolvedValue(jsonResponse(createBridgePage([createLiberlandBridgeRow({ amount })])));

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toEqual([
      expect.objectContaining({ amount }),
    ]);
  });

  it('walks pages sequentially and stops on an empty page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage([createLiberlandBridgeRow({ hash: hashFor(1), extrinsic_id: hashFor(1) })], 1, 5, 500)
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage([createLiberlandBridgeRow({ hash: hashFor(2), extrinsic_id: hashFor(2) })], 2, 5, 500)
        )
      )
      .mockResolvedValueOnce(jsonResponse(createBridgePage([], 3, 5, 500)));

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://sorametrics.org/history/bridges/account?page=1&limit=100',
      'https://sorametrics.org/history/bridges/account?page=2&limit=100',
      'https://sorametrics.org/history/bridges/account?page=3&limit=100',
    ]);
  });

  it('stops when the API repeats a page', async () => {
    const repeated = createLiberlandBridgeRow({ hash: hashFor(77), extrinsic_id: hashFor(77) });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(createBridgePage([repeated], 1, 10, 1_000)))
      .mockResolvedValueOnce(jsonResponse(createBridgePage([repeated], 2, 10, 1_000)));

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not mistake distinct non-Liberland pages for repeated empty candidate pages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage(
            [createLiberlandBridgeRow({ network: 'Ethereum', hash: hashFor(101), extrinsic_id: hashFor(101) })],
            1,
            3,
            300
          )
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage(
            [createLiberlandBridgeRow({ network: 'Ethereum', hash: hashFor(102), extrinsic_id: hashFor(102) })],
            2,
            3,
            300
          )
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage([createLiberlandBridgeRow({ hash: hashFor(103), extrinsic_id: hashFor(103) })], 3, 3, 300)
        )
      );

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toEqual([
      expect.objectContaining({ hash: hashFor(103) }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('drops conflicting candidates that share one settlement hash', async () => {
    const hash = hashFor(88);
    fetchMock.mockResolvedValue(
      jsonResponse(
        createBridgePage([
          createLiberlandBridgeRow({ hash, extrinsic_id: hash, amount: '1' }),
          createLiberlandBridgeRow({ hash, extrinsic_id: hash, amount: '2' }),
          createLiberlandBridgeRow({ hash, extrinsic_id: hash, amount: '1' }),
        ])
      )
    );

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toEqual([]);
  });

  it('rejects nonadvancing pagination', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(createBridgePage([createLiberlandBridgeRow()], 1, 2, 200)))
      .mockResolvedValueOnce(
        jsonResponse(
          createBridgePage([createLiberlandBridgeRow({ hash: hashFor(2), extrinsic_id: hashFor(2) })], 1, 2, 200)
        )
      );

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).rejects.toThrow(
      'Malformed Sorametrics bridge history pagination'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caps discovery at twenty pages and two thousand rows', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      const rows = Array.from({ length: 100 }, (_, index) => {
        const id = (page - 1) * 100 + index + 1;

        return createLiberlandBridgeRow({ hash: hashFor(id), extrinsic_id: hashFor(id), block: 27_000_000 + id });
      });

      return jsonResponse(createBridgePage(rows, page, 30, 3_000));
    });

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).resolves.toHaveLength(
      2_000
    );
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('propagates bridge-history HTTP failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false, 503));

    await expect(fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account')).rejects.toThrow(
      'HTTP 503'
    );
  });

  it('times out each bridge-history request even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => undefined));

    const request = fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account', { timeoutMs: 25 });
    const rejection = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
      message: expect.stringContaining('25 ms'),
    });
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
  });

  it('honors caller cancellation before and during bridge-history requests', async () => {
    const preAborted = new AbortController();
    preAborted.abort(new Error('account changed'));

    await expect(
      fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account', { signal: preAborted.signal })
    ).rejects.toThrow('account changed');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockReturnValue(new Promise(() => undefined));
    const inFlight = new AbortController();
    const request = fetchSorametricsLiberlandBridgeHistory('https://sorametrics.org', 'account', {
      signal: inFlight.signal,
      timeoutMs: 60_000,
    });
    const rejection = expect(request).rejects.toThrow('network changed');
    inFlight.abort(new Error('network changed'));

    await rejection;
  });
});
