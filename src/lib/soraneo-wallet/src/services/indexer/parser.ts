import { BN } from '@polkadot/util';
import { FPNumber, Operation, TransactionStatus } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { RewardType, RewardingEvents } from '@sora-substrate/sdk/build/rewards/consts';
import getOr from 'lodash/fp/getOr';

import { api } from '../../api';
import { ObjectInit } from '../../consts';
import { getWalletStore } from '../../store/instance';

import { ModuleNames, ModuleMethods } from './subquery/types';

import type {
  HistoryElement,
  HistoryElementError,
  HistoryElementSwap,
  HistoryElementSwapTransfer,
  HistoryElementLiquidityOperation,
  HistoryElementTransfer,
  HistoryElementVestedTransfer,
  HistoryElementAssetRegistration,
  HistoryElementAssetBurn,
  HistoryElementRewardsClaim,
  HistoryElementDemeterFarming,
  HistoryElementPlaceLimitOrder,
  HistoryElementCancelLimitOrder,
  HistoryElementSwapTransferBatch,
  HistoryElementBatchCall,
  HistoryElementReferrerReserve,
  HistoryElementStakingBond,
  HistoryElementStakingUnbond,
  HistoryElementStakingRebond,
  HistoryElementStakingNominate,
  HistoryElementStakingWithdrawUnbonded,
  HistoryElementStakingChill,
  HistoryElementStakingSetPayee,
  HistoryElementStakingSetController,
  HistoryElementStakingPayout,
  HistoryElementVaultCreate,
  HistoryElementVaultClose,
  HistoryElementVaultDepositCollateral,
  HistoryElementVaultDebt,
  HistoryElementEthBridgeIncoming,
  HistoryElementEthBridgeOutgoing,
  ClaimedRewardItem,
  CallArgs,
} from './subquery/types';
import type { HistoryItem } from '@sora-substrate/sdk';
import type {
  Asset,
  WhitelistItem,
  HistoryElementTransfer as HistoryXorlessTransfer,
  VestedTransferHistory,
} from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { VaultHistory } from '@sora-substrate/sdk/build/kensetsu/types';
import type { LimitOrderHistory } from '@sora-substrate/sdk/build/orderBook/types';
import type { RewardClaimHistory, RewardInfo } from '@sora-substrate/sdk/build/rewards/types';
import type { StakingHistory } from '@sora-substrate/sdk/build/staking/types';

const insensitive = (value: string) => value.toLowerCase();

