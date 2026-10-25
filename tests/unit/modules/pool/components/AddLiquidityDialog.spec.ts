import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';

const emitted: { reset: number } = { reset: 0 };

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => ({
    resetAddLiquidityData: vi.fn(() => {
      emitted.reset += 1;
      return Promise.resolve();
    }),
  }),
}));

vi.mock('@/modules/pool/components/AddLiquidity/Form.vue', () => ({
  __esModule: true,
  default: {
    name: 'AddLiquidityForm',
    emits: ['back'],
    template: '<div class="form-stub" @click="$emit(\'back\')"></div>',
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    emits: ['update:visible'],
    props: ['visible', 'title', 'tooltip'],
    template: '<div class="dialog-base"><slot /></div>',
  },
}));

import AddLiquidityDialog from '@/modules/pool/components/AddLiquidity/Dialog.vue';

describe('AddLiquidityDialog.vue', () => {
  it('resets data when dialog closes', async () => {
    emitted.reset = 0;

    const wrapper = mount(AddLiquidityDialog, {
      props: { visible: true },
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.setProps({ visible: false });

    expect(emitted.reset).toBe(1);
  });
});
