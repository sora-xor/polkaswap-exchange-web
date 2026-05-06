import { describe, expect, it, vi } from 'vitest';

const loadNotificationService = async () => {
  vi.resetModules();
  return import('@/lib/soraneo-wallet/src/services/notification');
};

describe('wallet services/notification', () => {
  it('queues notifications until handlers are registered and normalizes severities', async () => {
    const { default: notificationService, NOTIFICATION_STATUS } = await loadNotificationService();
    const toastHandler = vi.fn();
    const alertHandler = vi.fn();
    const onConfirm = vi.fn();

    notificationService.notify({
      message: 'queued toast',
      title: 'Toast',
      severity: 'warning',
      timeout: 3000,
      showCloseBtn: false,
    });
    notificationService.alert({
      message: 'queued alert',
      title: 'Alert',
      confirmText: 'Continue',
      cancelText: 'Cancel',
      onConfirm,
    });

    notificationService.registerToastHandler(toastHandler);
    notificationService.registerAlertHandler(alertHandler);

    expect(toastHandler).toHaveBeenCalledWith({
      message: 'queued toast',
      title: 'Toast',
      status: NOTIFICATION_STATUS.Warning,
      timeout: 3000,
      showCloseBtn: false,
    });
    expect(alertHandler).toHaveBeenCalledWith({
      message: 'queued alert',
      title: 'Alert',
      status: NOTIFICATION_STATUS.Error,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      onConfirm,
    });
  });

  it('unregisters only the active handler and replays newly queued events to the next handler', async () => {
    const { default: notificationService, NOTIFICATION_STATUS } = await loadNotificationService();
    const firstToastHandler = vi.fn();
    const secondToastHandler = vi.fn();
    const unregisterFirstToast = notificationService.registerToastHandler(firstToastHandler);
    const unregisterSecondToast = notificationService.registerToastHandler(secondToastHandler);

    unregisterFirstToast();
    notificationService.notify({ message: 'live toast', severity: NOTIFICATION_STATUS.Success });

    expect(firstToastHandler).not.toHaveBeenCalled();
    expect(secondToastHandler).toHaveBeenCalledWith({
      message: 'live toast',
      title: undefined,
      status: NOTIFICATION_STATUS.Success,
      timeout: undefined,
      showCloseBtn: undefined,
    });

    unregisterSecondToast();
    notificationService.notify({ message: 'replayed toast', severity: 'custom' as any });

    const replayToastHandler = vi.fn();
    notificationService.registerToastHandler(replayToastHandler);

    expect(replayToastHandler).toHaveBeenCalledWith({
      message: 'replayed toast',
      title: undefined,
      status: 'custom',
      timeout: undefined,
      showCloseBtn: undefined,
    });
  });
});
