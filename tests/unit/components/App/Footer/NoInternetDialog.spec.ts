import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { networkState, settingsStoreMock } = vi.hoisted(() => {
  const networkState = { enabled: true };

  return {
    networkState,
    settingsStoreMock: {
      get isInternetConnectionEnabled() {
        return networkState.enabled;
      },
    },
  };
});

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBaseStub',
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
    },
    template: '<div class="dialog-base-stub" v-if="visible"><slot /><slot name="footer" /></div>',
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

describe('NoInternetDialog', () => {
  beforeEach(() => {
    networkState.enabled = true;
  });

  it('stays hidden when internet connection is enabled', async () => {
    const component = (await import('@/components/App/Footer/NoInternetDialog.vue')).default;
    const wrapper = mount(component);

    expect(wrapper.find('.dialog-base-stub').exists()).toBe(false);
    expect(wrapper.find('.no-internet__action').exists()).toBe(false);
  });

  it('shows the dialog content when internet connection is disabled', async () => {
    networkState.enabled = false;

    const component = (await import('@/components/App/Footer/NoInternetDialog.vue')).default;
    const wrapper = mount(component);

    expect(wrapper.find('.dialog-base-stub').exists()).toBe(true);
    expect(wrapper.find('.no-internet__action').exists()).toBe(true);
  });
});
