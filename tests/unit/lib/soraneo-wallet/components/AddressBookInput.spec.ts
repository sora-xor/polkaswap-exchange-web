import { describe, expect, it, vi } from 'vitest';

import AddressBookInput from '@/lib/soraneo-wallet/src/components/AddressBook/Input.vue';

describe('Wallet AddressBookInput', () => {
  it('trims the emitted address from the computed proxy setter', () => {
    const emit = vi.fn();

    (AddressBookInput as any).computed.address.set.call({ $emit: emit }, '  address  ');

    expect(emit).toHaveBeenCalledWith('update:modelValue', 'address');
  });

  it('selects a record and propagates the resolved contact name', () => {
    const updateName = vi.fn();
    const context = {
      name: '',
      updateName,
      $emit: vi.fn(),
    };
    let address = '';

    Object.defineProperty(context, 'address', {
      get: () => address,
      set: (value: string) => {
        address = value;
        context.$emit('update:modelValue', value);
      },
    });

    (AddressBookInput as any).methods.chooseRecord.call(context, {
      name: 'Alice',
      address: 'address-1',
    });

    expect(context.name).toBe('Alice');
    expect(updateName).toHaveBeenCalledTimes(1);
    expect(context.$emit).toHaveBeenCalledWith('update:modelValue', 'address-1');
  });
});
