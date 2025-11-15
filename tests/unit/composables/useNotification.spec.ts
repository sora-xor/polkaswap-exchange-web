import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const tMock = vi.fn((key: string, payload?: Record<string, unknown>) =>
  payload ? `${key}:${JSON.stringify(payload)}` : key
);
const teMock = vi.fn((key: string) => key === 'translated.message');
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (...args: Parameters<typeof tMock>) => tMock(...args),
    te: (...args: Parameters<typeof teMock>) => teMock(...args),
  }),
}));

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

async function setupNotification() {
  const notificationService = await import('@/services/notification');

  const notifySpy = vi.spyOn(notificationService.default, 'notify').mockImplementation(() => {});
  const alertSpy = vi.spyOn(notificationService.default, 'alert').mockImplementation(() => {});

  const module = await import('@/composables/useNotification');

  return {
    notifySpy,
    alertSpy,
    notification: module.useNotification(),
    cleanup: () => {
      notifySpy.mockRestore();
      alertSpy.mockRestore();
    },
  };
}

describe('useNotification', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    tMock.mockClear();
    teMock.mockClear();
    consoleErrorSpy.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('translates AppErrors with payload metadata', async () => {
    const { notification, cleanup } = await setupNotification();
    const { AppError } = await import('@/util');

    const error = new AppError({ key: 'errors.custom', payload: { code: 42 } });

    expect(notification.getErrorMessage(error)).toBe('errors.custom:{"code":42}');
    cleanup();
  });

  it('prioritises existing translation keys and registered mappings', async () => {
    teMock.mockImplementation((key: string) => key === 'translated.message');

    const { useNotificationStore } = await import('@/stores/notification');
    const { notification, cleanup } = await setupNotification();
    const store = useNotificationStore();

    expect(notification.getErrorMessage(new Error('translated.message'))).toBe('translated.message');

    teMock.mockReturnValue(false);
    store.replaceErrorMappings([]);
    store.registerErrorMapping({ pattern: 'Insufficient', translationKey: 'errors.insufficient' });

    expect(notification.getErrorMessage(new Error('Insufficient balance detected'))).toBe('errors.insufficient');
    cleanup();
  });

  it('logs unexpected values and falls back to the default key', async () => {
    teMock.mockReturnValue(false);

    const { notification, cleanup } = await setupNotification();

    expect(notification.getErrorMessage('mystery')).toBe('unknownErrorText');
    expect(consoleErrorSpy).toHaveBeenCalled();

    cleanup();
  });

  it('wraps tasks with toast notifications and can rethrow', async () => {
    teMock.mockReturnValue(false);
    const { notification, notifySpy, cleanup } = await setupNotification();
    const failure = new Error('boom');

    await notification.withAppNotification(async () => {
      throw failure;
    });

    expect(notifySpy).toHaveBeenCalledWith({ message: 'unknownErrorText', severity: 'error' });

    await expect(
      notification.withAppNotification(async () => {
        throw failure;
      }, true)
    ).rejects.toBe(failure);
    cleanup();
  });

  it('shows alerts for fatal flows and exposes the confirm handler', async () => {
    teMock.mockReturnValue(false);
    const { notification, alertSpy, cleanup } = await setupNotification();
    const reload = vi.fn();
    const windowUtils = await import('@/utils/window');
    const reloadSpy = vi.spyOn(windowUtils, 'reloadPage').mockImplementation(reload);

    await notification.withAppAlert(async () => {
      throw new Error('fatal');
    });

    expect(alertSpy).toHaveBeenCalled();
    const payload = alertSpy.mock.calls[0]?.[0];
    expect(payload?.title).toBe('errorText');
    expect(payload?.confirmText).toBe('provider.messages.reloadPage');
    expect(payload?.cancelText).toBe('cancelText');

    payload?.onConfirm?.();
    expect(reload).toHaveBeenCalledTimes(1);

    reloadSpy.mockRestore();
    cleanup();

    await expect(
      notification.withAppAlert(async () => {
        throw new Error('fatal');
      }, true)
    ).rejects.toThrow();
  });

  it('exposes direct notification helpers', async () => {
    const { notification, notifySpy, alertSpy, cleanup } = await setupNotification();

    notification.showAppNotification('hello', 'success');
    notification.showAppAlert('alert message', 'title');

    expect(notifySpy).toHaveBeenCalledWith({ message: 'hello', severity: 'success' });
    expect(alertSpy).toHaveBeenCalledWith({ message: 'alert message', title: 'title' });
    cleanup();
  });
});
