import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';

import { removeLiquidityActionContext } from '@/store/removeLiquidity';
import { FocusedField } from './types';
import type { LiquidityParams } from '../pool/types';

function updateFirstTokenAmount(context: ActionContext<any, any>): void {
  const { state, commit, getters } = removeLiquidityActionContext(context);

  const value = state.secondTokenAmount;

  if (value && Number.isFinite(+value)) {
    const part = new FPNumber(value).div(getters.secondTokenBalance);

    commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()).toString());
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
    commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance).toString());
  } else {
    commit.setRemovePart();
    commit.setLiquidityAmount();
    commit.setFirstTokenAmount();
  }
}

function updateSecondTokenAmount(context: ActionContext<any, any>): void {
  const { state, commit, getters } = removeLiquidityActionContext(context);

  const value = state.firstTokenAmount;

  if (value && Number.isFinite(+value)) {
    const part = Number.isFinite(+value) ? new FPNumber(value).div(getters.firstTokenBalance) : FPNumber.ZERO;

    commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()).toString());
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
    commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance).toString());
  } else {
    commit.setRemovePart();
    commit.setLiquidityAmount();
    commit.setSecondTokenAmount();
  }
}

function updateRemovePart(context: ActionContext<any, any>): void {
  const { state, commit, getters } = removeLiquidityActionContext(context);

  const part = new FPNumber(state.removePart).div(FPNumber.HUNDRED);

  if (!part.isZero()) {
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
    commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance).toString());
    commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance).toString());
  } else {
    commit.setLiquidityAmount();
    commit.setFirstTokenAmount();
    commit.setSecondTokenAmount();
  }
}

const actions = defineActions({
  async setLiquidity(context, { firstAddress, secondAddress }: LiquidityParams): Promise<void> {
    const { commit, dispatch } = removeLiquidityActionContext(context);
    try {
      commit.setAddresses({ firstAddress, secondAddress });

      await dispatch.getTotalSupply();
    } catch (error) {
      console.error(error);
    }
  },
  // [TODO]: add total suuply to account liquidity
  async getTotalSupply(context: ActionContext<any, any>): Promise<void> {
    const { state, getters, commit } = removeLiquidityActionContext(context);
    const { firstToken, secondToken, reserveA, reserveB } = getters;

    if (firstToken && secondToken) {
      try {
        const [_, pts] = await api.poolXyk.estimatePoolTokensMinted(
          firstToken,
          secondToken,
          state.firstTokenAmount,
          state.secondTokenAmount,
          reserveA,
          reserveB
        );
        commit.setTotalSupply(pts);
      } catch (error) {
        console.error('removeLiquidity:getTotalSupply', error);
        commit.setTotalSupply();
      }
    }
  },
  async setRemovePart(context, removePart: string): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.Percent);
    commit.setRemovePart(removePart);

    updateRemovePart(context);
  },
  async setFirstTokenAmount(context, value: string): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.First);
    commit.setFirstTokenAmount(value);

    updateSecondTokenAmount(context);
  },
  async setSecondTokenAmount(context, value: string): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.Second);
    commit.setSecondTokenAmount(value);

    updateFirstTokenAmount(context);
  },
  async removeLiquidity(context): Promise<void> {
    const { state, getters, rootState } = removeLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;
    if (!(firstToken && secondToken)) {
      return;
    }
    await api.poolXyk.remove(
      firstToken,
      secondToken,
      state.liquidityAmount,
      getters.reserveA,
      getters.reserveB,
      state.totalSupply,
      rootState.settings.slippageTolerance
    );
  },
  async resetData(context): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);
    commit.setRemovePart();
    commit.setLiquidityAmount();
    commit.setFirstTokenAmount();
    commit.setSecondTokenAmount();
    commit.setTotalSupply();
    commit.resetFocusedField();
  },
});

export default actions;
