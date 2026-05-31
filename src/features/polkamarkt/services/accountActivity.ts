import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';

import type { AccountActivity, AccountPosition, AccountTrade, TicketOutcome } from '../types';

type AccountActivityResponse = Record<string, unknown>;

const AccountActivityQuery = gql<AccountActivityResponse>`
  query PolkamarktAccountActivity($account: String!, $limit: Int = 50) {
    accountPositions(first: $limit, orderBy: [UPDATED_AT_DESC], where: { account: { equalTo: $account } }) {
      edges {
        node {
          id
          account
          marketId
          outcome
          shares
          yesShares
          noShares
          netCollateralPaid
          lpShares
          lpCollateralContributed
          costBasisUsd
          marketValueUsd
          realizedPnlUsd
          unrealizedPnlUsd
          claimablePayoutUsd
          lpClaimablePayoutUsd
          isCreator
          status
          updatedAt
          market {
            id
            marketId
            title
            status
          }
        }
      }
    }
    accountTrades(first: $limit, orderBy: [TIMESTAMP_DESC], where: { account: { equalTo: $account } }) {
      edges {
        node {
          id
          account
          marketId
          side
          outcome
          fromOutcome
          toOutcome
          collateralUsd
          collateralAmountUsd
          collateralReinvestedUsd
          shares
          sharesAmount
          sharesIn
          sharesOut
          price
          executionPrice
          feeUsd
          feeAmountUsd
          sellFeeUsd
          buyFeeUsd
          realizedPnlUsd
          timestamp
          blockNumber
          blockHash
          extrinsicHash
          market {
            id
            marketId
            title
            status
          }
        }
      }
    }
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const readNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const firstRecordValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

const readOutcome = (value: unknown): TicketOutcome | undefined => {
  const normalized = readString(value)?.toUpperCase();
  return normalized === 'YES' || normalized === 'NO' ? normalized : undefined;
};

const readSide = (value: unknown): AccountTrade['side'] => {
  const normalized = readString(value)?.toLowerCase();
  return normalized === 'buy' || normalized === 'sell' || normalized === 'claim' || normalized === 'flip'
    ? normalized
    : undefined;
};

const readTimestamp = (value: unknown): string | undefined => {
  const text = readString(value);
  if (text && !/^\d+(\.\d+)?$/.test(text)) return text;

  const numeric = readNumber(value);
  if (numeric === undefined) return text;
  return new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000).toISOString();
};

const extractNodes = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter(isRecord);

  const edges = asRecord(value).edges;
  if (!Array.isArray(edges)) return [];
  return edges.map((edge) => asRecord(edge).node).filter(isRecord);
};

const parseMarketTitle = (record: Record<string, unknown>): string | undefined => {
  const market = asRecord(record.market);
  return readString(record.marketTitle) ?? readString(record.title) ?? readString(market.title);
};

const parseMarketId = (record: Record<string, unknown>): number | undefined => {
  const market = asRecord(record.market);
  return readNumber(
    firstRecordValue(record, ['marketId', 'market_id']) ?? firstRecordValue(market, ['marketId', 'market_id', 'id'])
  );
};

export function parseAccountPosition(record: Record<string, unknown>, index = 0): AccountPosition {
  const market = asRecord(record.market);
  const marketId = parseMarketId(record);

  return {
    id: readString(record.id) ?? `${marketId ?? 'position'}-${readOutcome(record.outcome) ?? index}`,
    marketId,
    marketTitle: parseMarketTitle(record),
    outcome: readOutcome(record.outcome),
    shares: readNumber(firstRecordValue(record, ['shares', 'sharesAmount'])),
    yesShares: readNumber(firstRecordValue(record, ['yesShares', 'yes_shares'])),
    noShares: readNumber(firstRecordValue(record, ['noShares', 'no_shares'])),
    netCollateralPaid: readNumber(firstRecordValue(record, ['netCollateralPaid', 'net_collateral_paid'])),
    lpShares: readNumber(firstRecordValue(record, ['lpShares', 'lp_shares'])),
    lpCollateralContributed: readNumber(
      firstRecordValue(record, ['lpCollateralContributed', 'lp_collateral_contributed'])
    ),
    costBasisUsd: readNumber(firstRecordValue(record, ['costBasisUsd', 'costBasisUSD'])),
    marketValueUsd: readNumber(firstRecordValue(record, ['marketValueUsd', 'marketValueUSD', 'currentValueUsd'])),
    realizedPnlUsd: readNumber(firstRecordValue(record, ['realizedPnlUsd', 'realizedPnlUSD'])),
    unrealizedPnlUsd: readNumber(firstRecordValue(record, ['unrealizedPnlUsd', 'unrealizedPnlUSD'])),
    claimablePayoutUsd: readNumber(firstRecordValue(record, ['claimablePayoutUsd', 'claimablePayoutUSD'])),
    lpClaimablePayoutUsd: readNumber(firstRecordValue(record, ['lpClaimablePayoutUsd', 'lpClaimablePayoutUSD'])),
    isCreator: Boolean(record.isCreator),
    status: readString(record.status) ?? readString(market.status),
    updatedAt: readString(record.updatedAt) ?? readString(record.timestamp),
  };
}

export function parseAccountTrade(record: Record<string, unknown>, index = 0): AccountTrade {
  const marketId = parseMarketId(record);
  const blockNumber = readNumber(firstRecordValue(record, ['blockNumber', 'block', 'blockHeight']));

  return {
    id: readString(record.id) ?? readString(record.extrinsicHash) ?? `${marketId ?? 'trade'}-${blockNumber ?? index}`,
    marketId,
    marketTitle: parseMarketTitle(record),
    side: readSide(record.side ?? record.action ?? record.method),
    outcome: readOutcome(record.outcome),
    fromOutcome: readOutcome(firstRecordValue(record, ['fromOutcome', 'from_outcome'])),
    toOutcome: readOutcome(firstRecordValue(record, ['toOutcome', 'to_outcome'])),
    collateralUsd: readNumber(
      firstRecordValue(record, [
        'collateralUsd',
        'collateralUSD',
        'collateralAmountUsd',
        'collateralAmountUSD',
        'notionalUsd',
        'amountUsd',
      ])
    ),
    collateralReinvestedUsd: readNumber(
      firstRecordValue(record, ['collateralReinvestedUsd', 'collateralReinvestedUSD', 'collateral_reinvested_usd'])
    ),
    shares: readNumber(firstRecordValue(record, ['shares', 'sharesAmount', 'shareAmount'])),
    sharesIn: readNumber(firstRecordValue(record, ['sharesIn', 'shares_in'])),
    sharesOut: readNumber(firstRecordValue(record, ['sharesOut', 'shares_out'])),
    price: readNumber(firstRecordValue(record, ['price', 'executionPrice', 'avgPrice'])),
    feeUsd: readNumber(firstRecordValue(record, ['feeUsd', 'feeUSD', 'feeAmountUsd'])),
    sellFeeUsd: readNumber(firstRecordValue(record, ['sellFeeUsd', 'sellFeeUSD'])),
    buyFeeUsd: readNumber(firstRecordValue(record, ['buyFeeUsd', 'buyFeeUSD'])),
    realizedPnlUsd: readNumber(firstRecordValue(record, ['realizedPnlUsd', 'realizedPnlUSD', 'pnlUsd'])),
    timestamp: readTimestamp(record.timestamp) ?? readTimestamp(record.createdAt),
    blockNumber,
    blockHash: readString(record.blockHash),
    extrinsicHash: readString(record.extrinsicHash) ?? readString(record.txHash) ?? readString(record.id),
  };
}

export function parseAccountActivity(payload: unknown, account: string): AccountActivity {
  const root = asRecord(payload);

  return {
    account,
    positions: extractNodes(root.accountPositions ?? root.positions).map(parseAccountPosition),
    trades: extractNodes(root.accountTrades ?? root.trades).map(parseAccountTrade),
    updatedAt: readString(root.updatedAt),
  };
}

/**
 * Loads connected-account Polkamarkt positions and recent trades from the active indexer.
 */
export async function fetchPolkamarktAccountActivity(account: string, limit = 50): Promise<AccountActivity> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const data = await polkaswapIndexer.services.explorer.request(AccountActivityQuery, { account, limit });
  return parseAccountActivity(data ?? {}, account);
}
