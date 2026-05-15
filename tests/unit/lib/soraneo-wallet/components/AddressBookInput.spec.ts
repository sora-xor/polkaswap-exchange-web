import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/lib/soraneo-wallet/src/util/account', () => ({
  subscribeToWalletAccounts: vi.fn(async () => vi.fn()),
}));

import AddressBookInput from '@/lib/soraneo-wallet/src/components/AddressBook/Input.vue';

describe('Wallet AddressBookInput', () => {
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
});
