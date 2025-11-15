import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

type DispatchFn = (payload: { id: number | string; type: BridgeNetworkType }) => void;

const commitSpy = vi.fn();
const dispatchSpy = vi.fn<Parameters<DispatchFn>, void>();

const storeMock = {
  state: {
    web3: {
      selectNetworkDialogVisibility: true,
      networkType: BridgeNetworkType.Eth,
      networkSelected: 1,
    },
  },
  getters: {
    web3: {
      availableNetworks: {
        [BridgeNetworkType.Eth]: {
          1: {
            disabled: false,
            data: { id: 1, name: 'Ethereum' },
          },
        },
        [BridgeNetworkType.Sub]: {
          sora: {
            disabled: true,
            data: { id: 'sora', name: 'SORA' },
          },
        },
      },
    },
  },
  commit: {
    web3: {
      setSelectNetworkDialogVisibility: commitSpy,
    },
  },
  dispatch: {
    web3: {
      selectExternalNetwork: dispatchSpy,
    },
  },
};

vi.mock('@/store', () => ({
  default: storeMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useNetworkFormatter', () => ({
  useNetworkFormatter: () => ({
    getNetworkIcon: () => 'icon',
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
        name: 'DialogBase',
        props: ['visible'],
        emits: ['update:visible'],
        template: '<div><slot /></div>',
      },
      ExternalLink: {
        name: 'ExternalLink',
        props: ['href', 'title'],
        template: '<a :href="href">{{ title }}</a>',
      },
      SRadioGroup: {
        name: 'SRadioGroup',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<div><slot /></div>',
      },
      SRadio: {
        name: 'SRadio',
        props: ['label', 'disabled'],
        template: '<label><slot /></label>',
      },
      SScrollbar: {
        name: 'SScrollbar',
        template: '<div><slot /></div>',
      },
      TokenLogo: {
        name: 'TokenLogo',
        template: '<div />',
      },
    },
  });
});

let SelectNetwork: typeof import('@/components/pages/Bridge/SelectNetwork.vue').default;

const factory = () => mount(SelectNetwork);

describe('BridgeSelectNetwork', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    storeMock.state.web3.selectNetworkDialogVisibility = true;
    storeMock.state.web3.networkType = BridgeNetworkType.Eth;
    storeMock.state.web3.networkSelected = 1;

    ({ default: SelectNetwork } = await import('@/components/pages/Bridge/SelectNetwork.vue'));
  });

  it('exposes available networks sorted by availability', () => {
    const wrapper = factory();

    const [ethNetwork, subNetwork] = wrapper.vm.networks;

    expect(wrapper.vm.networks).toHaveLength(2);
    expect(ethNetwork.disabled).toBe(false);
    expect(subNetwork.disabled).toBe(true);
    expect(subNetwork.info.content).toBe('comingSoonText');
  });

  it('reflects the selected network tuple', () => {
    const wrapper = factory();

    expect(wrapper.vm.selectedNetworkTuple).toBe(`${BridgeNetworkType.Eth}-1`);
  });

  it('selects a new network and closes the dialog', () => {
    const wrapper = factory();

    wrapper.vm.selectedNetworkTuple = `${BridgeNetworkType.Sub}-sora`;

    expect(dispatchSpy).toHaveBeenCalledWith({ id: 'sora', type: BridgeNetworkType.Sub });
    expect(commitSpy).toHaveBeenCalledWith(false);
  });
});
