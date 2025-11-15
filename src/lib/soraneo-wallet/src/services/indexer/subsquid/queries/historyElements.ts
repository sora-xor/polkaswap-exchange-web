import { Operation } from '@sora-substrate/sdk';
import { gql } from '@urql/core';

import { PageInfoFragment } from '../../fragments/pageInfo';
import { ModuleNames, ModuleMethods } from '../types';

import type { HistoryQuery } from '../../../../types/history';
import type { ConnectionQueryResponse, HistoryElement } from '../../types';
import type { SubsquidQueryResponse } from '../types';

export const HistoryElementsQuery = gql<SubsquidQueryResponse<HistoryElement>>`
  query SubsquidHistoryElements(
    $first: Int
    $offset: Int = null
    $orderBy: [HistoryElementOrderByInput!] = [timestamp_DESC, id_DESC]
    $filter: HistoryElementWhereInput
  ) {
    info: historyElementsConnection(first: 0, orderBy: $orderBy, where: $filter) {
      totalCount
    }
    nodes: historyElements(limit: $first, offset: $offset, orderBy: $orderBy, where: $filter) {
      id
      timestamp
      blockHash
      blockHeight
      module
      method
      address
      networkFee
      execution {
        success
        error {
          moduleErrorId
          moduleErrorIndex
          nonModuleErrorMessage
        }
      }
      data
      dataFrom
      dataTo
      calls {
        module
        method
        data
      }
    }
  }
`;

export const HistoryElementsConnectionQuery = gql<ConnectionQueryResponse<HistoryElement>>`
  query SubsquidHistoryElementsConnection(
    $first: Int
    $after: String = null
    $orderBy: [HistoryElementOrderByInput!] = timestamp_DESC
    $filter: HistoryElementWhereInput
  ) {
    data: historyElementsConnection(first: $first, after: $after, orderBy: $orderBy, where: $filter) {
      pageInfo {
        ...PageInfoFragment
      }
      edges {
        node {
          id
          timestamp
          blockHash
          blockHeight
          module
          method
          address
          networkFee
          execution {
            success
            error {
              moduleErrorId
              moduleErrorIndex
              nonModuleErrorMessage
            }
          }
          data
          dataFrom
          dataTo
        }
      }
    }
  }
  ${PageInfoFragment}
`;

type DataCriteria = {
  data_jsonContains: {
    [key: string]: any;
  };
};

type CallsDataCriteria = {
  calls_some: {
    data_jsonContains: {
      [key: string]: any;
    };
  };
};

const RewardsClaimExtrinsics = [
  [ModuleNames.PswapDistribution, ModuleMethods.PswapDistributionClaimIncentive],
  [ModuleNames.Rewards, ModuleMethods.RewardsClaim],
  [ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimRewards],
  [ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimCrowdloanRewards],
];

const DemeterFarmingDeposit = {
  module_eq: ModuleNames.DemeterFarming,
  method_eq: ModuleMethods.DemeterFarmingDeposit,
};

const DemeterFarmingWithdraw = {
  module_eq: ModuleNames.DemeterFarming,
  method_eq: ModuleMethods.DemeterFarmingWithdraw,
};

const OrderBookCancelLimitOrders = {
  module_eq: ModuleNames.OrderBook,
  method_eq: ModuleMethods.OrderBookCancelLimitOrders,
};

