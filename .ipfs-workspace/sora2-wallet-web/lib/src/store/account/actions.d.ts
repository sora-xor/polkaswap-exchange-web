import type { VestedTransferParams, VestedTransferFeeParams } from './types';
import type { PolkadotJsAccount } from '../../types/common';
import type { FPNumber } from '@sora-substrate/sdk';
import type { ActionContext } from 'vuex';
declare const actions: {
  afterLogin(context: ActionContext<any, any>): Promise<void>;
  logout(context: ActionContext<any, any>): Promise<void>;
  checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
  checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
  /**
   * Update the list of installed extensions & internal wallets
   */
  updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
  loginAccount(context: ActionContext<any, any>, accountData: PolkadotJsAccount): Promise<void>;
  renameAccount(
    context: ActionContext<any, any>,
    {
      address,
      name,
    }: {
      address: string;
      name: string;
    }
  ): Promise<void>;
  setAccountPassphrase(
    context: ActionContext<any, any>,
    {
      address,
      password,
    }: {
      address: string;
      password: string;
    }
  ): void;
  resetAccountPassphrase(context: ActionContext<any, any>, address: string): void;
  syncWithStorage(context: ActionContext<any, any>): Promise<void>;
  getAssets(context: ActionContext<any, any>): Promise<void>;
  subscribeOnAssets(context: ActionContext<any, any>): Promise<void>;
  subscribeOnAccountAssets(context: ActionContext<any, any>): Promise<void>;
  getWhitelist(context: ActionContext<any, any>): Promise<void>;
  getNftBlacklist(context: ActionContext<any, any>): Promise<void>;
  subscribeOnAlerts(context: ActionContext<any, any>): Promise<void>;
  subscribeOnFiatPrice(context: ActionContext<any, any>): Promise<void>;
  useCeresApiForFiatValues(context: ActionContext<any, any>, flag: boolean): Promise<void>;
  notifyOnDeposit(context: ActionContext<any, any>, data: any): Promise<void>;
  addAsset(_: ActionContext<any, any>, address?: string): Promise<void>;
  transfer(
    context: ActionContext<any, any>,
    {
      to,
      amount,
    }: {
      to: string;
      amount: string;
    }
  ): Promise<void>;
  getVestedTransferFee(
    context: ActionContext<any, any>,
    { asset, amount, vestingPercent, unlockPeriodInDays }: VestedTransferFeeParams
  ): Promise<Nullable<FPNumber>>;
  vestedTransfer(
    context: ActionContext<any, any>,
    { to, asset, amount, vestingPercent, unlockPeriodInDays, start, current }: VestedTransferParams
  ): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
  initMultisigAddress(context: ActionContext<any, any>): void;
};
export default actions;
