import { FPNumber } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { addLiquidityActionContext } from '@/store/addLiquidity';
import { FocusedField } from '@/store/addLiquidity/types';
import type { LiquidityParams } from '@/store/pool/types';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { ActionContext } from 'vuex';

const balanceSubscriptions = new TokenBalanceSubscriptions();

function updateTokenSubscription(context: ActionContext<any, any>, field: FocusedField): void {
  const { getters, commit, rootGetters } = addLiquidityActionContext(context);
  const { firstToken, secondToken } = getters;
  const { setFirstTokenBalance, setSecondTokenBalance } = commit;

  const isFirst = field === FocusedField.First;
  const token = isFirst ? firstToken : secondToken;
  const setTokenBalance = isFirst ? setFirstTokenBalance : setSecondTokenBalance;
  const updateBalance = (balance: Nullable<AccountBalance>) => setTokenBalance(balance);

  balanceSubscriptions.remove(field);

  if (
    rootGetters.wallet.account.isLoggedIn &&
    token?.address &&
    !(token.address in rootGetters.wallet.account.accountAssetsAddressTable)
  ) {
    balanceSubscriptions.add(field, { updateBalance, token });
  }
}

function updateFirstTokenValue(context: ActionContext<any, any>): void {
  const { getters, commit, state } = addLiquidityActionContext(context);

  const value = state.secondTokenValue;

  if (getters.isNotFirstLiquidityProvider) {
    if (!value) {
      commit.setFirstTokenValue();
    } else {
      commit.setFirstTokenValue(
        new FPNumber(value)
          .mul(FPNumber.fromCodecValue(getters.reserveA))
          .div(FPNumber.fromCodecValue(getters.reserveB))
          .toString()
      );
    }
  }
}

function updateSecondTokenValue(context: ActionContext<any, any>): void {
  const { getters, commit, state } = addLiquidityActionContext(context);

  const value = state.firstTokenValue;

  if (getters.isNotFirstLiquidityProvider) {
    if (!value) {
      commit.setSecondTokenValue();
    } else {
      commit.setSecondTokenValue(
        new FPNumber(value)
          .mul(FPNumber.fromCodecValue(getters.reserveB))
          .div(FPNumber.fromCodecValue(getters.reserveA))
          .toString()
      );
    }
  }
}

const actions = defineActions({
  async setFirstTokenAddress(context, address: string): Promise<void> {
    const { commit, dispatch } = addLiquidityActionContext(context);

    commit.setFirstTokenAddress(address);
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();

    updateTokenSubscription(context, FocusedField.First);
    dispatch.subscribeOnAvailability();
    dispatch.subscribeOnReserves();
    dispatch.subscribeOnTotalSupply();
  },

  async setSecondTokenAddress(context, address: string): Promise<void> {
    const { commit, dispatch } = addLiquidityActionContext(context);

    commit.setSecondTokenAddress(address);
    commit.setFirstTokenValue();
    commit.setSecondTokenValue();

    updateTokenSubscription(context, FocusedField.Second);
    dispatch.subscribeOnAvailability();
    dispatch.subscribeOnReserves();
    dispatch.subscribeOnTotalSupply();
  },

  async setFirstTokenValue(context, value: string): Promise<void> {
    const { commit, dispatch } = addLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.First);
    commit.setFirstTokenValue(value);

    dispatch.updateValues();
  },

  async setSecondTokenValue(context, value: string): Promise<void> {
    const { commit, dispatch } = addLiquidityActionContext(context);

    commit.setFocusedField(FocusedField.Second);
    commit.setSecondTokenValue(value);

    dispatch.updateValues();
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

  async updateSubscriptions(context): Promise<void> {
    const { dispatch } = addLiquidityActionContext(context);

    updateTokenSubscription(context, FocusedField.First);
    updateTokenSubscription(context, FocusedField.Second);

    dispatch.subscribeOnAvailability();
    dispatch.subscribeOnReserves();
    dispatch.subscribeOnTotalSupply();
  },

  async resetSubscriptions(context): Promise<void> {
    const { commit } = addLiquidityActionContext(context);

    balanceSubscriptions.remove(FocusedField.First);
    balanceSubscriptions.remove(FocusedField.Second);

    commit.resetAvailabilitySubscription();
    commit.resetReserveSubscription();
    commit.resetTotalSupplySubscription();
  },

  async resetData(context): Promise<void> {
    const { commit, dispatch } = addLiquidityActionContext(context);

    dispatch.resetSubscriptions();

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
      const subscription = api.poolXyk
        .getPoolPropertiesObservable(firstToken.address, secondToken.address)
        .subscribe((result) => {
          commit.setAvailability(!!result);
        });

      commit.setAvailabilitySubscription(subscription);
    }
  },

  subscribeOnReserves(context): void {
    const { commit, dispatch, getters } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;

    commit.resetReserveSubscription();

    if (firstToken && secondToken) {
      const subscription = api.poolXyk
        .getReservesObservable(firstToken.address, secondToken.address)
        .subscribe((reserves) => {
          commit.setReserve(reserves);
          dispatch.updateValues();
        });

      commit.setReserveSubscription(subscription);
    }
  },

  subscribeOnTotalSupply(context): void {
    const { commit, getters } = addLiquidityActionContext(context);
    const { firstToken, secondToken } = getters;

    commit.resetTotalSupplySubscription();

    if (firstToken && secondToken) {
      const subscription = api.poolXyk
        .getTotalSupplyObservable(firstToken.address, secondToken.address)
        .subscribe((totalSupply) => {
          commit.setTotalSupply(totalSupply ?? ZeroStringValue);
        });

      commit.setTotalSupplySubscription(subscription);
    }
  },

  updateValues(context): void {
    const { state } = addLiquidityActionContext(context);

    if (state.focusedField === FocusedField.Second) {
      updateFirstTokenValue(context);
    } else {
      updateSecondTokenValue(context);
    }
  },
});

export default actions;
