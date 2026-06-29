import { FPNumber } from '@sora-substrate/math';

import type { FiatPriceObject } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type SorametricsLatestBlockResponse = {
  blocks?: unknown;
};

export type SorametricsTokenPricesResponse = {
  data?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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
