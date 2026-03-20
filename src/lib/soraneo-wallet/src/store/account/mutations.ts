import { AES } from 'crypto-js';
import cryptoRandomString from 'crypto-random-string';
import { defineMutations } from '@/store/module-helpers';
import omit from 'lodash/fp/omit';

import { api } from '../../api';
import { storage, settingsStorage } from '../../util/storage';

import { initialState } from './state';

import type { AccountState } from './types';
import type { AppWallet } from '../../consts';
import type { FiatPriceObject } from '../../services/indexer/types';
import type { Wallet } from '../../services/wallet/types';
import type { Book, PolkadotJsAccount } from '../../types/common';
import type { CreateResult } from '@polkadot/ui-keyring/types';
import type { Asset, AccountAsset, WhitelistArrayItem, Blacklist } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription, Subject } from 'rxjs';

const mutations = defineMutations<AccountState>()({
  // Fiat price
  setFiatPriceObject(state, object: FiatPriceObject): void {
    state.fiatPriceObject = Object.freeze(object);
  },
  updateFiatPriceObject(state, fiatPriceAndApyRecord?: FiatPriceObject): void {
    if (!fiatPriceAndApyRecord) return;

    const updated = Object.freeze({ ...(state.fiatPriceObject || {}), ...fiatPriceAndApyRecord });

    if (state.alertSubject) {
      state.alertSubject.next(updated);
    }

    state.fiatPriceObject = updated;
  },
  /** When fiat price and apy request has an error */
  clearFiatPriceObject(state): void {
    state.fiatPriceObject = {};
  },
  setAlertSubject(state, alertSubject: Subject<FiatPriceObject>) {
    state.alertSubject = alertSubject;
  },
  resetAlertSubscription(state) {
    if (state.alertSubject) {
      state.alertSubject.unsubscribe();
    }
    state.alertSubject = null;
  },
  setFiatPriceSubscription(state, subscription: VoidFunction): void {
    state.fiatPriceSubscription = subscription;
  },
  resetFiatPriceSubscription(state): void {
    state.fiatPriceSubscription?.();
    state.fiatPriceSubscription = null;
  },
  setCeresFiatValuesUsage(state, flag): void {
    state.ceresFiatValuesUsage = flag;
    settingsStorage.set('ceresFiatValues', flag);
  },
  resetAccount(state): void {
    const s = omit(
      [
        'whitelistArray',
        'blacklistArray',
        'fiatPriceObject',
        'fiatPriceSubscription',
        'assets',
        'assetsSubscription',
        'availableWallets',
      ],
      initialState()
    );
    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  setAssetsSubscription(state, subscription: VoidFunction): void {
    state.assetsSubscription = subscription;
  },
  resetAssetsSubscription(state): void {
    state.assetsSubscription?.();
    state.assetsSubscription = null;
  },
  setAccountAssetsSubscription(state, subscription: Subscription): void {
    state.accountAssetsSubscription = subscription;
  },
  resetAccountAssetsSubscription(state): void {
    api.assets.clearAccountAssets();
    if (state.accountAssetsSubscription) {
      state.accountAssetsSubscription.unsubscribe();
      state.accountAssetsSubscription = null;
    }
  },
  syncWithStorage(state): void {
    const isExternal = storage.get('isExternal');

    state.address = storage.get('address');
    state.name = storage.get('name');
    state.source = storage.get('source') as AppWallet;
    state.isExternal = isExternal ? JSON.parse(isExternal) : false;
  },
  setAssets(state, assets: Array<Asset>): void {
    state.assets = assets;
  },
  setAccountAssets(state, accountAssets: Array<AccountAsset>): void {
    state.accountAssets = accountAssets;
  },
  setPinnedAsset(state, pinnedAccountAsset: AccountAsset): void {
    const assetAddress = pinnedAccountAsset.address;
    state.pinnedAssets.push(assetAddress);
    settingsStorage.set('pinnedAssets', JSON.stringify(state.pinnedAssets));
  },
  setMultiplePinnedAssets(state, pinnedAssetAddresses: string[]) {
    state.pinnedAssets = pinnedAssetAddresses;
    settingsStorage.set('pinnedAssets', JSON.stringify(state.pinnedAssets));
  },
  removePinnedAsset(state, pinnedAccountAsset: AccountAsset): void {
    state.pinnedAssets = state.pinnedAssets.filter((address) => address !== pinnedAccountAsset.address);
    settingsStorage.set('pinnedAssets', JSON.stringify(state.pinnedAssets));
  },

  setAssetToNotify(state, asset: WhitelistArrayItem): void {
    state.assetsToNotifyQueue.push(asset);
  },
  popAssetFromNotificationQueue(state): void {
    state.assetsToNotifyQueue.shift();
  },
  setWhitelist(state, whitelistArray: Array<WhitelistArrayItem>): void {
    state.whitelistArray = Object.freeze(whitelistArray);
  },
  setNftBlacklist(state, blacklistArray: Blacklist): void {
    state.blacklistArray = Object.freeze(blacklistArray);
  },
  clearWhitelist(state): void {
    state.whitelistArray = [];
  },
  clearBlacklist(state): void {
    state.blacklistArray = [];
  },

  setAvailableWallets(state, wallets: Wallet[]) {
    state.availableWallets = wallets;
  },

  setAccountPassphrase(state, { address, password }: { address: string; password: string }): void {
    const key = cryptoRandomString({ length: 10, type: 'ascii-printable' });
    const passphrase = AES.encrypt(password, key).toString();
    const defaultAddress = api.formatAddress(address, false);

    state.addressPassphraseMapping = {
      ...state.addressPassphraseMapping,
      [defaultAddress]: passphrase,
    };
    state.addressKeyMapping = {
      ...state.addressKeyMapping,
      [defaultAddress]: key,
    };
  },

  resetAccountPassphrase(state, address: string): void {
    const defaultAddress = api.formatAddress(address, false);
    state.addressKeyMapping = {
      ...state.addressKeyMapping,
      [defaultAddress]: null,
    };
    state.addressPassphraseMapping = {
      ...state.addressPassphraseMapping,
      [defaultAddress]: null,
    };
  },
  setPasswordTimeout(state, timeout: number): void {
    state.accountPasswordTimeout = timeout;
    settingsStorage.set('accountPasswordTimeout', JSON.stringify(timeout));
  },
  setAccountPassphraseTimer(state, { address, timer }: { address: string; timer: NodeJS.Timeout }): void {
    const defaultAddress = api.formatAddress(address, false);
    state.accountPasswordTimer = {
      ...state.accountPasswordTimer,
      [defaultAddress]: timer,
    };
    state.accountPasswordTimestamp = {
      ...state.accountPasswordTimestamp,
      [defaultAddress]: Date.now(),
    };
  },
  resetAccountPassphraseTimer(state, address: string): void {
    const defaultAddress = api.formatAddress(address, false);
    const timer = state.accountPasswordTimer[address];

    if (timer) {
      clearTimeout(timer);
    }
    state.accountPasswordTimer[defaultAddress] = null;
    state.accountPasswordTimestamp[defaultAddress] = null;
  },
  setIsDesktop(state, value: boolean): void {
    state.isDesktop = value;
  },
  setAddressToBook(state, { address, name }: PolkadotJsAccount): void {
    const addressBook = { ...state.book, [address]: name };
    state.book = addressBook as Book;
    settingsStorage.set('book', JSON.stringify(addressBook));
  },
  removeAddressFromBook(state, address: string): void {
    if (state.book) {
      delete state.book[address];
      settingsStorage.set('book', JSON.stringify(state.book));
    }
  },
  setIsMstAddressExist(state, isExist: boolean): void {
    state.isMstAddressExist = isExist;
  },
  setIsMST(state, isMST: boolean): void {
    state.isMST = isMST;
  },
});

export default mutations;
