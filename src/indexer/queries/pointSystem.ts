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

export async function fetchBridgeData(start: number, end: number, account: string): Promise<BridgeData[]> {
  const variables = { start, end, account };
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
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

export async function fetchCount(start: number, end: number, account: string, type: CountType): Promise<number> {
  const variables = { start, end, account };
  const filter = CountFilters[type];
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
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

const PolkaswapAccountMetaQuery = gql<QueryData<AccountMetaEntity>>`
  query AccountMetaQuery($id: String = "") {
    data: accountMeta(id: $id) {
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

export async function fetchAccountMeta(accountAddress: string): Promise<AccountPointSystems | null> {
  const variables = { id: accountAddress };

  try {
    const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
    const response = await polkaswapIndexer.services.explorer.request(PolkaswapAccountMetaQuery, variables);

    if (!response) return null;

    return parseAccountMeta(response.data);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchAccountPointSystems(accountAddress: string): Promise<AccountPointsVersioned[] | null> {
  const variables = { id: accountAddress };

  try {
    const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
    const response = await polkaswapIndexer.services.explorer.fetchAllEntities(
      PolkaswapAccountPointSystemsQuery,
      variables,
      parseAccountPointSystem
    );

    if (!response) return null;

    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function fetchAccountPoints(accountAddress: string): Promise<AccountPointSystems | null> {
  const meta = await fetchAccountMeta(accountAddress);
  const points = await fetchAccountPointSystems(accountAddress);

  if (!meta) return null;

  return {
    createdAt: meta.createdAt,
    points: Array.isArray(points) ? points : meta.points,
  };
}
