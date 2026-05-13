import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/components/icons', () => ({
  IconClose: defineComponent({
    name: 'IconCloseStub',
    setup: () => () => h('svg', { 'data-testid': 'close-icon' }),
  }),
  STATUS_ICONS_MAP: {
    info: defineComponent({
      name: 'InfoIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-info-icon' }),
    }),
    warning: defineComponent({
      name: 'WarningIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-warning-icon' }),
    }),
    error: defineComponent({
      name: 'ErrorIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-error-icon' }),
    }),
    success: defineComponent({
      name: 'SuccessIconStub',
      setup: () => () => h('svg', { 'data-testid': 'status-success-icon' }),
    }),
  },
}));

import SNotificationBody from '@/lib/soramitsu-ui/components/Notifications/SNotificationBody.vue';

describe('SNotificationBody', () => {
  it('keeps untyped toasts neutral instead of forcing the info status treatment', () => {
    const wrapper = mount(SNotificationBody, {
      props: {
        description: 'Transaction was submitted',
        showCloseBtn: true,
      },
    });

    expect(wrapper.attributes('data-status')).toBeUndefined();
    expect(wrapper.find('.s-notification-body__icon-wrapper').exists()).toBe(false);
    expect(wrapper.find('[data-testid="status-info-icon"]').exists()).toBe(false);
    expect(wrapper.find('.sora-tpg-p2').exists()).toBe(false);
    expect(wrapper.find('.sora-tpg-p4').text()).toBe('Transaction was submitted');
    expect(wrapper.find('[data-testid="close-icon"]').exists()).toBe(true);
  });

  it('renders status styling only when a toast explicitly provides a status', () => {
    const wrapper = mount(SNotificationBody, {
      props: {
        description: 'Signed',
        status: 'success',
      },
    });

    expect(wrapper.attributes('data-status')).toBe('success');
    expect(wrapper.find('.s-notification-body__icon-wrapper').exists()).toBe(true);
    expect(wrapper.find('[data-testid="status-success-icon"]').exists()).toBe(true);
  });
});
