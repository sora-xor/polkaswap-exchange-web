import { defineGetters } from 'direct-vuex';
import { CodecString, FPNumber } from '@sora-substrate/util';
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
  liquidityBalanceFreePart(...args): FPNumber {
    const { getters, rootGetters } = removeLiquidityGetterContext(args);

    if (!rootGetters.demeterFarming || !getters.liquidity) return FPNumber.ONE;

    const poolAsset = getters.liquidity.secondAddress;
    const balance = FPNumber.fromCodecValue(getters.liquidity.balance);
    const lockedAmount = rootGetters.demeterFarming.getLockedAmount(poolAsset, true);
    const maxLocked = FPNumber.min(balance, lockedAmount) as FPNumber;

    return balance.sub(maxLocked).div(balance);
  },
  liquidityBalance(...args): CodecString {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.balance) return ZeroStringValue;

    const balance = FPNumber.fromCodecValue(getters.liquidity.balance);
    const freePart = getters.liquidityBalanceFreePart;

    return balance.mul(freePart).toCodecString();
  },
  liquidityDecimals(...args): number {
    const { getters } = removeLiquidityGetterContext(args);
    return getters.liquidity?.decimals ?? 0;
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
  firstTokenBalance(...args): CodecString {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.firstBalance) return ZeroStringValue;

    const balance = FPNumber.fromCodecValue(getters.liquidity.firstBalance, getters.firstToken?.decimals);
    const freePart = getters.liquidityBalanceFreePart;

    return balance.mul(freePart).toCodecString();
  },
  secondTokenBalance(...args): CodecString {
    const { getters } = removeLiquidityGetterContext(args);

    if (!getters.liquidity?.secondBalance) return ZeroStringValue;

    const balance = FPNumber.fromCodecValue(getters.liquidity.secondBalance, getters.secondToken?.decimals);
    const freePart = getters.liquidityBalanceFreePart;

    return balance.mul(freePart).toCodecString();
  },
  shareOfPool(...args): string {
    const { state, getters } = removeLiquidityGetterContext(args);

    const balance = FPNumber.fromCodecValue(getters.liquidityBalance);
    const removed = new FPNumber(state.liquidityAmount ?? 0);
    const totalSupply = FPNumber.fromCodecValue(state.totalSupply);
    const totalSupplyAfter = totalSupply.sub(removed);

    if (balance.isZero() || totalSupply.isZero() || totalSupplyAfter.isZero()) return ZeroStringValue;

    return balance.sub(removed).div(totalSupplyAfter).mul(FPNumber.HUNDRED).toLocaleString() || ZeroStringValue;
  },
});

export default getters;
