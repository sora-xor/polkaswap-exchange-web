import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletMock } from '@tests/stubs/createWalletMock';

let SelectAddress: typeof import('@/components/pages/Bridge/SelectAddress.vue').default;
let walletRuntime: typeof import('@tests/stubs/walletRuntime');
let originalValidate: (value: string) => boolean;
const addressBookInputStub = {
  name: 'AddressBookInputStub',
  props: ['modelValue', 'isValid'],
  emits: ['update:modelValue', 'update-name'],
  template: '<div><slot /></div>',
};

vi.mock('@tests/stubs/walletRuntime', async () => {
  return await createWalletMock({
    api: {
      validateAddress: (value: string) => value.startsWith('5'),
    },
  });
});

vi.mock('@/lib/soraneo-wallet/src/components/AddressBook/Input.vue', () => ({
  default: addressBookInputStub,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('BridgeSelectAddress', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: SelectAddress } = await import('@/components/pages/Bridge/SelectAddress.vue'));
    walletRuntime = await import('@tests/stubs/walletRuntime');
    originalValidate = walletRuntime.api.validateAddress;
    walletRuntime.api.validateAddress = (value: string) => value.startsWith('5');
  });

  afterEach(() => {
    walletRuntime.api.validateAddress = originalValidate;
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
