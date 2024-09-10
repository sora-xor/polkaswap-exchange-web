import { FPNumber } from '@sora-substrate/sdk';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { removeLiquidityActionContext } from '@/store/removeLiquidity';

import { FocusedField } from './types';

import type { ActionContext } from 'vuex';

function updateFirstTokenAmount(context: ActionContext<any, any>): void {
  const { state, commit, getters } = removeLiquidityActionContext(context);

  const value = state.secondTokenAmount;

  if (value && Number.isFinite(+value)) {
    const part = new FPNumber(value).div(getters.secondTokenBalance as FPNumber);

    commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()).toString());
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance as FPNumber).toString());
    commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance as FPNumber).toString());
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
    const part = Number.isFinite(+value)
      ? new FPNumber(value).div(getters.firstTokenBalance as FPNumber)
      : FPNumber.ZERO;

    commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()).toString());
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance as FPNumber).toString());
    commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance as FPNumber).toString());
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
    commit.setLiquidityAmount(part.mul(getters.liquidityBalance as FPNumber).toString());
    commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance as FPNumber).toString());
    commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance as FPNumber).toString());
  } else {
    commit.setLiquidityAmount();
    commit.setFirstTokenAmount();
    commit.setSecondTokenAmount();
  }
}

const actions = defineActions({
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
      getters.totalSupply,
      rootState.settings.slippageTolerance
    );
  },
  async resetData(context): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);
    commit.setRemovePart();
    commit.setLiquidityAmount();
    commit.setFirstTokenAmount();
    commit.setSecondTokenAmount();
    commit.resetFocusedField();
  },
});

export default actions;