const OperationFilterMap = {
  [Operation.Swap]: {
    module_eq: ModuleNames.LiquidityProxy,
    method_eq: ModuleMethods.LiquidityProxySwap,
  },
  [Operation.SwapAndSend]: {
    module_eq: ModuleNames.LiquidityProxy,
    method_eq: ModuleMethods.LiquidityProxySwapTransfer,
  },
  [Operation.SwapTransferBatch]: {
    module_eq: ModuleNames.LiquidityProxy,
    method_eq: ModuleMethods.LiquidityProxySwapTransferBatch,
  },
  [Operation.Transfer]: {
    OR: [
      {
        module_eq: ModuleNames.Assets,
        method_containsInsensitive: ModuleMethods.AssetsTransfer,
      },
      {
        module_eq: ModuleNames.LiquidityProxy,
        method_eq: ModuleMethods.LiquidityProxyXorlessTransfer,
      },
    ],
  },
  [Operation.VestedTransfer]: {
    module_eq: ModuleNames.VestedRewards,
    method_eq: ModuleMethods.VestedRewardsVestedTransfer,
  },
  [Operation.RegisterAsset]: {
    module_eq: ModuleNames.Assets,
    method_eq: ModuleMethods.AssetsRegister,
  },
  [Operation.Burn]: {
    module_eq: ModuleNames.Assets,
    method_eq: ModuleMethods.AssetsBurn,
  },
  [Operation.Mint]: {
    module_eq: ModuleNames.Assets,
    method_eq: ModuleMethods.AssetsMint,
  },
  [Operation.CreatePair]: {
    module_eq: ModuleNames.Utility,
    method_eq: ModuleMethods.UtilityBatchAll,
    callNames_containsAny: [
      ModuleNames.PoolXYK + '.' + ModuleMethods.PoolXYKInitializePool,
      ModuleNames.PoolXYK + '.' + ModuleMethods.PoolXYKDepositLiquidity,
    ],
  },
  [Operation.AddLiquidity]: {
    module_containsInsensitive: ModuleNames.PoolXYK,
    method_eq: ModuleMethods.PoolXYKDepositLiquidity,
  },
  [Operation.RemoveLiquidity]: {
    module_containsInsensitive: ModuleNames.PoolXYK,
    method_eq: ModuleMethods.PoolXYKWithdrawLiquidity,
  },
  [Operation.ReferralSetInvitedUser]: {
    module_eq: ModuleNames.Referrals,
    method_eq: ModuleMethods.ReferralsSetReferrer,
  },
  [Operation.ReferralReserveXor]: {
    module_eq: ModuleNames.Referrals,
    method_eq: ModuleMethods.ReferralsReserve,
  },
  [Operation.ReferralUnreserveXor]: {
    module_eq: ModuleNames.Referrals,
    method_eq: ModuleMethods.ReferralsUnreserve,
  },
  [Operation.EthBridgeOutgoing]: {
    module_eq: ModuleNames.EthBridge,
    method_eq: ModuleMethods.EthBridgeTransferToSidechain,
  },
  [Operation.EthBridgeIncoming]: {
    module_eq: ModuleNames.BridgeMultisig,
    method_eq: ModuleMethods.BridgeMultisigAsMulti,
  },
  [Operation.ClaimRewards]: {
    OR: [
      ...RewardsClaimExtrinsics.map(([module, method]) => ({
        module_eq: module,
        method_eq: method,
      })),
      {
        module_eq: ModuleNames.Utility,
        method_eq: ModuleMethods.UtilityBatchAll,
        callNames_containsAny: RewardsClaimExtrinsics.map(([module, method]) => module + '.' + method),
      },
    ],
  },
  // DEMETER
  [Operation.DemeterFarmingDepositLiquidity]: DemeterFarmingDeposit,
  [Operation.DemeterFarmingWithdrawLiquidity]: DemeterFarmingWithdraw,
  [Operation.DemeterFarmingStakeToken]: DemeterFarmingDeposit,
  [Operation.DemeterFarmingUnstakeToken]: DemeterFarmingWithdraw,
  [Operation.DemeterFarmingGetRewards]: {
    module_eq: ModuleNames.DemeterFarming,
    method_eq: ModuleMethods.DemeterFarmingGetRewards,
  },
  // ORDER BOOK
  [Operation.OrderBookPlaceLimitOrder]: {
    module_eq: ModuleNames.OrderBook,
    method_eq: ModuleMethods.OrderBookPlaceLimitOrder,
  },
  [Operation.OrderBookCancelLimitOrder]: OrderBookCancelLimitOrders,
  [Operation.OrderBookCancelLimitOrders]: OrderBookCancelLimitOrders,
  // STAKING
  [Operation.StakingBond]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingBond,
  },
  [Operation.StakingBondExtra]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingBondExtra,
  },
  [Operation.StakingUnbond]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingUnbond,
  },
  [Operation.StakingWithdrawUnbonded]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingWithdrawUnbonded,
  },
  [Operation.StakingNominate]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingNominate,
  },
  [Operation.StakingChill]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingChill,
  },
  [Operation.StakingSetPayee]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingSetPayee,
  },
  [Operation.StakingSetController]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingSetController,
  },
  [Operation.StakingPayout]: {
    OR: [
      {
        module_eq: ModuleNames.Staking,
        method_eq: ModuleMethods.StakingPayout,
      },
      {
        module_eq: ModuleNames.Utility,
        method_eq: ModuleMethods.UtilityBatchAll,
        callNames_containsAny: [
          ModuleNames.Staking + '.' + ModuleMethods.StakingPayout,
          ModuleNames.Staking + '.' + ModuleMethods.StakingSetPayee,
        ],
      },
    ],
  },
  [Operation.StakingRebond]: {
    module_eq: ModuleNames.Staking,
    method_eq: ModuleMethods.StakingRebond,
  },
  [Operation.StakingBondAndNominate]: {
    module_eq: ModuleNames.Utility,
    method_eq: ModuleMethods.UtilityBatchAll,
    callNames_containsAny: [
      ModuleNames.Staking + '.' + ModuleMethods.StakingBond,
      ModuleNames.Staking + '.' + ModuleMethods.StakingNominate,
    ],
  },
  // KENSETSU
  [Operation.CreateVault]: {
    module_eq: ModuleNames.Vault,
    method_eq: ModuleMethods.VaultCreate,
  },
  [Operation.CloseVault]: {
    module_eq: ModuleNames.Vault,
    method_eq: ModuleMethods.VaultClose,
  },
  [Operation.DepositCollateral]: {
    module_eq: ModuleNames.Vault,
    method_eq: ModuleMethods.VaultCollateralDeposit,
  },
  [Operation.RepayVaultDebt]: {
    module_eq: ModuleNames.Vault,
    method_eq: ModuleMethods.VaultDebtPayment,
  },
  [Operation.BorrowVaultDebt]: {
    module_eq: ModuleNames.Vault,
    method_eq: ModuleMethods.VaultDebtBorrow,
  },
};

