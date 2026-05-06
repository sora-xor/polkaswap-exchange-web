import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const networkShortName = ref('SORA');
const commitSpy = vi.fn();

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({
    setSelectNetworkDialogVisibility: commitSpy,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useNetworkFormatter', () => ({
  useNetworkFormatter: () => ({
    selectedNetworkShortName: networkShortName,
  }),
}));

vi.mock('@/shared/ui/StatusActionBadge.vue', () => ({
  default: {
    name: 'StatusActionBadge',
    template: '<div class="status-action-badge"><slot name="value" /><slot name="action" /></div>',
  },
}));

const SButtonStub = {
  name: 'SButton',
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
};

const SIconStub = {
  name: 'SIcon',
  inheritAttrs: false,
  template: '<i v-bind="$attrs"></i>',
};

let NetworkSelector: typeof import('@/components/pages/Bridge/NetworkSelector.vue').default;

const factory = () =>
  mount(NetworkSelector, {
    global: {
      stubs: {
        's-button': SButtonStub,
        's-icon': SIconStub,
      },
    },
  });

describe('BridgeNetworkSelector', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    networkShortName.value = 'SORA';
    ({ default: NetworkSelector } = await import('@/components/pages/Bridge/NetworkSelector.vue'));
  });

  it('exposes the selected network short name from the formatter', () => {
    const wrapper = factory();

    const exposed = (wrapper.vm as { selectedNetworkShortName?: string | { value: string } }).selectedNetworkShortName;
    const value = typeof exposed === 'object' && exposed !== null && 'value' in exposed ? exposed.value : exposed;

    expect(value).toBe('SORA');
  });

  it('opens the network selection dialog when the settings button is clicked', async () => {
    const wrapper = factory();
    const handler = (wrapper.vm as { handleChangeNetwork?: () => void }).handleChangeNetwork;

    expect(typeof handler).toBe('function');
    handler?.();

    expect(commitSpy).toHaveBeenCalledWith(true);
  });
});
