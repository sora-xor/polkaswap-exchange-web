import { FPNumber } from '@sora-substrate/math';

import type { FiatPriceObject } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type SorametricsLatestBlockResponse = {
  blocks?: unknown;
};

export type SorametricsTokenPricesResponse = {
  data?: unknown;
};

/** Strictly validated settlement hint returned by Sorametrics bridge history. */
export type SorametricsLiberlandBridgeCandidate = Readonly<{
  hash: string;
  block: number;
  timestamp: number;
  recipient: string;
  sender: string;
  assetAddress: string;
  amount: string;
}>;

/** Cancellation controls for bounded Sorametrics bridge-history discovery. */
export type SorametricsLiberlandBridgeHistoryOptions = Readonly<{
  signal?: AbortSignal;
  timeoutMs?: number;
}>;

const SORAMETRICS_LIBERLAND_NETWORK = 'Substrate: Liberland';
const SORAMETRICS_LIBERLAND_DIRECTION = 'Incoming';
const SORAMETRICS_BRIDGE_PAGE_SIZE = 100;
const SORAMETRICS_BRIDGE_MAX_PAGES = 20;
const SORAMETRICS_BRIDGE_MAX_ROWS = SORAMETRICS_BRIDGE_PAGE_SIZE * SORAMETRICS_BRIDGE_MAX_PAGES;
const SORAMETRICS_BRIDGE_REQUEST_TIMEOUT_MS = 10_000;
const MIN_SANE_TIMESTAMP_MS = 946_684_800_000; // 2000-01-01T00:00:00.000Z
const MAX_SANE_TIMESTAMP_MS = 4_102_444_800_000; // 2100-01-01T00:00:00.000Z
const HASH_32_PATTERN = /^0x[0-9a-f]{64}$/i;
const ORDINARY_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const MAX_BRIDGE_AMOUNT_LENGTH = 128;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

/**
 * Normalizes the optional Sorametrics REST API endpoint from runtime config.
 */
export function resolveSorametricsApiEndpoint(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value.trim().replace(/\/+$/, '');
}

function buildSorametricsUrl(endpoint: string, path: string): string {
  const baseUrl = resolveSorametricsApiEndpoint(endpoint);
  if (!baseUrl) throw new Error('Sorametrics API endpoint is not configured.');

  return `${baseUrl}/${path.replace(/^\/+/, '')}`;
}

function toPositiveCodecPrice(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const price = new FPNumber(String(value));
  if (!price.isFinity() || !FPNumber.gt(price, FPNumber.ZERO)) return null;

  return price.toCodecString();
}

/**
 * Converts Sorametrics `/tokens` payloads into the wallet fiat price table shape.
 */
export function parseSorametricsTokenPrices(response: unknown): FiatPriceObject | null {
  const tokens = isRecord(response) && Array.isArray(response.data) ? response.data : [];
  const prices = tokens.reduce<FiatPriceObject>((acc, item) => {
    if (!isRecord(item)) return acc;

    const assetId = typeof item.assetId === 'string' ? item.assetId.trim() : '';
    const price = toPositiveCodecPrice(item.price);

    if (assetId && price) {
      acc[assetId] = price;
    }

    return acc;
  }, {});

  return Object.keys(prices).length ? prices : null;
}

/**
 * Extracts the newest block number from Sorametrics `/staking/recent-blocks`.
 */
export function parseSorametricsLatestBlock(response: unknown): number | null {
  const blocks = isRecord(response) && Array.isArray(response.blocks) ? response.blocks : [];

  for (const block of blocks) {
    if (!isRecord(block)) continue;

    const number = Number(block.number);
    if (Number.isSafeInteger(number) && number >= 0) {
      return number;
    }
  }

  return null;
}

