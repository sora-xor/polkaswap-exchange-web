import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/rewards/components/point-system/ProgressCard.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'ProgressCardStub',
    props: ['imageName', 'progressPercentage'],
    template: '<div class="progress-card-stub" />',
  },
}));

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

import PointCard from '@/features/rewards/components/point-system/PointCard.vue';
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

describe('PointCard.vue', () => {
  it('opens the task dialog when the card is clickable', async () => {
    const wrapper = shallowMount(PointCard, {
      props: {
        pointsForCategory: buildCategory(),
        categoryName: 'liquidityProvision',
      },
      global: {
        stubs: {
          's-divider': true,
          TokenLogo: {
            template: '<div class="token-logo-stub" />',
          },
        },
      },
    });

    (wrapper.vm as any).handleClick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as { isDialogVisible: boolean }).isDialogVisible).toBe(true);
  });

  it('does not open the dialog when no next level is available', async () => {
    const wrapper = shallowMount(PointCard, {
      props: {
        pointsForCategory: buildCategory({
          minimumAmountForNextLevel: null,
          nextLevelRewardPoints: null,
        }),
        categoryName: 'liquidityProvision',
      },
      global: {
        stubs: {
          's-divider': true,
          TokenLogo: {
            template: '<div class="token-logo-stub" />',
          },
        },
      },
    });

    (wrapper.vm as any).handleClick();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as { isDialogVisible: boolean }).isDialogVisible).toBe(false);
  });
});
