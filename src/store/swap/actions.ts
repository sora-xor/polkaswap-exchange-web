import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { ActionContext } from 'vuex';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { QuotePayload } from '@sora-substrate/liquidity-proxy/build/types';
import { DexId } from '@sora-substrate/util/build/dex/consts';

import { swapActionContext } from '@/store/swap';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

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
  const updateBalance = (balance: AccountBalance) => setTokenBalance(balance);

  balanceSubscriptions.remove(dir, { updateBalance });

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

  setSubscriptionPayload(context, { dexId, payload }: { dexId: number; payload: QuotePayload }): void {
    const { state, getters, commit } = swapActionContext(context);

    const inputAssetId = getters.tokenFrom?.address;
    const outputAssetId = getters.tokenTo?.address;

    if (!(inputAssetId && outputAssetId && payload)) {
      return;
    }

    // tbc & xst is enabled only on dex 0
    const enabledAssets = dexId === DexId.XOR ? state.enabledAssets : { tbc: [], xst: [] };

    const { paths, liquiditySources } = api.swap.getPathsAndPairLiquiditySources(
      inputAssetId,
      outputAssetId,
      payload,
      enabledAssets,
      dexId
    );

    commit.setSubscriptionPayload({ dexId, liquiditySources, paths, payload });
  },
  async updateSubscriptions(context): Promise<void> {
    updateTokenSubscription(context, Direction.From);
    updateTokenSubscription(context, Direction.To);
  },
  async resetSubscriptions(context): Promise<void> {
    const { commit } = swapActionContext(context);
    balanceSubscriptions.remove(Direction.From, {
      updateBalance: (balance: AccountBalance) => commit.setTokenFromBalance(balance),
    });
    balanceSubscriptions.remove(Direction.To, {
      updateBalance: (balance: AccountBalance) => commit.setTokenToBalance(balance),
    });
  },
  async reset(context): Promise<void> {
    const { commit, dispatch } = swapActionContext(context);
    dispatch.resetSubscriptions();
    commit.reset();
  },
});

export default actions;
