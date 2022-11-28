import { defineGetters } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import { removeLiquidityGetterContext } from '@/store/removeLiquidity';
import { ZeroStringValue } from '@/consts';
import type { RemoveLiquidityState } from './types';
import type { RegisteredAccountAssetWithDecimals } from '../assets/types';

const getters = defineGetters<RemoveLiquidityState>()({
  liquidity(...args): Nullable<AccountLiquidity> {
    const { state, rootState } = removeLiquidityGetterContext(args);
    const { firstTokenAddress, secondTokenAddress } = state;
    return rootState.pool.accountLiquidity.find(
      (liquidity) => liquidity.firstAddress === firstTokenAddress && liquidity.secondAddress === secondTokenAddress
    );
  },
  reserveA(...args): string {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity) return ZeroStringValue;

    const poolShare = new FPNumber(getters.liquidity.poolShare);
    const reserve = FPNumber.fromCodecValue(getters.liquidity.firstBalance, getters.firstToken?.decimals);

    return reserve.div(poolShare).toCodecString();
  },
  reserveB(...args): string {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity) return ZeroStringValue;

    const poolShare = new FPNumber(getters.liquidity.poolShare);
    const reserve = FPNumber.fromCodecValue(getters.liquidity.secondBalance, getters.secondToken?.decimals);

    return reserve.div(poolShare).toCodecString();
  },
  // Liquidity full balance (without locked balance)
  liquidityBalanceFull(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.balance) return FPNumber.ZERO;

    return FPNumber.fromCodecValue(getters.liquidity.balance);
  },
  // Liquidity locked balance
  liquidityBalanceLocked(...args): FPNumber {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);

    if (!rootGetters.demeterFarming || !getters.liquidity) return FPNumber.ZERO;

    const baseAsset = getters.liquidity.firstAddress;
    const poolAsset = getters.liquidity.secondAddress;
    const lockedBalance = rootGetters.demeterFarming.getLockedAmount(baseAsset, poolAsset, true);
    const balance = getters.liquidityBalanceFull;
    const maxLocked = FPNumber.min(balance, lockedBalance) as FPNumber;

    return maxLocked;
  },
  // Liqudity free balance (full - locked)
  liquidityBalance(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    const balance = getters.liquidityBalanceFull;
    const lockedBalance = getters.liquidityBalanceLocked;

    return balance.sub(lockedBalance);
  },
  firstToken(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);
    const firstAddress = getters.liquidity?.firstAddress;
    if (!firstAddress) {
      return null;
    }
    return rootGetters.assets.assetDataByAddress(firstAddress);
  },
  secondToken(...args): Nullable<RegisteredAccountAssetWithDecimals> {
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

    return tokenBalance.mul(getters.liquidityBalance).div(getters.liquidityBalanceFull);
  },
  // Second token free balance
  secondTokenBalance(...args): FPNumber {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.secondBalance) return FPNumber.ZERO;

    const tokenBalance = FPNumber.fromCodecValue(getters.liquidity.secondBalance, getters.secondToken?.decimals);

    return tokenBalance.mul(getters.liquidityBalance).div(getters.liquidityBalanceFull);
  },
  shareOfPool(...args): string {
    const { state, getters } = removeLiquidityGetterContext(args);

    const balance = getters.liquidityBalanceFull;
    const removed = new FPNumber(state.liquidityAmount ?? 0);
    const totalSupply = FPNumber.fromCodecValue(state.totalSupply);
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
