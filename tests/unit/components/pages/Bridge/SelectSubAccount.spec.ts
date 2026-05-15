import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WALLET_TYPES } from '@tests/stubs/walletRuntime';

const logoutSpy = vi.fn();
const selectSpy = vi.fn();

const mockAccount = {
  address: 'addr',
  name: 'Account',
  source: 'polkadot-js',
} as unknown as WALLET_TYPES.PolkadotJsAccount;

const bridgeStorePiniaMock = {
  connector: {
    accountApi: { foo: 'bar' },
  },
};

const web3StorePiniaMock = {
  subAccountDialogVisibility: true,
  subAccount: mockAccount,
  setSubAccountDialogVisibility: vi.fn(),
  resetSubAccount: logoutSpy,
  changeSubAccountName: vi.fn(),
  selectSubAccount: selectSpy,
};

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStorePiniaMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StorePiniaMock,
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    props: ['visible'],
    emits: ['update:visible'],
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue', () => ({
  default: {
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
}));

let SelectSubAccount: typeof import('@/features/bridge/components/SelectSubAccount.vue').default;

const factory = () => mount(SelectSubAccount);

describe('BridgeSelectSubAccount', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    web3StorePiniaMock.subAccount = mockAccount;
    web3StorePiniaMock.subAccountDialogVisibility = true;
    web3StorePiniaMock.resetSubAccount = logoutSpy;
    web3StorePiniaMock.changeSubAccountName = vi.fn();
    web3StorePiniaMock.selectSubAccount = selectSpy;
    web3StorePiniaMock.setSubAccountDialogVisibility = vi.fn();

    ({ default: SelectSubAccount } = await import('@/features/bridge/components/SelectSubAccount.vue'));
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
    expect(web3StorePiniaMock.setSubAccountDialogVisibility).toHaveBeenCalledWith(false);
  });
});
