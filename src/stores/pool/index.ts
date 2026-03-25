import { FPNumber as MathFPNumber } from '@sora-substrate/math';
import { FPNumber as SDKFPNumber } from '@sora-substrate/sdk';
import { defineStore } from 'pinia';
import { firstValueFrom } from 'rxjs';

import { ZeroStringValue } from '@/consts';
import { api } from '@/shims/wallet-api';
import { getPoolsApyObject, createPoolsApySubscription } from '@/indexer/queries/pool/apy';
import { useAssetsStore } from '@/stores/assets';
import { useDemeterFarmingStore } from '@/stores/demeterFarming';
import type {
  AddLiquidityState,
  AddLiquidityFocusedField,
  LiquidityParams,
  PoolState,
  RemoveLiquidityFocusedField,
  RemoveLiquidityState,
} from '@/stores/pool/types';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';
import { waitForAccountPair } from '@/utils';

import type { PoolApyObject } from '@/shims/wallet-indexer-types';
import type { AccountBalance, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLockedPool } from '@sora-substrate/sdk/build/ceresLiquidityLocker/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { Subscription } from 'rxjs';

type PoolStoreState = PoolState & {
  addLiquidity: AddLiquidityState;
  removeLiquidity: RemoveLiquidityState;
};

const EMPTY_ACCOUNT_LIQUIDITY = Object.freeze([]) as readonly AccountLiquidity[];
const EMPTY_ACCOUNT_LOCKED_LIQUIDITY = Object.freeze([]) as readonly AccountLockedPool[];
const EMPTY_POOL_APY_OBJECT = Object.freeze({}) as PoolApyObject;

const balanceSubscriptions = new TokenBalanceSubscriptions();

const buildAddLiquidityState = (): AddLiquidityState => ({
  firstTokenAddress: '',
  secondTokenAddress: '',
  firstTokenValue: '',
  secondTokenValue: '',
  firstTokenBalance: null,
  secondTokenBalance: null,
  reserve: null,
  reserveSubscription: null,
  minted: ZeroStringValue,
  totalSupply: ZeroStringValue,
  totalSupplySubscription: null,
  focusedField: null,
  isAvailable: false,
  availabilitySubscription: null,
});

const buildRemoveLiquidityState = (): RemoveLiquidityState => ({
  firstTokenAddress: '',
  secondTokenAddress: '',
  removePart: '',
  liquidityAmount: '',
  firstTokenAmount: '',
  secondTokenAmount: '',
  focusedField: null,
});

const buildInitialState = (): PoolStoreState => ({
  accountLiquidity: EMPTY_ACCOUNT_LIQUIDITY,
  accountLiquidityList: null,
  accountLiquidityUpdates: null,
  poolApyObject: EMPTY_POOL_APY_OBJECT,
  poolApySubscription: null,
  accountLockedLiquidity: EMPTY_ACCOUNT_LOCKED_LIQUIDITY,
  accountLockedLiquiditySubscription: null,
  addLiquidity: buildAddLiquidityState(),
  removeLiquidity: buildRemoveLiquidityState(),
});

const resetSubscription = <T extends { unsubscribe?: () => void }>(subscription: Nullable<T>): null => {
  subscription?.unsubscribe?.();
  return null;
};

const resetCallbackSubscription = (subscription: Nullable<VoidFunction>): null => {
  subscription?.();
  return null;
};

const freezeArray = <T>(items: readonly T[] = []): readonly T[] => Object.freeze([...items]);

const withTokenBalance = (
  token: Nullable<RegisteredAccountAsset>,
  balance: Nullable<AccountBalance>
): Nullable<RegisteredAccountAsset> => {
  if (!token) return null;
  return balance ? ({ ...token, balance } as RegisteredAccountAsset) : token;
};

const findLiquidity = (
  accountLiquidity: readonly AccountLiquidity[],
  firstTokenAddress: string,
  secondTokenAddress: string
): Nullable<AccountLiquidity> => {
  if (!(firstTokenAddress && secondTokenAddress)) return null;

  return (
    accountLiquidity.find(
      (liquidity) => liquidity.firstAddress === firstTokenAddress && liquidity.secondAddress === secondTokenAddress
    ) ?? null
  );
};

const normalizePoolApy = (value: Nullable<PoolApyObject>): PoolApyObject =>
  value ? Object.freeze({ ...value }) : EMPTY_POOL_APY_OBJECT;

