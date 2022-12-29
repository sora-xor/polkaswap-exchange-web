import { api } from '@soramitsu/soraneo-wallet-web';
import { Recipient } from './types';
import { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

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