const createOperationsCriteria = (operations: Array<Operation>) => {
  return operations.reduce((buffer: Array<any>, operation) => {
    if (!(operation in OperationFilterMap)) return buffer;

    buffer.push(OperationFilterMap[operation]);

    return buffer;
  }, []);
};

const createAssetCriteria = (assetAddress: string): Array<DataCriteria | CallsDataCriteria> => {
  const attributes = ['assetId', 'baseAssetId', 'targetAssetId', 'quoteAssetId', 'collateralAssetId', 'debtAssetId'];

  const criterias = attributes.reduce((result: Array<DataCriteria | CallsDataCriteria>, attr) => {
    result.push({
      data_jsonContains: {
        [attr]: assetAddress,
      },
    });

    return result;
  }, []);

  // for create pair operation
  ['input_asset_a', 'input_asset_b'].forEach((attr) => {
    criterias.push({
      calls_some: {
        data_jsonContains: {
          [attr]: assetAddress,
        },
      },
    });
  });

  return criterias;
};

const createAccountAddressCriteria = (address: string) => {
  return [
    {
      address_eq: address,
    },
    {
      dataTo_eq: address,
    },
  ];
};

const isAccountAddress = (value: string) => value.startsWith('cn') && value.length === 49;
const isHexAddress = (value: string) => value.startsWith('0x') && value.length === 66;

type SubsquidHistoryElementsFilterOptions = {
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
  query: { operationNames = [], assetsAddresses = [], accountAddress = '', hexAddress = '' } = {},
}: SubsquidHistoryElementsFilterOptions = {}): any => {
  const filter: any = {
    AND: [],
  };

  if (operations.length) {
    filter.AND.push({
      OR: createOperationsCriteria(operations),
    });
  }

  if (address) {
    filter.AND.push({
      OR: createAccountAddressCriteria(address),
    });
  }

  if (assetAddress) {
    filter.AND.push({
      OR: createAssetCriteria(assetAddress),
    });
  }

  if (timestamp) {
    filter.AND.push({
      timestamp_gt: timestamp,
    });
  }

  if (ids.length) {
    filter.AND.push({
      id_in: ids,
    });
  }

  const queryFilters: Array<any> = [];

  // account address criteria
  if (accountAddress) {
    queryFilters.push({
      dataFrom_eq: accountAddress,
    });
    queryFilters.push({
      dataTo_eq: accountAddress,
    });
  }

  // hex address criteria
  if (hexAddress) {
    queryFilters.push(...createAssetCriteria(hexAddress));
    queryFilters.push({
      blockHash_containsInsensitive: hexAddress,
    });
  }

  // operation names criteria
  if (operationNames.length) {
    queryFilters.push(...createOperationsCriteria(operationNames));
  }

  // symbol criteria
  if (assetsAddresses.length) {
    assetsAddresses.forEach((assetAddress) => {
      queryFilters.push(...createAssetCriteria(assetAddress));
    });
  }

  if (queryFilters.length) {
    filter.AND.push({
      OR: queryFilters,
    });
  }

  return filter;
};
