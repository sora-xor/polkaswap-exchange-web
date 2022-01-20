import { Component, Mixins } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';

const BaseTokenPairMixinInstance = (namespace: string) => {
  @Component
  class BaseTokenPairMixin extends Mixins(mixins.TranslationMixin, mixins.FormattedAmountMixin) {
    readonly XOR_SYMBOL = XOR.symbol;

    @Getter networkFees!: NetworkFeesObject;

    @Getter('firstTokenValue', { namespace }) firstTokenValue!: string;
    @Getter('secondTokenValue', { namespace }) secondTokenValue!: string;
    @Getter('firstToken', { namespace }) firstToken!: any;
    @Getter('secondToken', { namespace }) secondToken!: any;
    @Getter('isAvailable', { namespace }) isAvailable!: boolean;

    @Getter('price', { namespace: 'prices' }) price!: string;
    @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string;

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
      return this.getFiatAmount(this.firstTokenValue, this.firstToken);
    }

    get fiatSecondAmount(): Nullable<string> {
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
      return this.firstToken && this.secondToken;
    }
  }

  return BaseTokenPairMixin;
};

export default BaseTokenPairMixinInstance;