async function fetchSorametricsJson(endpoint: string, path: string): Promise<unknown> {
  const response = await fetch(buildSorametricsUrl(endpoint, path), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Sorametrics request failed with HTTP ${response.status}.`);
  }

  return response.json();
}

const createNamedError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;

  return error;
};

const getAbortError = (signal: AbortSignal): Error =>
  signal.reason instanceof Error ? signal.reason : createNamedError('AbortError', 'Sorametrics request was aborted.');

const normalizeRequestTimeout = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : SORAMETRICS_BRIDGE_REQUEST_TIMEOUT_MS;

/** Fetches one Sorametrics page while enforcing cancellation even when a fetch implementation ignores abort. */
async function fetchSorametricsJsonWithTimeout(
  endpoint: string,
  path: string,
  options: SorametricsLiberlandBridgeHistoryOptions
): Promise<unknown> {
  const callerSignal = options.signal;
  if (callerSignal?.aborted) throw getAbortError(callerSignal);

  const controller = new AbortController();
  let rejectCancellation!: (reason: Error) => void;
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });
  const onCallerAbort = () => {
    const error = callerSignal ? getAbortError(callerSignal) : createNamedError('AbortError', 'Request aborted.');
    rejectCancellation(error);
    controller.abort(error);
  };
  const timeoutMs = normalizeRequestTimeout(options.timeoutMs);
  const timeout = setTimeout(() => {
    const error = createNamedError('TimeoutError', `Sorametrics request timed out after ${timeoutMs} ms.`);
    rejectCancellation(error);
    controller.abort(error);
  }, timeoutMs);

  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  try {
    const request = (async () => {
      const response = await fetch(buildSorametricsUrl(endpoint, path), {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Sorametrics request failed with HTTP ${response.status}.`);
      }

      return response.json();
    })();

    return await Promise.race([request, cancellation]);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

const getNonEmptyString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const getNormalizedHash = (value: unknown): string => {
  const hash = getNonEmptyString(value);

  return HASH_32_PATTERN.test(hash) ? hash.toLowerCase() : '';
};

const getSafeInteger = (value: unknown, minimum: number): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= minimum ? value : null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
};

const getSaneTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const timestamp = Number(value);

  return Number.isSafeInteger(timestamp) && timestamp >= MIN_SANE_TIMESTAMP_MS && timestamp <= MAX_SANE_TIMESTAMP_MS
    ? timestamp
    : null;
};

const parseSingleJsonString = (value: unknown, key: string): string => {
  if (typeof value !== 'string') return '';

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isPlainRecord(parsed)) return '';

    const keys = Object.keys(parsed);
    if (keys.length !== 1 || keys[0] !== key) return '';

    return getNonEmptyString(parsed[key]);
  } catch {
    return '';
  }
};

const getPositiveAmount = (value: unknown): string => {
  const amount = getNonEmptyString(value);
  if (amount.length > MAX_BRIDGE_AMOUNT_LENGTH || !ORDINARY_DECIMAL_PATTERN.test(amount)) return '';

  const [integer, fraction = ''] = amount.split('.');
  const normalizedFraction = fraction.replace(/0+$/, '');
  const normalizedAmount = normalizedFraction ? `${integer}.${normalizedFraction}` : integer;

  try {
    // Match FPNumber precision to the input instead of its 18-decimal default;
    // discovery must never round a natural amount before settlement verification.
    const normalized = new FPNumber(normalizedAmount, normalizedFraction.length);

    if (!normalized.isFinity() || !FPNumber.gt(normalized, FPNumber.ZERO)) return '';

    return normalizedAmount;
  } catch {
    return '';
  }
};

const parseLiberlandBridgeCandidate = (value: unknown): SorametricsLiberlandBridgeCandidate | null => {
  if (!isPlainRecord(value)) return null;
  if (value.network !== SORAMETRICS_LIBERLAND_NETWORK || value.direction !== SORAMETRICS_LIBERLAND_DIRECTION) {
    return null;
  }

  const hash = getNormalizedHash(value.hash);
  const extrinsicId = getNormalizedHash(value.extrinsic_id);
  const block = getSafeInteger(value.block, 1);
  const timestamp = getSaneTimestamp(value.timestamp);
  const recipient = getNonEmptyString(value.recipient);
  const sender = parseSingleJsonString(value.sender, 'liberland');
  const assetAddress = getNormalizedHash(parseSingleJsonString(value.asset_id, 'code'));
  const amount = getPositiveAmount(value.amount);

  if (!(hash && hash === extrinsicId && block && timestamp && recipient && sender && assetAddress && amount)) {
    return null;
  }

  return {
    hash,
    block,
    timestamp,
    recipient,
    sender,
    assetAddress,
    amount,
  };
};

type SorametricsBridgePage = {
  data: unknown[];
  page: number;
  totalPages: number;
  total: number;
};

const parseBridgePage = (value: unknown, requestedPage: number): SorametricsBridgePage => {
  if (!isPlainRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Malformed Sorametrics bridge history response.');
  }

  const page = getSafeInteger(value.page, 1);
  const totalPages = getSafeInteger(value.totalPages, 0);
  const total = getSafeInteger(value.total, 0);

  if (
    page !== requestedPage ||
    totalPages === null ||
    total === null ||
    value.data.length > SORAMETRICS_BRIDGE_PAGE_SIZE ||
    value.data.length > total ||
    (value.data.length > 0 && (totalPages === 0 || requestedPage > totalPages))
  ) {
    throw new Error('Malformed Sorametrics bridge history pagination.');
  }

  return { data: value.data, page, totalPages, total };
};

