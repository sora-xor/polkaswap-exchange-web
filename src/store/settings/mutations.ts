import { defineMutations } from 'direct-vuex';
import { NFTStorage } from 'nft.storage';

import { Breakpoint, MarketAlgorithms, BreakpointClass, Language } from '@/consts';
import storage, { settingsStorage } from '@/utils/storage';

import type { Ad, FeatureFlags, SettingsState } from './types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<SettingsState>()({
  setSlippageTolerance(state, value: string): void {
    state.slippageTolerance = value;
    storage.set('slippageTolerance', value);
  },
  /** Set market algorithm, `MarketAlgorithms.SMART` is set by default */
  setMarketAlgorithm(state, value: MarketAlgorithms = MarketAlgorithms.SMART): void {
    state.marketAlgorithm = value;
    storage.set('marketAlgorithm', value);
  },
  setTransactionDeadline(state, value: number): void {
    state.transactionDeadline = value;
    storage.set('transactionDeadline', value);
  },
  setFaucetUrl(state, url: string): void {
    state.faucetUrl = url;
  },
  setSelectNodeDialogVisibility(state, value: boolean): void {
    state.selectNodeDialogVisibility = value;
  },
  setSelectIndexerDialogVisibility(state, value: boolean): void {
    state.selectIndexerDialogVisibility = value;
  },
  setSelectLanguageDialogVisibility(state, value: boolean): void {
    state.selectLanguageDialogVisibility = value;
  },
  setSelectCurrencyDialogVisibility(state, value: boolean): void {
    state.selectCurrencyDialogVisibility = value;
  },
  toggleDisclaimerDialogVisibility(state): void {
    state.disclaimerVisibility = !state.disclaimerVisibility;
  },
  setAlertSettingsPopup(state, value: boolean): void {
    state.alertSettingsVisibility = value;
  },
  setBrowserNotifsPopupEnabled(state, value: boolean): void {
    state.browserNotifPopupVisibility = value;
  },
  setBrowserNotifsPopupBlocked(state, value: boolean): void {
    state.browserNotifPopupBlockedVisibility = value;
  },
  setBrowserNotifsAgreement(state, value: NotificationPermission): void {
    state.browserNotifsPermission = value;
  },
  setLanguage(state, value: Language): void {
    state.language = value;
    settingsStorage.set('language', value);
  },
  setUserDisclaimerApprove(state): void {
    state.userDisclaimerApprove = true;
    settingsStorage.set('disclaimerApprove', true);
  },
  updateIntlUtils(state): void {
    try {
      state.displayRegions = new Intl.DisplayNames([state.language], { type: 'region' });
      state.percentFormat = new Intl.NumberFormat([state.language], { style: 'percent', maximumFractionDigits: 2 });
    } catch (error) {
      console.warn('Intl is not supported!', error);
      state.displayRegions = null;
      state.percentFormat = null;
    }
  },
  setFeatureFlags(state, featureFlags: FeatureFlags = {}): void {
    state.featureFlags = { ...state.featureFlags, ...featureFlags };
  },
  setBlockNumber(state, value: number): void {
    state.blockNumber = value || 0;
  },
  setMenuCollapsed(state, collapsed: boolean): void {
    state.menuCollapsed = collapsed;
  },
  setBlockNumberUpdates(state, subscription: Subscription): void {
    state.blockNumberUpdates = subscription;
  },
  resetBlockNumberSubscription(state): void {
    state.blockNumberUpdates?.unsubscribe();
    state.blockNumberUpdates = null;
  },
  setInternetConnectionEnabled(state): void {
    state.internetConnection = true;
  },
  setInternetConnectionDisabled(state): void {
    state.internetConnection = false;
  },
  setInternetConnectionSpeed(state): void {
    state.internetConnectionSpeed = ((navigator as any)?.connection?.downlink as number) ?? 0;
  },
  setScreenBreakpointClass(state, width: number): void {
    let newClass = state.screenBreakpointClass;
    state.windowWidth = width;

    if (width >= Breakpoint.HugeDesktop) {
      newClass = BreakpointClass.HugeDesktop;
    } else if (width >= Breakpoint.LargeDesktop) {
      newClass = BreakpointClass.LargeDesktop;
    } else if (width >= Breakpoint.Desktop) {
      newClass = BreakpointClass.Desktop;
    } else if (width >= Breakpoint.Tablet) {
      newClass = BreakpointClass.Tablet;
    } else if (width >= Breakpoint.LargeMobile) {
      newClass = BreakpointClass.LargeMobile;
    } else if (width < Breakpoint.LargeMobile) {
      newClass = BreakpointClass.Mobile;
    }

    if (newClass !== state.screenBreakpointClass) {
      state.screenBreakpointClass = newClass;
    }
  },
  setAdsArray(state, arr: Array<Ad>): void {
    state.adsArray = arr;
  },
  setNftStorage(
    state,
    { marketplaceDid, ucan, token = '' }: { marketplaceDid?: string; ucan?: string; token?: string }
  ): void {
    let nftStorage: NFTStorage;

    if (marketplaceDid && ucan) {
      // on prod environment
      nftStorage = new NFTStorage({
        token: ucan,
        did: marketplaceDid,
      });
    } else {
      // on dev, test environments
      nftStorage = new NFTStorage({ token });
    }

    state.nftStorage = nftStorage;
  },
});

export default mutations;
