import { api } from '@soramitsu/soraneo-wallet-web';
import {
  setDebug,
  initViewport,
  initMiniApp,
  initWeb,
  isIframe,
  retrieveLaunchParams,
  initUtils,
  initSwipeBehavior,
  isTMA,
  type MiniApp,
  type LaunchParams,
  type Utils,
  type Viewport,
  type SwipeBehavior,
} from '@telegram-apps/sdk';

import store from '@/store';

class TmaSdk {
  public miniApp: Nullable<MiniApp>;
  public viewport: Nullable<Viewport>;
  public launchParams: Nullable<LaunchParams>;
  public swipeBehavior: Nullable<SwipeBehavior>;
  private utils: Nullable<Utils>;

  public async init(botUrl?: string, isDebug = false): Promise<void> {
    try {
      // Check if the current platform is Telegram Mini App
      const isTma = await isTMA();
      if (!isTma) {
        console.info('[TMA]: initTMA: Not a Telegram Mini App');
        return;
      }
      store.commit.settings.enableTMA();
      store.commit.wallet.account.setIsDesktop(true);
      // Initialize the app in the web version of Telegram
      if (isIframe()) {
        initWeb();
        console.info('[TMA]: initTMA: Web version of Telegram');
      }
      // Init viewport and expand it to the full screen
      await this.initViewport();
      this.viewport?.expand();
      // Init mini app
      const [miniApp] = initMiniApp();
      this.miniApp = miniApp;
      console.info('[TMA]: Mini app was initialized');
      // Set theme
      this.updateTheme();
      // Init swipe behavior and disable vertical swipe
      this.initSwipeBehavior();
      this.swipeBehavior?.disableVerticalSwipe();
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
  public updateTheme(): void {
    try {
      const colorUtilityBody =
        (getComputedStyle(document.documentElement).getPropertyValue('--s-color-utility-body') as `#${string}`) ||
        '#f7f3f4'; // Default color

      this.miniApp?.setHeaderColor(colorUtilityBody);
      this.miniApp?.setBgColor(colorUtilityBody);
    } catch (error) {
      console.warn('[TMA]: updateTheme', error);
    }
  }

  public shareLink(url: string, text?: string): void {
    try {
      this.utils?.shareURL(url, text ? encodeURIComponent(text) : text);
    } catch (error) {
      console.warn('[TMA]: shareLink', error);
    }
  }

  private async initViewport(): Promise<void> {
    try {
      const [viewport] = initViewport();
      this.viewport = await viewport;
      console.info('[TMA]: Viewport was initialized');
    } catch (error) {
      console.warn('[TMA]: initViewport', error);
    }
  }

  private initSwipeBehavior(): void {
    try {
      const [swipeBehavior] = initSwipeBehavior();
      this.swipeBehavior = swipeBehavior;
      console.info('[TMA]: Swipe behavior was initialized');
    } catch (error) {
      console.warn('[TMA]: initSwipeBehavior', error);
    }
  }

  private setReferrer(referrerAddress?: string): void {
    if (referrerAddress && api.validateAddress(referrerAddress)) {
      store.commit.referrals.setStorageReferrer(referrerAddress);
      console.info('[TMA]: Referrer was set', referrerAddress);
    }
  }
}

const tmaSdkService = new TmaSdk();

export { tmaSdkService };
