import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString } from '@sora-substrate/util';

import ConfirmDialogMixin from './ConfirmDialogMixin';
import BaseTokenPairMixinInstance from './BaseTokenPairMixin';

import router from '@/router';
import { PageNames } from '@/consts';
import {
  getMaxValue,
  isMaxButtonAvailable,
  isXorAccountAsset,
  hasInsufficientBalance,
  formatAssetBalance,
  getAssetBalance,
} from '@/utils';

const TokenPairMixinInstance = (namespace: string) => {
  const BaseTokenPairMixin = BaseTokenPairMixinInstance(namespace);

  @Component
  class TokenPairMixin extends Mixins(mixins.TransactionMixin, BaseTokenPairMixin, ConfirmDialogMixin) {
    @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any;

    @Getter('minted', { namespace }) minted!: CodecString;

    @Getter slippageTolerance!: string;
    @Getter isLoggedIn!: boolean;

    @Action('setFirstTokenAddress', { namespace }) setFirstTokenAddress;
    @Action('setSecondTokenAddress', { namespace }) setSecondTokenAddress;
    @Action('setFirstTokenValue', { namespace }) setFirstTokenValue;
    @Action('setSecondTokenValue', { namespace }) setSecondTokenValue;
    @Action('resetData', { namespace }) resetData;

    @Action('getPrices', { namespace: 'prices' }) getPrices;
    @Action('resetPrices', { namespace: 'prices' }) resetPrices;

    @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn;

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
      this.resetData(params?.assetBAddress && params?.assetBAddress);
    }

    get formattedMinted(): string {
      return this.formatCodecNumber(this.minted);
    }

    get isEmptyBalance(): boolean {
      return +this.firstTokenValue === 0 || +this.secondTokenValue === 0;
    }

    get isFirstMaxButtonAvailable(): boolean {
      return (
        this.isLoggedIn &&
        isMaxButtonAvailable(
          this.areTokensSelected,
          this.firstToken,
          this.firstTokenValue,
          this.networkFee,
          this.tokenXOR
        )
      );
    }

    get isSecondMaxButtonAvailable(): boolean {
      return (
        this.isLoggedIn &&
        isMaxButtonAvailable(
          this.areTokensSelected,
          this.secondToken,
          this.secondTokenValue,
          this.networkFee,
          this.tokenXOR
        )
      );
    }

    get isInsufficientBalance(): boolean {
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
        // TODO: [Release 2] Add check for pair without XOR
      }
      return false;
    }

    get firstTokenPrice(): Nullable<CodecString> {
      return this.getAssetFiatPrice(this.firstToken);
    }

    get secondTokenPrice(): Nullable<CodecString> {
      return this.getAssetFiatPrice(this.secondToken);
    }

    async handleMaxValue(token: any, setValue: (v: any) => void): Promise<void> {
      setValue(getMaxValue(token, this.networkFee));
      this.updatePrices();
    }

    async handleTokenChange(value: string, setValue: (v: any) => Promise<void>): Promise<void> {
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

    getFormattedTokenBalance(token: any): string {
      return formatAssetBalance(token);
    }

    openSelectSecondTokenDialog(): void {
      this.showSelectSecondTokenDialog = true;
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
