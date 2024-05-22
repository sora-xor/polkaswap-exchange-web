import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { getAveragePrice } from '@sora-substrate/liquidity-proxy/build/pallets/priceTools';
import { XOR, DAI } from '@sora-substrate/util/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { fetchClosedVaults } from '@/indexer/queries/kensetsu';
import { vaultActionContext } from '@/store/vault';
import { delay } from '@/utils';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

/** Debt calculation in real-time each 6 seconds */
const DEBT_INTERVAL = 6_000;
const INDEXER_DELAY = 4 * DEBT_INTERVAL; // 4 blocks delay
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
    const { collaterals, averageCollateralPriceSubscriptions } = state;
    const newIds: string[] = [];
    const idsToRemove: string[] = [];
    // Check if there are new collateral assets or some of them were removed
    for (const collateralId in collaterals) {
      if (!(collateralId in averageCollateralPriceSubscriptions)) {
        newIds.push(collateralId);
      }
    }
    for (const priceSubId in averageCollateralPriceSubscriptions) {
      if (!(priceSubId in collaterals)) {
        idsToRemove.push(priceSubId);
      }
    }
    // Unsubscribe from removed collateral assets
    if (idsToRemove.length) {
      commit.removeAverageCollateralPriceSubscriptions(idsToRemove);
    }
    if (!newIds.length) {
      return;
    }
    // Subscribe on new collateral assets if they are not subscribed yet
    const newSubscriptions: Record<string, Subscription> = {};
    for (const collateralAddress of newIds) {
      if (collateralAddress !== DaiAddress) {
        const sub = api.swap.subscribeOnReserves(collateralAddress, DaiAddress)?.subscribe((payload) => {
          try {
            const averagePrice = getAveragePrice(collateralAddress, DaiAddress, PriceVariant.Sell, payload);
            commit.setAverageCollateralPrice({ address: collateralAddress, price: averagePrice });
          } catch (error) {
            commit.setAverageCollateralPrice({ address: collateralAddress, price: null });
            console.warn(`[Kensetsu] getAveragePrice with ${collateralAddress}`, error);
          }
        });
        if (sub) {
          newSubscriptions[collateralAddress] = sub;
        }
      }
    }
    commit.setAverageCollateralPriceSubscriptions(newSubscriptions);
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
  async fetchClosedVaults(context): Promise<void> {
    const { commit, rootState } = vaultActionContext(context);
    const account = rootState.wallet.account.address;
    try {
      const closedVaults = await fetchClosedVaults(account);
      commit.setClosedAccountVaults(closedVaults);
    } catch (error) {
      console.error(error);
      commit.resetClosedAccountVaults();
    }
  },
  async subscribeOnAccountVaults(context): Promise<void> {
    const { commit, dispatch, state } = vaultActionContext(context);
    commit.resetAccountVaultIdsSubscription();
    dispatch.fetchClosedVaults();
    let firstExecution = true;
    try {
      const idsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
        commit.resetAccountVaultsSubscription();
        const subscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
          const prevVaultsLength = state.accountVaults.length;
          commit.setAccountVaults(vaults);
          if (firstExecution) {
            firstExecution = false;
          } else if (prevVaultsLength !== vaults.length) {
            delay(INDEXER_DELAY).then(dispatch.fetchClosedVaults); // cuz it's not so fast
          }
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
    commit.resetCollateralsSubscription();

    const subscription = api.system.getBlockNumberObservable().subscribe(() => {
      dispatch.requestCollaterals();
    });

    commit.setCollateralsSubscription(subscription);
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
  async subscribeOnBadDebt(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetBadDebtSubscription();
    try {
      const subscription = api.kensetsu.subscribeOnBadDebt().subscribe((badDebt) => {
        commit.setBadDebt(badDebt);
      });
      commit.setBadDebtSubscription(subscription);
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
    commit.resetCollateralsSubscription();
    commit.resetDebtCalculationInterval();
    commit.resetBorrowTaxSubscription();
    commit.resetAccountVaultIdsSubscription();
    commit.resetAccountVaultsSubscription();
    commit.unsubscribeAverageCollateralPriceSubscriptions();
    commit.resetCollaterals();
    commit.resetAccountVaults();
    commit.resetAverageCollateralPrices();
    commit.resetBadDebtSubscription();
  },
});

export default actions;
