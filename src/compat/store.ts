import type { AppStore } from '@/store';
import type { WalletStore } from '@/stores/wallet';

const noop = () => undefined;
const asyncNoop = async () => undefined;

type UnknownRecord = Record<string, unknown>;

const ensureFunction = <T extends UnknownRecord>(
  target: T | undefined,
  key: keyof any,
  fallback: () => unknown = noop
) => {
  if (!target || typeof target[key as keyof T] === 'function') return;
  target[key as keyof T] = fallback as T[keyof T];
};

const ensureAsyncFunction = <T extends UnknownRecord>(
  target: T | undefined,
  key: keyof any,
  fallback: () => Promise<unknown> = asyncNoop
) => ensureFunction(target, key, fallback);

const ensureBranch = <T extends UnknownRecord>(root: UnknownRecord, key: keyof any, factory: () => T): T => {
  const current = root[key as keyof typeof root];
  if (current && typeof current === 'object') {
    return current as T;
  }
  const value = factory();
  root[key as keyof typeof root] = value;
  return value;
};

export function applyCompatStoreShims(store: AppStore, walletStore: WalletStore) {
  // Ensure store.state has the minimum structures expected by the UI and Pinia facades
  const settingsState = ensureBranch<Record<string, unknown>>(store.state, 'settings', () => ({}));
  Object.assign(settingsState, {
    selectIndexerDialogVisibility: Boolean(settingsState.selectIndexerDialogVisibility),
    selectNodeDialogVisibility: Boolean(settingsState.selectNodeDialogVisibility),
    rotatePhoneDialogVisibility: Boolean(settingsState.rotatePhoneDialogVisibility),
    browserNotifPopupVisibility: Boolean(settingsState.browserNotifPopupVisibility),
    browserNotifPopupBlockedVisibility: Boolean(settingsState.browserNotifPopupBlockedVisibility),
    isOrientationWarningVisible: Boolean(settingsState.isOrientationWarningVisible),
  });

  const walletState = ensureBranch<Record<string, unknown>>(store.state, 'wallet', () => ({}));
  const walletSettingsState = ensureBranch<Record<string, unknown>>(walletState, 'settings', () => ({}));
  walletSettingsState.soraNetwork ??= null;
  walletSettingsState.isMSTAvailable = Boolean(walletSettingsState.isMSTAvailable);
  walletSettingsState.indexerType ??= '';
  walletSettingsState.indexers ??= {
    subquery: { endpoint: '', status: 'available' },
    subsquid: { endpoint: '', status: 'available' },
  };

  const walletAccountState = ensureBranch<Record<string, unknown>>(walletState, 'account', () => ({}));
  walletAccountState.address ??= '';
  walletAccountState.assetsToNotifyQueue ??= [];
  walletAccountState.ceresFiatValuesUsage = Boolean(walletAccountState.ceresFiatValuesUsage);

  const walletTransactionsState = ensureBranch<Record<string, unknown>>(walletState, 'transactions', () => ({}));
  walletTransactionsState.pendingMstTransactions ??= [];
  walletTransactionsState.isSignTxDialogVisible = Boolean(walletTransactionsState.isSignTxDialogVisible);

  const walletAssetsState = ensureBranch<Record<string, unknown>>(walletState, 'assets', () => ({}));
  walletAssetsState.assetDataByAddress ??= {};

  // Patch wallet store actions that rely on the legacy Vuex modules
  walletStore.setApiKeys = asyncNoop;
  walletStore.subscribeOnExchangeRatesApi = asyncNoop;
  walletStore.resetNetworkSubscriptions = asyncNoop;
  walletStore.resetInternalSubscriptions = asyncNoop;
  walletStore.activateNetworkSubscriptions = asyncNoop;
  walletStore.notifyOnDeposit = asyncNoop;

  // Ensure commit paths exist
  const settingsCommit = ensureBranch<UnknownRecord>(store.commit as UnknownRecord, 'settings', () => ({}));
  ensureFunction(settingsCommit, 'setInternetConnectionDisabled');
  ensureFunction(settingsCommit, 'setInternetConnectionEnabled');
  ensureFunction(settingsCommit, 'setInternetConnectionSpeed');
  ensureFunction(settingsCommit, 'setBrowserNotifsPopupEnabled');
  ensureFunction(settingsCommit, 'setBrowserNotifsPopupBlocked');
  ensureFunction(settingsCommit, 'setRotatePhoneDialogVisibility');
  ensureFunction(settingsCommit, 'showOrientationWarning');
  ensureFunction(settingsCommit, 'hideOrientationWarning');
  ensureFunction(settingsCommit, 'setSelectIndexerDialogVisibility');
  ensureFunction(settingsCommit, 'setSelectNodeDialogVisibility');

  const walletCommit = ensureBranch<UnknownRecord>(store.commit as UnknownRecord, 'wallet', () => ({}));
  const walletCommitSettings = ensureBranch<UnknownRecord>(walletCommit, 'settings', () => ({}));
  ensureFunction(walletCommitSettings, 'setSelectIndexerDialogVisibility');
  ensureFunction(walletCommitSettings, 'setSelectNodeDialogVisibility');
  ensureFunction(walletCommitSettings, 'setDepositNotifications');
  ensureAsyncFunction(walletCommitSettings, 'setApiKeys');
  ensureFunction(walletCommitSettings, 'toggleHideBalance');

  const walletCommitAccount = ensureBranch<UnknownRecord>(walletCommit, 'account', () => ({}));
  ensureFunction(walletCommitAccount, 'setAssetsToNotifyQueue');

  const walletCommitTransactions = ensureBranch<UnknownRecord>(walletCommit, 'transactions', () => ({}));
  ensureFunction(walletCommitTransactions, 'setSignTxDialogVisibility');

  // Dispatch fallbacks used by the Pinia wallet facade
  const dispatch = store.dispatch as UnknownRecord;
  const walletDispatch = ensureBranch<UnknownRecord>(dispatch, 'wallet', () => ({}));
  const walletDispatchAccount = ensureBranch<UnknownRecord>(walletDispatch, 'account', () => ({}));
  ensureAsyncFunction(walletDispatchAccount, 'notifyOnDeposit');
  ensureAsyncFunction(walletDispatchAccount, 'afterLogin');
  ensureAsyncFunction(walletDispatchAccount, 'loginAccount');
  ensureAsyncFunction(walletDispatchAccount, 'logout');
  ensureAsyncFunction(walletDispatchAccount, 'renameAccount');
  ensureAsyncFunction(walletDispatchAccount, 'addAsset');
  ensureAsyncFunction(walletDispatchAccount, 'useCeresApiForFiatValues');

  const walletDispatchSettings = ensureBranch<UnknownRecord>(walletDispatch, 'settings', () => ({}));
  ensureAsyncFunction(walletDispatchSettings, 'selectIndexer');
  ensureAsyncFunction(walletDispatchSettings, 'setApiKeys');
  ensureAsyncFunction(walletDispatchSettings, 'subscribeOnExchangeRatesApi');
  ensureAsyncFunction(walletDispatchSettings, 'setTheme');

  const walletDispatchSubscriptions = ensureBranch<UnknownRecord>(walletDispatch, 'subscriptions', () => ({}));
  ensureAsyncFunction(walletDispatchSubscriptions, 'resetNetworkSubscriptions');
  ensureAsyncFunction(walletDispatchSubscriptions, 'resetInternalSubscriptions');
  ensureAsyncFunction(walletDispatchSubscriptions, 'activateNetwokSubscriptions');
}
