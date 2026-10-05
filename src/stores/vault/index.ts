import { FPNumber } from '@sora-substrate/math';
import { defineStore } from 'pinia';
import { XOR, DAI, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';

import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { fetchClosedVaults } from '@/indexer/queries/vault/vaults';
import type { VaultState } from '@/stores/vault/types';
import { delay, areEqual } from '@/utils';
import { subscribeAndWaitForFirst, TokenBalanceSubscriptions } from '@/utils/subscriptions';
import type { ClosedVault } from '@/modules/vault/types';

import type {
  AccountBalance,
  AccountAsset,
  Asset,
  RegisteredAccountAsset,
} from '@sora-substrate/sdk/build/assets/types';
import type { BorrowTaxes, Collateral, StablecoinInfo, Vault } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Subscription } from 'rxjs';

const DEBT_INTERVAL_MS = 6_000;
const INDEXER_DELAY_MS = 4 * DEBT_INTERVAL_MS;

const balanceSubscriptions = new TokenBalanceSubscriptions();
const stablecoinInfosSubscriptionGeneration = new WeakMap<object, number>();
const accountVaultsSubscriptionGenerations = new WeakMap<object, number>();
const closedVaultsRequestGenerations = new WeakMap<object, number>();
const collateralSubscriptionGenerations = new WeakMap<object, number>();

/** Invalidates account-bound vault work before a reset or replacement. */
const nextAccountGeneration = (generations: WeakMap<object, number>, store: object): number => {
  const generation = (generations.get(store) ?? 0) + 1;
  generations.set(store, generation);
  return generation;
};

/** Captures the selected wallet before fetching account-specific vault data. */
const captureVaultAccount = () => {
  const walletStore = useWalletStore();
  const address = walletStore.address;
  const source = walletStore.accountSource;
  return {
    address,
    isCurrent: (): boolean =>
      Boolean(
        address && walletStore.isLoggedIn && address === walletStore.address && source === walletStore.accountSource
      ),
  };
};

const invalidateStablecoinInfosSubscription = (store: object): number => {
  const generation = (stablecoinInfosSubscriptionGeneration.get(store) ?? 0) + 1;
  stablecoinInfosSubscriptionGeneration.set(store, generation);
  return generation;
};

const defaultAverageCollateralPrices: Record<string, Nullable<FPNumber>> = {
  [`${DAI.address},${KUSD.address}`]: FPNumber.ONE,
};

const buildInitialState = (): VaultState => ({
  collaterals: {},
  collateralsSubscription: null,
  accountVaultIdsSubscription: null,
  accountVaults: [],
  accountVaultsLoaded: false,
  closedAccountVaults: [],
  closedAccountVaultsLoaded: false,
  accountVaultsSubscription: null,
  collateralAddress: XOR.address,
  debtAddress: KUSD.address,
  collateralTokenBalance: null,
  debtTokenBalance: null,
  averageCollateralPrices: { ...defaultAverageCollateralPrices },
  averageCollateralPriceSubscriptions: {},
  liquidationPenalty: 0,
  borrowTax: 0,
  tbcdBorrowTax: 0,
  karmaBorrowTax: 0,
  borrowTaxesSubscription: null,
  debtCalculationInterval: null,
  stablecoinInfos: {},
  stablecoinInfosSubscription: null,
});

const unsubscribe = (subscription: Nullable<Subscription>): null => {
  subscription?.unsubscribe();
  return null;
};

const withTokenBalance = (
  token: Nullable<RegisteredAccountAsset>,
  balance: Nullable<AccountBalance>
): Nullable<RegisteredAccountAsset> => {
  if (!token) return null;
  return balance ? ({ ...token, balance } as RegisteredAccountAsset) : token;
};

/**
 * Native Pinia store for Kensetsu vault state.
 * Mirrors the previous Vuex module while keeping vault flows off the legacy app-store bridge.
 */