const OperationsMap = {
  // events
  [insensitive(ModuleNames.Tokens)]: {
    [insensitive(ModuleMethods.TokensTransfer)]: () => Operation.Transfer,
    [insensitive(ModuleMethods.TokensDeposited)]: () => Operation.Mint,
  },
  [insensitive(ModuleNames.Balances)]: {
    [insensitive(ModuleMethods.BalancesTransfer)]: () => Operation.Transfer,
    [insensitive(ModuleMethods.BalancesDeposited)]: () => Operation.Mint,
  },
  // extrinsics
  [insensitive(ModuleNames.Assets)]: {
    [insensitive(ModuleMethods.AssetsRegister)]: () => Operation.RegisterAsset,
    [insensitive(ModuleMethods.AssetsTransfer)]: () => Operation.Transfer,
    [insensitive(ModuleMethods.AssetsBurn)]: () => Operation.Burn,
    [insensitive(ModuleMethods.AssetsMint)]: () => Operation.Mint,
  },
  [insensitive(ModuleNames.PoolXYK)]: {
    [insensitive(ModuleMethods.PoolXYKDepositLiquidity)]: () => Operation.AddLiquidity,
    [insensitive(ModuleMethods.PoolXYKWithdrawLiquidity)]: () => Operation.RemoveLiquidity,
  },
  [insensitive(ModuleNames.LiquidityProxy)]: {
    [insensitive(ModuleMethods.LiquidityProxySwap)]: () => Operation.Swap,
    [insensitive(ModuleMethods.LiquidityProxySwapTransfer)]: () => Operation.SwapAndSend,
    [insensitive(ModuleMethods.LiquidityProxySwapTransferBatch)]: () => Operation.SwapTransferBatch,
    [insensitive(ModuleMethods.LiquidityProxyXorlessTransfer)]: () => Operation.Transfer,
  },
  [insensitive(ModuleNames.Utility)]: {
    [insensitive(ModuleMethods.UtilityBatchAll)]: (data: HistoryElementBatchCall[]) => {
      if (!(Array.isArray(data) && !!data.length)) return null;

      if (
        !!getBatchCall(data, { module: ModuleNames.PoolXYK, method: ModuleMethods.PoolXYKInitializePool }) &&
        !!getBatchCall(data, { module: ModuleNames.PoolXYK, method: ModuleMethods.PoolXYKDepositLiquidity })
      ) {
        return Operation.CreatePair;
      }

      if (
        data.every(
          (call) =>
            isModuleMethod(call, ModuleNames.Rewards, ModuleMethods.RewardsClaim) ||
            isModuleMethod(call, ModuleNames.PswapDistribution, ModuleMethods.PswapDistributionClaimIncentive) ||
            isModuleMethod(call, ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimRewards) ||
            isModuleMethod(call, ModuleNames.VestedRewards, ModuleMethods.VestedRewardsClaimCrowdloanRewards)
        )
      ) {
        return Operation.ClaimRewards;
      }

      if (
        data.every(
          (call) =>
            isModuleMethod(call, ModuleNames.Staking, ModuleMethods.StakingPayout) ||
            isModuleMethod(call, ModuleNames.Staking, ModuleMethods.StakingSetPayee)
        )
      ) {
        return Operation.StakingPayout;
      }

      if (
        data.every(
          (call) =>
            isModuleMethod(call, ModuleNames.Staking, ModuleMethods.StakingBond) ||
            isModuleMethod(call, ModuleNames.Staking, ModuleMethods.StakingNominate)
        )
      ) {
        return Operation.StakingBondAndNominate;
      }

      return null;
    },
  },
  [insensitive(ModuleNames.Referrals)]: {
    [insensitive(ModuleMethods.ReferralsSetReferrer)]: () => Operation.ReferralSetInvitedUser,
    [insensitive(ModuleMethods.ReferralsReserve)]: () => Operation.ReferralReserveXor,
    [insensitive(ModuleMethods.ReferralsUnreserve)]: () => Operation.ReferralUnreserveXor,
  },
  [insensitive(ModuleNames.PswapDistribution)]: {
    [insensitive(ModuleMethods.PswapDistributionClaimIncentive)]: () => Operation.ClaimRewards,
  },
  [insensitive(ModuleNames.Rewards)]: {
    [insensitive(ModuleMethods.RewardsClaim)]: () => Operation.ClaimRewards,
  },
  [insensitive(ModuleNames.VestedRewards)]: {
    [insensitive(ModuleMethods.VestedRewardsClaimRewards)]: () => Operation.ClaimRewards,
    [insensitive(ModuleMethods.VestedRewardsClaimCrowdloanRewards)]: () => Operation.ClaimRewards,
    [insensitive(ModuleMethods.VestedRewardsVestedTransfer)]: () => Operation.VestedTransfer,
  },
  [insensitive(ModuleNames.DemeterFarming)]: {
    [insensitive(ModuleMethods.DemeterFarmingDeposit)]: (data: HistoryElementDemeterFarming) => {
      return data.isFarm ? Operation.DemeterFarmingDepositLiquidity : Operation.DemeterFarmingStakeToken;
    },
    [insensitive(ModuleMethods.DemeterFarmingWithdraw)]: (data: HistoryElementDemeterFarming) => {
      return data.isFarm ? Operation.DemeterFarmingWithdrawLiquidity : Operation.DemeterFarmingUnstakeToken;
    },
    [insensitive(ModuleMethods.DemeterFarmingGetRewards)]: () => Operation.DemeterFarmingGetRewards,
  },
  [insensitive(ModuleNames.OrderBook)]: {
    [insensitive(ModuleMethods.OrderBookPlaceLimitOrder)]: () => Operation.OrderBookPlaceLimitOrder,
    [insensitive(ModuleMethods.OrderBookCancelLimitOrder)]: () => Operation.OrderBookCancelLimitOrder,
    [insensitive(ModuleMethods.OrderBookCancelLimitOrders)]: () => Operation.OrderBookCancelLimitOrders,
  },
  [insensitive(ModuleNames.Staking)]: {
    [insensitive(ModuleMethods.StakingBond)]: () => Operation.StakingBond,
    [insensitive(ModuleMethods.StakingBondExtra)]: () => Operation.StakingBondExtra,
    [insensitive(ModuleMethods.StakingRebond)]: () => Operation.StakingRebond,
    [insensitive(ModuleMethods.StakingUnbond)]: () => Operation.StakingUnbond,
    [insensitive(ModuleMethods.StakingNominate)]: () => Operation.StakingNominate,
    [insensitive(ModuleMethods.StakingWithdrawUnbonded)]: () => Operation.StakingWithdrawUnbonded,
    [insensitive(ModuleMethods.StakingChill)]: () => Operation.StakingChill,
    [insensitive(ModuleMethods.StakingSetPayee)]: () => Operation.StakingSetPayee,
    [insensitive(ModuleMethods.StakingSetController)]: () => Operation.StakingSetController,
    [insensitive(ModuleMethods.StakingPayout)]: () => Operation.StakingPayout,
  },
  [insensitive(ModuleNames.Vault)]: {
    [insensitive(ModuleMethods.VaultCreate)]: () => Operation.CreateVault,
    [insensitive(ModuleMethods.VaultClose)]: () => Operation.CloseVault,
    [insensitive(ModuleMethods.VaultCollateralDeposit)]: () => Operation.DepositCollateral,
    [insensitive(ModuleMethods.VaultDebtPayment)]: () => Operation.RepayVaultDebt,
    [insensitive(ModuleMethods.VaultDebtBorrow)]: () => Operation.BorrowVaultDebt,
  },
  [insensitive(ModuleNames.BridgeMultisig)]: {
    [insensitive(ModuleMethods.BridgeMultisigAsMulti)]: () => Operation.EthBridgeIncoming,
  },
  [insensitive(ModuleNames.EthBridge)]: {
    [insensitive(ModuleMethods.EthBridgeTransferToSidechain)]: () => Operation.EthBridgeOutgoing,
  },
};

