import {
  MARKET_CATEGORIES,
  MARKET_CATEGORY_ALIASES,
  POLKAMARKT_BLOCK_TIME_MS,
  POLKAMARKT_DEFAULT_ORACLE,
  POLKAMARKT_MAX_METADATA_BYTES,
  POLKAMARKT_MIN_DURATION_BLOCKS,
  POLKAMARKT_MIN_QUESTION_BYTES,
  type MarketCategory,
  type MarketStatusFilter,
} from '../consts';

import type { PolkamarktMarket } from '../types';

export const isMarketCategory = (value: string): value is MarketCategory =>
  (MARKET_CATEGORIES as readonly string[]).includes(value);

const CLOSED_MARKET_STATUS = 'Closed';
const EARLY_REPORT_LOCKED_STATUS = 'Early report locked';
const OPEN_MARKET_STATUSES = ['open', 'active', 'live'] as const;
const FINALIZED_MARKET_STATUSES = ['resolved', 'cancelled', 'canceled', 'finalized', 'closed'] as const;
const SETTLED_MARKET_STATUSES = ['resolved', 'cancelled', 'canceled', 'finalized'] as const;

export type HotPolkamarktMarketGroup = {
  category: MarketCategory;
  markets: PolkamarktMarket[];
  totalLiquidity: number;
  totalVolume: number;
};

/**
 * Normalizes free-form indexed category text into the Polkamarkt category set.
 */
export function normalizeMarketCategory(value: string): MarketCategory | undefined {
  const trimmed = value.trim();
  if (isMarketCategory(trimmed)) return trimmed;
  return MARKET_CATEGORY_ALIASES[trimmed.toLowerCase()];
}

const GOVERNANCE_ORACLE_ALIASES = new Set([
  'sora council',
  'sora technical committee',
  'sora council and technical committee',
  'sora governance',
  'sora on-chain governance',
]);

export function normalizeMarketOracle(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  return GOVERNANCE_ORACLE_ALIASES.has(normalized) ? POLKAMARKT_DEFAULT_ORACLE : trimmed;
}

const normalizedBlockNumber = (value: unknown): number | undefined => {
  const block = Number(value);
  if (!Number.isFinite(block)) return undefined;
  const normalized = Math.trunc(block);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : undefined;
};

/**
 * Detects markets whose trading deadline has passed even when the indexer still reports them as open.
 */
export function isMarketClosedByBlock(
  market: Pick<PolkamarktMarket, 'closeBlock'> | undefined,
  currentBlock?: number
): boolean {
  const closeBlock = normalizedBlockNumber(market?.closeBlock);
  const block = normalizedBlockNumber(currentBlock);
  return closeBlock !== undefined && block !== undefined && block >= closeBlock;
}

/**
 * Returns the market status the UI should present after applying block-derived closure state.
 */
export function getMarketDisplayStatus(
  market: PolkamarktMarket | undefined,
  currentBlock?: number
): string | undefined {
  const status = market?.status?.trim();
  const normalizedStatus = status?.toLowerCase() ?? '';

  if (market?.earlyResolutionOutcome && !SETTLED_MARKET_STATUSES.some((item) => normalizedStatus.includes(item))) {
    return EARLY_REPORT_LOCKED_STATUS;
  }

  if (
    market &&
    isMarketClosedByBlock(market, currentBlock) &&
    (!normalizedStatus || OPEN_MARKET_STATUSES.some((item) => normalizedStatus.includes(item)))
  ) {
    return CLOSED_MARKET_STATUS;
  }

  return status || undefined;
}

export const isActiveMarket = (market: PolkamarktMarket, currentBlock?: number): boolean => {
  if (market.earlyResolutionOutcome) return false;
  if (isMarketClosedByBlock(market, currentBlock)) return false;

  const status = market.status?.toLowerCase();
  if (!status) return Boolean(market.chainId !== undefined && market.liquidity > 0);

  return OPEN_MARKET_STATUSES.some((item) => status.includes(item)) && !isFinalizedMarket(market, currentBlock);
};

export const isFinalizedMarket = (market: PolkamarktMarket, currentBlock?: number): boolean => {
  const status = market.status?.toLowerCase() ?? '';
  return FINALIZED_MARKET_STATUSES.some((item) => status.includes(item)) || isMarketClosedByBlock(market, currentBlock);
};

export const isClaimableMarketStatus = (status?: string | null): boolean => {
  const normalized = status?.trim().toLowerCase();
  return normalized === 'resolved' || normalized === 'cancelled' || normalized === 'canceled';
};

