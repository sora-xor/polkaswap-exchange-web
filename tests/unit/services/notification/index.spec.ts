import { describe, expect, it, vi } from 'vitest';

const loadNotificationService = async () => {
  vi.resetModules();
  return import('@/services/notification');
};

describe('services/notification', () => {
  it('queues notifications until handlers are registered and normalizes severities', async () => {
    const { default: notificationService, NOTIFICATION_STATUS } = await loadNotificationService();
    const toastHandler = vi.fn();
    const alertHandler = vi.fn();
    const onConfirm = vi.fn();

    notificationService.notify({ message: 'queued toast' });
    notificationService.notify({
      message: 'queued warning',
      title: 'Warning',
      severity: 'warning',
      timeout: 1000,
      showCloseBtn: false,
    });
    notificationService.alert({
      message: 'queued alert',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
    });

    const unregisterToast = notificationService.registerToastHandler(toastHandler);
    const unregisterAlert = notificationService.registerAlertHandler(alertHandler);

    expect(toastHandler).toHaveBeenNthCalledWith(1, {
      message: 'queued toast',
      title: undefined,
      status: NOTIFICATION_STATUS.Info,
      timeout: undefined,
      showCloseBtn: undefined,
    });
    expect(toastHandler).toHaveBeenNthCalledWith(2, {
      message: 'queued warning',
      title: 'Warning',
      status: NOTIFICATION_STATUS.Warning,
      timeout: 1000,
      showCloseBtn: false,
    });
    expect(alertHandler).toHaveBeenCalledWith({
      message: 'queued alert',
      title: undefined,
      status: NOTIFICATION_STATUS.Error,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
    });

    notificationService.notify({ message: 'live toast', severity: NOTIFICATION_STATUS.Success });
    notificationService.alert({ message: 'live alert', severity: 'info' });

    expect(toastHandler).toHaveBeenLastCalledWith({
      message: 'live toast',
      title: undefined,
      status: NOTIFICATION_STATUS.Success,
      timeout: undefined,
      showCloseBtn: undefined,
    });
    expect(alertHandler).toHaveBeenLastCalledWith({
      message: 'live alert',
      title: undefined,
      status: NOTIFICATION_STATUS.Info,
      confirmText: undefined,
      cancelText: undefined,
      onConfirm: undefined,
    });

    unregisterToast();
    unregisterAlert();
  });

  it('only unregisters the currently active handler and replays queued events to the next handler', async () => {
    const { default: notificationService, NOTIFICATION_STATUS } = await loadNotificationService();
    const firstToastHandler = vi.fn();
    const secondToastHandler = vi.fn();
    const firstAlertHandler = vi.fn();
    const secondAlertHandler = vi.fn();

    const unregisterFirstToast = notificationService.registerToastHandler(firstToastHandler);
    const unregisterFirstAlert = notificationService.registerAlertHandler(firstAlertHandler);
    const unregisterSecondToast = notificationService.registerToastHandler(secondToastHandler);
    const unregisterSecondAlert = notificationService.registerAlertHandler(secondAlertHandler);

    unregisterFirstToast();
    unregisterFirstAlert();

    notificationService.notify({ message: 'after swap', severity: 'success' });
    notificationService.alert({ message: 'after swap alert', severity: NOTIFICATION_STATUS.Warning });

    expect(firstToastHandler).not.toHaveBeenCalled();
    expect(firstAlertHandler).not.toHaveBeenCalled();
    expect(secondToastHandler).toHaveBeenCalledWith({
      message: 'after swap',
      title: undefined,
      status: NOTIFICATION_STATUS.Success,
      timeout: undefined,
      showCloseBtn: undefined,
    });
    expect(secondAlertHandler).toHaveBeenCalledWith({
      message: 'after swap alert',
      title: undefined,
      status: NOTIFICATION_STATUS.Warning,
      confirmText: undefined,
      cancelText: undefined,
      onConfirm: undefined,
    });

    unregisterSecondToast();
    unregisterSecondAlert();

    notificationService.notify({ message: 'replayed toast' });
    notificationService.alert({ message: 'replayed alert' });

    const replayToastHandler = vi.fn();
    const replayAlertHandler = vi.fn();
    notificationService.registerToastHandler(replayToastHandler);
    notificationService.registerAlertHandler(replayAlertHandler);

    expect(replayToastHandler).toHaveBeenCalledWith({
      message: 'replayed toast',
      title: undefined,
      status: NOTIFICATION_STATUS.Info,
      timeout: undefined,
      showCloseBtn: undefined,
    });
    expect(replayAlertHandler).toHaveBeenCalledWith({
      message: 'replayed alert',
      title: undefined,
      status: NOTIFICATION_STATUS.Error,
      confirmText: undefined,
      cancelText: undefined,
      onConfirm: undefined,
    });
  });
});
