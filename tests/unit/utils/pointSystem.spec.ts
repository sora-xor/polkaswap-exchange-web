import { describe, expect, it } from 'vitest';

import { categoriesPointSystem, getImageSrc, isTokenImage } from '@/consts/pointSystem';
import { pointsService } from '@/utils/pointSystem';

describe('pointsService', () => {
  it('applies the reduced coefficient only to the first era', () => {
    expect(pointsService.getEraCoefficient(1)).toBe(0.5);
    expect(pointsService.getEraCoefficient(2)).toBe(1);
    expect(pointsService.getEraCoefficient(0)).toBe(1);
  });

  it('calculates current and next rewards for a middle category level', () => {
    const { liquidityProvision } = pointsService.calculateCategoryPoints({ liquidityProvision: 750 });

    expect(liquidityProvision).toMatchObject({
      levelCurrent: 3,
      threshold: 500,
      points: 7000,
      nextLevelRewardPoints: 8000,
      currentProgress: 750,
      minimumAmountForNextLevel: 1000,
      titleProgress: categoriesPointSystem.liquidityProvision.titleProgress,
      titleTask: categoriesPointSystem.liquidityProvision.titleTask,
      descriptionTask: categoriesPointSystem.liquidityProvision.descriptionTask,
      imageName: 'liquidity',
    });
  });

  it('returns null next-level fields at the terminal level', () => {
    const { networkFeeSpent } = pointsService.calculateCategoryPoints({ networkFeeSpent: 25_000 });

    expect(networkFeeSpent).toMatchObject({
      levelCurrent: 6,
      threshold: 10_000,
      points: 5000,
      nextLevelRewardPoints: null,
      currentProgress: 25_000,
      minimumAmountForNextLevel: null,
      imageName: 'network_fee',
    });
  });

  it('keeps firstTxAccount after regular categories in the returned object', () => {
    const result = pointsService.calculateCategoryPoints({
      firstTxAccount: 1_667_260_800_000,
      liquidityProvision: 0,
    });

    expect(Object.keys(result)).toEqual(['liquidityProvision', 'firstTxAccount']);
    expect(result.firstTxAccount).toMatchObject({
      levelCurrent: 1,
      threshold: 1_667_260_800_000,
      points: 500,
      nextLevelRewardPoints: 450,
      currentProgress: 1_667_260_800_000,
      minimumAmountForNextLevel: 1_672_531_200_000,
      imageName: 'liquidity',
    });
  });

  it('throws for unknown category names', () => {
    expect(() => pointsService.calculateCategoryPoints({ unknownCategory: 10 })).toThrow(
      'Category "unknownCategory" was not found.'
    );
  });
});

describe('point-system image helpers', () => {
  it('detects token image names by address prefix', () => {
    expect(isTokenImage('0x123')).toBe(true);
    expect(isTokenImage('liquidity')).toBe(false);
  });

  it('returns static paths for named images and resolved assets for token image names', () => {
    expect(getImageSrc('liquidity')).toBe('/point-system/liquidity.svg');
    expect(getImageSrc('0xnot-registered')).toMatchObject({
      address: '0xnot-registered',
      symbol: '0XNOT-REGISTERED',
      decimals: 18,
    });
  });
});
