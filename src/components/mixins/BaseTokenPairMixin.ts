import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import { state, getter } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class BaseTokenPairMixin extends Mixins(TranslationMixin, mixins.FormattedAmountMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
  @state.addLiquidity.firstTokenValue firstTokenValue!: string;
  @state.addLiquidity.secondTokenValue secondTokenValue!: string;
  @state.addLiquidity.isAvailable isAvailable!: boolean;

  @getter.addLiquidity.firstToken firstToken!: Nullable<AccountAsset>;
  @getter.addLiquidity.secondToken secondToken!: Nullable<AccountAsset>;
  @getter.addLiquidity.price price!: string;
  @getter.addLiquidity.priceReversed priceReversed!: string;

  get firstTokenSymbol(): string {
    return this.firstToken?.symbol ?? '';
  }

  get secondTokenSymbol(): string {
    return this.secondToken?.symbol ?? '';
  }

  get networkFee(): CodecString {
    const operation = this.isAvailable ? Operation.AddLiquidity : Operation.CreatePair;

    return this.networkFees[operation];
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

  get emptyAssets(): boolean {
    if (!(this.firstTokenValue || this.secondTokenValue)) {
      return true;
    }
    const first = new FPNumber(this.firstTokenValue);
    const second = new FPNumber(this.secondTokenValue);
    return first.isNaN() || first.isZero() || second.isNaN() || second.isZero();
  }
}
