import isElectron from 'is-electron';

import type { Book } from '@/types/common';

import { DefaultPassphraseTimeout } from '@/lib/soraneo-wallet/src/consts';
import { storage, settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';
import { parseStoredBoolean, parseStoredFiniteNumber, parseStoredJson } from '@/utils/storageParsing';

import type { AccountState } from './types';
import type { AppWallet } from '@/lib/soraneo-wallet/src/consts';

const isBook = (value: unknown): value is Book =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((name) => typeof name === 'string');

const isPinnedAssets = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((address) => typeof address === 'string');

export function initialState(): AccountState {
  const addressBook = settingsStorage.get('book');
  const book = parseStoredJson(addressBook, {} as Book, isBook);
  const isExternal = storage.get('isExternal');
  const pinnedAssetsString = settingsStorage.get('pinnedAssets');
  const pinnedAssets = parseStoredJson(pinnedAssetsString, [] as string[], isPinnedAssets);
  const accountPasswordTimeout = settingsStorage.get('accountPasswordTimeout');
  const parsedAccountPasswordTimeout = parseStoredFiniteNumber(
    accountPasswordTimeout,
    DefaultPassphraseTimeout,
    (value) => value > 0
  );

  return {
    address: storage.get('address') || '',
    name: storage.get('name') || '',
    source: (storage.get('source') as AppWallet) || '',
    isExternal: parseStoredBoolean(isExternal, false),
    assets: [],
    assetsToNotifyQueue: [],
    assetsSubscription: null,
    book,
    alertSubject: null,
    accountAssets: [],
    accountAssetsLoading: false,
    accountAssetsLoaded: false,
    pinnedAssets,
    accountAssetsSubscription: null,
    whitelistArray: [],
    blacklistArray: [],
    fiatPriceObject: {},
    fiatPriceSubscription: null,
    availableWallets: [],
    isDesktop: isElectron(),
    addressKeyMapping: {},
    addressPassphraseMapping: {},
    accountPasswordTimer: {},
    accountPasswordTimestamp: {},
    accountPasswordTimeout: parsedAccountPasswordTimeout,
    isMstAddressExist: false,
    isMST: false,
  };
}

const state = initialState();

export default state;
