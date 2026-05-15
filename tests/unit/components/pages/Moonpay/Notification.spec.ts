import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MoonpayNotifications } from '@/features/deposit/components/moonpay/consts';

const storeSetup = vi.hoisted(() => {
  const setNotificationVisibility = vi.fn();
  const moonpayStore = {
    notificationVisibility: true,
    notificationKey: '' as MoonpayNotifications | '',
    setNotificationVisibility,
  };
  const settingsStore = {
    libraryTheme: 'light',
  };

  return {
    moonpayStore,
    settingsStore,
    setNotificationVisibility,
  };
});

const storeMocks = storeSetup.moonpayStore;

vi.mock('@/stores/moonpay', () => ({
  useMoonpayStore: () => storeMocks,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => storeSetup.settingsStore,
}));

vi.mock('@/components/shared/Logo/Moonpay.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'MoonpayLogoStub',
    template: '<div class="moonpay-logo-stub" />',
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
        name: 'DialogBaseStub',
        props: {
          visible: {
            type: Boolean,
            default: false,
          },
        },
        emits: ['update:visible'],
        template: '<div class="dialog-base-stub"><slot name="title" /><slot /><slot name="text" /></div>',
      },
      SimpleNotification: {
        name: 'SimpleNotificationStub',
        props: {
          success: {
            type: Boolean,
            default: false,
          },
        },
        emits: ['submit'],
        template:
          '<form class="simple-notification-stub" @submit.prevent="$emit(\'submit\')"><slot name="title" /><slot name="text" /></form>',
      },
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key.endsWith('.title')) {
        return `title:${key}`;
      }

      if (key.endsWith('.text')) {
        return '<p>Allowed</p><script>alert("not-allowed")</script>';
      }

      return key;
    },
  }),
}));

let MoonpayNotification: typeof import('@/features/deposit/components/moonpay/Notification.vue').default;

const mountComponent = () =>
  mount(MoonpayNotification, {
    global: {
      stubs: {
        's-button': { template: '<button><slot /></button>' },
      },
    },
  });

beforeEach(async () => {
  vi.clearAllMocks();
  storeMocks.notificationVisibility = true;
  storeMocks.notificationKey = MoonpayNotifications.Success;
  storeSetup.setNotificationVisibility.mockClear();

  ({ default: MoonpayNotification } = await import('@/features/deposit/components/moonpay/Notification.vue'));
});

describe('MoonpayNotification.vue', () => {
  it('computes success state and sanitizes notification text', () => {
    const wrapper = mountComponent();
    const vm = wrapper.vm as unknown as {
      success: boolean;
      title: string;
      sanitizedText: string;
    };

    expect(vm.success).toBe(true);
    expect(vm.title).toBe(`title:moonpay.notifications.${MoonpayNotifications.Success}.title`);
    expect(vm.sanitizedText).toContain('<p>Allowed</p>');
    expect(vm.sanitizedText).not.toContain('<script>');
  });

  it('closes the notification via store mutation', async () => {
    const wrapper = mountComponent();
    const vm = wrapper.vm as unknown as { close: () => void };

    vm.close();
    await wrapper.vm.$nextTick();

    expect(storeSetup.setNotificationVisibility).toHaveBeenCalledWith(false);
  });
});
