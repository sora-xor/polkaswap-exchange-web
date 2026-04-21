import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

const bridgeMocks = vi.hoisted(() => {
  const closeMock = vi.fn();
  const showMock = vi.fn(() => ({ close: closeMock }));
  const unregisterToastMock = vi.fn();
  const unregisterAlertMock = vi.fn();

  return {
    closeMock,
    showMock,
    unregisterToastMock,
    unregisterAlertMock,
    toastHandler: undefined as ((payload: Record<string, unknown>) => void) | undefined,
    alertHandler: undefined as ((payload: Record<string, unknown>) => void) | undefined,
  };
});

vi.mock('@soramitsu-ui/ui', () => ({
  useNotifications: () => ({
    show: bridgeMocks.showMock,
  }),
}));

vi.mock('@/services/notification', () => ({
  NOTIFICATION_STATUS: {
    Error: 'error',
  },
  default: {
    registerToastHandler: (handler: typeof bridgeMocks.toastHandler) => {
      bridgeMocks.toastHandler = handler;
      return bridgeMocks.unregisterToastMock;
    },
    registerAlertHandler: (handler: typeof bridgeMocks.alertHandler) => {
      bridgeMocks.alertHandler = handler;
      return bridgeMocks.unregisterAlertMock;
    },
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/NotificationAlertToast.vue', () => ({
  default: {
    name: 'NotificationAlertToastStub',
  },
}));

import NotificationBridge from '@/lib/soraneo-wallet/src/components/NotificationBridge';

describe('wallet NotificationBridge', () => {
  afterEach(() => {
    vi.clearAllMocks();
    bridgeMocks.toastHandler = undefined;
    bridgeMocks.alertHandler = undefined;
  });

  it('bridges toast and alert notifications into the Soramitsu notification api and unregisters on unmount', () => {
    const wrapper = mount(NotificationBridge);
    const confirmMock = vi.fn();

    bridgeMocks.toastHandler?.({
      message: 'Toast body',
      title: 'Toast title',
      status: 'success',
      timeout: 5000,
      showCloseBtn: undefined,
    });

    expect(bridgeMocks.showMock).toHaveBeenNthCalledWith(1, {
      title: 'Toast title',
      description: 'Toast body',
      status: 'success',
      timeout: 5000,
      showCloseBtn: true,
    });

    bridgeMocks.alertHandler?.({
      message: 'Alert body',
      title: 'Alert title',
      status: undefined,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm: confirmMock,
    });

    const alertPayload = bridgeMocks.showMock.mock.calls[1]?.[0];
    expect(alertPayload).toMatchObject({
      title: 'Alert title',
      status: 'error',
      showCloseBtn: true,
      timeout: undefined,
    });

    const vnode = alertPayload?.descriptionSlot?.();
    expect(vnode.props).toMatchObject({
      message: 'Alert body',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    });

    vnode.props.onConfirm();
    vnode.props.onCancel();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(bridgeMocks.closeMock).toHaveBeenCalledTimes(2);

    wrapper.unmount();

    expect(bridgeMocks.unregisterToastMock).toHaveBeenCalledTimes(1);
    expect(bridgeMocks.unregisterAlertMock).toHaveBeenCalledTimes(1);
  });
});
