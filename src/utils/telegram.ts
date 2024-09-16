import { api } from '@soramitsu/soraneo-wallet-web';

import store from '@/store';

enum HapticStatusValue {
  success = 'success',
  warning = 'warning',
  error = 'error',
}

type HapticFeedbackStatus = keyof typeof HapticStatusValue;

export type HapticFeedbackBinding = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | HapticFeedbackStatus;

const HapticNotificationTypes: string[] = Object.values(HapticStatusValue);

const HapticButtonSelector =
  'button, a, [role="button"], [role="tab"], [role="radio"], [role="switch"], .el-button, .el-dropdown-menu__item, .s-clickable, .clickable, .s-input';

function isNotification(value: HapticFeedbackBinding): value is HapticFeedbackStatus {
  return HapticNotificationTypes.includes(value);
}

function useHaptic(type: HapticFeedbackBinding): void {
  const HapticFeedback = Telegram?.WebApp?.HapticFeedback;
  if (!HapticFeedback) {
    return;
  }
  try {
    if (isNotification(type)) {
      HapticFeedback?.notificationOccurred(type);
      return;
    }
    HapticFeedback?.impactOccurred(type);
  } catch (error) {
    console.warn('[TMA]: useHapticFeedback', error);
  }
}

class TmaSdk {
  public init(botUrl?: string): void {
    try {
      // Check if the current platform is Telegram Mini App
      const WebApp = Telegram?.WebApp;
      if (!WebApp?.initData) {
        console.info('[TMA]: Not a Telegram Mini App, skipping initialization');
        return;
      }
      // Expand viewport to the full screen
      WebApp?.expand?.();
      // Disable vertical swipe if possible
      WebApp?.disableVerticalSwipes?.();
      store.commit.settings.enableTMA();
      store.commit.wallet.account.setIsDesktop(true);
      console.info('[TMA]: Mini app was initialized');
      // Set theme
      this.updateTheme();
      // Check the referrer
      this.setReferrer(WebApp?.initDataUnsafe?.start_param);
      // Set the Telegram bot URL
      if (botUrl) {
        store.commit.settings.setTelegramBotUrl(botUrl);
      }
      // Init haptic feedback
      this.addHapticListener();
      this.addOrientationListener();
    } catch (error) {
      console.warn('[TMA]: disabling TMA mode because of the error:', error);
      store.commit.settings.disableTMA();
      store.commit.wallet.account.setIsDesktop(false);
    }
  }

  private addOrientationListener(): void {
    console.info('we are in addOrientationListener');
    window.addEventListener('resize', this.handleOrientationChange);
    this.handleOrientationChange();
  }

  private removeOrientationListener(): void {
    console.info('we removed removeOrientationListener');
    window.removeEventListener('resize', this.handleOrientationChange);
  }

  private handleOrientationChange(): void {
    const isLandscape = window.innerHeight < window.innerWidth;
    console.info('the landscape is');
    console.info(isLandscape);
    if (isLandscape) {
      console.info('we will show showOrientationWarning');
      store.commit.settings.showOrientationWarning();
    } else {
      console.info('we will hide hideOrientationWarning');
      store.commit.settings.hideOrientationWarning();
    }
  }

  /**
   * Update the theme of the Telegram Mini App using `var(--s-color-utility-body)`
   */
  public updateTheme(): void {
    try {
      const colorUtilityBody =
        (getComputedStyle(document.documentElement).getPropertyValue('--s-color-utility-body') as `#${string}`) ||
        '#f7f3f4'; // Default color
      const WebApp = Telegram?.WebApp;
      WebApp?.setHeaderColor(colorUtilityBody);
      WebApp?.setBackgroundColor(colorUtilityBody);
    } catch (error) {
      console.warn('[TMA]: updateTheme', error);
    }
  }

  public shareLink(url: string, text?: string): void {
    try {
      const desc = text ? encodeURIComponent(text) : text;
      Telegram?.WebApp?.openLink(`https://t.me/share/url?url=${url}&text=${desc}`);
    } catch (error) {
      console.warn('[TMA]: shareLink', error);
    }
  }

  public useHaptic(type: HapticFeedbackBinding): void {
    useHaptic(type);
  }

  private onTouchEnd(event: TouchEvent): void {
    let clickedElement = event.target as Nullable<HTMLElement>;

    while (clickedElement) {
      if (clickedElement.matches(HapticButtonSelector)) {
        useHaptic('soft');
        return;
      }
      clickedElement = clickedElement.parentElement as Nullable<HTMLElement>;
    }
  }

  private addHapticListener(): void {
    console.info('[TMA]: Haptic listener was added');
    document.addEventListener('touchend', this.onTouchEnd);
  }

  private removeHapticListener(): void {
    document.removeEventListener('touchend', this.onTouchEnd);
  }

  private setReferrer(referrerAddress?: string): void {
    if (referrerAddress && api.validateAddress(referrerAddress)) {
      store.commit.referrals.setStorageReferrer(referrerAddress);
      console.info('[TMA]: Referrer was set', referrerAddress);
    }
  }

  public destroy(): void {
    this.removeHapticListener();
    this.removeOrientationListener();
  }
}

const tmaSdkService = new TmaSdk();

export { tmaSdkService };
