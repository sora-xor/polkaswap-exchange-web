import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { addLiquidityActionContext } from '@/store/addLiquidity';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import type { LiquidityParams } from '@/store/pool/types';

const balanceSubscriptions = new TokenBalanceSubscriptions();

async function estimateMinted(context: ActionContext<any, any>): Promise<void> {
  const { state, getters, commit } = addLiquidityActionContext(context);
  const { firstToken, secondToken } = getters;

  if (firstToken?.address && secondToken?.address) {
    try {
      const [minted, pts] = await api.poolXyk.estimatePoolTokensMinted(
        firstToken,
        secondToken,
        state.firstTokenValue,
        state.secondTokenValue,
        getters.reserveA,
        getters.reserveB
      );
      commit.setMintedAndSupply({ minted, pts });
    } catch (error) {
      console.error('addLiquidity:estimateMinted', error);
      commit.resetMintedAndSupply();
    }
  }
}

async function checkReserve(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = addLiquidityActionContext(context);
  const { firstToken, secondToken } = getters;

  if (firstToken && secondToken) {
    try {
      const reserve = await api.poolXyk.getReserves(firstToken.address, secondToken.address);
      commit.setReserve(reserve);

      await estimateMinted(context);
    } catch (error) {
      console.error('addLiquidity:checkReserve', error);
    }
  }
}

async function checkLiquidity(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = addLiquidityActionContext(context);
  const { firstToken, secondToken } = getters;

  if (firstToken && secondToken) {
    try {
      const isAvailable = await api.poolXyk.check(firstToken.address, secondToken.address);
      commit.setIsAvailable(isAvailable);

      await checkReserve(context);
    } catch (error) {
      console.error('addLiquidity:checkLiquidity', error);
    }
  }
}

const actions = defineActions({
  async setFirstTokenAddress(context, address: string): Promise<void> {
    const { commit } = addLiquidityActionContext(context);
    commit.setFirstTokenAddress(address);
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();
    await checkLiquidity(context);
  },
  async setSecondTokenAddress(context, address: string): Promise<void> {
    const { commit, getters, rootGetters } = addLiquidityActionContext(context);

    const updateBalance = (balance: Nullable<AccountBalance>) => commit.setSecondTokenBalance(balance);

    commit.setSecondTokenAddress(address);
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();

    balanceSubscriptions.remove('second', { updateBalance });

    if (
      getters.secondToken?.address &&
      !(getters.secondToken.address in rootGetters.wallet.account.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('second', { updateBalance, token: getters.secondToken });
    }

    await checkLiquidity(context);
  },
  async setFirstTokenValue(context, value: string): Promise<void> {
    const { commit, getters, state } = addLiquidityActionContext(context);

    if ((!state.focusedField || state.focusedField === 'firstTokenValue') && value !== state.firstTokenValue) {
      commit.setVocusedField('firstTokenValue');

      commit.setFirstTokenValue(value);

      if (!value) {
        commit.setSecondTokenValue();
      } else if (getters.isNotFirstLiquidityProvider) {
        commit.setSecondTokenValue(
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveB))
            .div(FPNumber.fromCodecValue(getters.reserveA))
            .toString()
        );
      }

      estimateMinted(context);
    }
  },
  async setSecondTokenValue(context, value: string): Promise<void> {
    const { commit, getters, state } = addLiquidityActionContext(context);

    if ((!state.focusedField || state.focusedField === 'secondTokenValue') && value !== state.secondTokenValue) {
      commit.setVocusedField('secondTokenValue');

      commit.setSecondTokenValue(value);

      if (!value) {
        commit.setFirstTokenValue();
      } else if (getters.isNotFirstLiquidityProvider) {
        commit.setFirstTokenValue(
          new FPNumber(value)
            .mul(FPNumber.fromCodecValue(getters.reserveA))
            .div(FPNumber.fromCodecValue(getters.reserveB))
            .toString()
        );
      }

      estimateMinted(context);
    }
  },
  async addLiquidity(context): Promise<void> {
    const { getters, state, rootState } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;
    if (!(firstToken && secondToken)) {
      return;
    }
    await api.poolXyk.add(
      firstToken,
      secondToken,
      state.firstTokenValue,
      state.secondTokenValue,
      rootState.settings.slippageTolerance
    );
  },
  async setDataFromLiquidity(context, { firstAddress, secondAddress }: LiquidityParams): Promise<void> {
    const { dispatch } = addLiquidityActionContext(context);

    const findAssetAddress = async (address: string): Promise<string> => {
      const asset = await api.assets.getAssetInfo(address);
      return asset?.address ?? '';
    };

    const [first, second] = await Promise.all([findAssetAddress(firstAddress), findAssetAddress(secondAddress)]);

    await dispatch.setFirstTokenAddress(first);
    await dispatch.setSecondTokenAddress(second);
  },
  async resetData(context, withAssets = false): Promise<void> {
    const { commit } = addLiquidityActionContext(context);

    balanceSubscriptions.remove('second', {
      updateBalance: (balance: Nullable<AccountBalance>) => commit.setSecondTokenBalance(balance),
    });

    if (!withAssets) {
      commit.setFirstTokenAddress();
      commit.setSecondTokenAddress();
    }
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();
  },
});

export default actions;