const getAssetSymbol = (asset: Nullable<Asset | WhitelistItem>): string => asset?.symbol ?? '';

const getTransactionId = (tx: HistoryElement): string => tx.id;

const isModuleMethod = (item: HistoryElementBatchCall, module: string, method: string) =>
  insensitive(item.module) === insensitive(module) && insensitive(item.method) === insensitive(method);

const getBatchCall = (calls: HistoryElementBatchCall[], { module, method }): Nullable<HistoryElementBatchCall> =>
  calls.find((item) => isModuleMethod(item, module, method));

const getCallDataArgs = (call: HistoryElementBatchCall): CallArgs => {
  const data = call.data;

  if (!('args' in data)) {
    return data;
  }

  return data.args as CallArgs;
};

const getTransactionOperationType = (tx: HistoryElement): Nullable<Operation> => {
  const { module, method, data, calls } = tx;

  const operationGetter = getOr(ObjectInit, [insensitive(module), insensitive(method)], OperationsMap);

  return operationGetter((data as any) || calls);
};

const getTransactionTimestamp = (tx: HistoryElement): number => {
  const timestamp = tx.timestamp * 1000;

  return !Number.isNaN(timestamp) ? timestamp : Date.now();
};

const getErrorMessage = (historyElementError: HistoryElementError): Record<string, string> => {
  try {
    const [error, index] = [new BN(historyElementError.moduleErrorId), new BN(historyElementError.moduleErrorIndex)];
    const { name, section } = api.api.registry.findMetaError({ error, index });
    return { name, section };
  } catch (error) {
    console.error(historyElementError, error);
    return { section: '', name: '' };
  }
};

const getTransactionStatus = (tx: HistoryElement): string => {
  if (tx.execution.success) return TransactionStatus.Finalized;

  return TransactionStatus.Error;
};

const getTransactionNetworkFee = (tx: HistoryElement): string => {
  const fromCodec = FPNumber.fromCodecValue(tx.networkFee);
  const minFee = new FPNumber('0.0007');

  if (FPNumber.isLessThan(fromCodec, minFee)) {
    return new FPNumber(tx.networkFee).toCodecString();
  } else {
    return tx.networkFee;
  }
};

