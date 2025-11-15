import { Operation } from '@sora-substrate/sdk';
import { gql } from '@urql/core';

import { PageInfoFragment } from '../../fragments/pageInfo';
import { ModuleNames, ModuleMethods } from '../types';

import type { HistoryQuery } from '../../../../types/history';
import type { ConnectionQueryResponse, HistoryElement } from '../../types';

export const HistoryElementsQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query SubqueryHistoryElements(
    $first: Int = null
    $last: Int = null
    $offset: Int = null
    $after: Cursor = ""
    $before: Cursor = ""
    $orderBy: [HistoryElementsOrderBy!] = [TIMESTAMP_DESC, ID_DESC]
    $filter: HistoryElementFilter
  ) {
    data: historyElements(
      first: $first
      last: $last
      offset: $offset
      before: $before
      after: $after
      orderBy: $orderBy
      filter: $filter
    ) {
      edges {
        node {
          id
          type
          timestamp
          blockHash
          blockHeight
          module
          method
          address
          networkFee
          execution
          data
          dataFrom
          dataTo
          calls {
            nodes {
              module
              method
              data
            }
          }
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
      totalCount
    }
  }
  ${PageInfoFragment}
`;

const RewardsClaimExtrinsics = [
  [ModuleNames.PswapDistribution, ModuleMethods.PswapDistributionClaimIncentive],
  [ModuleNames.Rewards, ModuleMethods.RewardsClaim],
  [ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimRewards],
  [ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimCrowdloanRewards],
];

const DemeterFarmingDeposit = {
  module: {
    equalTo: ModuleNames.DemeterFarming,
  },
  method: {
    equalTo: ModuleMethods.DemeterFarmingDeposit,
  },
};

const DemeterFarmingWithdraw = {
  module: {
    equalTo: ModuleNames.DemeterFarming,
  },
  method: {
    equalTo: ModuleMethods.DemeterFarmingWithdraw,
  },
};

const OrderBookCancelLimitOrders = {
  module: {
    equalTo: ModuleNames.OrderBook,
  },
  method: {
    equalTo: ModuleMethods.OrderBookCancelLimitOrders,
  },
};

const OperationFilterMap = {
  [Operation.Swap]: {
    module: {
      equalTo: ModuleNames.LiquidityProxy,
    },
    method: {
      equalTo: ModuleMethods.LiquidityProxySwap,
    },
  },
  [Operation.SwapAndSend]: {
    module: {
      equalTo: ModuleNames.LiquidityProxy,
    },
    method: {
      equalTo: ModuleMethods.LiquidityProxySwapTransfer,
    },
  },
  [Operation.SwapTransferBatch]: {
    module: {
      equalTo: ModuleNames.LiquidityProxy,
    },
    method: {
      equalTo: ModuleMethods.LiquidityProxySwapTransferBatch,
    },
  },
  [Operation.Transfer]: {
    or: [
      // sender
      {
        module: {
          equalTo: ModuleNames.Assets,
        },
        method: {
          equalToInsensitive: ModuleMethods.AssetsTransfer,
        },
      },
      // sender
      {
        module: {
          equalTo: ModuleNames.LiquidityProxy,
        },
        method: {
          equalTo: ModuleMethods.LiquidityProxyXorlessTransfer,
        },
      },
      // recipient
      {
        module: {
          equalTo: ModuleNames.Tokens,
        },
        method: {
          equalToInsensitive: ModuleMethods.TokensTransfer,
        },
      },
      // recipient
      {
        module: {
          equalTo: ModuleNames.Balances,
        },
        method: {
          equalToInsensitive: ModuleMethods.BalancesTransfer,
        },
      },
    ],
  },
  [Operation.VestedTransfer]: {
    module: {
      equalTo: ModuleNames.VestedRewards,
    },
    method: {
      equalTo: ModuleMethods.VestedRewardsVestedTransfer,
    },
  },
  [Operation.RegisterAsset]: {
    module: {
      equalTo: ModuleNames.Assets,
    },
    method: {
      equalTo: ModuleMethods.AssetsRegister,
    },
  },
  [Operation.Burn]: {
    module: {
      equalTo: ModuleNames.Assets,
    },
    method: {
      equalTo: ModuleMethods.AssetsBurn,
    },
  },
  [Operation.Mint]: {
    or: [
      // sender
      {
        module: {
          equalTo: ModuleNames.Assets,
        },
        method: {
          equalTo: ModuleMethods.AssetsMint,
        },
      },
      // recipient
      {
        module: {
          equalTo: ModuleNames.Tokens,
        },
        method: {
          equalTo: ModuleMethods.TokensDeposited,
        },
      },
      // recipient
      {
        module: {
          equalTo: ModuleNames.Balances,
        },
        method: {
          equalTo: ModuleMethods.BalancesDeposited,
        },
      },
    ],
  },
  [Operation.CreatePair]: {
    module: {
      equalTo: ModuleNames.Utility,
    },
    method: {
      equalTo: ModuleMethods.UtilityBatchAll,
    },
    callNames: {
      contains: [
        ModuleNames.PoolXYK + '.' + ModuleMethods.PoolXYKInitializePool,
        ModuleNames.PoolXYK + '.' + ModuleMethods.PoolXYKDepositLiquidity,
      ],
    },
  },
  [Operation.AddLiquidity]: {
    module: {
      includesInsensitive: ModuleNames.PoolXYK,
    },
    method: {
      equalTo: ModuleMethods.PoolXYKDepositLiquidity,
    },
  },
  [Operation.RemoveLiquidity]: {
    module: {
      includesInsensitive: ModuleNames.PoolXYK,
    },
    method: {
      equalTo: ModuleMethods.PoolXYKWithdrawLiquidity,
    },
  },
  [Operation.ReferralSetInvitedUser]: {
    module: {
      equalTo: ModuleNames.Referrals,
    },
    method: {
      equalTo: ModuleMethods.ReferralsSetReferrer,
    },
  },
  [Operation.ReferralReserveXor]: {
    module: {
      equalTo: ModuleNames.Referrals,
    },
    method: {
      equalTo: ModuleMethods.ReferralsReserve,
    },
  },
  [Operation.ReferralUnreserveXor]: {
    module: {
      equalTo: ModuleNames.Referrals,
    },
    method: {
      equalTo: ModuleMethods.ReferralsUnreserve,
    },
  },
  [Operation.EthBridgeOutgoing]: {
    module: {
      equalTo: ModuleNames.EthBridge,
    },
    method: {
      equalTo: ModuleMethods.EthBridgeTransferToSidechain,
    },
  },
  [Operation.EthBridgeIncoming]: {
    module: {
      equalTo: ModuleNames.BridgeMultisig,
    },
    method: {
      equalTo: ModuleMethods.BridgeMultisigAsMulti,
    },
  },
  [Operation.ClaimRewards]: {
    or: [
      ...RewardsClaimExtrinsics.map(([module, method]) => ({
        module: {
          equalTo: module,
        },
        method: {
          equalTo: method,
        },
      })),
      {
        module: {
          equalTo: ModuleNames.Utility,
        },
        method: {
          equalTo: ModuleMethods.UtilityBatchAll,
        },
        or: RewardsClaimExtrinsics.map(([module, method]) => ({
          callNames: {
            contains: module + '.' + method,
          },
        })),
      },
    ],
  },
  // DEMETER
  [Operation.DemeterFarmingDepositLiquidity]: DemeterFarmingDeposit,
  [Operation.DemeterFarmingWithdrawLiquidity]: DemeterFarmingWithdraw,
  [Operation.DemeterFarmingStakeToken]: DemeterFarmingDeposit,
  [Operation.DemeterFarmingUnstakeToken]: DemeterFarmingWithdraw,
  [Operation.DemeterFarmingGetRewards]: {
    module: {
      equalTo: ModuleNames.DemeterFarming,
    },
    method: {
      equalTo: ModuleMethods.DemeterFarmingGetRewards,
    },
  },
  // ORDER BOOK
  [Operation.OrderBookPlaceLimitOrder]: {
    module: {
      equalTo: ModuleNames.OrderBook,
    },
    method: {
      equalTo: ModuleMethods.OrderBookPlaceLimitOrder,
    },
  },
  [Operation.OrderBookCancelLimitOrder]: OrderBookCancelLimitOrders,
  [Operation.OrderBookCancelLimitOrders]: OrderBookCancelLimitOrders,
  // STAKING
  [Operation.StakingBond]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingBond,
    },
  },
  [Operation.StakingBondExtra]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingBondExtra,
    },
  },
  [Operation.StakingUnbond]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingUnbond,
    },
  },
  [Operation.StakingWithdrawUnbonded]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingWithdrawUnbonded,
    },
  },
  [Operation.StakingNominate]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingNominate,
    },
  },
  [Operation.StakingChill]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingChill,
    },
  },
  [Operation.StakingSetPayee]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingSetPayee,
    },
  },
  [Operation.StakingSetController]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingSetController,
    },
  },
  [Operation.StakingPayout]: {
    or: [
      {
        module: {
          equalTo: ModuleNames.Staking,
        },
        method: {
          equalTo: ModuleMethods.StakingPayout,
        },
      },
      {
        module: {
          equalTo: ModuleNames.Utility,
        },
        method: {
          equalTo: ModuleMethods.UtilityBatchAll,
        },
        callNames: {
          contains: [
            ModuleNames.Staking + '.' + ModuleMethods.StakingPayout,
            ModuleNames.Staking + '.' + ModuleMethods.StakingSetPayee,
          ],
        },
      },
    ],
  },
  [Operation.StakingRebond]: {
    module: {
      equalTo: ModuleNames.Staking,
    },
    method: {
      equalTo: ModuleMethods.StakingRebond,
    },
  },
  [Operation.StakingBondAndNominate]: {
    module: {
      equalTo: ModuleNames.Utility,
    },
    method: {
      equalTo: ModuleMethods.UtilityBatchAll,
    },
    callNames: {
      contains: [
        ModuleNames.Staking + '.' + ModuleMethods.StakingBond,
        ModuleNames.Staking + '.' + ModuleMethods.StakingNominate,
      ],
    },
  },
  // KENSETSU
  [Operation.CreateVault]: {
    module: {
      equalTo: ModuleNames.Vault,
    },
    method: {
      equalTo: ModuleMethods.VaultCreate,
    },
  },
  [Operation.CloseVault]: {
    module: {
      equalTo: ModuleNames.Vault,
    },
    method: {
      equalTo: ModuleMethods.VaultCreate,
    },
  },
  [Operation.DepositCollateral]: {
    module: {
      equalTo: ModuleNames.Vault,
    },
    method: {
      equalTo: ModuleMethods.VaultCollateralDeposit,
    },
  },
  [Operation.RepayVaultDebt]: {
    module: {
      equalTo: ModuleNames.Vault,
    },
    method: {
      equalTo: ModuleMethods.VaultDebtPayment,
    },
  },
  [Operation.BorrowVaultDebt]: {
    module: {
      equalTo: ModuleNames.Vault,
    },
    method: {
      equalTo: ModuleMethods.VaultDebtBorrow,
    },
  },
};

const createOperationsCriteria = (operations: Array<Operation>) => {
  return operations.reduce((buffer: Array<any>, operation) => {
    if (operation in OperationFilterMap) {
      buffer.push(OperationFilterMap[operation]);
    }
    return buffer;
  }, []);
};

const createAssetCriteria = (assetAddress: string) => {
  return {
    dataAssets: {
      contains: assetAddress,
    },
  };
};

const createOwnerCriteria = (address: string) => {
  return {
    address: {
      equalTo: address,
    },
  };
};

const createAddressCriterias = (address: string) => {
  return [
    {
      dataFrom: {
        equalTo: address,
      },
    },
    {
      dataTo: {
        equalTo: address,
      },
    },
  ];
};

type SubqueryHistoryElementsFilterOptions = {
  address?: string;
  assetAddress?: string;
  timestamp?: number;
  operations?: Array<Operation>;
  ids?: Array<string>;
  query?: HistoryQuery;
};

export const historyElementsFilter = ({
  address = '',
  assetAddress = '',
  timestamp = 0,
  operations = [],
  ids = [],
  query: { operationNames, assetsAddresses = [], accountAddress = '', hexAddress = '' } = {},
}: SubqueryHistoryElementsFilterOptions = {}): any => {
  const filter: any = {
    and: [],
  };

  // history owner
  if (address) {
    filter.and.push(createOwnerCriteria(address));
  }

  // filter has more priority
  const operationsPrepared = operationNames ?? operations;

  if (operationsPrepared.length) {
    filter.and.push({
      or: createOperationsCriteria(operationsPrepared),
    });
  }

  if (assetAddress) {
    filter.and.push(createAssetCriteria(assetAddress));
  }

  if (timestamp) {
    filter.and.push({
      timestamp: {
        greaterThan: timestamp,
      },
    });
  }

  if (ids.length) {
    filter.and.push({
      id: {
        in: ids,
      },
    });
  }

  const queryFilters: Array<any> = [];

  // account address criteria
  if (accountAddress) {
    queryFilters.push(...createAddressCriterias(accountAddress));
  }

  // hex address criteria
  if (hexAddress) {
    queryFilters.push(createAssetCriteria(hexAddress));
    queryFilters.push({
      blockHash: {
        includesInsensitive: hexAddress,
      },
    });
  }

  // symbol criteria
  if (assetsAddresses.length) {
    assetsAddresses.forEach((assetAddress) => {
      queryFilters.push(createAssetCriteria(assetAddress));
    });
  }

  if (queryFilters.length) {
    filter.and.push({
      or: queryFilters,
    });
  }

  return filter;
};
