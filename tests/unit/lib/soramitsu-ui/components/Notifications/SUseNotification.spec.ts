import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const { notificationProviderMock } = vi.hoisted(() => ({
  notificationProviderMock: {
    api: undefined as unknown,
  },
}));

vi.mock('@soramitsu-ui/ui/composables/conditional-scope', () => ({
  forceInject: () => notificationProviderMock.api,
  useConditionalScope: (condition: { value: boolean }, callback: () => void) => {
    if (condition.value) callback();
  },
}));

import SNotificationBody from '@/lib/soramitsu-ui/components/Notifications/SNotificationBody.vue';
import SUseNotification from '@/lib/soramitsu-ui/components/Notifications/SUseNotification.vue';
import { createToastsApiMock } from '@/lib/soramitsu-ui/test-utils';

describe('SUseNotification', () => {
  it('keeps omitted status neutral when registering a toast body', async () => {
    const { api, register, slots } = createToastsApiMock();
    notificationProviderMock.api = api;

    mount(SUseNotification, {
      props: {
        show: true,
        description: 'Transaction was submitted',
      },
    });

    await nextTick();

    expect(register).toHaveBeenCalledTimes(1);

    const slotOutput = slots[0]?.({} as any, {} as any);
    const vnode = Array.isArray(slotOutput) ? slotOutput[0] : slotOutput;

    expect(vnode?.type).toBe(SNotificationBody);
    expect(vnode?.props).toMatchObject({
      description: 'Transaction was submitted',
      timeout: 5000,
    });
    expect(vnode?.props?.status).toBeUndefined();
  });
});
