import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import QrCodeScanButton from '@/lib/soraneo-wallet/src/components/QrCode/QrCodeScanButton.vue';
import qrCodeScanButtonSource from '@/lib/soraneo-wallet/src/components/QrCode/QrCodeScanButton.vue?raw';
import SButton from '@/lib/soramitsu-ui/components/Button/SButton.vue';
import SDropdown from '@/lib/soramitsu-ui/components/Select/SDropdown.vue';
import SDropdownItem from '@/lib/soramitsu-ui/components/Select/SDropdownItem.vue';

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
    const state = (QrCodeScanButton as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.dropdown.value = {
      $refs: {
        dropdown: {
          handleClick,
        },
      },
    };

    state.handleButtonClick();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the wallet QR action button on the shared production button contract', () => {
    expect(qrCodeScanButtonSource).not.toContain('.qr-code-button.el-button');
  });

  it('passes camera devices through the current select options contract', () => {
    expect(qrCodeScanButtonSource).toContain(':options="mediaDeviceOptions"');
    expect(qrCodeScanButtonSource).not.toContain('<s-option');
  });

  it('names the icon-only scan/upload action', () => {
    expect(qrCodeScanButtonSource).toContain(':aria-label="t(\'code.upload\')"');
  });

  it('opens the QR source menu from a single scanner icon click', async () => {
    const wrapper = mount(QrCodeScanButton, {
      attachTo: document.body,
      global: {
        components: {
          SButton,
          SDropdown,
          SDropdownItem,
        },
        stubs: {
          SIcon: { template: '<i />' },
          SSelect: { template: '<div><slot /></div>' },
          SOption: { template: '<div><slot /></div>' },
          DialogBase: { template: '<div><slot /><slot name="footer" /></div>' },
          NotificationEnablingPage: { template: '<div><slot /></div>' },
        },
      },
    });

    try {
      await wrapper.find('.qr-code-dropdown').trigger('click');
      await nextTick();
      await nextTick();

      const menuText = document.body.querySelector('.el-dropdown-menu')?.textContent ?? '';

      expect(menuText).toContain('code.import');
      expect(menuText).toContain('code.scan');
    } finally {
      wrapper.unmount();
    }
  });
});
