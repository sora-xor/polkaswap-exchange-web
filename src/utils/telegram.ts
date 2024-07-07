import { api } from '@soramitsu/soraneo-wallet-web';
import { setDebug, initViewport, initInitData, initMiniApp, initWeb, isIframe } from '@tma.js/sdk';

import store from '@/store';

/**
 * Update the theme of the Telegram Mini App using `var(--s-color-utility-body)`
 */
export function updateTgTheme(): void {
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

export async function initTMA(botUrl?: string, isDebug = false): Promise<void> {
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
