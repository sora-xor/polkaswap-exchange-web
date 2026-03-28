import { describe, expect, it, vi } from 'vitest';

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

import AddressBookInput from '@/lib/soraneo-wallet/src/components/AddressBook/Input.vue';

describe('Wallet AddressBookInput', () => {
  it('trims the emitted address from the computed proxy setter', () => {
    const emit = vi.fn();
    const state = (AddressBookInput as any).setup(
      {
        modelValue: '',
        value: '',
        isValid: false,
      },
      {
        attrs: {},
        emit,
        expose: vi.fn(),
        slots: {},
      }
    );

    state.address.value = '  address  ';

    expect(emit).toHaveBeenCalledWith('update:modelValue', 'address');
  });

  it('selects a record and propagates the resolved contact name', () => {
    const emit = vi.fn();
    const state = (AddressBookInput as any).setup(
      {
        modelValue: '',
        value: '',
        isValid: true,
      },
      {
        attrs: {},
        emit,
        expose: vi.fn(),
        slots: {},
      }
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