const getAssetByAddress = async (address: string): Promise<Nullable<Asset>> => {
  try {
    const asset = getWalletStore().getters.wallet.account.assetsDataTable[address];
    return asset ?? (await api.assets.getAssetInfo(address));
  } catch (error) {
    console.error(error);
    return null;
  }
};

const formatRewards = async (rewards: ClaimedRewardItem[]): Promise<RewardInfo[]> => {
  const formatted: RewardInfo[] = [];

  for (const { assetId, amount } of rewards) {
    const asset = await getAssetByAddress(assetId);

    if (asset) {
      formatted.push({
        amount,
        asset,
        type: ['' as RewardType, RewardingEvents.Unspecified],
      });
    }
  }

  return formatted;
};

const formatAmount = (amount: string): string => (amount ? new FPNumber(amount).toString() : '0');

const parseMintOrBurn = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementAssetBurn;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  payload.amount = formatAmount(data.amount);
  payload.assetAddress = assetAddress;
  payload.symbol = getAssetSymbol(asset);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseSwapTransfer = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementSwap & HistoryElementSwapTransfer;

  const assetAddress = data.baseAssetId;
  const asset2Address = data.targetAssetId;
  const asset = await getAssetByAddress(assetAddress);
  const asset2 = await getAssetByAddress(asset2Address);

  payload.assetAddress = assetAddress;
  payload.asset2Address = asset2Address;
  payload.amount = formatAmount(data.baseAssetAmount);
  payload.amount2 = formatAmount(data.targetAssetAmount);
  payload.symbol = getAssetSymbol(asset);
  payload.symbol2 = getAssetSymbol(asset2);
  payload.liquiditySource = data.selectedMarket;

  payload.payload = {
    amountUSD: formatAmount(data.baseAssetAmountUSD),
    amount2USD: formatAmount(data.targetAssetAmountUSD),
  };

  return payload;
};

const parseSwapTransferBatch = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementSwapTransferBatch;

  const inputAssetId = data.assetId;
  const inputAsset = await getAssetByAddress(inputAssetId);

  payload.assetAddress = inputAssetId;
  payload.liquiditySource = data.selectedMarket;
  payload.amount = data.inputAmount;
  payload.symbol = getAssetSymbol(inputAsset);

  payload.payload = {};
  payload.payload.adarFee = data.adarFee;
  payload.payload.actualFee = data.actualFee;
  payload.payload.maxInputAmount = data.maxInputAmount;
  payload.payload.receivers = [];
  payload.payload.comment = data.comment ? JSON.parse(data.comment) : null;

  for (const receiver of data.receivers) {
    const asset = await getAssetByAddress(receiver.assetId);

    payload.payload.receivers.push({
      accountId: receiver.accountId,
      asset,
      amount: formatAmount(receiver.amount),
      amountUSD: formatAmount(receiver.amountUSD),
      symbol: getAssetSymbol(asset),
    });
  }

  return payload;
};

const parseLiquidityDepositOrWithdrawal = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementLiquidityOperation;

  const assetAddress = data.baseAssetId;
  const asset2Address = data.targetAssetId;
  const asset = await getAssetByAddress(assetAddress);
  const asset2 = await getAssetByAddress(asset2Address);

  payload.assetAddress = assetAddress;
  payload.asset2Address = asset2Address;
  payload.symbol = getAssetSymbol(asset);
  payload.symbol2 = getAssetSymbol(asset2);
  payload.amount = formatAmount(data.baseAssetAmount);
  payload.amount2 = formatAmount(data.targetAssetAmount);

  payload.payload = {
    amountUSD: formatAmount(data.baseAssetAmountUSD),
    amount2USD: formatAmount(data.targetAssetAmountUSD),
  };

  return payload;
};

