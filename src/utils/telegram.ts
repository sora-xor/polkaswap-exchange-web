import { api } from '@soramitsu/soraneo-wallet-web';
import { setDebug, initViewport, initInitData, initMiniApp } from '@tma.js/sdk';

import store from '@/store';

/**
 * Update the theme of the Telegram Mini App using `var(--s-color-utility-body)`
 */
export function updateTgTheme(): void {
  const [miniApp] = initMiniApp();
  const colorUtilityBody =
    (getComputedStyle(document.documentElement).getPropertyValue('--s-color-utility-body') as `#${string}`) ||
    '#000000'; // Default color // f7f3f4
  console.info('Theme color:', colorUtilityBody);
  miniApp.setHeaderColor(colorUtilityBody);
  miniApp.setBgColor(colorUtilityBody);
}

export async function initTMA(botUrl?: string, isDebug = false): Promise<void> {
  // Expand the Mini App to the maximum available height
  const [viewport] = initViewport();
  const viewportInstance = await viewport;
  viewportInstance.expand();
  // Set theme
  updateTgTheme();
  // Enable debugging
  setDebug(isDebug);
  // Check the referrer
  const initData = initInitData();
  const referrerAddress = initData?.startParam;
  console.info('Referrer address:', referrerAddress);
  if (referrerAddress && api.validateAddress(referrerAddress)) {
    store.commit.referrals.setStorageReferrer(referrerAddress);
  }
  // Set the Telegram bot URL
  if (botUrl) {
    store.commit.settings.setTelegramBotUrl(botUrl);
  }
}
