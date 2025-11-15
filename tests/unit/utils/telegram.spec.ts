import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const storageStub = () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  remove: vi.fn(),
});

vi.mock('@wallet', async () => {
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
  commit: {
    settings: {
      enableTMA: vi.fn(),
      disableTMA: vi.fn(),
      setTelegramBotUrl: vi.fn(),
      setIsRotatePhoneHideBalanceFeatureEnabled: vi.fn(),
      setAccessGranted: vi.fn(),
      setIsAccessAccelerometrEventDeclined: vi.fn(),
    },
    wallet: {
      account: {
        setIsDesktop: vi.fn(),
        syncWithStorage: vi.fn(),
      },
      settings: {
        toggleHideBalance: vi.fn(),
      },
    },
    referrals: {
      setStorageReferrer: vi.fn(),
    },
  },
  state: {
    settings: {
      isRotatePhoneHideBalanceFeatureEnabled: false,
      isAccessRotationListener: false,
      isAccessAccelerometrEventDeclined: false,
    },
  },
}));

vi.mock('@/store', () => ({
  default: mockStore,
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
});
