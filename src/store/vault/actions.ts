import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { getAveragePrice } from '@sora-substrate/liquidity-proxy/build/quote/price';
import { XOR, DAI } from '@sora-substrate/util/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { vaultActionContext } from '@/store/vault';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

const COLLATERALS_INTERVAL = 2 * 60_000; // Do not decrease this interval due to a lot of data subscriptions updates
/** Debt calculation in real-time each 6 seconds */
const DEBT_INTERVAL = 6_000;
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
  async subscribeOnAverageCollateralPrices(context): Promise<void> {
    const { commit, state } = vaultActionContext(context);
    const { collaterals } = state;
    const collateralIds = Object.keys(collaterals);
    const subscriptions: Subscription[] = [];

    for (const collateralAddress of collateralIds) {
      if (collateralAddress !== DaiAddress) {
        const subs = api.swap.subscribeOnReserves(collateralAddress, DaiAddress)?.subscribe((payload) => {
          const averagePrice = getAveragePrice(collateralAddress, DaiAddress, PriceVariant.Sell, payload);
          commit.setAverageCollateralPrice({ address: collateralAddress, price: averagePrice });
        });
        if (subs) {
          subscriptions.push(subs);
        }
      }
    }

    commit.setAverageCollateralPriceSubscriptions(subscriptions);
  },
  async updateBalanceSubscriptions(context): Promise<void> {
    updateTokenSubscription(context, 'kusd');
    updateTokenSubscription(context, 'collateral');
  },
  async setCollateralTokenAddress(context, address?: string): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.setCollateralAddress(address ?? XOR.address);
    updateTokenSubscription(context, 'collateral');
  },
  async subscribeOnAccountVaults(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetAccountVaultIdsSubscription();
    try {
      const idsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
        commit.resetAccountVaultsSubscription();
        const subscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
          commit.setAccountVaults(vaults);
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
  async subscribeOnDebtCalculation(context): Promise<void> {
    const { commit, state } = vaultActionContext(context);
    commit.resetDebtCalculationInterval();

    const interval = setInterval(() => {
      const vaults = state.accountVaults;
      if (!vaults.length) {
        return;
      }

      const updatedVaults = [...vaults];
      vaults.forEach((vault, index) => {
        const collateral = state.collaterals[vault.lockedAssetId];
        if (!collateral) {
          return;
        }

        const newDebt = api.kensetsu.calcNewDebt(collateral, vault);
        if (!newDebt) {
          return;
        }
        updatedVaults[index] = { ...vault, debt: newDebt };
      });
      commit.setAccountVaults(updatedVaults);
    }, DEBT_INTERVAL);

    commit.setDebtCalculationInterval(interval);
  },
  async requestCollaterals(context): Promise<void> {
    const { commit, dispatch } = vaultActionContext(context);
    try {
      const collaterals = await api.kensetsu.getCollaterals();
      commit.setCollaterals(collaterals);
      await dispatch.subscribeOnAverageCollateralPrices();
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
    }, COLLATERALS_INTERVAL);

    commit.setCollateralsInterval(interval);
  },
  async subscribeOnBorrowTax(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetBorrowTaxSubscription();
    try {
      const subscription = api.kensetsu.subscribeOnBorrowTax().subscribe((tax) => {
        commit.setBorrowTax(tax / 100); // Convert to percentage coefficient
      });
      commit.setBorrowTaxSubscription(subscription);
    } catch (error) {
      console.error(error);
    }
  },
  async getLiquidationPenalty(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    try {
      const penalty = await api.kensetsu.getLiquidationPenalty();
      commit.setLiquidationPenalty(penalty);
    } catch (error) {
      console.error(error);
    }
  },
  async reset(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    balanceSubscriptions.remove('kusd');
    balanceSubscriptions.remove('collateral');
    commit.setKusdTokenBalance();
    commit.setCollateralTokenBalance();
    commit.setCollateralAddress(XOR.address);
    commit.resetCollateralsInterval();
    commit.resetDebtCalculationInterval();
    commit.resetBorrowTaxSubscription();
    commit.resetAccountVaultIdsSubscription();
    commit.resetAccountVaultsSubscription();
    commit.setAverageCollateralPriceSubscriptions();
    commit.resetCollaterals();
    commit.resetAccountVaults();
    commit.resetAverageCollateralPrices();
  },
});

export default actions;
