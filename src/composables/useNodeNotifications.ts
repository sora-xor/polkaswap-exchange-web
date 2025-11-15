import { useNotification } from '@/composables/useNotification';
import { useTranslation } from '@/composables/useTranslation';
import type { Node } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';

/**
 * Provides node-related notification helpers previously implemented inside
 * `NodeErrorMixin`.
 */
export function useNodeNotifications() {
  const { t } = useTranslation();
  const notification = useNotification();

  const handleNodeError = (error: unknown, node: Node): void => {
    const isHandled = error instanceof AppHandledError;
    const errorKey = isHandled ? error.translationKey : 'node.errors.connection';
    const payload = isHandled ? error.translationPayload : {};

    notification.showAppNotification(t(errorKey, payload), 'error');
  };

  const handleNodeDisconnect = (node: Node): void => {
    notification.showAppNotification(t('node.warnings.disconnect', { address: node.address }), 'warning');
  };

  const handleNodeConnect = (node: Node): void => {
    notification.showAppNotification(t('node.messages.connected', { address: node.address }), 'success');
  };

  return {
    handleNodeError,
    handleNodeDisconnect,
    handleNodeConnect,
  };
}

export type NodeNotificationsComposable = ReturnType<typeof useNodeNotifications>;
