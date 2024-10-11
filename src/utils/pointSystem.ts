// pointsService.ts
import { categoriesPointSystem, POINTS_PER_PERCENT } from '@/consts/pointSystem';
import { CalculateCategoryPointResult, CategoryValues } from '@/types/pointSystem';

class PointsService {
  private findLevel(
    levels: { threshold: number; multiplier: number }[],
    value: number
  ): {
    levelCurrent: number;
    threshold: number;
    multiplier: number;
    nextLevelRewardPoints: number | null;
    currentProgress: number;
    minimumAmountForNextLevel: number | null;
  } {
    const matchedLevelIndex = levels.findIndex((level, index) => {
      const nextLevelThreshold = levels[index + 1]?.threshold ?? Infinity;
      return value >= level.threshold && value < nextLevelThreshold;
    });

    const finalIndex = matchedLevelIndex !== -1 ? matchedLevelIndex : levels.length - 1;
    const matchedLevel = levels[finalIndex];

    const nextLevel = levels[finalIndex + 1] ?? null;

    const nextLevelRewardPoints = nextLevel ? parseFloat((nextLevel.multiplier * POINTS_PER_PERCENT).toFixed(0)) : null;

    const currentProgress = value;

    const minimumAmountForNextLevel = nextLevel ? nextLevel.threshold : null;

    return {
      levelCurrent: finalIndex + 1,
      threshold: matchedLevel.threshold,
      multiplier: matchedLevel.multiplier,
      nextLevelRewardPoints,
      currentProgress,
      minimumAmountForNextLevel,
    };
  }

  public calculateCategoryPoints(categoryValues: CategoryValues): { [key: string]: CalculateCategoryPointResult } {
    const results: { [key: string]: CalculateCategoryPointResult } = {};
    const firstTxAccountResult: { [key: string]: CalculateCategoryPointResult } = {};

    Object.entries(categoryValues).forEach(([categoryName, value]) => {
      const category = categoriesPointSystem[categoryName];
      if (!category) {
        throw new Error(`Category "${categoryName}" was not found.`);
      }

      const { levelCurrent, threshold, multiplier, nextLevelRewardPoints, currentProgress, minimumAmountForNextLevel } =
        this.findLevel(category.levels, value);

      const points = parseFloat((multiplier * category.maxPercentage * POINTS_PER_PERCENT).toFixed(0));

      const categoryData = {
        levelCurrent,
        threshold,
        points,
        nextLevelRewardPoints,
        currentProgress,
        minimumAmountForNextLevel,
        titleProgress: category.titleProgress,
        titleTask: category.titleTask,
        descriptionTask: category.descriptionTask,
        imageName: category.imageName,
      };

      if (categoryName === 'firstTxAccount') {
        // Store firstTxAccount category separately
        firstTxAccountResult[categoryName] = categoryData;
      } else {
        // Store other categories in results
        results[categoryName] = categoryData;
      }
    });

    // Merge results and add firstTxAccount at the end
    return { ...results, ...firstTxAccountResult };
  }
}

const pointsService = new PointsService();
export { pointsService };
