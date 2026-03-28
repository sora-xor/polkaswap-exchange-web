import { useNotifications } from '@soramitsu-ui/ui';
import { h, onBeforeUnmount } from 'vue';

import notificationService, { NormalizedAlertRequest, NOTIFICATION_STATUS } from '@/services/notification';

import NotificationAlertToast from './NotificationAlertToast.vue';

export default {
  name: 'NotificationBridge',
  setup() {
    const { show } = useNotifications();

    const unregisterToast = notificationService.registerToastHandler(
      ({ message, title, status, timeout, showCloseBtn }) => {
        show({
          title,
          description: message,
          status,
          timeout,
          showCloseBtn: showCloseBtn ?? true,
        });
      }
    );

    const unregisterAlert = notificationService.registerAlertHandler((request: NormalizedAlertRequest) => {
      const { close } = show({
        title: request.title,
        status: request.status ?? NOTIFICATION_STATUS.Error,
        showCloseBtn: true,
        timeout: undefined,
        descriptionSlot: () =>
          h(NotificationAlertToast, {
            message: request.message,
            confirmText: request.confirmText,
            cancelText: request.cancelText,
            onConfirm: () => {
              request.onConfirm?.();
              close();
            },
            onCancel: () => {
              close();
            },
          }),
      });
    });

    onBeforeUnmount(() => {
      unregisterToast();
      unregisterAlert();
    });

    return () => null;
  },
};
