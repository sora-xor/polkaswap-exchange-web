import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import ConfirmDialogMixin from './ConfirmDialogMixin';
import BaseTokenPairMixinInstance, { TokenPairNamespace } from './BaseTokenPairMixin';
import TokenSelectMixin from './TokenSelectMixin';

import router from '@/router';
import { PageNames } from '@/consts';
import { state, getter, mutation, action } from '@/store/decorators';
import { getMaxValue, isMaxButtonAvailable, isXorAccountAsset, hasInsufficientBalance, getAssetBalance } from '@/utils';
import type { PricesPayload } from '@/store/prices/types';

const TokenPairMixinInstance = (namespace: TokenPairNamespace) => {
  const namespacedAction = action[namespace];
  const namespacedGetter = getter[namespace];

  const BaseTokenPairMixin = BaseTokenPairMixinInstance(namespace);

  @Component
  class TokenPairMixin extends Mixins(
    mixins.TransactionMixin,
    BaseTokenPairMixin,
    ConfirmDialogMixin,
    TokenSelectMixin
  ) {
    @state.settings.slippageTolerance slippageTolerance!: string;

    @getter.assets.xor private xor!: AccountAsset;
    @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
    @namespacedGetter.minted minted!: CodecString;

    @mutation.prices.resetPrices resetPrices!: VoidFunction;
    @action.prices.getPrices getPrices!: (options?: PricesPayload) => Promise<void>;

    @namespacedAction.setFirstTokenAddress setFirstTokenAddress!: (address: string) => Promise<void>;
    @namespacedAction.setSecondTokenAddress setSecondTokenAddress!: (address: string) => Promise<void>;
    @namespacedAction.setFirstTokenValue setFirstTokenValue!: (address: string) => Promise<void>;
    @namespacedAction.setSecondTokenValue setSecondTokenValue!: (address: string) => Promise<void>;
    @namespacedAction.resetData resetData!: (withAssets?: boolean) => Promise<void>;

    @Watch('isLoggedIn')
    private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
      if (wasLoggedIn && !isLoggedIn) {
        this.handleBack();
      }
    }

    showSelectSecondTokenDialog = false;
    insufficientBalanceTokenSymbol = '';

    destroyed(): void {
      const params = router.currentRoute.params;
      this.resetPrices();
      this.resetData(!!(params?.assetBAddress && params?.assetBAddress));
    }

    get isEmptyBalance(): boolean {
      return +this.firstTokenValue === 0 || +this.secondTokenValue === 0;
    }

    get isFirstMaxButtonAvailable(): boolean {
      if (!this.firstToken) return false;

      return (
        this.isLoggedIn &&
        isMaxButtonAvailable(this.areTokensSelected, this.firstToken, this.firstTokenValue, this.networkFee, this.xor)
      );
    }

    get isSecondMaxButtonAvailable(): boolean {
      if (!this.secondToken) return false;

      return (
        this.isLoggedIn &&
        isMaxButtonAvailable(this.areTokensSelected, this.secondToken, this.secondTokenValue, this.networkFee, this.xor)
      );
    }

    get isInsufficientBalance(): boolean {
      if (!(this.firstToken && this.secondToken)) return false;

      if (this.isLoggedIn && this.areTokensSelected) {
        if (isXorAccountAsset(this.firstToken) || isXorAccountAsset(this.secondToken)) {
          if (hasInsufficientBalance(this.firstToken, this.firstTokenValue, this.networkFee)) {
            this.insufficientBalanceTokenSymbol = this.firstToken.symbol;
            return true;
          }
          if (hasInsufficientBalance(this.secondToken, this.secondTokenValue, this.networkFee)) {
            this.insufficientBalanceTokenSymbol = this.secondToken.symbol;
            return true;
          }
        }
      }
      return false;
    }

    handleMaxValue(token: Nullable<AccountAsset>, setValue: (v: string) => Promise<void>): void {
      if (!token) return;
      setValue(getMaxValue(token, this.networkFee));
      this.updatePrices();
    }

    async handleTokenChange(value: string, setValue: (v: string) => Promise<void>): Promise<void> {
      await setValue(value);
      this.updatePrices();
    }

    updatePrices(): void {
      this.getPrices({
        assetAAddress: this.firstToken?.address,
        assetBAddress: this.secondToken?.address,
        amountA: this.firstTokenValue,
        amountB: this.secondTokenValue,
      });
    }

    getTokenBalance(token: any): CodecString {
      return getAssetBalance(token);
    }

    openSelectSecondTokenDialog(): void {
      this.showSelectSecondTokenDialog = true;
    }

    async selectSecondTokenAddress(address: string): Promise<void> {
      await this.withSelectAssetLoading(async () => {
        this.setSecondTokenAddress(address);
      });
    }

    async handleConfirm(func: AsyncVoidFn): Promise<void> {
      await this.handleConfirmDialog(async () => {
        await this.withNotifications(func);
        this.handleBack();
      });
    }

    handleBack(): void {
      router.push({ name: PageNames.Pool });
    }
  }

  return TokenPairMixin;
};

export default TokenPairMixinInstance;
