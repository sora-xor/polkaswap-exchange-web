import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletMock } from '@tests/stubs/createWalletMock';

let SelectAddress: typeof import('@/components/pages/Bridge/SelectAddress.vue').default;
let walletModule: typeof import('@wallet');
let originalValidate: (value: string) => boolean;
let originalAddressBookInput: unknown;

const addressBookInputStub = {
  name: 'AddressBookInputStub',
  props: ['modelValue', 'isValid'],
  emits: ['update:modelValue', 'update-name'],
  template: '<div><slot /></div>',
};

vi.mock('@wallet', async () => {
  return await createWalletMock({
    components: {
      AddressBookInput: addressBookInputStub,
    },
    api: {
      validateAddress: (value: string) => value.startsWith('5'),
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('BridgeSelectAddress', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: SelectAddress } = await import('@/components/pages/Bridge/SelectAddress.vue'));
    walletModule = await import('@wallet');
    originalValidate = walletModule.api.validateAddress;
    originalAddressBookInput = walletModule.components.AddressBookInput;
    walletModule.api.validateAddress = (value: string) => value.startsWith('5');
    walletModule.components.AddressBookInput = addressBookInputStub as unknown;
  });

  afterEach(() => {
    walletModule.api.validateAddress = originalValidate;
    walletModule.components.AddressBookInput = originalAddressBookInput;
  });

  it('validates substrate addresses', async () => {
    const wrapper = mount(SelectAddress, {
      props: {
        value: '5valid',
      },
      global: {
        stubs: {
          's-button': true,
        },
      },
    });

    expect(wrapper.vm.validAddress).toBe(true);

    wrapper.vm.address = '3invalid';
    await nextTick();

    expect(wrapper.vm.validAddress).toBe(false);
  });

  it('emits the address and stored name on save', () => {
    const wrapper = mount(SelectAddress, {
      props: {
        value: '5valid',
      },
      global: {
        stubs: {
          's-button': true,
        },
      },
    });

    wrapper.vm.updateName('Alice');
    wrapper.vm.handleSelectAddress();

    expect(wrapper.emitted('select')?.[0]).toEqual([{ address: '5valid', name: 'Alice' }]);
  });
});
