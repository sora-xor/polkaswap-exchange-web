import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import type { ActionContext } from 'vuex';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { addLiquidityActionContext } from '@/store/addLiquidity';
import { FocusedField } from '@/store/addLiquidity/types';
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

function updateFirstTokenValue(context: ActionContext<any, any>) {
  const { getters, commit, state } = addLiquidityActionContext(context);

  const value = state.secondTokenValue;

  if (!value) {
    commit.setFirstTokenValue();
  } else if (getters.isNotFirstLiquidityProvider) {
    const firstTokenValue = new FPNumber(value)
      .mul(FPNumber.fromCodecValue(getters.reserveA))
      .div(FPNumber.fromCodecValue(getters.reserveB))
      .toString();
    commit.setFirstTokenValue(firstTokenValue);
  }

  estimateMinted(context);
}

function updateSecondTokenValue(context: ActionContext<any, any>) {
  const { getters, commit, state } = addLiquidityActionContext(context);

  const value = state.firstTokenValue;

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

const actions = defineActions({
  async setFirstTokenAddress(context, address: string): Promise<void> {
    const { commit, dispatch, getters, rootGetters } = addLiquidityActionContext(context);

    const updateBalance = (balance: Nullable<AccountBalance>) => commit.setFirstTokenBalance(balance);

    commit.setFirstTokenAddress(address);
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();

    balanceSubscriptions.remove('first', { updateBalance });

    if (
      getters.firstToken?.address &&
      !(getters.firstToken.address in rootGetters.wallet.account.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add('first', { updateBalance, token: getters.firstToken });
    }

    dispatch.subscribeOnAvailability();
    dispatch.subscribeOnReserves();
  },

  async setSecondTokenAddress(context, address: string): Promise<void> {
    const { commit, dispatch, getters, rootGetters } = addLiquidityActionContext(context);

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

    dispatch.subscribeOnAvailability();
    dispatch.subscribeOnReserves();
  },

  async setFirstTokenValue(context, value: string): Promise<void> {
    const { commit } = addLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.First);
    commit.setFirstTokenValue(value);

    updateSecondTokenValue(context);
  },

  async setSecondTokenValue(context, value: string): Promise<void> {
    const { commit } = addLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.Second);
    commit.setSecondTokenValue(value);

    updateFirstTokenValue(context);
  },

  async addLiquidity(context): Promise<void> {
    const { getters, state, rootState } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;
    const { isAvailable, firstTokenValue, secondTokenValue } = state;

    if (!(firstToken && secondToken)) {
      return;
    }

    if (isAvailable) {
      await api.poolXyk.add(
        firstToken,
        secondToken,
        firstTokenValue,
        secondTokenValue,
        rootState.settings.slippageTolerance
      );
    } else {
      await api.poolXyk.create(
        firstToken,
        secondToken,
        firstTokenValue,
        secondTokenValue,
        rootState.settings.slippageTolerance
      );
    }
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
  async resetData(context): Promise<void> {
    const { commit } = addLiquidityActionContext(context);

    balanceSubscriptions.remove('first', {
      updateBalance: (balance: Nullable<AccountBalance>) => commit.setFirstTokenBalance(balance),
    });
    balanceSubscriptions.remove('second', {
      updateBalance: (balance: Nullable<AccountBalance>) => commit.setSecondTokenBalance(balance),
    });

    commit.resetAvailabilitySubscription();
    commit.resetReserveSubscription();

    commit.setFirstTokenAddress();
    commit.setSecondTokenAddress();
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();
  },

  subscribeOnAvailability(context): void {
    const { commit, getters } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;

    commit.resetAvailabilitySubscription();

    if (firstToken && secondToken) {
      // [TODO]: subscription to js-lib
      const subscription = api.apiRx.query.poolXYK
        .properties(firstToken.address, secondToken.address)
        .subscribe((result) => {
          const isAvailable = !!result && result.isSome;
          commit.setIsAvailable(isAvailable);
        });

      commit.setAvailabilitySubscription(subscription);
    }
  },

  subscribeOnReserves(context): void {
    const { commit, dispatch, getters } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;

    commit.resetReserveSubscription();

    if (firstToken && secondToken) {
      // [TODO]: subscription to js-lib
      const subscription = api.apiRx.query.poolXYK
        .reserves(firstToken.address, secondToken.address)
        .subscribe((result) => {
          const correctReserves = result && result.length === 2;

          const reserveA = correctReserves ? new FPNumber(result[0], firstToken.decimals).toCodecString() : '0';
          const reserveB = correctReserves ? new FPNumber(result[1], secondToken.decimals).toCodecString() : '0';

          dispatch.updateReserves([reserveA, reserveB]);
        });

      commit.setReserveSubscription(subscription);
    }
  },

  updateReserves(context, reserves: Array<CodecString>): void {
    const { commit, state } = addLiquidityActionContext(context);
    commit.setReserve(reserves);

    if (state.focusedField === 'secondTokenValue') {
      updateFirstTokenValue(context);
    } else {
      updateSecondTokenValue(context);
    }
  },
});

export default actions;
