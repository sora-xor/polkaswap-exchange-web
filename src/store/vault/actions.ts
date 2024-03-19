import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { getAveragePrice } from '@sora-substrate/liquidity-proxy/build/quote/price';
import { XOR, DAI } from '@sora-substrate/util/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { vaultActionContext } from '@/store/vault';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { ActionContext } from 'vuex';

const INTERVAL = 60_000;
const DaiAddress = DAI.address;

const balanceSubscriptions = new TokenBalanceSubscriptions();

function updateTokenSubscription(context: ActionContext<any, any>, field: 'collateral' | 'kusd'): void {
  const { getters, commit, rootGetters } = vaultActionContext(context);
  const { kusdToken, collateralToken } = getters;
  const { setKusdTokenBalance, setCollateralTokenBalance } = commit;

  const isKusd = field === 'kusd';
  const token = isKusd ? kusdToken : collateralToken;
  const setTokenBalance = isKusd ? setKusdTokenBalance : setCollateralTokenBalance;
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

const actions = defineActions({
  async subscribeOnAverageCollateralPrice(context): Promise<void> {
    const { commit, state } = vaultActionContext(context);
    const { collateralAddress } = state;
    commit.setAverageCollateralPriceSubscription();
    const subs = api.swap.subscribeOnReserves(collateralAddress, DaiAddress)?.subscribe((payload) => {
      const averagePrice = getAveragePrice(collateralAddress, DaiAddress, PriceVariant.Sell, payload);
      commit.setAverageCollateralPrice(averagePrice);
    });
    commit.setAverageCollateralPriceSubscription(subs);
  },
  async updateBalanceSubscriptions(context): Promise<void> {
    const { dispatch } = vaultActionContext(context);
    updateTokenSubscription(context, 'kusd');
    updateTokenSubscription(context, 'collateral');
    await dispatch.subscribeOnAverageCollateralPrice();
  },
  async setCollateralTokenAddress(context, address?: string): Promise<void> {
    const { commit, dispatch } = vaultActionContext(context);
    commit.setCollateralAddress(address ?? XOR.address);
    updateTokenSubscription(context, 'collateral');
    await dispatch.subscribeOnAverageCollateralPrice();
  },
  async subscribeOnAccountVaults(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetAccountVaultIdsSubscription();
    try {
      const idsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
        commit.resetAccountVaultsSubscription();
        const subscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
          // TODO: remove map after 1.32.7 of substrate js library
          commit.setAccountVaults(vaults.map((vault, index) => ({ ...vault, id: ids[index] })));
        });
        commit.setAccountVaultsSubscription(subscription);
      });
      commit.setAccountVaultIdsSubscription(idsSubscription);
    } catch (error) {
      commit.resetAccountVaultIdsSubscription();
      commit.resetAccountVaultsSubscription();
      commit.resetAccountVaults();
    }
  },
  async requestCollaterals(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    try {
      const collaterals = await api.kensetsu.getCollaterals();
      commit.setCollaterals(collaterals);
    } catch (error) {
      console.error(error);
      commit.resetCollaterals();
    }
  },
  async subscribeOnCollaterals(context): Promise<void> {
    const { commit, dispatch } = vaultActionContext(context);
    commit.resetCollateralsInterval();
    await dispatch.requestCollaterals();

    const interval = setInterval(() => {
      dispatch.requestCollaterals();
    }, INTERVAL);

    commit.setCollateralsInterval(interval);
  },
  async reset(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    balanceSubscriptions.remove('kusd');
    balanceSubscriptions.remove('collateral');
    commit.setKusdTokenBalance();
    commit.setCollateralTokenBalance();
    commit.setCollateralAddress(XOR.address);
    commit.resetCollateralsInterval();
    commit.resetAccountVaultIdsSubscription();
    commit.resetAccountVaultsSubscription();
    commit.setAverageCollateralPriceSubscription();
    commit.resetCollaterals();
    commit.resetAccountVaults();
    commit.setAverageCollateralPrice();
  },
});

export default actions;
