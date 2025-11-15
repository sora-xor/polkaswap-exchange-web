import { describe, expect, it, vi } from 'vitest';

import { useNodeNotifications } from '@/composables/useNodeNotifications';
import type { Node } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';

const showAppNotification = vi.fn();

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => ({ key, values }),
  }),
}));

describe('useNodeNotifications', () => {
  const notifications = useNodeNotifications();
  const node = { address: 'node-address' } as Node;

  it('shows translated errors for handled node issues', () => {
    const error = new AppHandledError({ key: 'node.error.handled', payload: { foo: 'bar' } });

    notifications.handleNodeError(error, node);

    expect(showAppNotification).toHaveBeenCalledWith({ key: 'node.error.handled', values: { foo: 'bar' } }, 'error');
  });

  it('falls back to generic connection errors', () => {
    showAppNotification.mockClear();

    notifications.handleNodeError(new Error('fail'), node);

    expect(showAppNotification).toHaveBeenCalledWith({ key: 'node.errors.connection', values: {} }, 'error');
  });

  it('shows disconnect and connect notifications', () => {
    showAppNotification.mockClear();

    notifications.handleNodeDisconnect(node);

    expect(showAppNotification).toHaveBeenCalledWith(
      { key: 'node.warnings.disconnect', values: { address: node.address } },
      'warning'
    );

    notifications.handleNodeConnect(node);

    expect(showAppNotification).toHaveBeenCalledWith(
      { key: 'node.messages.connected', values: { address: node.address } },
      'success'
    );
  });
});
