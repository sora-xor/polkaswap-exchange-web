import { api } from '@soramitsu/soraneo-wallet-web';
import {
  setDebug,
  initViewport,
  initInitData,
  initMiniApp,
  initWeb,
  isIframe,
  type MiniApp,
  type LaunchParams,
  type Utils,
  type Viewport,
  retrieveLaunchParams,
  initUtils,
} from '@tma.js/sdk';

import store from '@/store';

/**
 * Update the theme of the Telegram Mini App using `var(--s-color-utility-body)`
 */
function updateTgTheme(): void {
  try {
    const [miniApp] = initMiniApp();
    const colorUtilityBody =
      (getComputedStyle(document.documentElement).getPropertyValue('--s-color-utility-body') as `#${string}`) ||
      '#f7f3f4'; // Default color

    miniApp.setHeaderColor(colorUtilityBody);
    miniApp.setBgColor(colorUtilityBody);
  } catch (error) {
    console.warn('[TMA]: updateTgTheme', error);
  }
}

async function initTMA(botUrl?: string, isDebug = false): Promise<void> {
  try {
    // Initialize the app in the web version of Telegram
    if (isIframe()) {
      initWeb();
      console.info('[TMA]: initTMA: Web version of Telegram');
    }
    // Expand the Mini App to the maximum available height
    const [viewport] = initViewport();
    const viewportInstance = await viewport;
    viewportInstance.expand();
    console.info('[TMA]: initTMA: Expand the Mini App to the maximum available height');
    // Set theme
    updateTgTheme();
    console.info('[TMA]: initTMA: Set theme');
    // Enable debugging
    setDebug(isDebug);
    // Check the referrer
    const initData = initInitData();
    console.info('[TMA]: initTMA: Data initialization', initData);
    const referrerAddress = initData?.startParam;

    if (referrerAddress && api.validateAddress(referrerAddress)) {
      store.commit.referrals.setStorageReferrer(referrerAddress);
    }
    // Set the Telegram bot URL
    if (botUrl) {
      store.commit.settings.setTelegramBotUrl(botUrl);
    }
  } catch (error) {
    console.warn('[TMA]: initTMA', error);
  }
}

export class TmaSdk {
  public static miniApp: MiniApp;
  public static launchParams: LaunchParams;
  public static viewport: Nullable<Viewport>;
  private static utils: Utils;

  public static async init(botUrl?: string, isDebug = false): Promise<void> {
    try {
      // Initialize the app in the web version of Telegram
      if (isIframe()) {
        initWeb();
        console.info('[TMA]: initTMA: Web version of Telegram');
      }
      // Init mini app
      const [miniApp] = initMiniApp();
      this.miniApp = miniApp;
      console.info('[TMA]: Mini app was initialized');
      // Retrieve launch params
      this.launchParams = retrieveLaunchParams();
      console.info('[TMA]: Launch params were retrieved');
      // Init utils
      this.utils = initUtils();
      console.info('[TMA]: Utils were initialized');
      // Init viewport
      await this.initViewport();
      // Enable debugging
      setDebug(isDebug);
      // Set theme
      this.updateTheme();
      // Check the referrer
      this.setReferrer(this.launchParams.startParam);
      // Set the Telegram bot URL
      if (botUrl) {
        store.commit.settings.setTelegramBotUrl(botUrl);
      }
    } catch (error) {
      console.warn('[TMA]: init', error);
    }
  }

  public static updateTheme(): void {
    try {
      const colorUtilityBody =
        (getComputedStyle(document.documentElement).getPropertyValue('--s-color-utility-body') as `#${string}`) ||
        '#f7f3f4'; // Default color

      this.miniApp.setHeaderColor(colorUtilityBody);
      this.miniApp.setBgColor(colorUtilityBody);
    } catch (error) {
      console.warn('[TMA]: updateTheme', error);
    }
  }

  private static async initViewport(): Promise<void> {
    try {
      const [viewport] = initViewport();
      this.viewport = await viewport;
      console.info('[TMA]: Viewport was initialized');
    } catch (error) {
      console.warn('[TMA]: initViewport', error);
    }
  }

  private static setReferrer(referrerAddress?: string): void {
    if (referrerAddress && api.validateAddress(referrerAddress)) {
      store.commit.referrals.setStorageReferrer(referrerAddress);
      console.info('[TMA]: Referrer was set', referrerAddress);
    }
  }
}
