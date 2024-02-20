import { FPNumber } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { removeLiquidityGetterContext } from '@/store/removeLiquidity';

import type { RemoveLiquidityState } from './types';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

const getters = defineGetters<RemoveLiquidityState>()({
  liquidity(...args): Nullable<AccountLiquidity> {
    const { state, rootState } = removeLiquidityGetterContext(args);
    const { firstTokenAddress, secondTokenAddress } = state;

    if (!(firstTokenAddress && secondTokenAddress)) return undefined;

    return rootState.pool.accountLiquidity.find(
      (liquidity) => liquidity.firstAddress === firstTokenAddress && liquidity.secondAddress === secondTokenAddress
    );
  },
  totalSupply(...args): string {
    const { getters } = removeLiquidityGetterContext(args);

    return getters.liquidity?.totalSupply ?? ZeroStringValue;
  },
  reserveA(...args): string {
    const { getters } = removeLiquidityGetterContext(args);

    return getters.liquidity?.reserveA ?? ZeroStringValue;
  },
  reserveB(...args): string {
    const { getters } = removeLiquidityGetterContext(args);

    return getters.liquidity?.reserveB ?? ZeroStringValue;
  },
  // Liquidity full balance (without locked balance)
  liquidityBalanceFull(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.balance) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getters.liquidity.balance);
  },
  // Liquidity locked balance in demeterFarmingPlatform
  demeterLockedBalance(...args): FPNumber {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity || !rootGetters.demeterFarming) return FPNumber.ZERO;

    const baseAsset = getters.liquidity.firstAddress;
    const poolAsset = getters.liquidity.secondAddress;
    const balance = getters.liquidityBalanceFull as FPNumber;
    const lockedBalance = rootGetters.demeterFarming.getLockedAmount(baseAsset, poolAsset, true);

    const maxLocked = FPNumber.min(balance, lockedBalance) as FPNumber;

    return maxLocked;
  },
  // Liquidity locked balance in demeterFarmingPlatform
  ceresLockedBalance(...args): FPNumber {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity) return FPNumber.ZERO;

    const baseAsset = getters.liquidity.firstAddress;
    const poolAsset = getters.liquidity.secondAddress;
    const balance = getters.liquidityBalanceFull as FPNumber;
    const lockedBalance = rootGetters.pool.getLockedAmount(baseAsset, poolAsset);

    const maxLocked = FPNumber.min(balance, lockedBalance) as FPNumber;

    return maxLocked;
  },
  // Liquidity free balance (full - locked)
  liquidityBalance(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    const balance = getters.liquidityBalanceFull;
    const demeterLockedBalance = getters.demeterLockedBalance as FPNumber;
    const ceresLockedBalance = getters.ceresLockedBalance as FPNumber;
    const maxLocked = FPNumber.max(demeterLockedBalance, ceresLockedBalance) as FPNumber;

    return balance.sub(maxLocked);
  },
  firstToken(...args): Nullable<RegisteredAccountAsset> {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);
    const firstAddress = getters.liquidity?.firstAddress;
    if (!firstAddress) {
      return null;
    }
    return rootGetters.assets.assetDataByAddress(firstAddress);
  },
  secondToken(...args): Nullable<RegisteredAccountAsset> {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);
    const secondAddress = getters.liquidity?.secondAddress;
    if (!secondAddress) {
      return null;
    }
    return rootGetters.assets.assetDataByAddress(secondAddress);
  },
  // First token free balance
  firstTokenBalance(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.firstBalance) return FPNumber.ZERO;

    const tokenBalance = FPNumber.fromCodecValue(getters.liquidity.firstBalance, getters.firstToken?.decimals);

    return tokenBalance.mul(getters.liquidityBalance as FPNumber).div(getters.liquidityBalanceFull as FPNumber);
  },
  // Second token free balance
  secondTokenBalance(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.secondBalance) return FPNumber.ZERO;

    const tokenBalance = FPNumber.fromCodecValue(getters.liquidity.secondBalance, getters.secondToken?.decimals);

    return tokenBalance.mul(getters.liquidityBalance as FPNumber).div(getters.liquidityBalanceFull as FPNumber);
  },
  shareOfPool(...args): string {
    const { state, getters } = removeLiquidityGetterContext(args);

    const balance = getters.liquidityBalanceFull;
    const removed = new FPNumber(state.liquidityAmount ?? 0);
    const totalSupply = FPNumber.fromCodecValue(getters.totalSupply);
    const totalSupplyAfter = totalSupply.sub(removed);

    if (balance.isZero() || totalSupply.isZero() || totalSupplyAfter.isZero()) return ZeroStringValue;

    return balance.sub(removed).div(totalSupplyAfter).mul(FPNumber.HUNDRED).toLocaleString() || ZeroStringValue;
  },
  price(...args): string {
    const { getters } = removeLiquidityGetterContext(args);
    const { firstToken, secondToken, liquidity } = getters;
    if (!(liquidity && firstToken && secondToken)) {
      return ZeroStringValue;
    }
    return api.divideAssets(firstToken, secondToken, liquidity.firstBalance, liquidity.secondBalance, false);
  },
  priceReversed(...args): string {
    const { getters } = removeLiquidityGetterContext(args);
    const { firstToken, secondToken, liquidity } = getters;
    if (!(liquidity && firstToken && secondToken)) {
      return ZeroStringValue;
    }
    return api.divideAssets(firstToken, secondToken, liquidity.firstBalance, liquidity.secondBalance, true);
  },
});

export default getters;
