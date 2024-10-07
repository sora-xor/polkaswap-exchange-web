import { categoriesPointSystem, POINTS_PER_PERCENT } from '@/consts/pointSystem';

const findLevel = (
  levels: { threshold: number; multiplier: number }[],
  value: number
): { level: number; threshold: number; multiplier: number } => {
  const matchedLevelIndex = levels.findIndex((level, index) => {
    const nextLevelThreshold = levels[index + 1]?.threshold ?? Infinity;
    return value >= level.threshold && value < nextLevelThreshold;
  });

  const finalIndex = matchedLevelIndex !== -1 ? matchedLevelIndex : levels.length - 1;
  const matchedLevel = levels[finalIndex];

  return {
    level: finalIndex + 1,
    threshold: matchedLevel.threshold,
    multiplier: matchedLevel.multiplier,
  };
};

export const calculateAllCategoryPoints = (categoryValues: { [key: string]: number }) => {
  const results: { [key: string]: { level: number; threshold: number; points: number } } = {};

  Object.entries(categoryValues).forEach(([categoryName, value]) => {
    const category = categoriesPointSystem[categoryName];
    if (!category) {
      throw new Error(`Category "${categoryName}" was not found.`);
    }
    const { level, threshold, multiplier } = findLevel(category.levels, value);

    const points = parseFloat((multiplier * category.maxPercentage * POINTS_PER_PERCENT).toFixed(0));

    results[categoryName] = { level, threshold, points };
  });

  return results;
};
