import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import { state, getter } from '@/store/decorators';

export enum TokenPairNamespace {
  AddLiquidity = 'addLiquidity',
  CreatePair = 'createPair',
}

const BaseTokenPairMixinInstance = (namespace: TokenPairNamespace) => {
  const namespacedState = state[namespace];
  const namespacedGetter = getter[namespace];
  @Component
  class BaseTokenPairMixin extends Mixins(mixins.TranslationMixin, mixins.FormattedAmountMixin) {
    readonly XOR_SYMBOL = XOR.symbol;

    @state.prices.price price!: string;
    @state.prices.priceReversed priceReversed!: string;
    @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
    @namespacedState.firstTokenValue firstTokenValue!: string;
    @namespacedState.secondTokenValue secondTokenValue!: string;
    @namespacedState.isAvailable isAvailable!: boolean;

    @namespacedGetter.firstToken firstToken!: Nullable<AccountAsset>;
    @namespacedGetter.secondToken secondToken!: Nullable<AccountAsset>;

    get firstTokenSymbol(): string {
      return this.firstToken?.symbol ?? '';
    }

    get secondTokenSymbol(): string {
      return this.secondToken?.symbol ?? '';
    }

    get networkFee(): CodecString {
      return this.networkFees[Operation[namespace.charAt(0).toUpperCase() + namespace.slice(1)]];
    }

    get formattedFee(): string {
      return this.formatCodecNumber(this.networkFee);
    }

    get formattedPrice(): string {
      return this.formatStringValue(this.price);
    }

    get formattedPriceReversed(): string {
      return this.formatStringValue(this.priceReversed);
    }

    get fiatFirstAmount(): Nullable<string> {
      if (!this.firstToken) return null;
      return this.getFiatAmount(this.firstTokenValue, this.firstToken);
    }

    get fiatSecondAmount(): Nullable<string> {
      if (!this.secondToken) return null;
      return this.getFiatAmount(this.secondTokenValue, this.secondToken);
    }

    get emptyAssets(): boolean {
      if (!(this.firstTokenValue || this.secondTokenValue)) {
        return true;
      }
      const first = new FPNumber(this.firstTokenValue);
      const second = new FPNumber(this.secondTokenValue);
      return first.isNaN() || first.isZero() || second.isNaN() || second.isZero();
    }

    get areTokensSelected(): boolean {
      return !!(this.firstToken && this.secondToken);
    }
  }

  return BaseTokenPairMixin;
};

export default BaseTokenPairMixinInstance;
