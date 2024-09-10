import { XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { fetchClosedVaults } from '@/indexer/queries/kensetsu';
import { vaultActionContext } from '@/store/vault';
import { delay } from '@/utils';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

/** Debt calculation in real-time each 6 seconds */
const DEBT_INTERVAL = 6_000;
const INDEXER_DELAY = 4 * DEBT_INTERVAL; // 4 blocks delay

const balanceSubscriptions = new TokenBalanceSubscriptions();

const areEqual = <T>(prev: T, curr: T): boolean => JSON.stringify(prev) === JSON.stringify(curr);

function updateTokenSubscription(context: ActionContext<any, any>, field: 'collateral' | 'debt'): void {
  const { getters, commit, rootGetters } = vaultActionContext(context);
  const { debtToken, collateralToken } = getters;
  const { setDebtTokenBalance, setCollateralTokenBalance } = commit;

  const isDebt = field === 'debt';
  const token = isDebt ? debtToken : collateralToken;
  const setTokenBalance = isDebt ? setDebtTokenBalance : setCollateralTokenBalance;
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
    const { collaterals, averageCollateralPriceSubscriptions, stablecoinInfos } = state;

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
    for (const newId of newIds) {
      const keys = api.kensetsu.deserializeKey(newId);
      if (!(keys?.lockedAssetId && keys.debtAssetId)) {
        console.warn(`[Kensetsu] getAveragePrice: invalid key ${newId}`);
        continue;
      }
      const { lockedAssetId, debtAssetId } = keys;
      const stablecoinInfo = stablecoinInfos[debtAssetId];
      const averagePriceObservable = api.kensetsu.subscribeOnAveragePrice(lockedAssetId, debtAssetId, stablecoinInfo);

      if (!averagePriceObservable) {
        // No stablecoinInfo or DAI/KUSD pair. It's excluded because it has a fixed price 1:1
        continue;
      }

      newSubscriptions[newId] = averagePriceObservable.subscribe((price) => {
        commit.setAverageCollateralPrice({ key: newId, price });
      });
    }
    commit.setAverageCollateralPriceSubscriptions(newSubscriptions);
  },
  async updateBalanceSubscriptions(context): Promise<void> {
    updateTokenSubscription(context, 'debt');
    updateTokenSubscription(context, 'collateral');
  },
  async setCollateralTokenAddress(context, address?: string): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.setCollateralAddress(address ?? XOR.address); // Default selected collateral is XOR
    updateTokenSubscription(context, 'collateral');
  },
  async setDebtTokenAddress(context, address?: string): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.setDebtAddress(address ?? KUSD.address); // Default selected debt is KUSD
    updateTokenSubscription(context, 'debt');
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
        const collateralId = api.kensetsu.serializeKey(vault.lockedAssetId, vault.debtAssetId);
        const collateral = state.collaterals[collateralId];
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
    const { state, commit, dispatch } = vaultActionContext(context);
    const { collaterals } = state;
    try {
      const newCollaterals = await api.kensetsu.getCollaterals();
      if (areEqual(collaterals, newCollaterals)) {
        return;
      }
      commit.setCollaterals(newCollaterals);
      await dispatch.subscribeOnAverageCollateralPrices();
    } catch (error) {
      console.error(error);
      commit.resetCollaterals();
    }
  },
  async subscribeOnCollaterals(context): Promise<void> {
    const { commit, dispatch } = vaultActionContext(context);
    commit.resetStablecoinInfosSubscription();
    commit.resetCollateralsSubscription();
    // Subscribe on stablecoin infos to get the pegAsset for each collateral.
    // It's necessary to calculate the average price of each collateral asset.
    // The average price is used to calculate the debt in the vaults.
    await dispatch.subscribeOnStablecoinInfos();

    const subscription = api.system.getBlockNumberObservable().subscribe(() => {
      dispatch.requestCollaterals();
    });

    commit.setCollateralsSubscription(subscription);
  },
  async subscribeOnBorrowTaxes(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetBorrowTaxesSubscription();
    try {
      const subscription = api.kensetsu.subscribeOnBorrowTaxes().subscribe((taxes) => {
        commit.setBorrowTaxes(taxes);
      });
      commit.setBorrowTaxesSubscription(subscription);
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
  async subscribeOnStablecoinInfos(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetStablecoinInfosSubscription();
    try {
      const stablecoinInfosObservable = await api.kensetsu.subscribeOnStablecoinInfos();
      let subscription!: Subscription;
      // Wait for the first value to set the initial state
      await new Promise<void>((resolve) => {
        subscription = stablecoinInfosObservable.subscribe((infos) => {
          commit.setStablecoinInfos(infos);
          resolve();
        });
      });
      commit.setStablecoinInfosSubscription(subscription);
    } catch (error) {
      console.error(error);
    }
  },
  async reset(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    balanceSubscriptions.remove('debt');
    balanceSubscriptions.remove('collateral');
    commit.setDebtTokenBalance();
    commit.setCollateralTokenBalance();
    commit.setCollateralAddress(XOR.address);
    commit.setDebtAddress(KUSD.address);
    commit.resetCollateralsSubscription();
    commit.resetDebtCalculationInterval();
    commit.resetBorrowTaxesSubscription();
    commit.resetAccountVaultIdsSubscription();
    commit.resetAccountVaultsSubscription();
    commit.unsubscribeAverageCollateralPriceSubscriptions();
    commit.resetCollaterals();
    commit.resetAccountVaults();
    commit.resetAverageCollateralPrices();
    commit.resetStablecoinInfosSubscription();
  },
});

export default actions;