export function filterMarkets(
  markets: PolkamarktMarket[],
  {
    search,
    category,
    status,
    account,
    mineOnly = false,
    currentBlock,
  }: {
    search?: string;
    category?: MarketCategory | 'all';
    status?: MarketStatusFilter;
    account?: string;
    mineOnly?: boolean;
    currentBlock?: number;
  }
): PolkamarktMarket[] {
  const normalizedSearch = search?.trim().toLowerCase() ?? '';
  const normalizedAccount = account?.toLowerCase() ?? '';

  return markets.filter((market) => {
    if (status === 'active' && !isActiveMarket(market, currentBlock)) return false;
    if (status === 'finalized' && !isFinalizedMarket(market, currentBlock)) return false;
    if (category && category !== 'all' && market.category !== category) return false;
    if (mineOnly && (!normalizedAccount || market.creator?.toLowerCase() !== normalizedAccount)) return false;
    if (!normalizedSearch) return true;

    return [
      market.title,
      market.description,
      market.category,
      getMarketDisplayStatus(market, currentBlock),
      market.creator,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}

function compareHotMarkets(left: PolkamarktMarket, right: PolkamarktMarket): number {
  const trendingDiff = Number(Boolean(right.trending)) - Number(Boolean(left.trending));
  if (trendingDiff !== 0) return trendingDiff;

  const volumeDiff = (right.volume || 0) - (left.volume || 0);
  if (volumeDiff !== 0) return volumeDiff;

  const liquidityDiff = (right.liquidity || 0) - (left.liquidity || 0);
  if (liquidityDiff !== 0) return liquidityDiff;

  const titleDiff = left.title.localeCompare(right.title);
  if (titleDiff !== 0) return titleDiff;

  return left.id.localeCompare(right.id);
}

/**
 * Returns active Polkamarkt markets ordered by the first-screen "hot" contract:
 * explicit trending signal, then volume, liquidity, and stable text identifiers.
 */
export function rankHotPolkamarktMarkets(markets: PolkamarktMarket[], currentBlock?: number): PolkamarktMarket[] {
  return markets.filter((market) => isActiveMarket(market, currentBlock)).sort(compareHotMarkets);
}

/**
 * Groups the hottest active Polkamarkt markets by category while preserving hot-category order.
 */
export function groupHotMarketsByCategory(
  markets: PolkamarktMarket[],
  currentBlock?: number,
  limit = Number.POSITIVE_INFINITY
): HotPolkamarktMarketGroup[] {
  const rankedMarkets = rankHotPolkamarktMarkets(markets, currentBlock).slice(0, limit);
  const groups = new Map<MarketCategory, HotPolkamarktMarketGroup>();

  for (const market of rankedMarkets) {
    const group =
      groups.get(market.category) ??
      ({
        category: market.category,
        markets: [],
        totalLiquidity: 0,
        totalVolume: 0,
      } satisfies HotPolkamarktMarketGroup);

    group.markets.push(market);
    group.totalLiquidity += market.liquidity || 0;
    group.totalVolume += market.volume || 0;
    groups.set(market.category, group);
  }

  return [...groups.values()];
}

/**
 * Selects the capped set of cards that should load compact history sparklines.
 */
export function selectCardHistoryMarkets(
  markets: PolkamarktMarket[],
  currentBlock?: number,
  limit = 12
): PolkamarktMarket[] {
  return rankHotPolkamarktMarkets(markets, currentBlock).slice(0, limit);
}

export function metadataByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Validates the on-chain metadata constraints enforced by the Polkamarkt pallet.
 */
export function validateMarketMetadata(question: string, oracle: string, resolutionSource: string): string[] {
  const errors: string[] = [];
  if (metadataByteLength(question.trim()) < POLKAMARKT_MIN_QUESTION_BYTES) {
    errors.push('questionTooShort');
  }
  const totalBytes =
    metadataByteLength(question.trim()) +
    metadataByteLength(oracle.trim()) +
    metadataByteLength(resolutionSource.trim());
  if (totalBytes > POLKAMARKT_MAX_METADATA_BYTES) {
    errors.push('metadataTooLong');
  }
  return errors;
}

/**
 * Converts a user-selected deadline into a close block respecting runtime minimum duration.
 */
export function calculateCloseBlockFromDate(currentBlock: number, deadline: Date): number {
  const nowMs = Date.now();
  const deadlineMs = deadline.getTime();
  const diffMs = Number.isFinite(deadlineMs) ? Math.max(0, deadlineMs - nowMs) : 0;
  const blocksFromDeadline = Math.ceil(diffMs / POLKAMARKT_BLOCK_TIME_MS);
  const duration = Math.max(POLKAMARKT_MIN_DURATION_BLOCKS, blocksFromDeadline);
  return Math.max(0, currentBlock) + duration;
}

/**
 * Returns the earliest close block the pallet accepts for a newly created market.
 */
export function calculateMinimumCloseBlock(currentBlock: number): number {
  return Math.max(0, Math.trunc(currentBlock)) + POLKAMARKT_MIN_DURATION_BLOCKS;
}

/**
 * Converts a user-entered close block into a runtime-safe close block.
 */
export function calculateCloseBlockFromBlockInput(currentBlock: number, closeBlockInput: unknown): number {
  return Math.max(calculateMinimumCloseBlock(currentBlock), parseBlockInput(closeBlockInput) ?? 0);
}

export function calculateApproximateCloseDate(currentBlock: number, closeBlock?: number): Date | undefined {
  if (!closeBlock || closeBlock <= currentBlock) return undefined;
  const blocksLeft = closeBlock - currentBlock;
  return new Date(Date.now() + blocksLeft * POLKAMARKT_BLOCK_TIME_MS);
}

/**
 * Formats an approximate block-derived close date with the local UTC offset and minute precision.
 */
export function formatApproximateCloseDate(date: Date): string {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';

  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
  const offsetRemainderMinutes = absoluteOffsetMinutes % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    `UTC${offsetSign}${pad(offsetHours)}:${pad(offsetRemainderMinutes)}`,
  ].join(' ');
}

/**
 * Formats a Date for a datetime-local input at minute precision.
 */
export function formatDateTimeLocalInput(date: Date): string {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';

  const offset = date.getTimezoneOffset();
  return new Date(timestamp - offset * 60_000).toISOString().slice(0, 16);
}

export function parseBlockInput(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value).replace(/,/g, ''), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseProbability(value: unknown): number | undefined {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return undefined;
  if (raw <= 1) return Math.max(0, Math.min(100, Math.round(raw * 100)));
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export const yesNoPricesFromProbability = (probability?: number): { yes?: number; no?: number } => {
  if (!Number.isFinite(probability)) return {};
  const yes = Math.max(0, Math.min(1, (probability ?? 0) / 100));
  return { yes, no: 1 - yes };
};
