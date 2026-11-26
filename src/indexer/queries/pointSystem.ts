import { requireEntitlements, EntitlementsUnavailableError } from './capabilities';
import { FPNumber } from '@sora-substrate/sdk';
import { gql } from '@urql/core';

import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { AccountPointSystems, AccountPointsVersioned, AccountPointsCalculation } from '@/types/pointSystem';

import type {
  QueryData,
  ConnectionQueryResponse,
  HistoryElement,
  HistoryElementEthBridgeIncoming,
  HistoryElementEthBridgeOutgoing,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

type BridgeHistoryElement = HistoryElementEthBridgeIncoming | HistoryElementEthBridgeOutgoing;
type CountResponse = {
  totalCount: number;
};

export type BridgeData = {
  amount: FPNumber;
  assetId: string;
  type: 'incoming' | 'outgoing';
};

export enum CountType {
  Swap = 'swap',
  PoolDeposit = 'poolDeposit',
  PoolWithdraw = 'poolWithdraw',
}

const PolkaswapBridgeQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          {
            or: [
              {
                and: [
                  { data: { contains: { to: $account } } }
                  { module: { equalTo: "bridgeMultisig" } }
                  { method: { equalTo: "asMulti" } }
                ]
              }
              {
                and: [
                  { address: { equalTo: $account } }
                  { module: { equalTo: "ethBridge" } }
                  { method: { equalTo: "transferToSidechain" } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          data
        }
      }
    }
  }
`;

const parseBridgeData = (item: HistoryElement): BridgeData => {
  const data = item.data as BridgeHistoryElement;

  return {
    amount: new FPNumber(data.amount),
    assetId: data.assetId,
    type: (data as HistoryElementEthBridgeOutgoing).sidechainAddress ? 'outgoing' : 'incoming',
  };
};

export async function fetchBridgeData(
  start: number,
  end: number,
  account: string,
  indexer?: PolkaswapIndexer
): Promise<BridgeData[]> {
  const variables = { start, end, account };
  const { indexer: polkaswapIndexer, capabilities } = await requireEntitlements(indexer ?? getCurrentIndexer());
  if (capabilities.mode !== 'legacy') throw new EntitlementsUnavailableError();
  const items = await polkaswapIndexer.services.explorer.fetchAllEntities(
    PolkaswapBridgeQuery,
    variables,
    parseBridgeData
  );

  return items ?? [];
}

const getPolkaswapCountQuery = (filter: string) => gql<ConnectionQueryResponse<CountResponse>>`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { address: { equalTo: $account } }
          ${filter}
        ]
      }
    ) {
      totalCount
    }
  }
`;

const CountFilters = {
  [CountType.Swap]: `{ module: { equalTo: "liquidityProxy" } } { method: { equalTo: "swap" } }`,
  [CountType.PoolDeposit]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "depositLiquidity" } }`,
  [CountType.PoolWithdraw]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "withdrawLiquidity" } }`,
};

export async function fetchCount(
  start: number,
  end: number,
  account: string,
  type: CountType,
  indexer?: PolkaswapIndexer
): Promise<number> {
  const variables = { start, end, account };
  const filter = CountFilters[type];
  const { indexer: polkaswapIndexer, capabilities } = await requireEntitlements(indexer ?? getCurrentIndexer());
  if (capabilities.mode !== 'legacy') throw new EntitlementsUnavailableError();
  const response = await polkaswapIndexer.services.explorer.fetchEntities(getPolkaswapCountQuery(filter), variables);

  return response?.totalCount ?? 0;
}

type AccountMetaAssetVolume = {
  amount: string; // formatted NumberLike
  amountUSD: string; // formatted NumberLike
};

type AccountMetaEventCounter = {
  created: number; // count
  closed: number; // count
  amountUSD: string; // formatted NumberLike
};

type AccountMetaGovernance = {
  votes: number; // count
  amount: string; // formatted NumberLike
  amountUSD: string; // formatted NumberLike
};

type AccountMetaDeposit = {
  incomingUSD: string; // formatted NumberLike
  outgoingUSD: string; // formatted NumberLike
};

type AccountMetaEntity = {
  id: string;
  accountId: string;
  recoveryPolicyHash: string | null;
  createdAtTimestamp: number;
  createdAtBlock: number;
  xorFees: AccountMetaAssetVolume;
  xorBurned: AccountMetaAssetVolume;
  xorStakingValRewards: AccountMetaAssetVolume;
  orderBook: AccountMetaEventCounter;
  vault: AccountMetaEventCounter;
  governance: AccountMetaGovernance;
  deposit: AccountMetaDeposit;
};

type AccountPointSystemEntity = {
  id: string;
  accountId: string;
  version: number;
  startedAtBlock: number;
  // points
  xorFees: AccountMetaAssetVolume;
  xorBurned: AccountMetaAssetVolume;
  xorStakingValRewards: AccountMetaAssetVolume;
  orderBook: AccountMetaEventCounter;
  vault: AccountMetaEventCounter;
  governance: AccountMetaGovernance;
  deposit: AccountMetaDeposit;
};

const PolkaswapAccountMetaQuery = gql<QueryData<AccountMetaEntity | null>>`
  query AccountMetaQuery($id: String = "") {
    data: accountMeta(id: $id) {
      accountId
      recoveryPolicyHash
      createdAtTimestamp
      createdAtBlock
      xorFees
      xorBurned
      xorStakingValRewards
      orderBook
      vault
      governance
      deposit
    }
  }
