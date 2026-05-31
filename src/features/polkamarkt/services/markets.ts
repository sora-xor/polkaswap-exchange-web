import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

import { normalizeMarketCategory, normalizeMarketOracle, parseBlockInput, parseProbability } from '../lib/markets';

import type { PolkamarktMarket } from '../types';

type MarketPayload =
  | Array<Record<string, unknown>>
  | {
      edges?: Array<{ node?: Record<string, unknown> | null }>;
    };

type MarketsResponse = {
  markets?: MarketPayload;
};

const MarketsQuery = gql<MarketsResponse>`
  query PolkamarktLatestMarkets($limit: Int = 48) {
    markets(first: $limit, orderBy: [VOLUME_USD_DESC]) {
      edges {
        node {
          id
          marketId
          conditionId
          creator
          title
          category
          description
          oracle
          resolutionSource
          closeBlock
          status
          collateralAsset
          seedLiquidity
          creatorFees
          liquidityUsd: liquidityUSD
          volumeUsd: volumeUSD
          poolCollateral: collateral
          poolYes: yesShares
          poolNo: noShares
          liquidityShares
          liquidityCollateralContributed
          resolutionOutcome
          resolutionEvidenceUri
          resolutionEvidenceHash
          resolutionEvidenceBlock
          cancellationEvidenceUri
          cancellationEvidenceHash
          cancellationEvidenceBlock
          probability
          priceYes
        }
      }
    }
  }
`;

const LegacyMarketsQuery = gql<MarketsResponse>`
  query PolkamarktLatestMarkets($limit: Int = 48) {
    markets(first: $limit, orderBy: [VOLUME_USD_DESC]) {
      edges {
        node {
          id
          marketId
          conditionId
          creator
          title
          category
          description
          oracle
          resolutionSource
          closeBlock
          status
          collateralAsset
          seedLiquidity
          liquidityUsd: liquidityUSD
          volumeUsd: volumeUSD
          poolCollateral: collateral
          poolYes: yesShares
          poolNo: noShares
          resolutionOutcome
          probability
          priceYes
        }
      }
    }
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const coerceNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const positiveNumber = (value: unknown): number | undefined => {
  const parsed = coerceNumber(value);
  return parsed > 0 ? parsed : undefined;
};

const nonNegativeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = coerceNumber(value);
  return parsed >= 0 ? parsed : undefined;
};

const parseCategory = (value: unknown): PolkamarktMarket['category'] => {
  const category = parseString(value);
  return category ? (normalizeMarketCategory(category) ?? 'Other') : 'Other';
};

export function parseMarket(input: Record<string, unknown>): PolkamarktMarket | null {
  const marketId = parseBlockInput(input.marketId ?? input.id);
  const id = parseString(input.id) ?? (marketId !== undefined ? String(marketId) : undefined);
  const title = parseString(input.title);

  if (!id || !title) return null;

  return {
    id,
    chainId: marketId,
    conditionId: parseBlockInput(input.conditionId),
    creator: parseString(input.creator),
    title,
    category: parseCategory(input.category),
    description:
      parseString(input.description) ??
      'The indexer did not return a market description; review the oracle source before trading.',
    oracle: normalizeMarketOracle(parseString(input.oracle)),
    resolutionSource: parseString(input.resolutionSource),
    closeBlock: parseBlockInput(input.closeBlock),
    liquidity: coerceNumber(input.liquidityUsd ?? input.liquidityUSD ?? input.liquidity ?? input.seedLiquidity),
    volume: coerceNumber(input.volumeUsd ?? input.volumeUSD ?? input.volume ?? input.marketVolume),
    probability: parseProbability(input.probability ?? input.priceYes),
    trending: Boolean(input.trending ?? false),
    status: parseString(input.status),
    collateralAsset: parseString(input.collateralAsset),
    seedLiquidity: positiveNumber(input.seedLiquidity),
    creatorFees: nonNegativeNumber(input.creatorFees),
    liquidityShares: positiveNumber(input.liquidityShares),
    liquidityCollateralContributed: positiveNumber(input.liquidityCollateralContributed),
    resolutionOutcome: parseString(input.resolutionOutcome),
    resolutionEvidenceUri: parseString(input.resolutionEvidenceUri),
    resolutionEvidenceHash: parseString(input.resolutionEvidenceHash),
    resolutionEvidenceBlock: positiveNumber(input.resolutionEvidenceBlock),
    cancellationEvidenceUri: parseString(input.cancellationEvidenceUri),
    cancellationEvidenceHash: parseString(input.cancellationEvidenceHash),
    cancellationEvidenceBlock: positiveNumber(input.cancellationEvidenceBlock),
    pool: {
      collateral: positiveNumber(input.poolCollateral),
      yes: positiveNumber(input.poolYes),
      no: positiveNumber(input.poolNo),
    },
  };
}

function extractMarketNodes(value: MarketPayload | undefined): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);

  return value?.edges?.map((edge) => edge.node).filter(isRecord) ?? [];
}

async function requestMarkets(query: typeof MarketsQuery, limit: number): Promise<PolkamarktMarket[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const data = await polkaswapIndexer.services.explorer.request(query, { limit });
  return extractMarketNodes(data?.markets)
    .map(parseMarket)
    .filter((market): market is PolkamarktMarket => Boolean(market));
}

/**
 * Loads Polkamarkt markets from the active Polkaswap indexer with a legacy schema fallback.
 */
export async function fetchPolkamarktMarkets(limit = 48): Promise<PolkamarktMarket[]> {
  const markets = await requestMarkets(MarketsQuery, limit);
  if (markets.length) return markets;
  return requestMarkets(LegacyMarketsQuery, limit);
}