const areCandidatesEqual = (
  left: SorametricsLiberlandBridgeCandidate,
  right: SorametricsLiberlandBridgeCandidate
): boolean =>
  left.hash === right.hash &&
  left.block === right.block &&
  left.timestamp === right.timestamp &&
  left.recipient === right.recipient &&
  left.sender === right.sender &&
  left.assetAddress === right.assetAddress &&
  left.amount === right.amount;

const getRawPageSignature = (rows: unknown[]): string =>
  rows
    .map((row) => {
      if (!isPlainRecord(row)) return JSON.stringify([typeof row]);

      return JSON.stringify([
        row.hash,
        row.extrinsic_id,
        row.network,
        row.direction,
        row.block,
        row.timestamp,
        row.recipient,
        row.sender,
        row.asset_id,
        row.amount,
      ]);
    })
    .sort()
    .join('\n');

/**
 * Loads the latest fiat prices from the explicitly configured Sorametrics REST API.
 */
export async function fetchSorametricsTokenPrices(endpoint: string): Promise<FiatPriceObject | null> {
  return parseSorametricsTokenPrices(await fetchSorametricsJson(endpoint, 'tokens'));
}

/**
 * Loads the latest observed SORA block from the explicitly configured Sorametrics REST API.
 */
export async function fetchSorametricsLatestBlock(endpoint: string): Promise<number | null> {
  return parseSorametricsLatestBlock(await fetchSorametricsJson(endpoint, 'staking/recent-blocks'));
}

/**
 * Discovers account-scoped Liberland-to-SORA settlement hints from Sorametrics.
 *
 * The returned rows are deliberately display-only candidates. Callers must
 * still verify account identity and hydrate each hash from an authoritative
 * indexer or chain source before adding it to bridge history.
 */
export async function fetchSorametricsLiberlandBridgeHistory(
  endpoint: string,
  address: string,
  options: SorametricsLiberlandBridgeHistoryOptions = {}
): Promise<SorametricsLiberlandBridgeCandidate[]> {
  const preparedAddress = getNonEmptyString(address);
  if (!preparedAddress) throw new Error('Sorametrics bridge history address is required.');

  const candidatesByHash = new Map<string, SorametricsLiberlandBridgeCandidate>();
  const ambiguousHashes = new Set<string>();
  const seenPageSignatures = new Set<string>();
  let fetchedRows = 0;

  for (let requestedPage = 1; requestedPage <= SORAMETRICS_BRIDGE_MAX_PAGES; requestedPage += 1) {
    if (options.signal?.aborted) throw getAbortError(options.signal);

    const query = new URLSearchParams({
      page: String(requestedPage),
      limit: String(SORAMETRICS_BRIDGE_PAGE_SIZE),
    });
    const response = await fetchSorametricsJsonWithTimeout(
      endpoint,
      `history/bridges/${encodeURIComponent(preparedAddress)}?${query.toString()}`,
      options
    );
    const bridgePage = parseBridgePage(response, requestedPage);

    if (!bridgePage.data.length) break;

    fetchedRows += bridgePage.data.length;
    const pageSignature = getRawPageSignature(bridgePage.data);

    if (seenPageSignatures.has(pageSignature)) break;
    seenPageSignatures.add(pageSignature);

    const pageCandidates = bridgePage.data
      .map(parseLiberlandBridgeCandidate)
      .filter((candidate): candidate is SorametricsLiberlandBridgeCandidate => Boolean(candidate));

    for (const candidate of pageCandidates) {
      if (ambiguousHashes.has(candidate.hash)) continue;

      const previous = candidatesByHash.get(candidate.hash);
      if (!previous) {
        candidatesByHash.set(candidate.hash, candidate);
      } else if (!areCandidatesEqual(previous, candidate)) {
        candidatesByHash.delete(candidate.hash);
        ambiguousHashes.add(candidate.hash);
      }
    }

    if (
      fetchedRows >= SORAMETRICS_BRIDGE_MAX_ROWS ||
      requestedPage >= bridgePage.totalPages ||
      fetchedRows >= bridgePage.total
    ) {
      break;
    }
  }

  return [...candidatesByHash.values()];
}
