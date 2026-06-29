import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

import { parseBlockInput, parseProbability } from '../lib/markets';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';

type MarketHistoryPayload =
  | Array<Record<string, unknown>>
  | {
      edges?: Array<{ node?: Record<string, unknown> | null }>;
    };

type MarketHistoryResponse = {
  marketSnapshots?: MarketHistoryPayload;
};

const MarketHistoryQuery = gql<MarketHistoryResponse>`
  query PolkamarktMarketHistory($marketId: Int!, $limit: Int = 96) {
    marketSnapshots(
      first: $limit
      orderBy: [TIMESTAMP_ASC]
      filter: { marketId: { equalTo: $marketId }, type: { equalTo: "DEFAULT" } }
    ) {
      edges {
        node {
          id
          marketId
          timestamp
          blockHeight
          probability
          priceYes
          priceNo
          liquidityUsd: liquidityUSD
          volumeUsd: volumeUSD
          status
        }
      }
    }
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractSnapshotNodes = (value: MarketHistoryPayload | undefined): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value.filter(isRecord);

  return value?.edges?.map((edge) => edge.node).filter(isRecord) ?? [];
};

export function parseMarketHistoryPoint(input: Record<string, unknown>): MarketHistoryPoint | null {
  const id = typeof input.id === 'string' ? input.id : undefined;
  const probability = parseProbability(input.probability ?? input.priceYes);

  if (!id || probability === undefined) return null;

  return {
    id,
    marketId: parseBlockInput(input.marketId),
    timestamp: parseNumber(input.timestamp),
    blockHeight: parseBlockInput(input.blockHeight),
    probability,
    priceYes: parseNumber(input.priceYes),
    priceNo: parseNumber(input.priceNo),
    liquidityUSD: parseNumber(input.liquidityUsd ?? input.liquidityUSD),
    volumeUSD: parseNumber(input.volumeUsd ?? input.volumeUSD),
    status: typeof input.status === 'string' ? input.status : undefined,
  };
}

export function marketRuntimeId(market?: PolkamarktMarket): number | undefined {
  if (!market) return undefined;
  if (Number.isSafeInteger(market.chainId) && Number(market.chainId) >= 0) return market.chainId;

  const parsed = Number(market.id);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Loads indexed YES/NO probability snapshots for the selected Polkamarkt market.
 */
export async function fetchPolkamarktMarketHistory(
  market?: PolkamarktMarket,
  limit = 96
): Promise<MarketHistoryPoint[]> {
  const runtimeMarketId = marketRuntimeId(market);
  if (runtimeMarketId === undefined) return [];

  try {
    const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
    const data = await polkaswapIndexer.services.explorer.request(MarketHistoryQuery, {
      marketId: runtimeMarketId,
      limit,
    });
    const points = extractSnapshotNodes(data?.marketSnapshots)
      .map(parseMarketHistoryPoint)
      .filter((point): point is MarketHistoryPoint => Boolean(point));

    return points;
  } catch (error) {
    console.warn('Polkamarkt market history is unavailable.', error);
    return [];
  }
}
