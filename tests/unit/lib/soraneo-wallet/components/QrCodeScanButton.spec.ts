import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import QrCodeScanButton from '@/lib/soraneo-wallet/src/components/QrCode/QrCodeScanButton.vue';

vi.mock('@/composables/useTranslation', () => ({
  translationUtils: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    te: () => true,
    getDayjsLocale: () => 'en',
    formatDate: () => '',
  }),
}));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    getErrorMessage: () => '',
    showAppAlert: vi.fn(),
    showAppNotification: vi.fn(),
    withAppNotification: vi.fn(),
    withAppAlert: vi.fn(),
  }),
}));

vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    defaultErrorTranslationKey: '',
    errorMappings: [],
    setDefaultErrorTranslationKey: vi.fn(),
    replaceErrorMappings: vi.fn(),
  }),
}));

describe('QrCodeScanButton', () => {
  const createWrapper = () =>
    mount(QrCodeScanButton, {
      global: {
        stubs: {
          SButton: { template: '<button><slot /></button>' },
          SDropdown: { template: '<div><slot /><slot name="menu" /></div>' },
          SDropdownItem: { template: '<div><slot /></div>' },
          SSelect: { template: '<div><slot /></div>' },
          SOption: { template: '<div><slot /></div>' },
          SIcon: { template: '<i />' },
          DialogBase: { template: '<div><slot /><slot name="footer" /></div>' },
          NotificationEnablingPage: { template: '<div><slot /></div>' },
        },
      },
    });

  it('does not throw when dropdown ref is unavailable', () => {
    const wrapper = createWrapper();

    expect(typeof (wrapper.vm as any).handleButtonClick).toBe('function');
    expect(() => (wrapper.vm as any).handleButtonClick()).not.toThrow();
  });

  it('forwards click to dropdown handleClick when refs exist', () => {
    const handleClick = vi.fn();
    const wrapper = createWrapper();
    const handleButtonClick = (wrapper.vm as any).$options.methods.handleButtonClick as (
      this: Record<string, unknown>
    ) => void;

    handleButtonClick.call({
      $refs: {
        dropdown: {
          $refs: {
            dropdown: {
              handleClick,
            },
          },
        },
      },
    });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
