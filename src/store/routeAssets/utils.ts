import { FPNumber, Operation } from '@sora-substrate/util/build';
import { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FiatPriceObject } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import { Recipient } from './types';

import type { WhitelistArrayItem } from '@sora-substrate/util/build/assets/types';

export default {
  validate(recipient: Recipient) {
    return (
      this.wallet(recipient.wallet) &&
      this.asset(recipient.asset) &&
      this.usd(recipient.usd) &&
      this.amount(recipient.amount)
    );
  },

  name(name: Nullable<string>) {
    return name;
  },

  wallet(wallet: string) {
    return api.validateAddress(wallet);
  },

  asset(asset: Asset | AccountAsset) {
    return asset;
  },

  usd(usd: Nullable<number>) {
    return usd && !isNaN(usd);
  },

  amount(amount: Nullable<number>) {
    return amount && !isNaN(amount) && Number.isFinite(amount);
  },
};

export function getTokenEquivalent(
  priceObject: FiatPriceObject,
  asset: Asset | AccountAsset | WhitelistArrayItem,
  usd: number | string
): FPNumber {
  return new FPNumber(usd).div(FPNumber.fromCodecValue(priceObject[asset.address], asset.decimals));
}

export function getAssetUSDPrice(asset, fiatPriceObject) {
  if (!asset) return null;
  return FPNumber.fromCodecValue(fiatPriceObject[asset.address], asset.decimals);
}