const parseCreatePair = async (transaction: HistoryElement, payload: HistoryItem) => {
  const calls = transaction.calls;
  const call = getBatchCall(calls, {
    module: ModuleNames.PoolXYK,
    method: ModuleMethods.PoolXYKDepositLiquidity,
  });

  if (!call) return null;

  const args = getCallDataArgs(call);
  // [TODO] remove deprecated args names after migration
  const assetAddress = args.baseAssetId ?? args.inputAssetA ?? args.input_asset_a;
  const asset2Address = args.targetAssetId ?? args.inputAssetB ?? args.input_asset_b;
  const amount = args.baseAssetDesired ?? args.inputADesired ?? args.input_a_desired;
  const amount2 = args.targetAssetDesired ?? args.inputBDesired ?? args.input_b_desired;

  const asset = await getAssetByAddress(assetAddress as string);
  const asset2 = await getAssetByAddress(asset2Address as string);

  payload.assetAddress = asset ? (assetAddress as string) : '';
  payload.asset2Address = asset2 ? (asset2Address as string) : '';
  payload.symbol = getAssetSymbol(asset);
  payload.symbol2 = getAssetSymbol(asset2);
  payload.amount = String(amount);
  payload.amount2 = String(amount2);

  return payload;
};

const parseTransfer = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementTransfer;
  const _payload = payload as HistoryXorlessTransfer;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);
  _payload.amount = formatAmount(data.amount);
  _payload.assetFee = data.assetFee;
  _payload.xorFee = data.xorFee;
  _payload.comment = data.comment;

  _payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseVestedTransfer = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementVestedTransfer;
  const _payload = payload as VestedTransferHistory;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);
  _payload.amount = formatAmount(data.amount);
  _payload.period = data.period;
  _payload.percent = data.percent;

  _payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseRegisterAsset = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementAssetRegistration;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  payload.symbol = getAssetSymbol(asset);

  return payload;
};

const parseReferralReserve = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementReferrerReserve;

  payload.amount = formatAmount(data.amount);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseClaimRewards = async (transaction: HistoryElement, payload: HistoryItem) => {
  const rewardsData =
    transaction.module === ModuleNames.Utility ? [] : (transaction.data as HistoryElementRewardsClaim);

  (payload as RewardClaimHistory).rewards = Array.isArray(rewardsData) ? await formatRewards(rewardsData) : [];

  return payload;
};

const parseDemeterLiquidity = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementDemeterFarming;

  const assetAddress = data.baseAssetId as string;
  const asset2Address = data.assetId;

  const asset = await getAssetByAddress(assetAddress);
  const asset2 = await getAssetByAddress(asset2Address);

  payload.assetAddress = assetAddress;
  payload.asset2Address = asset2Address;
  payload.symbol = getAssetSymbol(asset);
  payload.symbol2 = getAssetSymbol(asset2);
  payload.amount = formatAmount(data.amount);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseDemeterStakeOrRewards = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementDemeterFarming;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  payload.assetAddress = assetAddress;
  payload.symbol = getAssetSymbol(asset);
  payload.amount = formatAmount(data.amount);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseOrderBookLimitOrderPlacement = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementPlaceLimitOrder;

  const _payload = payload as LimitOrderHistory;
  const baseAssetId = data.baseAssetId;
  const quoteAssetId = data.quoteAssetId;
  const baseAsset = await getAssetByAddress(baseAssetId);
  const quoteAsset = await getAssetByAddress(quoteAssetId);

  _payload.assetAddress = baseAssetId;
  _payload.asset2Address = quoteAssetId;
  _payload.symbol = getAssetSymbol(baseAsset);
  _payload.symbol2 = getAssetSymbol(quoteAsset);
  _payload.price = formatAmount(data.price);
  _payload.amount = formatAmount(data.amount);
  _payload.side = data.side;
  _payload.limitOrderTimestamp = data.lifetime;

  _payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseOrderBookLimitOrderCancel = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementCancelLimitOrder;

  const _payload = payload as LimitOrderHistory;
  const baseAssetId = data[0].baseAssetId;
  const quoteAssetId = data[0].quoteAssetId;
  const baseAsset = await getAssetByAddress(baseAssetId);
  const quoteAsset = await getAssetByAddress(quoteAssetId);

  _payload.assetAddress = baseAssetId;
  _payload.asset2Address = quoteAssetId;
  _payload.symbol = getAssetSymbol(baseAsset);
  _payload.symbol2 = getAssetSymbol(quoteAsset);
  _payload.limitOrderIds = data.map((order) => order.orderId);

  return payload;
};

