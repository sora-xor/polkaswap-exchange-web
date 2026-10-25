import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const walletNotificationMocks = vi.hoisted(() => ({
  notifyMock: vi.fn(),
  alertMock: vi.fn(),
  tMock: vi.fn((key: string, payload?: Record<string, unknown>) =>
    payload ? `${key}:${JSON.stringify(payload)}` : key
  ),
  teMock: vi.fn((key: string) => key === 'translated.message'),
  resolveErrorMappingMock: vi.fn(),
  setDefaultErrorTranslationKeyMock: vi.fn(),
  registerErrorMappingMock: vi.fn(),
  replaceErrorMappingsMock: vi.fn(),
}));

vi.mock('@/services/notification', () => ({
  default: {
    notify: (...args: unknown[]) => walletNotificationMocks.notifyMock(...args),
    alert: (...args: unknown[]) => walletNotificationMocks.alertMock(...args),
  },
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    language: { value: 'en' },
    TranslationConsts: {},
    t: (...args: Parameters<typeof walletNotificationMocks.tMock>) => walletNotificationMocks.tMock(...args),
    tc: vi.fn(),
    te: (...args: Parameters<typeof walletNotificationMocks.teMock>) => walletNotificationMocks.teMock(...args),
    dayjsLocale: { value: 'en' },
    formatDate: vi.fn(),
  }),
}));

vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    defaultErrorTranslationKey: 'unknownErrorText',
    resolveErrorMapping: (...args: Parameters<typeof walletNotificationMocks.resolveErrorMappingMock>) =>
      walletNotificationMocks.resolveErrorMappingMock(...args),
    setDefaultErrorTranslationKey: walletNotificationMocks.setDefaultErrorTranslationKeyMock,
    registerErrorMapping: walletNotificationMocks.registerErrorMappingMock,
    replaceErrorMappings: walletNotificationMocks.replaceErrorMappingsMock,
  }),
}));

import { AppError } from '@/util';
import { useNotification } from '@/lib/soraneo-wallet/src/composables/useNotification';

describe('wallet useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('translates AppErrors, direct translation keys, mapped errors, and unknown values', () => {
    const notification = useNotification();

    expect(notification.getErrorMessage(new AppError({ key: 'errors.custom', payload: { code: 7 } }))).toBe(
      'errors.custom:{"code":7}'
    );
    expect(notification.getErrorMessage(new Error('translated.message'))).toBe('translated.message');

    walletNotificationMocks.teMock.mockReturnValue(false);
    walletNotificationMocks.resolveErrorMappingMock.mockReturnValue({ translationKey: 'errors.mapped' });
    expect(notification.getErrorMessage(new Error('mapped boom'))).toBe('errors.mapped');

    walletNotificationMocks.resolveErrorMappingMock.mockReturnValue(undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(notification.getErrorMessage('mystery')).toBe('unknownErrorText');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('wraps tasks with app notifications and rethrows when requested', async () => {
    const notification = useNotification();
    const failure = new Error('boom');

    walletNotificationMocks.teMock.mockReturnValue(false);
    walletNotificationMocks.resolveErrorMappingMock.mockReturnValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await notification.withAppNotification(async () => {
      throw failure;
    });

    expect(walletNotificationMocks.notifyMock).toHaveBeenCalledWith({
      message: 'unknownErrorText',
      severity: 'error',
    });

    await expect(
      notification.withAppNotification(async () => {
        throw failure;
      }, true)
    ).rejects.toBe(failure);
  });

  it('shows alerts for fatal flows and exposes the reload callback', async () => {
    const notification = useNotification();
    const reloadMock = vi.fn();
    const originalLocation = window.location;

    walletNotificationMocks.teMock.mockReturnValue(false);
    walletNotificationMocks.resolveErrorMappingMock.mockReturnValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    await notification.withAppAlert(async () => {
      throw new Error('fatal');
    });

    const alertPayload = walletNotificationMocks.alertMock.mock.calls[0]?.[0];
    expect(alertPayload).toMatchObject({
      message: 'unknownErrorText',
      title: 'errorText',
      cancelText: 'cancelText',
      confirmText: 'provider.messages.reloadPage',
    });

    alertPayload?.onConfirm?.();
    expect(reloadMock).toHaveBeenCalledTimes(1);

    await expect(
      notification.withAppAlert(async () => {
        throw new Error('fatal');
      }, true)
    ).rejects.toThrow('fatal');
  });

  it('exposes direct notification helpers and store passthrough methods', () => {
    const notification = useNotification();

    notification.showAppNotification('hello', 'success');
    notification.showAppAlert('alert message', 'title');
    notification.setDefaultErrorTranslationKey('custom.key');
    notification.registerErrorMapping({ pattern: 'foo', translationKey: 'bar' });
    notification.replaceErrorMappings([{ pattern: 'a', translationKey: 'b' }]);

    expect(walletNotificationMocks.notifyMock).toHaveBeenCalledWith({ message: 'hello', severity: 'success' });
    expect(walletNotificationMocks.alertMock).toHaveBeenCalledWith({ message: 'alert message', title: 'title' });
    expect(walletNotificationMocks.setDefaultErrorTranslationKeyMock).toHaveBeenCalledWith('custom.key');
    expect(walletNotificationMocks.registerErrorMappingMock).toHaveBeenCalledWith({
      pattern: 'foo',
      translationKey: 'bar',
    });
    expect(walletNotificationMocks.replaceErrorMappingsMock).toHaveBeenCalledWith([
      { pattern: 'a', translationKey: 'b' },
    ]);
  });
});
