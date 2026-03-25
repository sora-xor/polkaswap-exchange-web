import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';

const resetCounts = {
  add: 0,
  remove: 0,
};

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => ({
    resetRemoveLiquidityData: vi.fn(() => {
      resetCounts.remove += 1;
      return Promise.resolve();
    }),
  }),
}));

vi.mock('@/modules/pool/router', () => ({
  __esModule: true,
  poolLazyComponent: () => ({
    name: 'RemoveLiquidityForm',
    emits: ['back'],
    template: '<div class="remove-form-stub" @click="$emit(\'back\')"></div>',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
        name: 'DialogBase',
        emits: ['update:visible'],
        props: ['visible', 'title', 'tooltip'],
        template: '<div class="dialog-base"><slot /></div>',
      },
    },
  });
});

import RemoveLiquidityDialog from '@/modules/pool/components/RemoveLiquidity/Dialog.vue';

describe('RemoveLiquidityDialog.vue', () => {
  it('calls resetData when dialog hides', async () => {
    resetCounts.remove = 0;
    const wrapper = mount(RemoveLiquidityDialog, {
      props: { visible: true },
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.setProps({ visible: false });

    expect(resetCounts.remove).toBe(1);
  });
});
