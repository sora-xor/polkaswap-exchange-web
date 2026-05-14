import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { forceInjectMock, registerMock, unregisterMock } = vi.hoisted(() => {
  const unregister = vi.fn();
  const register = vi.fn(() => unregister);
  const forceInject = vi.fn(() => ({ register }));

  return {
    forceInjectMock: forceInject,
    registerMock: register,
    unregisterMock: unregister,
  };
});

vi.mock('@soramitsu-ui/ui/util', () => ({
  forceInject: forceInjectMock,
}));

import SNotificationBody from '@/lib/soramitsu-ui/components/Notifications/SNotificationBody.vue';
import { useNotifications } from '@/lib/soramitsu-ui/components/Notifications/composables';

describe('useNotifications', () => {
  beforeEach(() => {
    forceInjectMock.mockClear();
    registerMock.mockClear();
    unregisterMock.mockClear();
  });

  it('registers notification content and exposes the unregister handle', () => {
    const titleSlot = vi.fn();
    const descriptionSlot = vi.fn();
    const notifications = useNotifications();

    const result = notifications.show({
      title: ref('Hello'),
      description: ref('World'),
      status: ref('success'),
      showCloseBtn: ref(true),
      titleSlot,
      descriptionSlot,
    });

    expect(forceInjectMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledTimes(1);

    const payload = registerMock.mock.calls[0]?.[0];
    const vnode = payload.slot();

    expect(vnode.type).toBe(SNotificationBody);
    expect(vnode.props).toMatchObject({
      title: 'Hello',
      description: 'World',
      status: 'success',
      timeout: 5000,
      showCloseBtn: true,
    });
    expect(vnode.children).toMatchObject({
      title: titleSlot,
      description: descriptionSlot,
    });

    result.close();
    expect(unregisterMock).toHaveBeenCalledTimes(1);
  });

  it('wires close and timeout callbacks back to the toast unregister function', () => {
    const notifications = useNotifications();
    notifications.show({
      title: 'Closable',
      description: 'Body',
      timeout: 2500,
    });

    const payload = registerMock.mock.calls[0]?.[0];
    const vnode = payload.slot();

    expect(vnode.props.timeout).toBe(2500);
    expect(vnode.props.status).toBeUndefined();

    vnode.props['onClick:close']();
    vnode.props.onTimeout();

    expect(unregisterMock).toHaveBeenCalledTimes(2);
  });
});
