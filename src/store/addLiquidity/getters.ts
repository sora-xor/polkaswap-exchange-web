import { CodecString, FPNumber } from '@sora-substrate/sdk';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { addLiquidityGetterContext } from '@/store/addLiquidity';

import type { AddLiquidityState } from './types';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

const getters = defineGetters<AddLiquidityState>()({
  firstToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = addLiquidityGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.firstTokenAddress);
    const balance = state.firstTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  secondToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = addLiquidityGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.secondTokenAddress);
    const balance = state.secondTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  liquidityInfo(...args): Nullable<AccountLiquidity> {
    const { state, rootState } = addLiquidityGetterContext(args);
    const { firstTokenAddress, secondTokenAddress } = state;

    if (!(firstTokenAddress && secondTokenAddress)) return undefined;

    return rootState.pool.accountLiquidity.find(
      (liquidity) => liquidity.firstAddress === firstTokenAddress && liquidity.secondAddress === secondTokenAddress
    );
  },
  reserveA(...args): CodecString {
    const { state } = addLiquidityGetterContext(args);
    return state.reserve ? state.reserve[0] : ZeroStringValue;
  },
  reserveB(...args): CodecString {
    const { state } = addLiquidityGetterContext(args);
    return state.reserve ? state.reserve[1] : ZeroStringValue;
  },
  isAvailable(...args): boolean {
    const { state } = addLiquidityGetterContext(args);
    return state.isAvailable && !!state.reserve?.length;
  },
  isNotFirstLiquidityProvider(...args): boolean {
    const { state, getters } = addLiquidityGetterContext(args);
    return !!state.reserve?.length && +getters.reserveA !== 0 && +getters.reserveB !== 0;
  },
  minted(...args): CodecString {
    const { state, getters } = addLiquidityGetterContext(args);

    if (!(getters.firstToken && getters.secondToken)) return ZeroStringValue;

    const [minted] = api.poolXyk.estimatePoolTokensMinted(
      getters.firstToken,
      getters.secondToken,
      state.firstTokenValue,
      state.secondTokenValue,
      getters.reserveA,
      getters.reserveB,
      state.totalSupply
    );

    return minted;
  },
  totalSupply(...args): CodecString {
    const { state } = addLiquidityGetterContext(args);
    return state.totalSupply || ZeroStringValue;
  },
  shareOfPool(...args): string {
    const { getters } = addLiquidityGetterContext(args);
    const full = FPNumber.HUNDRED;
    const minted = FPNumber.fromCodecValue(getters.minted);
    const total = FPNumber.fromCodecValue(getters.totalSupply);
    const existed = FPNumber.fromCodecValue(getters.liquidityInfo?.balance ?? 0);

    if (total.isZero() && minted.isZero()) return full.toLocaleString(); // pair created but hasn't liquidity

    return minted.add(existed).div(total.add(minted)).mul(full).toLocaleString() || ZeroStringValue;
  },
  price(...args): string {
    const { state, getters } = addLiquidityGetterContext(args);
    const { firstToken, secondToken } = getters;
    if (!(firstToken && secondToken)) {
      return ZeroStringValue;
    }
    return api.divideAssets(firstToken, secondToken, state.firstTokenValue, state.secondTokenValue, false);
  },
  priceReversed(...args): string {
    const { state, getters } = addLiquidityGetterContext(args);
    const { firstToken, secondToken } = getters;
    if (!(firstToken && secondToken)) {
      return ZeroStringValue;
    }
    return api.divideAssets(firstToken, secondToken, state.firstTokenValue, state.secondTokenValue, true);
  },
});

export default getters;
