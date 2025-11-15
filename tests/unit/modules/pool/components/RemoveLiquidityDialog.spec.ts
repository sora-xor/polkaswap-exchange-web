import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const resetCounts = {
  add: 0,
  remove: 0,
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    dispatch: {
      removeLiquidity: {
        resetData: vi.fn(() => {
          resetCounts.remove += 1;
        }),
      },
    },
  },
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
    });

    await wrapper.setProps({ visible: false });

    expect(resetCounts.remove).toBe(1);
  });
});
