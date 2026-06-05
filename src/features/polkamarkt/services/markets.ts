import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

import { normalizeMarketCategory, normalizeMarketOracle, parseBlockInput, parseProbability } from '../lib/markets';
import {
  fetchReadOnlyRuntimePolkamarktMarkets,
  fetchRuntimePolkamarktMarkets,
  mergePolkamarktMarkets,
} from './runtimeMarkets';

import type { PolkamarktMarket } from '../types';
import type { ApiPromise } from '@polkadot/api';

type MarketPayload =
  | Array<Record<string, unknown>>
  | {
      edges?: Array<{ node?: Record<string, unknown> | null }>;
    };

type MarketsResponse = {
  markets?: MarketPayload;
};

type FetchPolkamarktMarketsOptions = {
  api?: ApiPromise | null;
  endpoint?: string;
  limit?: number;
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
          mechanism
          collateralAsset
          virtualDepth
          dpmCollateral
          realYesShares
          realNoShares
          marginalYesPriceBps
          marginalNoPriceBps
          impliedYesProbabilityBps
          impliedNoProbabilityBps
          creatorFees
          liquidityUsd: liquidityUSD
          volumeUsd: volumeUSD
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
          mechanism
          collateralAsset
          liquidityUsd: liquidityUSD
          volumeUsd: volumeUSD
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
    liquidity: coerceNumber(input.liquidityUsd ?? input.liquidityUSD ?? input.liquidity ?? input.dpmCollateral),
    volume: coerceNumber(input.volumeUsd ?? input.volumeUSD ?? input.volume ?? input.marketVolume),
    probability: parseProbability(input.probability ?? input.priceYes),
    trending: Boolean(input.trending ?? false),
    status: parseString(input.status),
    mechanism: parseString(input.mechanism),
    collateralAsset: parseString(input.collateralAsset),
    virtualDepth: positiveNumber(input.virtualDepth),
    dpmCollateral: positiveNumber(input.dpmCollateral),
    realYesShares: positiveNumber(input.realYesShares),
    realNoShares: positiveNumber(input.realNoShares),
    marginalYesPriceBps: nonNegativeNumber(input.marginalYesPriceBps),
    marginalNoPriceBps: nonNegativeNumber(input.marginalNoPriceBps),
    impliedYesProbabilityBps: nonNegativeNumber(input.impliedYesProbabilityBps),
    impliedNoProbabilityBps: nonNegativeNumber(input.impliedNoProbabilityBps),
    creatorFees: nonNegativeNumber(input.creatorFees),
    resolutionOutcome: parseString(input.resolutionOutcome),
    resolutionEvidenceUri: parseString(input.resolutionEvidenceUri),
    resolutionEvidenceHash: parseString(input.resolutionEvidenceHash),
    resolutionEvidenceBlock: positiveNumber(input.resolutionEvidenceBlock),
    earlyResolutionOutcome: parseString(input.earlyResolutionOutcome),
    earlyResolutionReporter: parseString(input.earlyResolutionReporter),
    earlyResolutionBond: positiveNumber(input.earlyResolutionBond),
    earlyResolutionEvidenceUri: parseString(input.earlyResolutionEvidenceUri),
    earlyResolutionEvidenceHash: parseString(input.earlyResolutionEvidenceHash),
    earlyResolutionEvidenceBlock: positiveNumber(input.earlyResolutionEvidenceBlock),
    cancellationEvidenceUri: parseString(input.cancellationEvidenceUri),
    cancellationEvidenceHash: parseString(input.cancellationEvidenceHash),
    cancellationEvidenceBlock: positiveNumber(input.cancellationEvidenceBlock),
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
 * Loads Polkamarkt markets from the active Polkaswap indexer and appends direct runtime markets
 * that have not been indexed yet.
 */
export async function fetchPolkamarktMarkets(
  options: FetchPolkamarktMarketsOptions | number = 48
): Promise<PolkamarktMarket[]> {
  const { api, endpoint, limit } =
    typeof options === 'number' ? { api: undefined, endpoint: undefined, limit: options } : { limit: 48, ...options };
  let indexedMarkets: PolkamarktMarket[] = [];
  let indexerError: unknown;

  try {
    indexedMarkets = await requestMarkets(MarketsQuery, limit);
    if (!indexedMarkets.length) {
      indexedMarkets = await requestMarkets(LegacyMarketsQuery, limit);
    }
  } catch (error) {
    indexerError = error;
  }

  let runtimeMarkets: PolkamarktMarket[] = [];
  if (api) {
    try {
      runtimeMarkets = await fetchRuntimePolkamarktMarkets(api);
    } catch (error) {
      console.warn('Polkamarkt runtime markets are unavailable.', error);
    }
  }
  if (!runtimeMarkets.length && endpoint) {
    try {
      runtimeMarkets = await fetchReadOnlyRuntimePolkamarktMarkets(endpoint);
    } catch (error) {
      console.warn('Read-only Polkamarkt runtime markets are unavailable.', error);
    }
  }

  if (indexerError && !indexedMarkets.length && !runtimeMarkets.length) {
    throw indexerError;
  }

  return mergePolkamarktMarkets(indexedMarkets, runtimeMarkets);
}
