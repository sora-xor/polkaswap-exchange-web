import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tests/stubs/walletRuntime', () => ({
  components: {
    DialogBase: {
      name: 'DialogBaseStub',
      props: ['visible'],
      emits: ['update:visible'],
      template: '<div><slot /></div>',
    },
    TokenLogo: {
      name: 'TokenLogoStub',
      props: ['token'],
      template: '<div class="token-logo-stub">{{ token }}</div>',
    },
  },
  WALLET_CONSTS: {},
}));

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', async () => {
  const wallet = await import('@tests/stubs/walletRuntime');
  return {
    __esModule: true,
    default: wallet.components.DialogBase,
  };
});

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', async () => {
  const wallet = await import('@tests/stubs/walletRuntime');
  return {
    __esModule: true,
    default: wallet.components.TokenLogo,
  };
});

import TaskDialog from '@/features/rewards/components/point-system/TaskDialog.vue';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/consts/pointSystem', () => ({
  MAX_LEVEL: 6,
  getImageSrc: (name: string) => name,
  isTokenImage: () => false,
}));

function buildCategory(overrides: Partial<CalculateCategoryPointResult> = {}): CalculateCategoryPointResult {
  return {
    levelCurrent: 1,
    threshold: 100,
    points: 10,
    nextLevelRewardPoints: 20,
    currentProgress: 5,
    minimumAmountForNextLevel: 10,
    titleProgress: 'progress',
    titleTask: 'task',
    descriptionTask: 'description',
    imageName: 'liquidity',
    ...overrides,
  };
}

describe('TaskDialog.vue', () => {
  it('forwards visibility updates from dialog base', async () => {
    const wrapper = mount(TaskDialog, {
      props: {
        visible: true,
        pointsForCategory: buildCategory(),
        categoryName: 'liquidityProvision',
      },
      global: {
        stubs: {
          's-divider': true,
        },
      },
    });

    const dialogBase = wrapper.findComponent({ name: 'DialogBaseStub' });
    expect(dialogBase.exists()).toBe(true);
    expect(dialogBase.props('visible')).toBe(true);

    (wrapper.vm as { isVisible: boolean }).isVisible = false;
    await nextTick();

    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });
});
