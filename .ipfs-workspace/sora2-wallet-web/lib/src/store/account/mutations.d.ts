import type { AccountState } from './types';
import type { FiatPriceObject } from '../../services/indexer/types';
import type { Wallet } from '../../services/wallet/types';
import type { PolkadotJsAccount } from '../../types/common';
import type { Asset, AccountAsset, WhitelistArrayItem, Blacklist } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription, Subject } from 'rxjs';
declare const mutations: {
  setFiatPriceObject(state: AccountState, object: FiatPriceObject): void;
  updateFiatPriceObject(state: AccountState, fiatPriceAndApyRecord?: FiatPriceObject): void;
  /** When fiat price and apy request has an error */
  clearFiatPriceObject(state: AccountState): void;
  setAlertSubject(state: AccountState, alertSubject: Subject<FiatPriceObject>): void;
  resetAlertSubscription(state: AccountState): void;
  setFiatPriceSubscription(state: AccountState, subscription: VoidFunction): void;
  resetFiatPriceSubscription(state: AccountState): void;
  setCeresFiatValuesUsage(state: AccountState, flag: any): void;
  resetAccount(state: AccountState): void;
  setAssetsSubscription(state: AccountState, subscription: VoidFunction): void;
  resetAssetsSubscription(state: AccountState): void;
  setAccountAssetsSubscription(state: AccountState, subscription: Subscription): void;
  resetAccountAssetsSubscription(state: AccountState): void;
  syncWithStorage(state: AccountState): void;
  setAssets(state: AccountState, assets: Array<Asset>): void;
  setAccountAssets(state: AccountState, accountAssets: Array<AccountAsset>): void;
  setPinnedAsset(state: AccountState, pinnedAccountAsset: AccountAsset): void;
  setMultiplePinnedAssets(state: AccountState, pinnedAssetAddresses: string[]): void;
  removePinnedAsset(state: AccountState, pinnedAccountAsset: AccountAsset): void;
  setAssetToNotify(state: AccountState, asset: WhitelistArrayItem): void;
  popAssetFromNotificationQueue(state: AccountState): void;
  setWhitelist(state: AccountState, whitelistArray: Array<WhitelistArrayItem>): void;
  setNftBlacklist(state: AccountState, blacklistArray: Blacklist): void;
  clearWhitelist(state: AccountState): void;
  clearBlacklist(state: AccountState): void;
  setAvailableWallets(state: AccountState, wallets: Wallet[]): void;
  setAccountPassphrase(
    state: AccountState,
    {
      address,
      password,
    }: {
      address: string;
      password: string;
    }
  ): void;
  resetAccountPassphrase(state: AccountState, address: string): void;
  setPasswordTimeout(state: AccountState, timeout: number): void;
  setAccountPassphraseTimer(
    state: AccountState,
    {
      address,
      timer,
    }: {
      address: string;
      timer: NodeJS.Timeout;
    }
  ): void;
  resetAccountPassphraseTimer(state: AccountState, address: string): void;
  setIsDesktop(state: AccountState, value: boolean): void;
  setAddressToBook(state: AccountState, { address, name }: PolkadotJsAccount): void;
  removeAddressFromBook(state: AccountState, address: string): void;
  setIsMstAddressExist(state: AccountState, isExist: boolean): void;
  setIsMST(state: AccountState, isMST: boolean): void;
};
export default mutations;
