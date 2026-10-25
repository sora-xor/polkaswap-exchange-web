import notificationService, { type NotificationSeverity } from '@/services/notification';
import { useNotificationStore } from '@/stores/notification';
import { AppError } from '@/util';
import { reloadPage } from '@/utils/window';

import { useTranslation } from './useTranslation';

export type AsyncFnWithoutArgs = () => Promise<unknown>;

const DEFAULT_ERROR_KEY = 'unknownErrorText';

/**
 * Shared notification composable that wraps the low-level notification service
 * with translated error handling helpers and alert fallbacks.
 */
export function useNotification() {
  const store = useNotificationStore();
  const { t, te } = useTranslation();

  const resolveDefaultErrorKey = (): string => store.defaultErrorTranslationKey || DEFAULT_ERROR_KEY;

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AppError) {
      return t(error.key, error.payload);
    }

    if (error instanceof Error) {
      const { message } = error;
      if (message && te(message)) {
        return t(message);
      }

      const mapping = message ? store.resolveErrorMapping(message) : undefined;
      if (mapping) {
        return t(mapping.translationKey);
      }
    }

    console.error(error);

    return t(resolveDefaultErrorKey());
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
          reloadPage();
        },
      });
      if (throwable) throw error;
    }
  };

  return {
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
