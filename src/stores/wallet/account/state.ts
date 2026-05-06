import { api } from '@sora-substrate/sdk';
import isElectron from 'is-electron';

import type { Book } from '@/types/common';

import { DefaultPassphraseTimeout } from '@/lib/soraneo-wallet/src/consts';
import { storage, settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';

import type { AccountState } from './types';
import type { AppWallet } from '@/lib/soraneo-wallet/src/consts';

export function initialState(): AccountState {
  const addressBook = settingsStorage.get('book');
  const book = addressBook && JSON.parse(addressBook);
  const isExternal = storage.get('isExternal');
  const pinnedAssetsString = settingsStorage.get('pinnedAssets');
  const pinnedAssets = pinnedAssetsString ? JSON.parse(pinnedAssetsString) : [];
  const accountPasswordTimeout = settingsStorage.get('accountPasswordTimeout');

  return {
    address: storage.get('address') || '',
    name: storage.get('name') || '',
    source: (storage.get('source') as AppWallet) || '',
    isExternal: isExternal ? JSON.parse(isExternal) : false,
    assets: [],
    assetsToNotifyQueue: [],
    assetsSubscription: null,
    book: (book || {}) as Book,
    alertSubject: null,
    accountAssets: [],
    pinnedAssets: pinnedAssets || [],
    accountAssetsSubscription: null,
    whitelistArray: [],
    blacklistArray: [],
    fiatPriceObject: {},
    fiatPriceSubscription: null,
    ceresFiatValuesUsage: false,
    availableWallets: [],
    isDesktop: isElectron(),
    addressKeyMapping: {},
    addressPassphraseMapping: {},
    accountPasswordTimer: {},
    accountPasswordTimestamp: {},
    accountPasswordTimeout: accountPasswordTimeout ? JSON.parse(accountPasswordTimeout) : DefaultPassphraseTimeout,
    isMstAddressExist: false,
    isMST: false,
  };
}

const state = initialState();

export default state;
