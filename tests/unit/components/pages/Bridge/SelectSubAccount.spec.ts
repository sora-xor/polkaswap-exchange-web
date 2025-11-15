import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WALLET_TYPES } from '@wallet';

const logoutSpy = vi.fn();
const selectSpy = vi.fn();

const mockAccount = {
  address: 'addr',
  name: 'Account',
  source: 'polkadot-js',
} as unknown as WALLET_TYPES.PolkadotJsAccount;

const storeMock = {
  state: {
    web3: {
      subAccountDialogVisibility: true,
    },
    bridge: {
      subBridgeConnector: {
        accountApi: { foo: 'bar' },
      },
    },
  },
  getters: {
    web3: {
      subAccount: mockAccount,
    },
  },
  commit: {
    web3: {
      setSubAccountDialogVisibility: vi.fn(),
    },
  },
  dispatch: {
    web3: {
      resetSubAccount: logoutSpy,
      changeSubAccountName: vi.fn(),
      selectSubAccount: selectSpy,
    },
  },
};

vi.mock('@/store', () => ({
  default: storeMock,
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
      ConnectionView: {
        name: 'ConnectionView',
        props: [
          'chainApi',
          'account',
          'loginAccount',
          'logoutAccount',
          'renameAccount',
          'closeView',
          'checkConnectedAccountSource',
          'showClose',
        ],
        template: '<div><slot /></div>',
      },
    },
  });
});

let SelectSubAccount: typeof import('@/components/pages/Bridge/SelectSubAccount.vue').default;

const factory = () => mount(SelectSubAccount);

describe('BridgeSelectSubAccount', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    storeMock.state.web3.subAccountDialogVisibility = true;
    storeMock.dispatch.web3.resetSubAccount = logoutSpy;
    storeMock.dispatch.web3.selectSubAccount = selectSpy;
    storeMock.commit.web3.setSubAccountDialogVisibility = vi.fn();

    ({ default: SelectSubAccount } = await import('@/components/pages/Bridge/SelectSubAccount.vue'));
  });

  it('exposes the chain API from the connector', () => {
    const wrapper = factory();

    expect(wrapper.vm.chainApi.foo).toBe('bar');
  });

  it('logs out when the connected source matches', () => {
    const wrapper = factory();

    wrapper.vm.checkConnectedAccountSource(mockAccount.source);

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('selects an account and closes the dialog on login', async () => {
    const wrapper = factory();

    await wrapper.vm.login(mockAccount);

    expect(selectSpy).toHaveBeenCalledWith(mockAccount);
    expect(storeMock.commit.web3.setSubAccountDialogVisibility).toHaveBeenCalledWith(false);
  });
});