const parseStakingBond = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingBond;

  payload.symbol = XOR.symbol;
  payload.assetAddress = XOR.address;
  payload.amount = formatAmount(data.amount);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseStakingUnbond = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingUnbond;

  payload.symbol = XOR.symbol;
  payload.assetAddress = XOR.address;
  payload.amount = FPNumber.fromCodecValue(data.amount, XOR.decimals).toString();

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseStakingRebond = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingRebond;

  payload.symbol = XOR.symbol;
  payload.assetAddress = XOR.address;
  payload.amount = formatAmount(data.value);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseStakingNominate = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingNominate;

  const _payload = payload as StakingHistory;
  _payload.validators = data.targets;

  return payload;
};

const parseStakingWithdrawUnbonded = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingWithdrawUnbonded;

  payload.symbol = XOR.symbol;
  payload.assetAddress = XOR.address;
  payload.amount = formatAmount(data.amount);

  payload.payload = {
    amountUSD: formatAmount(data.amountUSD),
  };

  return payload;
};

const parseStakingChill = async (transaction: HistoryElement, payload: HistoryItem) => {
  const _data = transaction.data as HistoryElementStakingChill;
  // "Staking.chill" call doesn't have any parameters
  return payload;
};

const parseStakingSetPayee = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingSetPayee;
  const _payload = payload as StakingHistory;

  _payload.payee = data.payee;

  return payload;
};

const parseStakingSetController = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementStakingSetController;
  const _payload = payload as StakingHistory;

  _payload.controller = data.controller;

  return payload;
};

const parseStakingPayout = async (transaction: HistoryElement, payload: HistoryItem) => {
  const calls = transaction.calls;

  if (calls.length) {
    const _payload = payload as StakingHistory;

    const payoutCalls = calls.filter((call) => isModuleMethod(call, ModuleNames.Staking, ModuleMethods.StakingPayout));
    const validatorsByEra: Record<string, string[]> = payoutCalls.reduce((acc, call) => {
      const args = getCallDataArgs(call);
      const key = String(args.era);
      const value = String(args.validatorStash ?? args.validator_stash);

      acc[key] = acc[key] ?? [];
      acc[key].push(value);

      return acc;
    }, {});

    _payload.payouts = Object.entries(validatorsByEra).map(([era, validators]) => ({ era, validators }));
  } else {
    const data = transaction.data as HistoryElementStakingPayout;
    const _payload = payload as StakingHistory;

    _payload.payouts = [
      {
        era: String(data.era),
        validators: [data.validatorStash],
      },
    ];
  }

  return payload;
};

const parseStakingBondAndNominate = async (transaction: HistoryElement, payload: HistoryItem) => {
  const calls = transaction.calls;

  const bond = getBatchCall(calls, {
    module: ModuleNames.Staking,
    method: ModuleMethods.StakingBond,
  });

  const nominate = getBatchCall(calls, {
    module: ModuleNames.Staking,
    method: ModuleMethods.StakingNominate,
  });

  if (!(bond && nominate)) return null;

  const bondArgs = getCallDataArgs(bond);
  const nominateArgs = getCallDataArgs(nominate);
  const bondValue = bondArgs.value as string;
  const nominateTargets = nominateArgs.targets as string[];

  const _payload = payload as StakingHistory;

  _payload.symbol = XOR.symbol;
  _payload.assetAddress = XOR.address;
  _payload.amount = FPNumber.fromCodecValue(bondValue, XOR.decimals).toString();
  _payload.validators = nominateTargets;

  return payload;
};

const parseVaultCreateOrClose = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementVaultCreate | HistoryElementVaultClose;

  const assetAddress = data.collateralAssetId;
  const asset2Address = data.debtAssetId;
  const asset = await getAssetByAddress(assetAddress);
  const asset2 = await getAssetByAddress(asset2Address);

  const _payload = payload as VaultHistory;

  _payload.vaultId = Number(data.id ?? 0);
  _payload.amount = formatAmount(data.collateralAmount);
  _payload.amount2 = formatAmount(data.debtAmount);
  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);
  _payload.asset2Address = asset2Address;
  _payload.symbol2 = getAssetSymbol(asset2);

  _payload.payload = {
    amountUSD: formatAmount(data.collateralAmountUSD),
    amount2USD: formatAmount(data.debtAmountUSD),
  };

  return payload;
};

