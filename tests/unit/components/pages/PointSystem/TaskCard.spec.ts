import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { tokenLogoStub } from '@stubs/walletComponents';

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/features/rewards/components/point-system/TaskDialog.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'TaskDialogStub',
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['update:visible'],
    template: '<task-dialog :visible="visible" />',
  },
}));

import TaskCard from '@/features/rewards/components/point-system/TaskCard.vue';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
  }),
}));

vi.mock('@/consts/pointSystem', () => ({
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

describe('TaskCard.vue', () => {
  it('opens dialog when action button is clicked', async () => {
    const wrapper = shallowMount(TaskCard, {
      props: {
        pointsForCategory: buildCategory(),
        categoryName: 'liquidityProvision',
      },
      global: {
        stubs: {
          TokenLogo: tokenLogoStub,
          's-button': true,
          's-divider': true,
        },
      },
    });

    (wrapper.vm as { handleButtonClick: () => void }).handleButtonClick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as { isDialogVisible: boolean }).isDialogVisible).toBe(true);
  });

  it('keeps dialog closed when task is already completed', async () => {
    const wrapper = shallowMount(TaskCard, {
      props: {
        pointsForCategory: buildCategory({
          minimumAmountForNextLevel: null,
        }),
        categoryName: 'liquidityProvision',
      },
      global: {
        stubs: {
          TokenLogo: tokenLogoStub,
          's-button': true,
          's-divider': true,
        },
      },
    });

    (wrapper.vm as { handleButtonClick: () => void }).handleButtonClick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as { isDialogVisible: boolean }).isDialogVisible).toBe(false);
  });
});
