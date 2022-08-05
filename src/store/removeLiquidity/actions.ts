import debounce from 'lodash/debounce';
import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';

import { removeLiquidityActionContext } from '@/store/removeLiquidity';
import type { LiquidityParams } from '../pool/types';

async function getTotalSupply(context: ActionContext<any, any>): Promise<void> {
  const { state, getters, commit } = removeLiquidityActionContext(context);
  const { firstToken, secondToken } = getters;

  if (!(firstToken && secondToken)) {
    return;
  }
  try {
    const [_, pts] = await api.poolXyk.estimatePoolTokensMinted(
      firstToken,
      secondToken,
      state.firstTokenAmount,
      state.secondTokenAmount,
      state.reserveA,
      state.reserveB
    );
    commit.setTotalSupply(pts);
  } catch (error) {
    console.error('removeLiquidity:getTotalSupply', error);
    commit.setTotalSupply();
  }
}

async function getLiquidityReserves(context: ActionContext<any, any>): Promise<void> {
  const { state, commit } = removeLiquidityActionContext(context);
  try {
    const [reserveA, reserveB] = await api.poolXyk.getReserves(state.firstTokenAddress, state.secondTokenAddress);
    commit.setLiquidityReserves({ reserveA, reserveB });
  } catch (error) {
    console.error('removeLiquidity:getLiquidityReserves', error);
  }
}

const getRemoveLiquidityData = debounce(
  async (context: ActionContext<any, any>) => {
    await getLiquidityReserves(context);
    await getTotalSupply(context);
  },
  500,
  { leading: true }
);

const actions = defineActions({
  async setLiquidity(context, { firstAddress, secondAddress }: LiquidityParams): Promise<void> {
    const { commit } = removeLiquidityActionContext(context);
    try {
      commit.setAddresses({ firstAddress, secondAddress });

      await getRemoveLiquidityData(context);
    } catch (error) {
      console.error(error);
    }
  },
  async setRemovePart(context, removePart: number): Promise<void> {
    const { commit, state, getters } = removeLiquidityActionContext(context);

    if (!state.focusedField || state.focusedField === 'removePart') {
      commit.setFocusedField('removePart');
      const partAmount = new FPNumber(Math.round(removePart));

      if (removePart) {
        const part = partAmount.div(FPNumber.HUNDRED);
        commit.setRemovePart(partAmount.toNumber());
        commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
        commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance).toString());
        commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance).toString());
      } else {
        commit.setRemovePart();
        commit.setLiquidityAmount();
        commit.setFirstTokenAmount();
        commit.setSecondTokenAmount();
      }

      await getRemoveLiquidityData(context);
    }
  },
  async setFirstTokenAmount(context, firstTokenAmount: string): Promise<void> {
    const { commit, state, getters } = removeLiquidityActionContext(context);

    if (!state.focusedField || state.focusedField === 'firstTokenAmount') {
      commit.setFocusedField('firstTokenAmount');
      if (firstTokenAmount) {
        if (!Number.isNaN(firstTokenAmount)) {
          const part = new FPNumber(firstTokenAmount).div(getters.firstTokenBalance);
          commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()));
          commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
          commit.setFirstTokenAmount(firstTokenAmount);
          commit.setSecondTokenAmount(part.mul(getters.secondTokenBalance).toString());
        }
      } else {
        commit.setFirstTokenAmount();
      }

      await getRemoveLiquidityData(context);
    }
  },
  async setSecondTokenAmount(context, secondTokenAmount: string): Promise<void> {
    const { commit, state, getters } = removeLiquidityActionContext(context);

    if (!state.focusedField || state.focusedField === 'secondTokenAmount') {
      commit.setFocusedField('secondTokenAmount');
      if (secondTokenAmount) {
        if (!Number.isNaN(secondTokenAmount)) {
          const part = new FPNumber(secondTokenAmount).div(getters.secondTokenBalance);
          commit.setRemovePart(Math.round(part.mul(FPNumber.HUNDRED).toNumber()));
          commit.setLiquidityAmount(part.mul(getters.liquidityBalance).toString());
          commit.setFirstTokenAmount(part.mul(getters.firstTokenBalance).toString());
          commit.setSecondTokenAmount(secondTokenAmount);
        }
      } else {
        commit.setSecondTokenAmount();
      }

      await getRemoveLiquidityData(context);
    }
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
      state.reserveA,
      state.reserveB,
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
  },
});

export default actions;
