import { excludePoolXYKAssets } from '@sora-substrate/sdk/build/assets';
import { defineActions } from '@/store/module-helpers';

import { api } from '../../api';
import { AppWallet, BLOCK_PRODUCE_TIME } from '../../consts';
import alertsApiService from '../../services/alerts';
import { CeresApiService } from '../../services/ceres';
import { getCurrentIndexer } from '../../services/indexer';
import { getAppWallets, checkWallet, isAppStorageSource } from '../../services/wallet';
import { WHITE_LIST_URL, NFT_BLACK_LIST_URL } from '../../util';
import { loginApi, logoutApi, updateApiSigner } from '../../util/account';
import { sanitizeNftBlacklistPayload, sanitizeWhitelistPayload } from '../../util/security';

import { accountActionContext } from './../account';

import type { VestedTransferParams, VestedTransferFeeParams } from './types';
import type { PolkadotJsAccount } from '../../types/common';
import type { FPNumber } from '@sora-substrate/sdk';
import type { AccountAsset, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { ActionContext } from 'vuex';

const UPDATE_ASSETS_INTERVAL = BLOCK_PRODUCE_TIME * 3;

const dispatchRoot = (context: ActionContext<any, any>, type: string, payload?: unknown) =>
  context.dispatch(type, payload, { root: true });

const commitRoot = (context: ActionContext<any, any>, type: string, payload?: unknown) =>
  context.commit(type, payload, { root: true });

const getRootState = (context: ActionContext<any, any>) => context.rootState as any;

// [TODO]: change WsProvider timeout instead on this
const withTimeout = <T>(func: Promise<T>, timeout = UPDATE_ASSETS_INTERVAL) => {
  return Promise.race([
    func,
    new Promise<never>((resolve, reject) => {
      setTimeout(() => reject(new Error('Request Timeout')), timeout);
    }),
  ]);
};

// INDEXER
async function getFiatPriceObjectUsingIndexer(context: ActionContext<any, any>): Promise<void> {
  const { commit } = accountActionContext(context);
  const indexer = getCurrentIndexer();
  const data = await indexer.services.explorer.price.getFiatPriceObject();

  if (data) {
    commit.setFiatPriceObject(data);
  } else {
    commit.clearFiatPriceObject();
  }
}

async function getFiatPriceUpdatesUsingIndexer(context: ActionContext<any, any>): Promise<void> {
  const { commit } = accountActionContext(context);
  const indexer = getCurrentIndexer();
  const data = await indexer.services.explorer.price.getFiatPriceUpdates();

  if (data) {
    commit.updateFiatPriceObject(data);
  }
}

function subscribeOnFiatUsingCurrentIndexer(context: ActionContext<any, any>): void {
  const { commit, dispatch } = accountActionContext(context);
  commit.resetFiatPriceSubscription();
  const indexer = getCurrentIndexer();
  const subscription = indexer.services.explorer.price.createFiatPriceSubscription(
    (priceObject) => {
      if (priceObject) {
        commit.updateFiatPriceObject(priceObject);
      } else {
        getFiatPriceUpdatesUsingIndexer(context);
      }
    },
    // [CERES] do not switch automatically
    // () => dispatch.useCeresApiForFiatValues(true)
    () => {}
  );

  commit.setFiatPriceSubscription(subscription);
}

async function useFiatValuesFromIndexer(context: ActionContext<any, any>): Promise<void> {
  await getFiatPriceObjectUsingIndexer(context);
  subscribeOnFiatUsingCurrentIndexer(context);
}

// CERES
async function getFiatPriceObjectUsingCeresApi(context: ActionContext<any, any>): Promise<void> {
  const { commit } = accountActionContext(context);
  const data = await CeresApiService.getFiatPriceObject();
  if (data) {
    commit.setFiatPriceObject(data);
  } else {
    commit.clearFiatPriceObject();
  }
}

function subscribeOnFiatUsingCeresApi(context: ActionContext<any, any>): void {
  const { commit } = accountActionContext(context);
  commit.resetFiatPriceSubscription();
  const subscription = CeresApiService.createFiatPriceSubscription(
    commit.updateFiatPriceObject,
    commit.clearFiatPriceObject
  );
  commit.setFiatPriceSubscription(subscription);
}

async function useFiatValuesFromCeresApi(context: ActionContext<any, any>): Promise<void> {
  await getFiatPriceObjectUsingCeresApi(context);
  subscribeOnFiatUsingCeresApi(context);
  console.info(`[CERES API] Fiat values subscribe.`);
}

const actions = defineActions({
  async afterLogin(context): Promise<void> {
    const { dispatch } = accountActionContext(context);

    await dispatch.subscribeOnAccountAssets();
    await dispatchRoot(context, 'wallet/transactions/subscribeOnExternalHistory');
    await dispatchRoot(context, 'wallet/router/checkCurrentRoute');
  },

  async logout(context): Promise<void> {
    const { commit, state } = accountActionContext(context);
    const forgetCurrentAccount = !isAppStorageSource(state.source);

    logoutApi(api, forgetCurrentAccount);

    commit.resetAccountAssetsSubscription();
    commitRoot(context, 'wallet/transactions/resetExternalHistorySubscription');
    commit.resetAccount();

    await dispatchRoot(context, 'wallet/router/checkCurrentRoute');
  },

  async checkWalletAvailability(context): Promise<void> {
    const { dispatch, getters, state } = accountActionContext(context);

    if (!(getters.isLoggedIn && state.source)) return;

    try {
      if (state.isExternal) {
        await updateApiSigner(api, state.source);
      } else {
        checkWallet(state.source);
      }
    } catch (error) {
      console.error(error);
      await dispatch.logout();
    }
  },

  async checkConnectedAccountSource(context, source: string): Promise<void> {
    const { dispatch, getters } = accountActionContext(context);

    if (source && getters.account && getters.account.source === source) {
      await dispatch.logout();
    }
  },

  /**
   * Update the list of installed extensions & internal wallets
   */
  async updateAvailableWallets(context): Promise<void> {
    const { commit, state } = accountActionContext(context);

    try {
      const wallets = getAppWallets(state.isDesktop);

      commit.setAvailableWallets(wallets);
    } catch (error) {
      console.error(error);
      commit.setAvailableWallets([]);
    }
  },

  async loginAccount(context, accountData: PolkadotJsAccount): Promise<void> {
    const { commit, dispatch, state } = accountActionContext(context);

    await loginApi(api, accountData, isAppStorageSource(state.source));

    commit.syncWithStorage();

    await dispatch.afterLogin();
  },

  async renameAccount(context, { address, name }: { address: string; name: string }) {
    const { commit } = accountActionContext(context);
    // change name in api & storage
    api.changeAccountName(address, name);
    // update account data from storage
    commit.syncWithStorage();
  },

  setAccountPassphrase(context, { address, password }: { address: string; password: string }): void {
    const { commit, dispatch, state } = accountActionContext(context);

    dispatch.resetAccountPassphrase(address);
    commit.setAccountPassphrase({ address, password });

    const timer = setTimeout(() => dispatch.resetAccountPassphrase(address), state.accountPasswordTimeout);
    commit.setAccountPassphraseTimer({ address, timer });
  },

  resetAccountPassphrase(context, address: string): void {
    const { commit } = accountActionContext(context);
    commit.resetAccountPassphraseTimer(address);
    commit.resetAccountPassphrase(address);
  },

  // [NOTE]: Desktop is not syncing, because it runs in one flow
  async syncWithStorage(context): Promise<void> {
    const { state, getters, commit, dispatch } = accountActionContext(context);
    // previous state
    const { isLoggedIn: wasLoggedIn } = getters;
    const { address } = state;

    commit.syncWithStorage();

    // check log in/out state changes after sync
    if (getters.isLoggedIn !== wasLoggedIn || state.address !== address) {
      if (getters.isLoggedIn) {
        const account = { address: state.address, name: state.name, source: state.source as AppWallet };
        await dispatch.loginAccount(account);
      } else {
        await dispatch.logout();
      }
    }

    // still logged in after sync
    if (getters.isLoggedIn && wasLoggedIn) {
      await api.assets.updateAccountAssets();
    }
  },

  async getAssets(context): Promise<void> {
    const { getters, commit } = accountActionContext(context);
    try {
      const allAssets = await withTimeout(api.assets.getAssets(true, getters.whitelist, getters.blacklist));
      const filtered = excludePoolXYKAssets(allAssets);

      commit.setAssets(filtered);
    } catch (error) {
      console.warn('Connection was lost during getAssets operation');
      throw error;
    }
  },

  async subscribeOnAssets(context): Promise<void> {
    const { commit, dispatch, getters, state } = accountActionContext(context);

    commit.resetAssetsSubscription();

    await dispatch.getAssets();

    const indexer = getCurrentIndexer();

    const subscription = indexer.services.explorer.asset.createNewAssetsSubscription((newAssets) => {
      if (!newAssets.length) return;

      const assetsToAdd = newAssets.filter((asset) => {
        return !(asset.address in getters.assetsDataTable);
      });

      commit.setAssets([...state.assets, ...assetsToAdd]);
    }, console.error);

    commit.setAssetsSubscription(subscription);
  },

  async subscribeOnAccountAssets(context): Promise<void> {
    const { commit, getters } = accountActionContext(context);
    commit.resetAccountAssetsSubscription();

    if (getters.isLoggedIn) {
      try {
        const subscription = api.assets.balanceUpdated.subscribe(() => {
          const filtered = api.assets.accountAssets.filter(
            (asset) => !api.assets.isNftBlacklisted(asset, getters.blacklist)
          );
          commit.setAccountAssets(filtered);
        });
        commit.setAccountAssetsSubscription(subscription);
        await api.assets.updateAccountAssets();
      } catch (error) {
        commit.setAccountAssets([]);
      }
    }
  },
  async getWhitelist(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.clearWhitelist();
    try {
      const response = await fetch(WHITE_LIST_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Whitelist request failed with status ${response.status}`);

      const payload = await response.text();
      const data = sanitizeWhitelistPayload(payload);
      commit.setWhitelist(data);
    } catch (error) {
      commit.clearWhitelist();
      console.error('[whitelist] Unable to load whitelist.', error);
    }
  },
  async getNftBlacklist(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.clearBlacklist();
    try {
      const response = await fetch(NFT_BLACK_LIST_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`NFT blacklist request failed with status ${response.status}`);

      const payload = await response.text();
      const data = sanitizeNftBlacklistPayload(payload);
      commit.setNftBlacklist(data);
    } catch (error) {
      commit.clearBlacklist();
      console.error('[nft-blacklist] Unable to load NFT blacklist.', error);
    }
  },
  async subscribeOnAlerts(context): Promise<void> {
    const { commit } = accountActionContext(context);

    const alertSubject = alertsApiService.createPriceAlertSubscription();
    commit.setAlertSubject(alertSubject);
  },

  async subscribeOnFiatPrice(context): Promise<void> {
    const { state } = accountActionContext(context);

    if (!state.ceresFiatValuesUsage) {
      await useFiatValuesFromIndexer(context);
    } else {
      await useFiatValuesFromCeresApi(context);
    }
  },

  async useCeresApiForFiatValues(context, flag: boolean): Promise<void> {
    const { commit, dispatch } = accountActionContext(context);
    commit.setCeresFiatValuesUsage(flag);
    await dispatch.subscribeOnFiatPrice();
  },

  async notifyOnDeposit(context, data): Promise<void> {
    const { commit } = accountActionContext(context);
    const { asset, message }: { asset: WhitelistArrayItem; message: string } = data;
    alertsApiService.pushNotification(asset, message);
    commit.popAssetFromNotificationQueue();
  },
  async addAsset(_, address?: string): Promise<void> {
    if (!address) return;
    try {
      await api.assets.addAccountAsset(address);
    } catch (error) {
      console.error('[Add asset]:', error);
    }
  },
  async transfer(context, { to, amount }: { to: string; amount: string }): Promise<void> {
    const rootState = getRootState(context);
    const asset = rootState.wallet.router.currentRouteParams.asset as AccountAsset;

    await api.assets.simpleTransfer(asset, to, amount);
  },
  async getVestedTransferFee(
    context,
    { asset, amount, vestingPercent, unlockPeriodInDays }: VestedTransferFeeParams
  ): Promise<Nullable<FPNumber>> {
    try {
      const {
        wallet: {
          settings: { blockNumber },
        },
      } = getRootState(context);
      return await api.assets.getVestedTransferFee(asset, amount, blockNumber, vestingPercent, unlockPeriodInDays);
    } catch (error) {
      console.warn('[Vested Transfer Fee]:', error);
      return null;
    }
  },
  async vestedTransfer(
    context,
    { to, asset, amount, vestingPercent, unlockPeriodInDays, start, current }: VestedTransferParams
  ): Promise<void> {
    const {
      wallet: {
        settings: { blockNumber },
      },
    } = getRootState(context);
    const diff = Math.floor((start - current) / 6_000);
    const startBlock = diff > 0 ? blockNumber + diff : blockNumber;
    await api.assets.vestedTransfer(asset, to, amount, startBlock, vestingPercent, unlockPeriodInDays);
  },
  /** It's used **only** for subscriptions module */
  async resetAssetsSubscription(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.resetAssetsSubscription();
  },
  /** It's used **only** for subscriptions module */
  async resetAccountAssetsSubscription(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.resetAccountAssetsSubscription();
  },
  /** It's used **only** for subscriptions module */
  async resetFiatPriceSubscription(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.resetFiatPriceSubscription();
  },
  /** It's used **only** for subscriptions module */
  async resetAlertsSubscription(context): Promise<void> {
    const { commit } = accountActionContext(context);
    commit.resetAlertSubscription();
  },
  initMultisigAddress(context): void {
    const addressMstExist = api.mst.isMstAddressExist();
    const isMST = api.mst.isMST();
    const { commit } = accountActionContext(context);
    commit.setIsMstAddressExist(addressMstExist);
    commit.setIsMST(isMST);
  },
});

export default actions;
