import notificationService, { type NotificationSeverity } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification';
import { AppError } from '@/util';

import { useWalletTranslation } from './useWalletTranslation';

export type AsyncFnWithoutArgs = () => Promise<unknown>;

export function useNotification() {
  const store = useNotificationStore();
  const translation = useWalletTranslation();
  const { t, te } = translation;

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AppError) {
      return t(error.key, error.payload);
    }

    if (error instanceof Error) {
      const errorMessage = error.message;

      if (te(errorMessage)) {
        return t(errorMessage);
      }

      const supportedMessage = store.resolveErrorMapping(errorMessage);

      if (supportedMessage) {
        return t(supportedMessage.translationKey);
      }
    }

    console.error(error);

    return t(store.defaultErrorTranslationKey);
  };

  const showAppAlert = (message: string, title = ''): void => {
    notificationService.alert({
      message,
      title,
    });
  };

  const showAppNotification = (message: string, severity?: NotificationSeverity): void => {
    notificationService.notify({
      message,
      severity,
    });
  };

  const withAppNotification = async (func: AsyncFnWithoutArgs, throwable = false): Promise<void> => {
    try {
      await func();
    } catch (error) {
      const message = getErrorMessage(error);
      showAppNotification(message, 'error');
      if (throwable) throw error;
    }
  };

  const withAppAlert = async (func: AsyncFnWithoutArgs, throwable = false): Promise<void> => {
    try {
      await func();
    } catch (error) {
      const message = getErrorMessage(error);

      notificationService.alert({
        message,
        title: t('errorText'),
        cancelText: t('cancelText'),
        confirmText: t('provider.messages.reloadPage'),
        onConfirm: () => {
          window.location.reload();
        },
      });

      if (throwable) throw error;
    }
  };

  return {
    ...translation,
    getErrorMessage,
    showAppAlert,
    showAppNotification,
    withAppNotification,
    withAppAlert,
    setDefaultErrorTranslationKey: store.setDefaultErrorTranslationKey,
    registerErrorMapping: store.registerErrorMapping,
    replaceErrorMappings: store.replaceErrorMappings,
  };
}
