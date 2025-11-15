import { FPNumber, CodecString } from '@sora-substrate/sdk';
import { BalanceType, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { Options, mixins } from 'vue-property-decorator';

import { FontSizeRate, FontWeightRate } from '../../consts';
import { state } from '../../store/decorators';

import NumberFormatterMixin from './NumberFormatterMixin';

import type { FiatPriceObject } from '../../services/indexer/types';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

@Options({})
export default class FormattedAmountMixin extends mixins(NumberFormatterMixin) {
  readonly FontSizeRate = FontSizeRate;
  readonly FontWeightRate = FontWeightRate;

  @state.account.fiatPriceObject fiatPriceObject!: FiatPriceObject;

  getAssetFiatPrice(asset: Asset | AccountAsset): Nullable<CodecString> {
    return this.fiatPriceObject[asset.address] || null;
  }

  getFiatBalance(asset?: Nullable<AccountAsset>, type = BalanceType.Transferable): Nullable<string> {
    if (!asset) return null;

    const price = this.getAssetFiatPrice(asset);
    if (!price || !asset.balance) {
      return null;
    }
    return this.getFPNumberFromCodec(asset.balance[type], asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  }

  getFiatAmount(amount: string | CodecString, asset: Asset | AccountAsset, isCodecString = false): Nullable<string> {
    // When input is empty, zero should be shown
    if (!amount && amount !== '') {
      return null;
    }
    const price = this.getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    const { decimals } = asset;
    const amountParam = amount || '0';
    return (isCodecString ? this.getFPNumberFromCodec(amountParam, decimals) : this.getFPNumber(amountParam, decimals))
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  }

  getFiatAmountByString(amount: string, asset: AccountAsset | Asset): Nullable<string> {
    // When input is empty, zero should be shown
    if (!amount && amount !== '') {
      return null;
    }
    const price = this.getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return this.getFPNumber(amount || '0', asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  }

  getFPNumberFiatAmountByFPNumber(amount: FPNumber, asset: Asset | AccountAsset = XOR): Nullable<FPNumber> {
    const price = this.getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price));
  }

  getFiatAmountByFPNumber(amount: FPNumber, asset: Asset | AccountAsset = XOR): Nullable<string> {
    const price = this.getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price)).toLocaleString();
  }

  getFiatAmountByCodecString(amount: CodecString, asset: Asset | AccountAsset = XOR): Nullable<string> {
    return this.getFiatAmount(amount, asset, true);
  }
}
