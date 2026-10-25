import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SInput } from '@/lib/soramitsu-ui/components/Input';
import { mountSetup } from '@stubs/mountSetup';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    address: '',
    source: 'sora',
    book: {},
    setAddressToBook: vi.fn(),
    removeAddressFromBook: vi.fn(),
  }),
}));

const subscribeToWalletAccountsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/util/account', () => ({
  subscribeToWalletAccounts: subscribeToWalletAccountsMock,
}));

import AddressBookInput from '@/lib/soraneo-wallet/src/components/AddressBook/Input.vue';

describe('Wallet AddressBookInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeToWalletAccountsMock.mockResolvedValue(() => undefined);
  });

  it('applies the wallet input surface class while preserving parent classes', () => {
    const wrapper = mount(AddressBookInput, {
      props: {
        modelValue: '',
        value: '',
        isValid: false,
      },
      attrs: {
        class: 'wallet-send-address',
      },
      global: {
        components: {
          's-input': SInput,
        },
        stubs: {
          AddressBookContact: true,
          AddressBookList: true,
          WalletAccount: true,
        },
      },
    });

    const inputRoot = wrapper.find('.s-input.address-input__field');

    expect(inputRoot.exists()).toBe(true);
    expect(inputRoot.classes()).toContain('wallet-send-address');
  });

  it('trims the emitted address from the computed proxy setter', () => {
    const emit = vi.fn();
    const { state } = mountSetup(
      AddressBookInput as any,
      {
        modelValue: '',
        value: '',
        isValid: false,
      },
      { emit }
    );

    state.address.value = '  address  ';

    expect(emit).toHaveBeenCalledWith('update:modelValue', 'address');
  });

  it('selects a record and propagates the resolved contact name', () => {
    const emit = vi.fn();
    const { state } = mountSetup(
      AddressBookInput as any,
      {
        modelValue: '',
        value: '',
        isValid: true,
      },
      { emit }
    );

    state.chooseRecord({
      name: 'Alice',
      address: 'address-1',
    });

    expect(state.name.value).toBe('Alice');
    expect(emit).toHaveBeenCalledWith('update:modelValue', 'address-1');
    expect(emit).toHaveBeenCalledWith('update:name', 'Alice');
  });

  it('disposes a subscription that resolves after the component unmounts', async () => {
    let publishAccounts!: (accounts: Array<{ address: string; name: string }>) => void;
    let resolveSubscription!: (unsubscribe: VoidFunction) => void;
    const unsubscribe = vi.fn();

    subscribeToWalletAccountsMock.mockImplementationOnce(
      (_api, _wallet, callback) =>
        new Promise<VoidFunction>((resolve) => {
          publishAccounts = callback;
          resolveSubscription = resolve;
        })
    );

    const { state, unmount } = mountSetup(
      AddressBookInput as any,
      {
        modelValue: '',
        value: '',
        isValid: false,
      },
      { emit: vi.fn() }
    );

    unmount();
    publishAccounts([{ address: 'stale-address', name: 'Stale' }]);
    resolveSubscription(unsubscribe);
    await flushPromises();

    expect(state.accountsRecords.value).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
