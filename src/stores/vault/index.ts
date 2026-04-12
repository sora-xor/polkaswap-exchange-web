import { FPNumber } from '@sora-substrate/math';
import { defineStore } from 'pinia';
import { XOR, DAI, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/shims/wallet-api';

import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { fetchClosedVaults } from '@/indexer/queries/vault/vaults';
import type { VaultState } from '@/stores/vault/types';
import { delay, areEqual } from '@/utils';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
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
    async fetchClosedVaults(): Promise<void> {
      const walletStore = useWalletStore();
      this.closedAccountVaultsLoaded = false;

      try {
        this.closedAccountVaults = [...(await fetchClosedVaults(walletStore.address))];
      } catch {
        this.closedAccountVaults = [];
      } finally {
        this.closedAccountVaultsLoaded = true;
      }
    },
    async subscribeOnAccountVaults(): Promise<void> {
      this.accountVaultIdsSubscription = unsubscribe(this.accountVaultIdsSubscription);
      this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);
      this.accountVaultsLoaded = false;

      await this.fetchClosedVaults();

      let firstExecution = true;

      try {
        this.accountVaultIdsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
          this.accountVaultsSubscription = unsubscribe(this.accountVaultsSubscription);

          try {
            this.accountVaultsSubscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
              const prevVaultsLength = this.accountVaults.length;
              this.accountVaults = [...vaults];
              this.accountVaultsLoaded = true;

              if (firstExecution) {
                firstExecution = false;
              } else if (prevVaultsLength !== vaults.length) {
                delay(INDEXER_DELAY_MS).then(() => this.fetchClosedVaults());
              }
            });
          } catch {
            this.accountVaultsLoaded = true;
            this.accountVaults = [];
          }
        });
      } catch {
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
    async requestCollaterals(): Promise<void> {
      try {
        const newCollaterals = await api.kensetsu.getCollaterals();

        if (areEqual(this.collaterals, newCollaterals)) {
          return;
        }

        this.collaterals = { ...newCollaterals };
        await this.subscribeOnAverageCollateralPrices();
      } catch {
        this.collaterals = {};
      }
    },
    async subscribeOnCollaterals(): Promise<void> {
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);
      this.collateralsSubscription = unsubscribe(this.collateralsSubscription);

      await this.subscribeOnStablecoinInfos();

      try {
        this.collateralsSubscription = api.system.getBlockNumberObservable().subscribe(() => {
          void this.requestCollaterals();
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
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);

      try {
        const stablecoinInfosObservable = await api.kensetsu.subscribeOnStablecoinInfos();
        let subscription!: Subscription;

        await new Promise<void>((resolve) => {
          subscription = stablecoinInfosObservable.subscribe((infos) => {
            this.stablecoinInfos = { ...infos };
            resolve();
          });
        });

        this.stablecoinInfosSubscription = subscription;
      } catch {
        // Ignore when the Kensetsu API is not ready yet.
      }
    },
    async reset(): Promise<void> {
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
      this.stablecoinInfosSubscription = unsubscribe(this.stablecoinInfosSubscription);
    },
  },
});

export type VaultStore = ReturnType<typeof useVaultStore>;
