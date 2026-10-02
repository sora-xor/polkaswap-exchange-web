import type { FiatExchangeRateObject } from '@/lib/soraneo-wallet/src/types/currency';

/** Public daily DAI-relative reference rates, served as CORS-enabled static JSON. */
export const CURRENCY_RATE_ENDPOINT =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/dai.min.json';

const REQUEST_TIMEOUT_MS = 10_000;
const FAILURE_RETRY_MS = 60_000;
const DAY_MS = 86_400_000;
let pendingRates: Promise<FiatExchangeRateObject> | null = null;
let retryAt = 0;
let lastFailure: Error | null = null;

/** Keep the provider's UTC publication age bounded, including after caching. */
export function isCurrencySnapshotCurrent(publishedAt: unknown, now = Date.now()): publishedAt is number {
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return (
    typeof publishedAt === 'number' &&
    Number.isFinite(publishedAt) &&
    publishedAt > 0 &&
    publishedAt % DAY_MS === 0 &&
    publishedAt <= today &&
    today - publishedAt <= 3 * DAY_MS
  );
}

/** Reject malformed, future, or obsolete snapshots before they reach fiat displays. */
export function parseCurrencyRates(payload: unknown, now = Date.now()): FiatExchangeRateObject {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Currency rates payload is invalid');
  }
  const { date, dai } = payload as { date?: unknown; dai?: unknown };
  const publishedAt =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
  if (!isCurrencySnapshotCurrent(publishedAt, now) || new Date(publishedAt).toISOString().slice(0, 10) !== date) {
    throw new Error('Currency rates snapshot is stale or has an invalid date');
  }
  if (!dai || typeof dai !== 'object' || Array.isArray(dai)) {
    throw new Error('Currency rates have no DAI base');
  }
  const rates: FiatExchangeRateObject = {};
  for (const [currency, value] of Object.entries(dai)) {
    if (/^[a-z]{3}$/.test(currency) && typeof value === 'number' && Number.isFinite(value) && value > 0) {
      rates[currency] = value;
    }
  }
  if (rates.dai !== 1 || !rates.usd) throw new Error('Currency rates have an invalid DAI base');
  return { ...rates, sourceTimestamp: publishedAt };
}

/** Share concurrent refreshes and bound retries across the app and wallet adapters. */
export function fetchCurrencyRates(): Promise<FiatExchangeRateObject> {
  if (pendingRates) return pendingRates;
  if (lastFailure && Date.now() < retryAt) return Promise.reject(lastFailure);

  pendingRates = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // The provider's @latest URL can carry a week-long browser TTL. Revalidate
      // each scheduled refresh; the validated payload date bounds its real age.
      const response = await fetch(CURRENCY_RATE_ENDPOINT, {
        cache: 'no-cache',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Currency rates request failed (${response.status})`);
      const rates = parseCurrencyRates(await response.json());
      lastFailure = null;
      retryAt = 0;
      return rates;
    } catch (error) {
      lastFailure = error instanceof Error ? error : new Error('Currency rates request failed');
      retryAt = Date.now() + FAILURE_RETRY_MS;
      throw lastFailure;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => {
    pendingRates = null;
  });
  return pendingRates;
}
