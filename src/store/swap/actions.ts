import { defineActions } from 'direct-vuex';

import { swapActionContext } from '@/store/swap';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { ActionContext } from 'vuex';

enum Direction {
  From = 'from',
  To = 'to',
}

const balanceSubscriptions = new TokenBalanceSubscriptions();

function updateTokenSubscription(context: ActionContext<any, any>, dir: Direction): void {
  const { getters, commit, rootGetters } = swapActionContext(context);
  const { tokenFrom, tokenTo } = getters;
  const { setTokenFromBalance, setTokenToBalance } = commit;

  const token = dir === Direction.From ? tokenFrom : tokenTo;
  const setTokenBalance = dir === Direction.From ? setTokenFromBalance : setTokenToBalance;
  const updateBalance = (balance: Nullable<AccountBalance>) => setTokenBalance(balance);

  balanceSubscriptions.remove(dir);

  if (
    rootGetters.wallet.account.isLoggedIn &&
    token?.address &&
    !(token.address in rootGetters.wallet.account.accountAssetsAddressTable)
  ) {
    balanceSubscriptions.add(dir, { updateBalance, token });
  }
}

const actions = defineActions({
  async setTokenFromAddress(context, address?: string): Promise<void> {
    const { commit } = swapActionContext(context);
    if (!address) {
      commit.resetTokenFromAddress();
    } else {
      commit.setTokenFromAddress(address);
    }

    updateTokenSubscription(context, Direction.From);
  },

  async setTokenToAddress(context, address?: string): Promise<void> {
    const { commit } = swapActionContext(context);
    if (!address) {
      commit.resetTokenToAddress();
    } else {
      commit.setTokenToAddress(address);
    }

    updateTokenSubscription(context, Direction.To);
  },

  async switchTokens(context): Promise<void> {
    const { commit, state } = swapActionContext(context);
    const { tokenFromAddress: from, tokenToAddress: to, fromValue, toValue, isExchangeB } = state;
    if (from && to) {
      const [valueFrom, valueTo] = isExchangeB ? [toValue, ''] : ['', fromValue];

      commit.setTokenFromAddress(to);
      commit.setTokenToAddress(from);
      commit.setFromValue(valueFrom);
      commit.setToValue(valueTo);
      commit.setExchangeB(!isExchangeB);
      updateTokenSubscription(context, Direction.From);
      updateTokenSubscription(context, Direction.To);
    }
  },

  async updateSubscriptions(context): Promise<void> {
    updateTokenSubscription(context, Direction.From);
    updateTokenSubscription(context, Direction.To);
  },
  async resetSubscriptions(context): Promise<void> {
    balanceSubscriptions.remove(Direction.From);
    balanceSubscriptions.remove(Direction.To);
  },
  async reset(context): Promise<void> {
    const { commit, dispatch } = swapActionContext(context);
    dispatch.resetSubscriptions();
    commit.reset();
  },
});

export default actions;