const parseVaultCollateralDeposit = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementVaultDepositCollateral;

  const assetAddress = data.collateralAssetId;
  const asset = await getAssetByAddress(assetAddress);

  const _payload = payload as VaultHistory;

  _payload.vaultId = Number(data.id);
  _payload.amount = formatAmount(data.collateralAmount);
  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);

  _payload.payload = {
    amountUSD: formatAmount(data.collateralAmountUSD),
  };

  return payload;
};

const parseVaultDebtPaymentOrBorrow = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementVaultDebt;

  const assetAddress = data.debtAssetId;
  const asset = await getAssetByAddress(assetAddress);

  const _payload = payload as VaultHistory;

  _payload.vaultId = Number(data.id);
  _payload.amount = formatAmount(data.debtAmount);
  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);

  _payload.payload = {
    amountUSD: formatAmount(data.debtAmountUSD),
  };

  return payload;
};

const parseEthBridgeIncoming = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementEthBridgeIncoming;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  const _payload = payload as EthHistory;

  _payload.amount = formatAmount(data.amount);
  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);
  _payload.to = data.to;
  _payload.hash = data.requestHash;

  return payload;
};

const parseEthBridgeOutgoing = async (transaction: HistoryElement, payload: HistoryItem) => {
  const data = transaction.data as HistoryElementEthBridgeOutgoing;

  const assetAddress = data.assetId;
  const asset = await getAssetByAddress(assetAddress);

  const _payload = payload as EthHistory;

  _payload.amount = formatAmount(data.amount);
  _payload.assetAddress = assetAddress;
  _payload.symbol = getAssetSymbol(asset);
  _payload.to = data.sidechainAddress;
  _payload.hash = data.requestHash;

  return payload;
};

export default class IndexerDataParser {
  // Operations visible in wallet
  public static readonly SUPPORTED_OPERATIONS = [
    Operation.Burn,
    Operation.Mint,
    Operation.Transfer,
    Operation.VestedTransfer,
    Operation.Swap,
    Operation.SwapAndSend,
    Operation.SwapTransferBatch,
    Operation.CreatePair,
    Operation.AddLiquidity,
    Operation.RemoveLiquidity,
    Operation.RegisterAsset,
    Operation.ReferralSetInvitedUser,
    Operation.ReferralReserveXor,
    Operation.ReferralUnreserveXor,
    Operation.ClaimRewards,
    Operation.DemeterFarmingDepositLiquidity,
    Operation.DemeterFarmingWithdrawLiquidity,
    Operation.DemeterFarmingStakeToken,
    Operation.DemeterFarmingUnstakeToken,
    Operation.DemeterFarmingGetRewards,
    Operation.OrderBookPlaceLimitOrder,
    Operation.OrderBookCancelLimitOrder,
    Operation.OrderBookCancelLimitOrders,
    Operation.StakingBond,
    Operation.StakingBondExtra,
    Operation.StakingRebond,
    Operation.StakingUnbond,
    Operation.StakingWithdrawUnbonded,
    Operation.StakingNominate,
    Operation.StakingChill,
    Operation.StakingSetPayee,
    Operation.StakingSetController,
    Operation.StakingPayout,
    Operation.StakingBondAndNominate,
    Operation.CreateVault,
    Operation.CloseVault,
    Operation.DepositCollateral,
    Operation.RepayVaultDebt,
    Operation.BorrowVaultDebt,
    /** Don't show bridge tx in wallet */
    // Operation.EthBridgeIncoming,
    // Operation.EthBridgeOutgoing,
  ];

  public get supportedOperations(): Array<Operation> {
    return IndexerDataParser.SUPPORTED_OPERATIONS;
  }