export const useVaultStore = defineStore('vault-legacy', {
  state: (): VaultState => buildInitialState(),
  getters: {
    debtToken(): Nullable<RegisteredAccountAsset> {
      const assetsStore = useAssetsStore();
      return withTokenBalance(assetsStore.assetDataByAddress(this.debtAddress), this.debtTokenBalance);
    },
    collateralToken(): Nullable<RegisteredAccountAsset> {
      const assetsStore = useAssetsStore();
      return withTokenBalance(assetsStore.assetDataByAddress(this.collateralAddress), this.collateralTokenBalance);
    },
    averageCollateralPrice(): Nullable<FPNumber> {
      const key = api.kensetsu.serializeKey(this.collateralAddress, this.debtAddress);
      return this.averageCollateralPrices[key] ?? null;
    },
    getBorrowTax(): (debtAsset: Asset | AccountAsset | string) => number {
      return (debtAsset: Asset | AccountAsset | string): number =>
        api.kensetsu.calcTax(debtAsset, this.borrowTax, this.tbcdBorrowTax, this.karmaBorrowTax);
    },
  },
  actions: {
    updateTokenSubscription(field: 'collateral' | 'debt'): void {
      const walletStore = useWalletStore();
      const isDebt = field === 'debt';
      const token = isDebt ? this.debtToken : this.collateralToken;
      const updateBalance = (balance: Nullable<AccountBalance>) => {
        if (isDebt) {
          this.debtTokenBalance = balance ?? null;
        } else {
          this.collateralTokenBalance = balance ?? null;
        }
      };

      balanceSubscriptions.remove(field);

      if (walletStore.isLoggedIn && token?.address && !(token.address in walletStore.accountAssetsAddressTable)) {
        balanceSubscriptions.add(field, { updateBalance, token });
      }
    },
    async subscribeOnAverageCollateralPrices(): Promise<void> {
      const newIds: string[] = [];
      const idsToRemove: string[] = [];

      for (const collateralId in this.collaterals) {
        if (!(collateralId in this.averageCollateralPriceSubscriptions)) {
          newIds.push(collateralId);
        }
      }

      for (const priceSubId in this.averageCollateralPriceSubscriptions) {
        if (!(priceSubId in this.collaterals)) {
          idsToRemove.push(priceSubId);
        }
      }

      if (idsToRemove.length) {
        idsToRemove.forEach((id) => {
          this.averageCollateralPriceSubscriptions[id]?.unsubscribe();
          delete this.averageCollateralPriceSubscriptions[id];
        });
        this.averageCollateralPriceSubscriptions = { ...this.averageCollateralPriceSubscriptions };
        this.averageCollateralPrices = { ...this.averageCollateralPrices };
      }

      if (!newIds.length) return;

      const newSubscriptions: Record<string, Subscription> = {};

      for (const newId of newIds) {
        const keys = api.kensetsu.deserializeKey(newId);

        if (!(keys?.lockedAssetId && keys.debtAssetId)) {
          console.warn(`[Kensetsu] getAveragePrice: invalid key ${newId}`);
          continue;
        }

        const { lockedAssetId, debtAssetId } = keys;
        const stablecoinInfo = this.stablecoinInfos[debtAssetId];
        const averagePriceObservable = api.kensetsu.subscribeOnAveragePrice(lockedAssetId, debtAssetId, stablecoinInfo);

        if (!averagePriceObservable) {
          continue;
        }

        newSubscriptions[newId] = averagePriceObservable.subscribe((price) => {
          this.averageCollateralPrices = { ...this.averageCollateralPrices, [newId]: price };
        });
      }

      if (Object.keys(newSubscriptions).length) {
        this.averageCollateralPriceSubscriptions = {
          ...this.averageCollateralPriceSubscriptions,
          ...newSubscriptions,
        };
      }
    },
    updateBalanceSubscriptions(): void {
      this.updateTokenSubscription('debt');
      this.updateTokenSubscription('collateral');
    },
    async setCollateralTokenAddress(address?: string): Promise<void> {
      this.collateralAddress = address ?? XOR.address;
      this.updateTokenSubscription('collateral');
    },
    async setDebtTokenAddress(address?: string): Promise<void> {
      this.debtAddress = address ?? KUSD.address;
      this.updateTokenSubscription('debt');
    },
    /** Applies closed-vault responses only to the account and request that initiated them. */
    async fetchClosedVaults(): Promise<void> {
      const account = captureVaultAccount();
      const generation = nextAccountGeneration(closedVaultsRequestGenerations, this);
      const isCurrent = (): boolean => account.isCurrent() && generation === closedVaultsRequestGenerations.get(this);
      this.closedAccountVaultsLoaded = false;
      if (!account.isCurrent()) {
        this.closedAccountVaults = [];
        return;
      }

      try {
        const vaults = await fetchClosedVaults(account.address);
        if (isCurrent()) this.closedAccountVaults = [...vaults];
      } catch {
        if (isCurrent()) this.closedAccountVaults = [];
      } finally {
        if (isCurrent()) this.closedAccountVaultsLoaded = true;
      }
    },
    /** Restarts account vault streams while rejecting callbacks from earlier account lifecycles. */
    async subscribeOnAccountVaults(): Promise<void> {
      const account = captureVaultAccount();
      const generation = nextAccountGeneration(accountVaultsSubscriptionGenerations, this);
      const isCurrent = (): boolean =>
        account.isCurrent() && generation === accountVaultsSubscriptionGenerations.get(this);
      this.accountVaultIdsSubscription = unsubscribe(this.accountVaultIdsSubscription);
      this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);
      this.accountVaultsLoaded = false;
      this.accountVaults = [];
      this.closedAccountVaults = [];

      await this.fetchClosedVaults();
      if (!isCurrent()) return;

      let firstExecution = true;
      let vaultsGeneration = 0;

      try {
        this.accountVaultIdsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
          if (!isCurrent()) return;
          const requestedVaultsGeneration = ++vaultsGeneration;
          this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);

          try {
            this.accountVaultsSubscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
              if (!isCurrent() || requestedVaultsGeneration !== vaultsGeneration) return;
              const prevVaultsLength = this.accountVaults.length;
              this.accountVaults = [...vaults];
              this.accountVaultsLoaded = true;

              if (firstExecution) {
                firstExecution = false;
              } else if (prevVaultsLength !== vaults.length) {
                void delay(INDEXER_DELAY_MS).then(() => {
                  if (isCurrent()) return this.fetchClosedVaults();
                });
              }
            });
          } catch {
            if (!isCurrent()) return;
            this.accountVaultsLoaded = true;
            this.accountVaults = [];
          }
        });
      } catch {
        if (!isCurrent()) return;
        this.accountVaultIdsSubscription = unsubscribe(this.accountVaultIdsSubscription);
        this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);
        this.accountVaultsLoaded = true;
        this.accountVaults = [];
      }
    },
    async subscribeOnDebtCalculation(): Promise<void> {
      if (this.debtCalculationInterval) {
        clearInterval(this.debtCalculationInterval);
        this.debtCalculationInterval = null;
      }

      this.debtCalculationInterval = setInterval(() => {
        if (!this.accountVaults.length) return;

        const updatedVaults = [...this.accountVaults];

        this.accountVaults.forEach((vault, index) => {
          const collateralId = api.kensetsu.serializeKey(vault.lockedAssetId, vault.debtAssetId);
          const collateral = this.collaterals[collateralId];

          if (!collateral) return;

          const newDebt = api.kensetsu.calcNewDebt(collateral, vault);

          if (!newDebt) return;

          updatedVaults[index] = { ...vault, debt: newDebt };
        });

        this.accountVaults = updatedVaults;
      }, DEBT_INTERVAL_MS);
    },
    /** Rejects collateral responses after the stream that requested them has been reset. */
    async requestCollaterals(): Promise<void> {
      const generation = collateralSubscriptionGenerations.get(this);
      const isCurrent = (): boolean => generation === collateralSubscriptionGenerations.get(this);
      try {
        const newCollaterals = await api.kensetsu.getCollaterals();
        if (!isCurrent()) return;

        if (areEqual(this.collaterals, newCollaterals)) {
          return;
        }

        this.collaterals = { ...newCollaterals };
        await this.subscribeOnAverageCollateralPrices();
      } catch {
        if (isCurrent()) this.collaterals = {};
      }
    },
    /** Starts network collateral updates only while this subscription lifecycle remains active. */
    async subscribeOnCollaterals(): Promise<void> {
      const generation = nextAccountGeneration(collateralSubscriptionGenerations, this);
      const isCurrent = (): boolean => generation === collateralSubscriptionGenerations.get(this);
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);
      this.collateralsSubscription = unsubscribe(this.collateralsSubscription);

      await this.subscribeOnStablecoinInfos();
      if (!isCurrent()) return;

      try {
        this.collateralsSubscription = api.system.getBlockNumberObservable().subscribe(() => {
          if (isCurrent()) void this.requestCollaterals();
        });
      } catch {
        // The chain API may be unavailable during boot (or in E2E stubs).
      }
    },
    async subscribeOnBorrowTaxes(): Promise<void> {
      this.borrowTaxesSubscription = unsubscribe(this.borrowTaxesSubscription);

      try {
        this.borrowTaxesSubscription = api.kensetsu.subscribeOnBorrowTaxes().subscribe((taxes: BorrowTaxes) => {
          this.borrowTax = taxes.borrowTax / 100;
          this.karmaBorrowTax = taxes.karmaBorrowTax / 100;
          this.tbcdBorrowTax = taxes.tbcdBorrowTax / 100;
        });
      } catch {
        // Ignore when the Kensetsu API is not ready yet.
      }
    },
    async getLiquidationPenalty(): Promise<void> {
      try {
        this.liquidationPenalty = await api.kensetsu.getLiquidationPenalty();
      } catch {
        // Ignore when the Kensetsu API is not ready yet.
      }
    },
    async subscribeOnStablecoinInfos(): Promise<void> {
      const generation = invalidateStablecoinInfosSubscription(this);
      const isCurrent = (): boolean => stablecoinInfosSubscriptionGeneration.get(this) === generation;
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);

      try {
        const stablecoinInfosObservable = await api.kensetsu.subscribeOnStablecoinInfos();

        if (!isCurrent()) return;

        const subscription = await subscribeAndWaitForFirst(stablecoinInfosObservable, (infos) => {
          if (isCurrent()) this.stablecoinInfos = { ...infos };
        });

        if (!isCurrent()) {
          subscription.unsubscribe();
          return;
        }

        this.stablecoinInfosSubscription = subscription;
      } catch {
        // Ignore when the Kensetsu API is not ready yet.
      }
    },
    /** Clears vault data and invalidates work that may complete after teardown. */
    async reset(): Promise<void> {
      nextAccountGeneration(accountVaultsSubscriptionGenerations, this);
      nextAccountGeneration(closedVaultsRequestGenerations, this);
      nextAccountGeneration(collateralSubscriptionGenerations, this);
      balanceSubscriptions.remove('debt');
      balanceSubscriptions.remove('collateral');
      this.debtTokenBalance = null;
      this.collateralTokenBalance = null;
      this.collateralAddress = XOR.address;
      this.debtAddress = KUSD.address;
      this.collateralsSubscription = unsubscribe(this.collateralsSubscription);

      if (this.debtCalculationInterval) {
        clearInterval(this.debtCalculationInterval);
        this.debtCalculationInterval = null;
      }

      this.borrowTaxesSubscription = unsubscribe(this.borrowTaxesSubscription);
      this.accountVaultIdsSubscription = unsubscribe(this.accountVaultIdsSubscription);
      this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);
      Object.values(this.averageCollateralPriceSubscriptions).forEach((subscription) => subscription?.unsubscribe());
      this.averageCollateralPriceSubscriptions = {};
      this.collaterals = {};
      this.accountVaults = [];
      this.accountVaultsLoaded = false;
      this.closedAccountVaults = [];
      this.closedAccountVaultsLoaded = false;
      this.averageCollateralPrices = { ...defaultAverageCollateralPrices };
      invalidateStablecoinInfosSubscription(this);
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);
    },
  },
});

export type VaultStore = ReturnType<typeof useVaultStore>;
