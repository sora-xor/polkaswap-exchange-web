import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWalletPiniaStoreMock, useWalletStoreMock, resolveGlobalPiniaMock, sharedPinia } = vi.hoisted(() => ({
  getWalletPiniaStoreMock: vi.fn(),
  useWalletStoreMock: vi.fn(),
  resolveGlobalPiniaMock: vi.fn(),
  sharedPinia: { id: 'shared-pinia' },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: resolveGlobalPiniaMock,
}));

describe('wallet lib AlertsApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveGlobalPiniaMock.mockReturnValue(sharedPinia);
    useWalletStoreMock.mockImplementation(() => getWalletPiniaStoreMock());
  });

  it('uses the Pinia wallet store to mark matching alerts as notified', async () => {
    const setPriceAlertAsNotified = vi.fn();

    getWalletPiniaStoreMock.mockReturnValue({
      alerts: [{ token: 'XOR', price: '1', type: 'raise', wasNotified: false, once: false }],
      whitelistIdsBySymbol: {
        XOR: 'xor',
      },
      whitelist: {
        xor: { address: 'xor', symbol: 'XOR' },
      },
      removePriceAlert: vi.fn(),
      setPriceAlertAsNotified,
    });

    const alertsService = (await import('@/lib/soraneo-wallet/src/services/alerts')).default;
    vi.spyOn(alertsService, 'pushNotification').mockResolvedValue();

    const subscription = alertsService.createPriceAlertSubscription();
    subscription.next({ xor: '2000000000000000000' } as never);

    expect(alertsService.pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'xor' }),
      expect.stringContaining('raised')
    );
    expect(setPriceAlertAsNotified).toHaveBeenCalledWith({ position: 0, value: true });
  });
});