const toSdkFPNumber = (value: MathFPNumber | SDKFPNumber): SDKFPNumber => new SDKFPNumber(value.toString());

/**
 * Native Pinia store for pool, add-liquidity, and remove-liquidity state.
 * Replaces the legacy pool facade and keeps the feature slice off the app-store bridge.
 */
export const usePoolStore = defineStore('pool-legacy', {
  state: (): PoolStoreState => buildInitialState(),
  getters: {
    getLockedAmount(state): (baseAsset: string, poolAsset: string) => MathFPNumber {
      return (baseAsset: string, poolAsset: string) => {
        return state.accountLockedLiquidity.reduce((value, accountLockedPool) => {
          if (accountLockedPool.assetA === baseAsset && accountLockedPool.assetB === poolAsset) {
            return value.add(accountLockedPool.poolTokens);
          }
          return value;
        }, MathFPNumber.ZERO);
      };
    },
    addLiquidityFirstTokenValue(state): string {
      return state.addLiquidity.firstTokenValue;
    },
    addLiquiditySecondTokenValue(state): string {
      return state.addLiquidity.secondTokenValue;
    },
    addLiquidityFirstToken(state): Nullable<RegisteredAccountAsset> {
      const assetsStore = useAssetsStore();
      return withTokenBalance(
        assetsStore.assetDataByAddress(state.addLiquidity.firstTokenAddress),
        state.addLiquidity.firstTokenBalance
      );
    },
    addLiquiditySecondToken(state): Nullable<RegisteredAccountAsset> {
      const assetsStore = useAssetsStore();
      return withTokenBalance(
        assetsStore.assetDataByAddress(state.addLiquidity.secondTokenAddress),
        state.addLiquidity.secondTokenBalance
      );
    },
    addLiquidityReserveA(state): CodecString {
      return state.addLiquidity.reserve?.[0] ?? ZeroStringValue;
    },
    addLiquidityReserveB(state): CodecString {
      return state.addLiquidity.reserve?.[1] ?? ZeroStringValue;
    },
    addLiquidityTotalSupply(state): CodecString {
      return state.addLiquidity.totalSupply || ZeroStringValue;
    },
    addLiquidityLiquidityInfo(): Nullable<AccountLiquidity> {
      return findLiquidity(
        this.accountLiquidity,
        this.addLiquidity.firstTokenAddress,
        this.addLiquidity.secondTokenAddress
      );
    },
    addLiquidityIsAvailable(state): boolean {
      return state.addLiquidity.isAvailable && !!state.addLiquidity.reserve?.length;
    },
    addLiquidityIsNotFirstLiquidityProvider(): boolean {
      return (
        !!this.addLiquidity.reserve?.length && +this.addLiquidityReserveA !== 0 && +this.addLiquidityReserveB !== 0
      );
    },
    addLiquidityMinted(): CodecString {
      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return ZeroStringValue;

      const [minted] = api.poolXyk.estimatePoolTokensMinted(
        firstToken,
        secondToken,
        this.addLiquidity.firstTokenValue,
        this.addLiquidity.secondTokenValue,
        this.addLiquidityReserveA,
        this.addLiquidityReserveB,
        this.addLiquidityTotalSupply
      );

      return minted;
    },
    addLiquidityShareOfPool(): string {
      const full = SDKFPNumber.HUNDRED;
      const minted = SDKFPNumber.fromCodecValue(this.addLiquidityMinted);
      const total = SDKFPNumber.fromCodecValue(this.addLiquidityTotalSupply);
      const existed = SDKFPNumber.fromCodecValue(this.addLiquidityLiquidityInfo?.balance ?? 0);

      if (total.isZero() && minted.isZero()) return full.toLocaleString();

      return minted.add(existed).div(total.add(minted)).mul(full).toLocaleString() || ZeroStringValue;
    },
    addLiquidityPrice(): string {
      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return ZeroStringValue;

      return api.divideAssets(
        firstToken,
        secondToken,
        this.addLiquidity.firstTokenValue,
        this.addLiquidity.secondTokenValue,
        false
      );
    },
    addLiquidityPriceReversed(): string {
      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return ZeroStringValue;

      return api.divideAssets(
        firstToken,
        secondToken,
        this.addLiquidity.firstTokenValue,
        this.addLiquidity.secondTokenValue,
        true
      );
    },
    removeLiquidityRemovePart(state): string {
      return state.removeLiquidity.removePart;
    },
    removeLiquidityLiquidityAmount(state): string {
      return state.removeLiquidity.liquidityAmount;
    },
    removeLiquidityFirstTokenAmount(state): string {
      return state.removeLiquidity.firstTokenAmount;
    },
    removeLiquiditySecondTokenAmount(state): string {
      return state.removeLiquidity.secondTokenAmount;
    },
    removeLiquidityFocusedField(state): Nullable<RemoveLiquidityFocusedField> {
      return state.removeLiquidity.focusedField;
    },
    removeLiquidityLiquidity(): Nullable<AccountLiquidity> {
      return findLiquidity(
        this.accountLiquidity,
        this.removeLiquidity.firstTokenAddress,
        this.removeLiquidity.secondTokenAddress
      );
    },
    removeLiquidityTotalSupply(): string {
      return this.removeLiquidityLiquidity?.totalSupply ?? ZeroStringValue;
    },
    removeLiquidityReserveA(): string {
      return this.removeLiquidityLiquidity?.reserveA ?? ZeroStringValue;
    },
    removeLiquidityReserveB(): string {
      return this.removeLiquidityLiquidity?.reserveB ?? ZeroStringValue;
    },
    removeLiquidityLiquidityBalanceFull(): SDKFPNumber {
      if (!this.removeLiquidityLiquidity?.balance) return SDKFPNumber.ZERO;
      return SDKFPNumber.fromCodecValue(this.removeLiquidityLiquidity.balance);
    },
    removeLiquidityDemeterLockedBalance(): SDKFPNumber {
      const liquidity = this.removeLiquidityLiquidity;

      if (!liquidity) return SDKFPNumber.ZERO;

      const demeterFarmingStore = useDemeterFarmingStore();
      const lockedBalance = demeterFarmingStore.getLockedAmount(liquidity.firstAddress, liquidity.secondAddress, true);

      return SDKFPNumber.min(this.removeLiquidityLiquidityBalanceFull, toSdkFPNumber(lockedBalance)) as SDKFPNumber;
    },
    removeLiquidityCeresLockedBalance(): SDKFPNumber {
      const liquidity = this.removeLiquidityLiquidity;

      if (!liquidity) return SDKFPNumber.ZERO;

      const lockedBalance = this.getLockedAmount(liquidity.firstAddress, liquidity.secondAddress);

      return SDKFPNumber.min(this.removeLiquidityLiquidityBalanceFull, toSdkFPNumber(lockedBalance)) as SDKFPNumber;
    },
    removeLiquidityLiquidityBalance(): SDKFPNumber {
      const maxLocked = SDKFPNumber.max(
        this.removeLiquidityDemeterLockedBalance,
        this.removeLiquidityCeresLockedBalance
      );
      return this.removeLiquidityLiquidityBalanceFull.sub(maxLocked);
    },
    removeLiquidityFirstToken(): Nullable<RegisteredAccountAsset> {
      const firstAddress = this.removeLiquidityLiquidity?.firstAddress;

      if (!firstAddress) return null;

      const assetsStore = useAssetsStore();
      return assetsStore.assetDataByAddress(firstAddress) ?? null;
    },
    removeLiquiditySecondToken(): Nullable<RegisteredAccountAsset> {
      const secondAddress = this.removeLiquidityLiquidity?.secondAddress;

      if (!secondAddress) return null;

      const assetsStore = useAssetsStore();
      return assetsStore.assetDataByAddress(secondAddress) ?? null;
    },
    removeLiquidityFirstTokenBalance(): SDKFPNumber {
      if (!this.removeLiquidityLiquidity?.firstBalance) return SDKFPNumber.ZERO;

      const tokenBalance = SDKFPNumber.fromCodecValue(
        this.removeLiquidityLiquidity.firstBalance,
        this.removeLiquidityFirstToken?.decimals
      );

      return tokenBalance.mul(this.removeLiquidityLiquidityBalance).div(this.removeLiquidityLiquidityBalanceFull);
    },
    removeLiquiditySecondTokenBalance(): SDKFPNumber {
      if (!this.removeLiquidityLiquidity?.secondBalance) return SDKFPNumber.ZERO;

      const tokenBalance = SDKFPNumber.fromCodecValue(
        this.removeLiquidityLiquidity.secondBalance,
        this.removeLiquiditySecondToken?.decimals
      );

      return tokenBalance.mul(this.removeLiquidityLiquidityBalance).div(this.removeLiquidityLiquidityBalanceFull);
    },
    removeLiquidityShareOfPool(): string {
      const balance = this.removeLiquidityLiquidityBalanceFull;
      const removed = new SDKFPNumber(this.removeLiquidity.liquidityAmount ?? 0);
      const totalSupply = SDKFPNumber.fromCodecValue(this.removeLiquidityTotalSupply);
      const totalSupplyAfter = totalSupply.sub(removed);

      if (balance.isZero() || totalSupply.isZero() || totalSupplyAfter.isZero()) return ZeroStringValue;

      return balance.sub(removed).div(totalSupplyAfter).mul(SDKFPNumber.HUNDRED).toLocaleString() || ZeroStringValue;
    },
    removeLiquidityPrice(): string {
      const liquidity = this.removeLiquidityLiquidity;
      const firstToken = this.removeLiquidityFirstToken;
      const secondToken = this.removeLiquiditySecondToken;

      if (!(liquidity && firstToken && secondToken)) return ZeroStringValue;

      return api.divideAssets(firstToken, secondToken, liquidity.firstBalance, liquidity.secondBalance, false);
    },
    removeLiquidityPriceReversed(): string {
      const liquidity = this.removeLiquidityLiquidity;
      const firstToken = this.removeLiquidityFirstToken;
      const secondToken = this.removeLiquiditySecondToken;

      if (!(liquidity && firstToken && secondToken)) return ZeroStringValue;

      return api.divideAssets(firstToken, secondToken, liquidity.firstBalance, liquidity.secondBalance, true);
    },
  },
  actions: {
    resetAccountLiquidity(): void {
      this.accountLiquidity = EMPTY_ACCOUNT_LIQUIDITY;
    },
    resetPoolApyObject(): void {
      this.poolApyObject = EMPTY_POOL_APY_OBJECT;
    },
    updatePoolApyObject(value: PoolApyObject): void {
      this.poolApyObject = normalizePoolApy({ ...this.poolApyObject, ...value });
    },
    updateAddLiquidityTokenSubscription(field: AddLiquidityFocusedField): void {
      const walletStore = useWalletStore();
      const isFirst = field === 'firstTokenValue';
      const token = isFirst ? this.addLiquidityFirstToken : this.addLiquiditySecondToken;

      balanceSubscriptions.remove(field);

      if (walletStore.isLoggedIn && token?.address && !(token.address in walletStore.accountAssetsAddressTable)) {
        balanceSubscriptions.add(field, {
          token,
          updateBalance: (balance) => {
            if (isFirst) {
              this.addLiquidity.firstTokenBalance = balance ?? null;
            } else {
              this.addLiquidity.secondTokenBalance = balance ?? null;
            }
          },
        });
      }
    },
    updateAddLiquidityFirstTokenValue(): void {
      const value = this.addLiquidity.secondTokenValue;

      if (!this.addLiquidityIsNotFirstLiquidityProvider) return;

      if (!value) {
        this.addLiquidity.firstTokenValue = '';
        return;
      }

      this.addLiquidity.firstTokenValue = new SDKFPNumber(value)
        .mul(SDKFPNumber.fromCodecValue(this.addLiquidityReserveA))
        .div(SDKFPNumber.fromCodecValue(this.addLiquidityReserveB))
        .toString();
    },
    updateAddLiquiditySecondTokenValue(): void {
      const value = this.addLiquidity.firstTokenValue;

      if (!this.addLiquidityIsNotFirstLiquidityProvider) return;

      if (!value) {
        this.addLiquidity.secondTokenValue = '';
        return;
      }

      this.addLiquidity.secondTokenValue = new SDKFPNumber(value)
        .mul(SDKFPNumber.fromCodecValue(this.addLiquidityReserveB))
        .div(SDKFPNumber.fromCodecValue(this.addLiquidityReserveA))
        .toString();
    },
    updateAddLiquidityValues(): void {
      if (this.addLiquidity.focusedField === 'secondTokenValue') {
        this.updateAddLiquidityFirstTokenValue();
      } else {
        this.updateAddLiquiditySecondTokenValue();
      }
    },
    async subscribeOnAccountLiquidityList(): Promise<void> {
      this.accountLiquidityList = resetSubscription(this.accountLiquidityList);

      const walletStore = useWalletStore();
      if (!walletStore.isLoggedIn) return;

      await waitForAccountPair(async () => {
        this.accountLiquidityList = api.poolXyk.getUserPoolsSubscription();

        if (api.poolXyk.accountLiquidityLoaded) {
          await firstValueFrom(api.poolXyk.accountLiquidityLoaded);
        }

        this.accountLiquidity = freezeArray(api.poolXyk.accountLiquidity ?? []) as readonly AccountLiquidity[];
      });
    },
    async subscribeOnAccountLiquidityUpdates(): Promise<void> {
      this.accountLiquidityUpdates = resetSubscription(this.accountLiquidityUpdates);

      const walletStore = useWalletStore();
      if (!walletStore.isLoggedIn) return;

      await waitForAccountPair(() => {
        this.accountLiquidityUpdates = api.poolXyk.updated.subscribe(() => {
          this.accountLiquidity = freezeArray(api.poolXyk.accountLiquidity ?? []) as readonly AccountLiquidity[];
        });

        this.accountLiquidity = freezeArray(api.poolXyk.accountLiquidity ?? []) as readonly AccountLiquidity[];
      });
    },
    async subscribeOnAccountLockedLiquidity(): Promise<void> {
      this.accountLockedLiquiditySubscription = resetSubscription(this.accountLockedLiquiditySubscription);

      const walletStore = useWalletStore();
      if (!walletStore.isLoggedIn) return;

      await waitForAccountPair(() => {
        this.accountLockedLiquiditySubscription = api.ceresLiquidityLocker
          .getLockerDataObservable()
          .subscribe((data) => {
            this.accountLockedLiquidity = freezeArray(data) as readonly AccountLockedPool[];
          });
      });
    },
    async getPoolApyObject(): Promise<void> {
      const data = await getPoolsApyObject();

      if (data) {
        this.poolApyObject = normalizePoolApy(data);
      }
    },
    async subscribeOnPoolsApy(): Promise<void> {
      this.poolApySubscription = resetCallbackSubscription(this.poolApySubscription);

      await this.getPoolApyObject();

      const subscription = createPoolsApySubscription(
        (entity) => {
          this.updatePoolApyObject(entity);
        },
        () => {
          this.resetPoolApyObject();
        }
      );

      if (subscription) {
        this.poolApySubscription = subscription;
      }
    },
    async unsubscribeAccountLiquidityListAndUpdates(): Promise<void> {
      this.accountLiquidityList = resetSubscription(this.accountLiquidityList);
      this.accountLiquidityUpdates = resetSubscription(this.accountLiquidityUpdates);
      this.accountLockedLiquiditySubscription = resetSubscription(this.accountLockedLiquiditySubscription);
      this.poolApySubscription = resetCallbackSubscription(this.poolApySubscription);
      this.resetAccountLiquidity();
      this.resetPoolApyObject();
      this.accountLockedLiquidity = EMPTY_ACCOUNT_LOCKED_LIQUIDITY;
      api.poolXyk.unsubscribeFromAllUpdates();
    },
    setAddLiquidityFocusedField(value: AddLiquidityFocusedField): void {
      this.addLiquidity.focusedField = value;
    },
    async setAddLiquidityFirstTokenAddress(address: string): Promise<void> {
      this.addLiquidity.firstTokenAddress = address;
      this.addLiquidity.firstTokenValue = '';
      this.addLiquidity.secondTokenValue = '';

      this.updateAddLiquidityTokenSubscription('firstTokenValue');
      this.subscribeOnAvailability();
      this.subscribeOnReserves();
      this.subscribeOnTotalSupply();
    },
    async setAddLiquiditySecondTokenAddress(address: string): Promise<void> {
      this.addLiquidity.secondTokenAddress = address;
      this.addLiquidity.firstTokenValue = '';
      this.addLiquidity.secondTokenValue = '';

      this.updateAddLiquidityTokenSubscription('secondTokenValue');
      this.subscribeOnAvailability();
      this.subscribeOnReserves();
      this.subscribeOnTotalSupply();
    },
    async setAddLiquidityFirstTokenValue(value: string): Promise<void> {
      this.addLiquidity.focusedField = 'firstTokenValue';
      this.addLiquidity.firstTokenValue = value;
      this.updateAddLiquidityValues();
    },
    async setAddLiquiditySecondTokenValue(value: string): Promise<void> {
      this.addLiquidity.focusedField = 'secondTokenValue';
      this.addLiquidity.secondTokenValue = value;
      this.updateAddLiquidityValues();
    },
    async submitAddLiquidity(): Promise<void> {
      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return;

      const settingsStore = useSettingsStore();

      if (this.addLiquidityIsAvailable) {
        await api.poolXyk.add(
          firstToken,
          secondToken,
          this.addLiquidity.firstTokenValue,
          this.addLiquidity.secondTokenValue,
          settingsStore.slippageTolerance
        );
      } else {
        await api.poolXyk.create(
          firstToken,
          secondToken,
          this.addLiquidity.firstTokenValue,
          this.addLiquidity.secondTokenValue,
          settingsStore.slippageTolerance
        );
      }
    },
    async setAddLiquidityDataFromLiquidity({ firstAddress, secondAddress }: LiquidityParams): Promise<void> {
      const findAssetAddress = async (address?: string): Promise<string> => {
        if (!address) return '';

        try {
          const asset = await api.assets.getAssetInfo(address);
          return asset?.address ?? '';
        } catch {
          return '';
        }
      };

      const [first, second] = await Promise.all([findAssetAddress(firstAddress), findAssetAddress(secondAddress)]);

      await this.setAddLiquidityFirstTokenAddress(first);
      await this.setAddLiquiditySecondTokenAddress(second);
    },
    async updateAddLiquiditySubscriptions(): Promise<void> {
      this.updateAddLiquidityTokenSubscription('firstTokenValue');
      this.updateAddLiquidityTokenSubscription('secondTokenValue');
      this.subscribeOnAvailability();
      this.subscribeOnReserves();
      this.subscribeOnTotalSupply();
    },
    async resetAddLiquiditySubscriptions(): Promise<void> {
      balanceSubscriptions.remove('firstTokenValue');
      balanceSubscriptions.remove('secondTokenValue');
      this.addLiquidity.availabilitySubscription = resetSubscription(this.addLiquidity.availabilitySubscription);
      this.addLiquidity.reserveSubscription = resetSubscription(this.addLiquidity.reserveSubscription);
      this.addLiquidity.totalSupplySubscription = resetSubscription(this.addLiquidity.totalSupplySubscription);
    },
    async resetAddLiquidityData(): Promise<void> {
      await this.resetAddLiquiditySubscriptions();
      this.addLiquidity = buildAddLiquidityState();
    },
    subscribeOnAvailability(): void {
      this.addLiquidity.availabilitySubscription = resetSubscription(this.addLiquidity.availabilitySubscription);

      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return;

      this.addLiquidity.availabilitySubscription = api.poolXyk
        .getPoolPropertiesObservable(firstToken.address, secondToken.address)
        .subscribe((result) => {
          this.addLiquidity.isAvailable = !!result;
        });
    },
    subscribeOnReserves(): void {
      this.addLiquidity.reserveSubscription = resetSubscription(this.addLiquidity.reserveSubscription);

      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return;

      this.addLiquidity.reserveSubscription = api.poolXyk
        .getReservesObservable(firstToken.address, secondToken.address)
        .subscribe((reserves) => {
          this.addLiquidity.reserve = reserves;
          this.updateAddLiquidityValues();
        });
    },
    subscribeOnTotalSupply(): void {
      this.addLiquidity.totalSupplySubscription = resetSubscription(this.addLiquidity.totalSupplySubscription);

      const firstToken = this.addLiquidityFirstToken;
      const secondToken = this.addLiquiditySecondToken;

      if (!(firstToken && secondToken)) return;

      this.addLiquidity.totalSupplySubscription = api.poolXyk
        .getTotalSupplyObservable(firstToken.address, secondToken.address)
        .subscribe((totalSupply) => {
          this.addLiquidity.totalSupply = totalSupply ?? ZeroStringValue;
        });
    },
    setRemoveLiquidityAddresses(value: LiquidityParams): void {
      this.removeLiquidity.firstTokenAddress = value.firstAddress;
      this.removeLiquidity.secondTokenAddress = value.secondAddress;
    },
    setRemoveLiquidityFocusedField(value: RemoveLiquidityFocusedField): void {
      this.removeLiquidity.focusedField = value;
    },
    resetRemoveLiquidityFocusedField(): void {
      this.removeLiquidity.focusedField = null;
    },
    updateRemoveLiquidityFromSecondToken(): void {
      const value = this.removeLiquidity.firstTokenAmount;

      if (value && Number.isFinite(+value)) {
        const part = new SDKFPNumber(value).div(this.removeLiquidityFirstTokenBalance);
        this.removeLiquidity.removePart = Math.round(part.mul(SDKFPNumber.HUNDRED).toNumber()).toString();
        this.removeLiquidity.liquidityAmount = part.mul(this.removeLiquidityLiquidityBalance).toString();
        this.removeLiquidity.secondTokenAmount = part.mul(this.removeLiquiditySecondTokenBalance).toString();
      } else {
        this.removeLiquidity.removePart = '';
        this.removeLiquidity.liquidityAmount = '';
        this.removeLiquidity.secondTokenAmount = '';
      }
    },
    updateRemoveLiquidityFromFirstToken(): void {
      const value = this.removeLiquidity.secondTokenAmount;

      if (value && Number.isFinite(+value)) {
        const part = new SDKFPNumber(value).div(this.removeLiquiditySecondTokenBalance);
        this.removeLiquidity.removePart = Math.round(part.mul(SDKFPNumber.HUNDRED).toNumber()).toString();
        this.removeLiquidity.liquidityAmount = part.mul(this.removeLiquidityLiquidityBalance).toString();
        this.removeLiquidity.firstTokenAmount = part.mul(this.removeLiquidityFirstTokenBalance).toString();
      } else {
        this.removeLiquidity.removePart = '';
        this.removeLiquidity.liquidityAmount = '';
        this.removeLiquidity.firstTokenAmount = '';
      }
    },
    updateRemoveLiquidityPart(): void {
      const part = new SDKFPNumber(this.removeLiquidity.removePart || '0').div(SDKFPNumber.HUNDRED);

      if (!part.isZero()) {
        this.removeLiquidity.liquidityAmount = part.mul(this.removeLiquidityLiquidityBalance).toString();
        this.removeLiquidity.firstTokenAmount = part.mul(this.removeLiquidityFirstTokenBalance).toString();
        this.removeLiquidity.secondTokenAmount = part.mul(this.removeLiquiditySecondTokenBalance).toString();
      } else {
        this.removeLiquidity.liquidityAmount = '';
        this.removeLiquidity.firstTokenAmount = '';
        this.removeLiquidity.secondTokenAmount = '';
      }
    },
    async setRemoveLiquidityPart(value: string): Promise<void> {
      this.removeLiquidity.focusedField = 'removePart';
      this.removeLiquidity.removePart = value;
      this.updateRemoveLiquidityPart();
    },
    async setRemoveLiquidityFirstTokenAmount(value: string): Promise<void> {
      this.removeLiquidity.focusedField = 'firstTokenAmount';
      this.removeLiquidity.firstTokenAmount = value;
      this.updateRemoveLiquidityFromSecondToken();
    },
    async setRemoveLiquiditySecondTokenAmount(value: string): Promise<void> {
      this.removeLiquidity.focusedField = 'secondTokenAmount';
      this.removeLiquidity.secondTokenAmount = value;
      this.updateRemoveLiquidityFromFirstToken();
    },
    async submitRemoveLiquidity(): Promise<void> {
      const firstToken = this.removeLiquidityFirstToken;
      const secondToken = this.removeLiquiditySecondToken;

      if (!(firstToken && secondToken)) return;

      const settingsStore = useSettingsStore();

      await api.poolXyk.remove(
        firstToken,
        secondToken,
        this.removeLiquidity.liquidityAmount,
        this.removeLiquidityReserveA,
        this.removeLiquidityReserveB,
        this.removeLiquidityTotalSupply,
        settingsStore.slippageTolerance
      );
    },
    async resetRemoveLiquidityData(): Promise<void> {
      this.removeLiquidity.removePart = '';
      this.removeLiquidity.liquidityAmount = '';
      this.removeLiquidity.firstTokenAmount = '';
      this.removeLiquidity.secondTokenAmount = '';
      this.removeLiquidity.focusedField = null;
    },
  },
});

export type PoolStore = ReturnType<typeof usePoolStore>;
