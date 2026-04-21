import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const storageStub = () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  remove: vi.fn(),
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      validateAddress: vi.fn(() => false),
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
  let dispatchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalTelegram = (window as any).Telegram;
    delete (window as any).Telegram;

    dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockReturnValue(true);
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
    (window as any).Telegram = originalTelegram;
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
});
