import { api, connection } from './api';
import en from './lang/en';
import AlertsApiService from './services/alerts';
import { getCurrentIndexer } from './services/indexer';
import * as SUBQUERY_TYPES from './services/indexer/subquery/types';
import * as SUBSQUID_TYPES from './services/indexer/subsquid/types';
import * as INDEXER_TYPES from './services/indexer/types';
import { historyElementsFilter } from './services/indexer/subsquid/queries/historyElements';
import { initializeWallets } from './services/wallet';
import * as WC from './services/walletconnect';
import { addWcSubWalletLocally } from './services/walletconnect';
import * as WALLET_CONSTS from './consts';
import * as WALLET_TYPES from './types/common';
import {
  beforeTransactionSign,
  delay,
  formatAccountAddress,
  getAssetsSubset,
  getExplorerLinks,
  groupRewardsByAssetsList,
  validateAddress,
} from './util';
import * as accountUtils from './util/account';
import { ScriptLoader } from './util/scriptLoader';
import { runtimeStorage, settingsStorage, storage } from './util/storage';

export {
  api,
  connection,
  storage,
  runtimeStorage,
  settingsStorage,
  getExplorerLinks,
  groupRewardsByAssetsList,
  formatAccountAddress,
  validateAddress,
  beforeTransactionSign,
  delay,
  getAssetsSubset,
  WALLET_CONSTS,
  WALLET_TYPES,
  accountUtils,
  ScriptLoader,
  historyElementsFilter,
  AlertsApiService,
  getCurrentIndexer,
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  INDEXER_TYPES,
  WC,
  en,
  initializeWallets,
  addWcSubWalletLocally,
};

export type { WithKeyring } from '@sora-substrate/sdk';
export type { TransactionSignVisibilityController, TransactionSignVisibilityTarget } from './util';
