import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { createPairActionContext } from '@/store/createPair';
import { rootActionContext } from '@/store';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { ZeroStringValue } from '@/consts';

const balanceSubscriptions = new TokenBalanceSubscriptions();

async function estimateMinted(context: ActionContext<any, any>): Promise<void> {
  const { state, getters, commit } = createPairActionContext(context);
  const { firstToken, secondToken } = getters;
  const { firstTokenValue, secondTokenValue } = state;

  if (firstToken && secondToken && firstTokenValue && secondTokenValue) {
    try {
      const [minted] = await api.poolXyk.estimatePoolTokensMinted(
        firstToken,
        secondToken,
        state.firstTokenValue,
        state.secondTokenValue,
        ZeroStringValue,
        ZeroStringValue
      );
      commit.setMinted(minted);
    } catch (error) {
      console.error('createPair:estimateMinted', error);
    }
  }
}

async function checkLiquidity(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = createPairActionContext(context);
  const { firstToken, secondToken } = getters;

  if (firstToken && secondToken) {
    try {
      const exists = await api.poolXyk.check(firstToken.address, secondToken.address);
      commit.setIsAvailable(!exists);

      await estimateMinted(context);
    } catch (error) {
      console.error('createPair:checkLiquidity', error);
    }
  }
}

const actions = defineActions({
  async setFirstTokenAddress(context, address: string): Promise<void> {
    const { commit } = createPairActionContext(context);
    commit.setFirstTokenAddress(address);
    await checkLiquidity(context);
  },

  async setSecondTokenAddress(context, address: string): Promise<void> {
    const { getters, commit } = createPairActionContext(context);
    const { rootGetters } = rootActionContext(context);
    const updateBalance = (balance: Nullable<AccountBalance>) => commit.setSecondTokenBalance(balance);

    commit.setSecondTokenAddress(address);

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
    const { commit } = createPairActionContext(context);
    commit.setFirstTokenValue(value);
    await estimateMinted(context);
  },
  async setSecondTokenValue(context, value: string): Promise<void> {
    const { commit } = createPairActionContext(context);
    commit.setSecondTokenValue(value);
    await estimateMinted(context);
  },
  async createPair(context): Promise<void> {
    const { getters, state } = createPairActionContext(context);
    const { rootState } = rootActionContext(context);
    const { firstToken, secondToken } = getters;
    if (!(firstToken && secondToken)) {
      return;
    }
    await api.poolXyk.create(
      firstToken,
      secondToken,
      state.firstTokenValue,
      state.secondTokenValue,
      rootState.settings.slippageTolerance
    );
  },
  async resetData(context, withAssets = false): Promise<void> {
    const { commit } = createPairActionContext(context);

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
