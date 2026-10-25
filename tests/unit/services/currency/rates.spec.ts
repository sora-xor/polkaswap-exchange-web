import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = new Date('2026-09-15T06:00:00Z');
const snapshot = { date: '2026-09-15', dai: { dai: 1, usd: 0.99979, eur: 0.86669, jpy: 154.67, xau: 0.00023 } };

describe('static DAI reference rates', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps actual DAI-relative conversions and excludes invalid rates and unsafe keys', async () => {
    const { parseCurrencyRates } = await import('@/services/currency/rates');
    const rates = parseCurrencyRates({
      ...snapshot,
      dai: { ...snapshot.dai, bad: -1, zero: 0, inf: Infinity, str: '123', constructor: 5, __proto__: {} },
    });
    expect(rates).toEqual({ ...snapshot.dai, sourceTimestamp: Date.parse(snapshot.date + 'T00:00:00Z') });
    expect(rates.usd).not.toBe(1);
  });

  it.each([
    null,
    [],
    { date: '2026-09-15', dai: [] },
    { ...snapshot, date: '2026-09-11' },
    { ...snapshot, date: '2026-09-16' },
    { ...snapshot, date: '2026-02-30' },
    { ...snapshot, date: 'bad' },
    { ...snapshot, dai: { dai: 2, usd: 1 } },
    { ...snapshot, dai: { dai: 1, usd: 0 } },
  ])('rejects invalid or stale input %j', async (payload) => {
    const { parseCurrencyRates } = await import('@/services/currency/rates');
    expect(() => parseCurrencyRates(payload)).toThrow();
  });

  it('accepts the three-day publication grace period', async () => {
    const { parseCurrencyRates } = await import('@/services/currency/rates');
    expect(parseCurrencyRates({ ...snapshot, date: '2026-09-12' })).toEqual({
      ...snapshot.dai,
      sourceTimestamp: Date.parse('2026-09-12T00:00:00Z'),
    });
  });

  it('shares concurrent requests and uses the public CORS-enabled endpoint without credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchCurrencyRates, CURRENCY_RATE_ENDPOINT } = await import('@/services/currency/rates');
    const first = fetchCurrencyRates();
    const second = fetchCurrencyRates();
    expect(first).toBe(second);
    expect(await first).toEqual({ ...snapshot.dai, sourceTimestamp: Date.parse(snapshot.date + 'T00:00:00Z') });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      CURRENCY_RATE_ENDPOINT,
      expect.objectContaining({ cache: 'no-cache', credentials: 'omit', signal: expect.any(AbortSignal) })
    );
    expect(CURRENCY_RATE_ENDPOINT).toBe(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/dai.min.json'
    );
  });

  it('does not retry every subscription tick after an HTTP failure and recovers after backoff', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchCurrencyRates } = await import('@/services/currency/rates');
    await expect(fetchCurrencyRates()).rejects.toThrow('(503)');
    vi.advanceTimersByTime(15_000);
    await expect(fetchCurrencyRates()).rejects.toThrow('(503)');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(45_000);
    expect(await fetchCurrencyRates()).toEqual({
      ...snapshot.dai,
      sourceTimestamp: Date.parse(snapshot.date + 'T00:00:00Z'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts a stalled request after ten seconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('aborted')));
          })
      )
    );
    const { fetchCurrencyRates } = await import('@/services/currency/rates');
    const assertion = expect(fetchCurrencyRates()).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('clears a synchronous fetch failure before the next retry', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('network');
      })
      .mockResolvedValue({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchCurrencyRates } = await import('@/services/currency/rates');
    await expect(fetchCurrencyRates()).rejects.toThrow('network');
    vi.advanceTimersByTime(60_000);
    expect(await fetchCurrencyRates()).toEqual({
      ...snapshot.dai,
      sourceTimestamp: Date.parse(snapshot.date + 'T00:00:00Z'),
    });
  });
});