`;

const PolkaswapAccountPointSystemsQuery = gql<ConnectionQueryResponse<AccountPointSystemEntity>>`
  query AccountPointSystemsQuery($id: String = "", $after: Cursor) {
    data: accountPointSystems(orderBy: ID_ASC, after: $after, filter: { accountId: { equalTo: $id } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          accountId
          version
          startedAtBlock
          xorFees
          xorBurned
          xorStakingValRewards
          orderBook
          vault
          governance
          deposit
        }
      }
    }
  }
`;

const parseVolume = (data: AccountMetaAssetVolume | AccountMetaGovernance) => {
  return {
    amount: new FPNumber(data.amount),
    amountUSD: new FPNumber(data.amountUSD),
  };
};

const parseCounter = (data: AccountMetaEventCounter) => {
  return {
    created: new FPNumber(data.created),
    closed: new FPNumber(data.closed),
    amountUSD: new FPNumber(data.amountUSD),
  };
};

const parseAccountPoints = (item: AccountMetaEntity | AccountPointSystemEntity): AccountPointsCalculation => {
  const { xorFees, xorBurned, xorStakingValRewards, orderBook, vault, governance, deposit } = item;

  return {
    fees: parseVolume(xorFees),
    burned: parseVolume(xorBurned),
    staking: parseVolume(xorStakingValRewards),
    orderBook: parseCounter(orderBook),
    kensetsu: parseCounter(vault),
    governance: {
      votes: new FPNumber(governance.votes),
      ...parseVolume(governance),
    },
    bridge: {
      incomingUSD: new FPNumber(deposit.incomingUSD),
      outgoingUSD: new FPNumber(deposit.outgoingUSD),
    },
  };
};

const parseAccountMeta = (item: AccountMetaEntity): AccountPointSystems => {
  const { createdAtTimestamp, createdAtBlock } = item;
  const startedAtBlock = Number(createdAtBlock);

  return {
    accountId: item.accountId,
    recoveryPolicyHash: item.recoveryPolicyHash,
    createdAt: {
      block: startedAtBlock,
      timestamp: Number(createdAtTimestamp) * 1000,
    },
    points: [
      {
        version: 1,
        startedAtBlock,
        ...parseAccountPoints(item),
      },
    ],
  };
};

const parseAccountPointSystem = (item: AccountPointSystemEntity): AccountPointsVersioned => {
  const { version, startedAtBlock } = item;

  return {
    version,
    startedAtBlock,
    ...parseAccountPoints(item),
  };
};

/** Retain a caller-selected explorer when joining metadata to its ownership admission. */
export async function fetchAccountMeta(
  accountAddress: string,
  indexer?: PolkaswapIndexer
): Promise<AccountPointSystems | null> {
  const variables = { id: accountAddress };

  try {
    const session = await requireEntitlements(indexer ?? getCurrentIndexer());
    const response = await session.indexer.services.explorer.request(PolkaswapAccountMetaQuery, variables);

    if (!response?.data) return null;

    await requireEntitlements(session.indexer);
    return parseAccountMeta(response.data);
  } catch (error) {
    if (!(error instanceof EntitlementsUnavailableError)) console.error(error);
    return null;
  }
}

export async function fetchAccountPointSystems(
  accountAddress: string,
  indexer?: PolkaswapIndexer
): Promise<AccountPointsVersioned[] | null> {
  const variables = { id: accountAddress };

  try {
    const { indexer: polkaswapIndexer } = await requireEntitlements(indexer ?? getCurrentIndexer());
    const response = await polkaswapIndexer.services.explorer.fetchAllEntities(
      PolkaswapAccountPointSystemsQuery,
      variables,
      parseAccountPointSystem
    );

    if (!response) return null;

    await requireEntitlements(polkaswapIndexer);
    return response;
  } catch (error) {
    if (!(error instanceof EntitlementsUnavailableError)) console.error(error);
    return null;
  }
}

export async function fetchAccountPoints(accountAddress: string): Promise<AccountPointSystems | null> {
  const session = await requireEntitlements();
  const meta = await fetchAccountMeta(accountAddress, session.indexer);
  const points = await fetchAccountPointSystems(accountAddress, session.indexer);

  if (!meta || !Array.isArray(points)) return null;
  await requireEntitlements(session.indexer);

  return {
    accountId: meta.accountId,
    recoveryPolicyHash: meta.recoveryPolicyHash,
    createdAt: meta.createdAt,
    points,
  };
}
