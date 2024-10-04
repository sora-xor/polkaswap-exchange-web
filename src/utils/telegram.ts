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
  private deviceOrientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  public async init(botUrl?: string): Promise<void> {
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

      if (
        store.state.settings.isRotatePhoneHideBalanceFeatureEnabled &&
        store.state.settings.isAccessRotationListener
      ) {
        this.listenForDeviceRotation();
      } else if (
        !store.state.settings.isAccessRotationListener &&
        store.state.settings.isAccessAccelerometrEventDeclined
      ) {
        const accessGranted = await this.checkAccelerometerAccess();
        if (accessGranted) {
          this.listenForDeviceRotation();
          store.commit.settings.setIsRotatePhoneHideBalanceFeatureEnabled(true);
          store.commit.settings.setAccessGranted(true);
          store.commit.settings.setIsAccessAccelerometrEventDeclined(false);
        }
      }
    } catch (error) {
      console.warn('[TMA]: disabling TMA mode because of the error:', error);
      store.commit.settings.disableTMA();
      store.commit.wallet.account.setIsDesktop(false);
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

  public checkAccelerometerSupport(): boolean {
    return 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window;
  }

  public listenForDeviceRotation(): void {
    let wasRotatedTo180 = false;

    this.deviceOrientationHandler = (event: DeviceOrientationEvent) => {
      const { beta } = event;

      if (beta !== null) {
        if (Math.abs(beta) > 170 && !wasRotatedTo180) {
          wasRotatedTo180 = true;
        }

        if (wasRotatedTo180 && Math.abs(beta) < 30) {
          useHaptic('soft');
          store.commit.wallet.settings.toggleHideBalance();
          store.commit.wallet.account.syncWithStorage();
          wasRotatedTo180 = false;
        }
      }
    };

    window.addEventListener('deviceorientation', this.deviceOrientationHandler);
  }

  public removeDeviceRotationListener(): void {
    if (this.deviceOrientationHandler) {
      window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
      this.deviceOrientationHandler = null;
    }
  }

  private async checkAccelerometerAccess(): Promise<boolean> {
    let hasAccess = false;

    try {
      if ('permissions' in navigator && navigator.permissions.query) {
        try {
          const permissionStatus = await (navigator.permissions.query as any)({ name: 'accelerometer' });
          hasAccess = permissionStatus.state === 'granted';
        } catch (permissionError) {
          console.warn('Error querying accelerometer permission:', permissionError);
        }
      } else {
        console.warn('Permissions API is not available in this environment.');
      }

      if (!hasAccess) {
        try {
          const sensor = new (window as any).Accelerometer({ frequency: 60 });

          sensor.onreading = () => {
            hasAccess = true;
            sensor.stop();
          };

          sensor.onerror = (event: { error: any }) => {
            console.error('Accelerometer error:', event.error);
          };

          sensor.start();

          // Wait for a short duration to see if readings are available
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
          sensor.stop();
        } catch (sensorError) {
          console.error('Accelerometer not supported or permission denied:', sensorError);
        }
      }

      return hasAccess;
    } catch (error) {
      console.error('Unexpected error during accelerometer check:', error);
      return false;
    }
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
    this.removeDeviceRotationListener();
  }
}

const tmaSdkService = new TmaSdk();

export { tmaSdkService };