  public async parseTransactionAsHistoryItem(transaction: HistoryElement): Promise<Nullable<HistoryItem>> {
    const type = getTransactionOperationType(transaction);

    if (!type) {
      console.warn('Unsupported transaction:', transaction);
      return null;
    }

    const id = getTransactionId(transaction);
    const timestamp = getTransactionTimestamp(transaction);
    const blockHeight = +transaction.blockHeight;
    const blockId = transaction.blockHash;

    // common attributes
    const payload: HistoryItem = {
      id, // history item id will be txId
      type,
      txId: id,
      blockId,
      blockHeight,
      endTime: timestamp,
      startTime: timestamp,
      soraNetworkFee: getTransactionNetworkFee(transaction),
      status: getTransactionStatus(transaction),
    };

    payload.from = transaction.dataFrom ?? transaction.address;
    payload.to = transaction.dataTo;

    if (transaction.execution.error) {
      const { name, section } = getErrorMessage(transaction.execution.error);

      payload.errorMessage = {
        section,
        name,
      };
    }

    switch (type) {
      case Operation.Burn:
      case Operation.Mint: {
        return await parseMintOrBurn(transaction, payload);
      }
      case Operation.Swap:
      case Operation.SwapAndSend: {
        return await parseSwapTransfer(transaction, payload);
      }
      case Operation.SwapTransferBatch: {
        return await parseSwapTransferBatch(transaction, payload);
      }
      case Operation.AddLiquidity:
      case Operation.RemoveLiquidity: {
        return await parseLiquidityDepositOrWithdrawal(transaction, payload);
      }
      case Operation.CreatePair: {
        return await parseCreatePair(transaction, payload);
      }
      case Operation.Transfer: {
        return await parseTransfer(transaction, payload);
      }
      case Operation.VestedTransfer: {
        return await parseVestedTransfer(transaction, payload);
      }
      case Operation.RegisterAsset: {
        return await parseRegisterAsset(transaction, payload);
      }
      case Operation.ReferralSetInvitedUser: {
        return payload;
      }
      case Operation.ReferralReserveXor:
      case Operation.ReferralUnreserveXor: {
        return await parseReferralReserve(transaction, payload);
      }
      case Operation.ClaimRewards: {
        return await parseClaimRewards(transaction, payload);
      }
      case Operation.DemeterFarmingDepositLiquidity:
      case Operation.DemeterFarmingWithdrawLiquidity: {
        return await parseDemeterLiquidity(transaction, payload);
      }
      case Operation.DemeterFarmingStakeToken:
      case Operation.DemeterFarmingUnstakeToken:
      case Operation.DemeterFarmingGetRewards: {
        return await parseDemeterStakeOrRewards(transaction, payload);
      }
      case Operation.OrderBookPlaceLimitOrder: {
        return await parseOrderBookLimitOrderPlacement(transaction, payload);
      }
      case Operation.OrderBookCancelLimitOrder:
      case Operation.OrderBookCancelLimitOrders: {
        return await parseOrderBookLimitOrderCancel(transaction, payload);
      }
      case Operation.StakingBond:
      case Operation.StakingBondExtra: {
        return await parseStakingBond(transaction, payload);
      }
      case Operation.StakingUnbond: {
        return await parseStakingUnbond(transaction, payload);
      }
      case Operation.StakingRebond: {
        return await parseStakingRebond(transaction, payload);
      }
      case Operation.StakingNominate: {
        return await parseStakingNominate(transaction, payload);
      }
      case Operation.StakingWithdrawUnbonded: {
        return await parseStakingWithdrawUnbonded(transaction, payload);
      }
      case Operation.StakingChill: {
        return await parseStakingChill(transaction, payload);
      }
      case Operation.StakingSetPayee: {
        return await parseStakingSetPayee(transaction, payload);
      }
      case Operation.StakingSetController: {
        return await parseStakingSetController(transaction, payload);
      }
      case Operation.StakingPayout: {
        return await parseStakingPayout(transaction, payload);
      }
      case Operation.StakingBondAndNominate: {
        return await parseStakingBondAndNominate(transaction, payload);
      }
      case Operation.CreateVault:
      case Operation.CloseVault: {
        return await parseVaultCreateOrClose(transaction, payload);
      }
      case Operation.DepositCollateral: {
        return await parseVaultCollateralDeposit(transaction, payload);
      }
      case Operation.RepayVaultDebt:
      case Operation.BorrowVaultDebt: {
        return await parseVaultDebtPaymentOrBorrow(transaction, payload);
      }
      case Operation.EthBridgeIncoming: {
        return await parseEthBridgeIncoming(transaction, payload);
      }
      case Operation.EthBridgeOutgoing: {
        return await parseEthBridgeOutgoing(transaction, payload);
      }
      default:
        return null;
    }
  }
}
