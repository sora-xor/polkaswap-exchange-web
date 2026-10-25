import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui', () => ({
  SNotificationsProvider: defineComponent({
    name: 'SNotificationsProviderStub',
    props: {
      vertical: {
        type: String,
        default: '',
      },
      horizontal: {
        type: String,
        default: '',
      },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          {
            class: 'notifications-provider-stub',
            'data-vertical': props.vertical,
            'data-horizontal': props.horizontal,
          },
          slots.default?.()
        );
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/NotificationBridge', () => ({
  default: defineComponent({
    name: 'NotificationBridgeStub',
    setup() {
      return () => h('div', { class: 'notification-bridge-stub' });
    },
  }),
}));

import NotificationProvider from '@/lib/soraneo-wallet/src/components/NotificationProvider.vue';

describe('wallet NotificationProvider', () => {
  it('wraps slot content in the notifications provider and includes the bridge', () => {
    const wrapper = mount(NotificationProvider, {
      slots: {
        default: '<div class="wallet-slot-content">Wallet content</div>',
      },
    });

    const provider = wrapper.find('.notifications-provider-stub');

    expect(provider.attributes('data-vertical')).toBe('top');
    expect(provider.attributes('data-horizontal')).toBe('right');
    expect(wrapper.find('.notification-bridge-stub').exists()).toBe(true);
    expect(wrapper.find('.wallet-slot-content').text()).toBe('Wallet content');
  });
});
