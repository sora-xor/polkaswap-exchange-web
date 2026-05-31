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

export const isActiveMarket = (market: PolkamarktMarket): boolean => {
  const status = market.status?.toLowerCase();
  if (!status) return Boolean(market.chainId !== undefined && market.liquidity > 0);

  return ['open', 'active', 'live'].some((item) => status.includes(item)) && !isFinalizedMarket(market);
};

export const isFinalizedMarket = (market: PolkamarktMarket): boolean => {
  const status = market.status?.toLowerCase() ?? '';
  return ['resolved', 'cancelled', 'canceled', 'finalized', 'closed'].some((item) => status.includes(item));
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
  }: {
    search?: string;
    category?: MarketCategory | 'all';
    status?: MarketStatusFilter;
    account?: string;
    mineOnly?: boolean;
  }
): PolkamarktMarket[] {
  const normalizedSearch = search?.trim().toLowerCase() ?? '';
  const normalizedAccount = account?.toLowerCase() ?? '';

  return markets.filter((market) => {
    if (status === 'active' && !isActiveMarket(market)) return false;
    if (status === 'finalized' && !isFinalizedMarket(market)) return false;
    if (category && category !== 'all' && market.category !== category) return false;
    if (mineOnly && (!normalizedAccount || market.creator?.toLowerCase() !== normalizedAccount)) return false;
    if (!normalizedSearch) return true;

    return [market.title, market.description, market.category, market.status, market.creator]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
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
 * Formats a Date for a datetime-local input while preserving block-time precision.
 */
export function formatDateTimeLocalInput(date: Date): string {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';

  const offset = date.getTimezoneOffset();
  return new Date(timestamp - offset * 60_000).toISOString().slice(0, 19);
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
