import { api } from '@soramitsu/soraneo-wallet-web';
import {
  setDebug,
  initViewport,
  initMiniApp,
  initWeb,
  isIframe,
  retrieveLaunchParams,
  initUtils,
  type MiniApp,
  type LaunchParams,
  type Utils,
  type Viewport,
} from '@tma.js/sdk';

import store from '@/store';

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
      // Init viewport
      await this.initViewport();
      // Init mini app
      const [miniApp] = initMiniApp();
      this.miniApp = miniApp;
      console.info('[TMA]: Mini app was initialized');
      // Set theme
      this.updateTheme();
      // Enable debugging
      setDebug(isDebug);
      // Retrieve launch params
      this.launchParams = retrieveLaunchParams();
      console.info('[TMA]: Launch params were retrieved');
      // Check the referrer
      this.setReferrer(this.launchParams.startParam);
      // Set the Telegram bot URL
      if (botUrl) {
        store.commit.settings.setTelegramBotUrl(botUrl);
      }
      // Init utils
      this.utils = initUtils();
      console.info('[TMA]: Utils were initialized');
    } catch (error) {
      console.warn('[TMA]: init', error);
    }
  }

  /**
   * **Should be used after `miniApp` init!**
   *
   * Update the theme of the Telegram Mini App using `var(--s-color-utility-body)`
   */
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
