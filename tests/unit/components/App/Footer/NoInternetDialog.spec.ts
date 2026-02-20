import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { networkState, storeMock } = vi.hoisted(() => {
  const networkState = { enabled: true };
  const settings: Record<string, unknown> = {};

  Object.defineProperty(settings, 'isInternetConnectionEnabled', {
    configurable: true,
    enumerable: true,
    get: () => networkState.enabled,
  });

  return {
    networkState,
    storeMock: {
      getters: {
        settings,
      },
    },
  };
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const walletMock = await createWalletMock();

  return {
    ...walletMock,
    components: {
      ...walletMock.components,
      DialogBase: {
        name: 'DialogBaseStub',
        props: {
          visible: {
            type: Boolean,
            default: false,
          },
        },
        template: '<div class="dialog-base-stub" v-if="visible"><slot /><slot name="footer" /></div>',
      },
    },
  };
});

vi.mock('@/store', () => ({
  __esModule: true,
  default: storeMock,
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
