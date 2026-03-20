import { aF as getCurrentIndexer$1, aI as WALLET_CONSTS, aH as gql, F as FPNumber } from "./index-73GArslZ.js";
const createFallbackIndexer = () => ({
  type: "subquery",
  services: {
    explorer: {
      request: async () => null,
      fetchEntities: async () => ({ totalCount: 0 }),
      fetchEntitiesConnection: async () => ({ totalCount: 0 }),
      createEntitySubscription: () => () => void 0
    }
  }
});
const getCurrentIndexer = getCurrentIndexer$1 ?? createFallbackIndexer;
const walletConsts = WALLET_CONSTS ?? {
  IndexerType: {
    SUBQUERY: "subquery",
    SUBSQUID: "subsquid"
  }
};
const { IndexerType } = walletConsts;
var CountType = /* @__PURE__ */ ((CountType2) => {
  CountType2["Swap"] = "swap";
  CountType2["PoolDeposit"] = "poolDeposit";
  CountType2["PoolWithdraw"] = "poolWithdraw";
  return CountType2;
})(CountType || {});
const SubqueryBridgeQuery = gql`
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
const SubsquidBridgeQuery = gql`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          {
            OR: [
              {
                AND: [
                  { data_jsonContains: { to: $account } }
                  { module_eq: "bridgeMultisig" }
                  { method_eq: "asMulti" }
                ]
              }
              { AND: [{ address_eq: $account }, { module_eq: "ethBridge" }, { method_eq: "transferToSidechain" }] }
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
const parseBridgeData = (item) => {
  const data = item.data;
  return {
    amount: new FPNumber(data.amount),
    assetId: data.assetId,
    type: data.sidechainAddress ? "outgoing" : "incoming"
  };
};
async function fetchBridgeData(start, end, account) {
  const indexer = getCurrentIndexer();
  const variables = { start, end, account };
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryBridgeQuery,
        variables,
        parseBridgeData
      );
      return items ?? [];
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      const items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidBridgeQuery,
        variables,
        parseBridgeData
      );
      return items ?? [];
    }
  }
  return [];
}
const getSubqueryCountQuery = (filter) => gql`
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
const getSubsquidCountQuery = (filter) => gql`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          { address_eq: $account }
          ${filter}
        ]
      }
    ) {
      totalCount
    }
  }
`;
const CountFilers = {
  [IndexerType.SUBQUERY]: {
    [
      "swap"
      /* Swap */
    ]: `{ module: { equalTo: "liquidityProxy" } } { method: { equalTo: "swap" } }`,
    [
      "poolDeposit"
      /* PoolDeposit */
    ]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "depositLiquidity" } }`,
    [
      "poolWithdraw"
      /* PoolWithdraw */
    ]: `{ module: { equalTo: "poolXYK" } } { method: { equalTo: "withdrawLiquidity" } }`
  },
  [IndexerType.SUBSQUID]: {
    [
      "swap"
      /* Swap */
    ]: `{ module_eq: "liquidityProxy" } { method_eq: "swap" }`,
    [
      "poolDeposit"
      /* PoolDeposit */
    ]: `{ module_eq: "poolXYK" } { method_eq: "depositLiquidity" }`,
    [
      "poolWithdraw"
      /* PoolWithdraw */
    ]: `{ module_eq: "poolXYK" } { method_eq: "withdrawLiquidity" }`
  }
};
async function fetchCount(start, end, account, type) {
  const indexer = getCurrentIndexer();
  const variables = { start, end, account };
  const filter = CountFilers[indexer.type]?.[type];
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      const response = await subqueryIndexer.services.explorer.fetchEntities(getSubqueryCountQuery(filter), variables);
      return response?.totalCount ?? 0;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      const response = await subsquidIndexer.services.explorer.fetchEntitiesConnection(
        getSubsquidCountQuery(filter),
        variables
      );
      return response?.totalCount ?? 0;
    }
  }
  return 0;
}
const SubqueryAccountMetaQuery = gql`
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
gql`
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
const parseVolume = (data) => {
  return {
    amount: new FPNumber(data.amount),
    amountUSD: new FPNumber(data.amountUSD)
  };
};
const parseCounter = (data) => {
  return {
    created: new FPNumber(data.created),
    closed: new FPNumber(data.closed),
    amountUSD: new FPNumber(data.amountUSD)
  };
};
const parseAccountPoints = (item) => {
  const { xorFees, xorBurned, xorStakingValRewards, orderBook, vault, governance, deposit } = item;
  return {
    fees: parseVolume(xorFees),
    burned: parseVolume(xorBurned),
    staking: parseVolume(xorStakingValRewards),
    orderBook: parseCounter(orderBook),
    kensetsu: parseCounter(vault),
    governance: {
      votes: new FPNumber(governance.votes),
      ...parseVolume(governance)
    },
    bridge: {
      incomingUSD: new FPNumber(deposit.incomingUSD),
      outgoingUSD: new FPNumber(deposit.outgoingUSD)
    }
  };
};
const parseAccountMeta = (item) => {
  const { createdAtTimestamp, createdAtBlock } = item;
  const startedAtBlock = Number(createdAtBlock);
  return {
    createdAt: {
      block: startedAtBlock,
      timestamp: Number(createdAtTimestamp) * 1e3
    },
    points: [
      {
        version: 1,
        startedAtBlock,
        ...parseAccountPoints(item)
      }
    ]
  };
};
async function fetchAccountMeta(accountAddress) {
  const indexer = getCurrentIndexer();
  const variables = { id: accountAddress };
  try {
    if (indexer.type === IndexerType.SUBQUERY) {
      const subqueryIndexer = indexer;
      const response = await subqueryIndexer.services.explorer.request(SubqueryAccountMetaQuery, variables);
      if (!response) return null;
      return parseAccountMeta(response.data);
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
export {
  CountType as C,
  fetchCount as a,
  fetchAccountMeta as b,
  fetchBridgeData as f
};
