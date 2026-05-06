import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { validateAddressMock } = vi.hoisted(() => ({
  validateAddressMock: vi.fn(() => false),
}));

const storageStub = () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  remove: vi.fn(),
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      validateAddress: validateAddressMock,
    },
    storage: storageStub(),
    settingsStorage: storageStub(),
  });
});

const mockStore = vi.hoisted(() => ({
  settings: {
    enableTMA: vi.fn(),
    disableTMA: vi.fn(),
    setTelegramBotUrl: vi.fn(),
    setIsRotatePhoneHideBalanceFeatureEnabled: vi.fn(),
    setAccessGranted: vi.fn(),
    setIsAccessAccelerometrEventDeclined: vi.fn(),
    isRotatePhoneHideBalanceFeatureEnabled: false,
    isAccessRotationListener: false,
    isAccessAccelerometrEventDeclined: false,
  },
  wallet: {
    setIsDesktop: vi.fn(),
    syncAccountWithStorage: vi.fn(),
    toggleHideBalance: vi.fn(),
  },
  referrals: {
    setStorageReferrer: vi.fn(),
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mockStore.settings,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => mockStore.wallet,
}));

vi.mock('@/stores/referrals', () => ({
  useReferralsStore: () => mockStore.referrals,
}));

vi.mock('@/plugins/pinia', () => ({
  default: {},
}));

describe('tmaSdkService', () => {
  let originalTelegram: unknown;
  let originalDeviceMotionEvent: unknown;
  let originalDeviceOrientationEvent: unknown;

  beforeEach(() => {
    originalTelegram = (window as any).Telegram;
    originalDeviceMotionEvent = (window as any).DeviceMotionEvent;
    originalDeviceOrientationEvent = (window as any).DeviceOrientationEvent;
    delete (window as any).Telegram;
    delete (window as any).DeviceMotionEvent;
    delete (window as any).DeviceOrientationEvent;
    validateAddressMock.mockReturnValue(false);
    mockStore.settings.isRotatePhoneHideBalanceFeatureEnabled = false;
    mockStore.settings.isAccessRotationListener = false;
    mockStore.settings.isAccessAccelerometrEventDeclined = false;
    Object.values(mockStore).forEach((store) => {
      Object.values(store).forEach((value) => {
        if (typeof value === 'function' && 'mockReset' in value) {
          value.mockReset();
        }
      });
    });
  });

  afterEach(async () => {
    const { tmaSdkService } = await import('@/utils/telegram');
    tmaSdkService.removeThemeListener();
    tmaSdkService.destroy();
    (window as any).Telegram = originalTelegram;
    (window as any).DeviceMotionEvent = originalDeviceMotionEvent;
    (window as any).DeviceOrientationEvent = originalDeviceOrientationEvent;
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('useHaptic does not throw when Telegram SDK is unavailable', async () => {
    const { tmaSdkService } = await import('@/utils/telegram');

    expect(() => tmaSdkService.useHaptic('light')).not.toThrow();
  });

  test('init uses Pinia facades when Telegram mini app is available', async () => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        initDataUnsafe: {
          start_param: 'not-a-valid-address',
        },
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    await tmaSdkService.init('https://t.me/polkaswap_bot');

    expect(mockStore.settings.enableTMA).toHaveBeenCalledTimes(1);
    expect(mockStore.wallet.setIsDesktop).toHaveBeenCalledWith(true);
    expect(mockStore.settings.setTelegramBotUrl).toHaveBeenCalledWith('https://t.me/polkaswap_bot');
  });

  test('init skips setup when Telegram init data is unavailable', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    (window as any).Telegram = {
      WebApp: {
        expand: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    await tmaSdkService.init();

    expect(info).toHaveBeenCalledWith('[TMA]: Not a Telegram Mini App, skipping initialization');
    expect(mockStore.settings.enableTMA).not.toHaveBeenCalled();
  });

  test('init stores a valid referrer and rolls back TMA mode when setup fails', async () => {
    validateAddressMock.mockReturnValue(true);
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        initDataUnsafe: {
          start_param: 'cnValidReferrer',
        },
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    await tmaSdkService.init();

    expect(mockStore.referrals.setStorageReferrer).toHaveBeenCalledWith('cnValidReferrer');

    mockStore.settings.enableTMA.mockImplementationOnce(() => {
      throw new Error('settings unavailable');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await tmaSdkService.init();

    expect(warn).toHaveBeenCalledWith('[TMA]: disabling TMA mode because of the error:', expect.any(Error));
    expect(mockStore.settings.disableTMA).toHaveBeenCalledTimes(1);
    expect(mockStore.wallet.setIsDesktop).toHaveBeenLastCalledWith(false);
  });

  test('init registers rotation listener when rotation access is already granted', async () => {
    mockStore.settings.isRotatePhoneHideBalanceFeatureEnabled = true;
    mockStore.settings.isAccessRotationListener = true;
    const addEventListener = vi.spyOn(window, 'addEventListener');
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    await tmaSdkService.init();

    expect(addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
  });

  test('init requests accelerometer access after a declined prompt and enables rotation hiding when granted', async () => {
    mockStore.settings.isAccessRotationListener = false;
    mockStore.settings.isAccessAccelerometrEventDeclined = true;
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const queryPermission = vi.fn().mockResolvedValue({ state: 'granted' });
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...(originalNavigator?.value as Navigator),
        permissions: {
          query: queryPermission,
        },
      },
    });
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    try {
      await tmaSdkService.init();
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, 'navigator', originalNavigator);
      }
    }

    expect(queryPermission).toHaveBeenCalledWith({ name: 'accelerometer' });
    expect(addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function));
    expect(mockStore.settings.setIsRotatePhoneHideBalanceFeatureEnabled).toHaveBeenCalledWith(true);
    expect(mockStore.settings.setAccessGranted).toHaveBeenCalledWith(true);
    expect(mockStore.settings.setIsAccessAccelerometrEventDeclined).toHaveBeenCalledWith(false);
  });

  test('init falls back to the Accelerometer sensor when permissions are denied', async () => {
    vi.useFakeTimers();
    mockStore.settings.isAccessRotationListener = false;
    mockStore.settings.isAccessAccelerometrEventDeclined = true;
    const sensorStop = vi.fn();
    const sensorStart = vi.fn(function (this: { onreading?: () => void }) {
      this.onreading?.();
    });
    const AccelerometerMock = vi.fn(function () {
      return {
        start: sensorStart,
        stop: sensorStop,
        onreading: null,
        onerror: null,
      };
    });
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...(originalNavigator?.value as Navigator),
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'denied' }),
        },
      },
    });
    (window as any).Accelerometer = AccelerometerMock;
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    try {
      const pending = tmaSdkService.init();
      await vi.advanceTimersByTimeAsync(1000);
      await pending;
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, 'navigator', originalNavigator);
      }
      delete (window as any).Accelerometer;
    }

    expect(AccelerometerMock).toHaveBeenCalledWith({ frequency: 60 });
    expect(sensorStart).toHaveBeenCalledTimes(1);
    expect(sensorStop).toHaveBeenCalled();
    expect(mockStore.settings.setAccessGranted).toHaveBeenCalledWith(true);
  });

  test('routes haptic feedback to notification and impact Telegram APIs', async () => {
    const notificationOccurred = vi.fn();
    const impactOccurred = vi.fn();
    (window as any).Telegram = {
      WebApp: {
        HapticFeedback: {
          notificationOccurred,
          impactOccurred,
        },
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    tmaSdkService.useHaptic('success');
    tmaSdkService.useHaptic('soft');

    expect(notificationOccurred).toHaveBeenCalledWith('success');
    expect(impactOccurred).toHaveBeenCalledWith('soft');
  });

  test('logs haptic feedback errors instead of throwing', async () => {
    const error = new Error('haptic unavailable');
    (window as any).Telegram = {
      WebApp: {
        HapticFeedback: {
          impactOccurred: vi.fn(() => {
            throw error;
          }),
        },
      },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { tmaSdkService } = await import('@/utils/telegram');

    expect(() => tmaSdkService.useHaptic('light')).not.toThrow();
    expect(warn).toHaveBeenCalledWith('[TMA]: useHapticFeedback', error);
  });

  test('listens for Telegram theme changes and removes the listener', async () => {
    const applyTheme = vi.fn();
    (window as any).Telegram = {
      WebView: {
        receiveEvent: null,
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    tmaSdkService.listenForThemeChanges(applyTheme);
    (window as any).Telegram.WebView.receiveEvent('theme_changed', { theme_params: { bg_color: -2 } });
    (window as any).Telegram.WebView.receiveEvent('viewport_changed', { theme_params: { bg_color: 1 } });

    expect(applyTheme).toHaveBeenCalledWith(true);

    tmaSdkService.removeThemeListener();

    expect((window as any).Telegram.WebView.receiveEvent).toBeNull();
  });

  test('updates Telegram colors from the document theme variable', async () => {
    const setHeaderColor = vi.fn();
    const setBackgroundColor = vi.fn();
    document.documentElement.style.setProperty('--s-color-utility-body', '#101820');
    (window as any).Telegram = {
      WebApp: {
        setHeaderColor,
        setBackgroundColor,
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    tmaSdkService.updateTheme();

    expect(setHeaderColor).toHaveBeenCalledWith('#101820');
    expect(setBackgroundColor).toHaveBeenCalledWith('#101820');
  });

  test('opens Telegram share links and logs open failures', async () => {
    const openLink = vi.fn();
    (window as any).Telegram = {
      WebApp: {
        openLink,
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');

    tmaSdkService.shareLink('https://polkaswap.io', 'Swap on SORA');

    expect(openLink).toHaveBeenCalledWith('https://t.me/share/url?url=https://polkaswap.io&text=Swap%20on%20SORA');

    const error = new Error('blocked');
    openLink.mockImplementationOnce(() => {
      throw error;
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    tmaSdkService.shareLink('https://polkaswap.io');

    expect(warn).toHaveBeenCalledWith('[TMA]: shareLink', error);
  });

  test('reports accelerometer support from browser motion APIs', async () => {
    const { tmaSdkService } = await import('@/utils/telegram');

    expect(tmaSdkService.checkAccelerometerSupport()).toBe(false);

    (window as any).DeviceOrientationEvent = class {};

    expect(tmaSdkService.checkAccelerometerSupport()).toBe(true);
  });

  test('device rotation listener hides balances after rotating back upright', async () => {
    const impactOccurred = vi.fn();
    (window as any).Telegram = {
      WebApp: {
        HapticFeedback: {
          impactOccurred,
        },
      },
    };

    const { tmaSdkService } = await import('@/utils/telegram');
    const createOrientationEvent = (beta: number) => {
      const event = new Event('deviceorientation');
      Object.defineProperty(event, 'beta', { value: beta });
      return event;
    };

    tmaSdkService.listenForDeviceRotation();
    window.dispatchEvent(createOrientationEvent(175));
    window.dispatchEvent(createOrientationEvent(10));

    expect(impactOccurred).toHaveBeenCalledWith('soft');
    expect(mockStore.wallet.toggleHideBalance).toHaveBeenCalledTimes(1);
    expect(mockStore.wallet.syncAccountWithStorage).toHaveBeenCalledTimes(1);

    tmaSdkService.removeDeviceRotationListener();
    window.dispatchEvent(createOrientationEvent(175));
    window.dispatchEvent(createOrientationEvent(10));

    expect(mockStore.wallet.toggleHideBalance).toHaveBeenCalledTimes(1);
  });

  test('haptic touch listener reacts to clickable ancestors and is removed by destroy', async () => {
    const impactOccurred = vi.fn();
    (window as any).Telegram = {
      WebApp: {
        initData: 'telegram-init',
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
        HapticFeedback: {
          impactOccurred,
        },
      },
    };
    const button = document.createElement('button');
    const label = document.createElement('span');
    button.appendChild(label);
    document.body.appendChild(button);

    const { tmaSdkService } = await import('@/utils/telegram');

    await tmaSdkService.init();
    label.dispatchEvent(new Event('touchend', { bubbles: true }));

    expect(impactOccurred).toHaveBeenCalledWith('soft');

    impactOccurred.mockClear();
    tmaSdkService.destroy();
    label.dispatchEvent(new Event('touchend', { bubbles: true }));

    expect(impactOccurred).not.toHaveBeenCalled();
  });
});
