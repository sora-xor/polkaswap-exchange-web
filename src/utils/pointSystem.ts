import { categoriesPointSystem, POINTS_PER_PERCENT } from '@/consts/pointSystem';

// Функция для поиска соответствующего уровня на основе входного значения
const findLevel = (
  levels: { threshold: number; multiplier: number }[],
  value: number
): {
  levelCurrent: number;
  threshold: number;
  multiplier: number;
  nextLevelRewardPoints: number | null;
  currentProgress: number;
  minimumAmountForNextLevel: number | null;
} => {
  // Найти индекс текущего уровня на основе значения
  const matchedLevelIndex = levels.findIndex((level, index) => {
    const nextLevelThreshold = levels[index + 1]?.threshold ?? Infinity;
    return value >= level.threshold && value < nextLevelThreshold;
  });

  // Если не найден соответствующий уровень, используем последний уровень
  const finalIndex = matchedLevelIndex !== -1 ? matchedLevelIndex : levels.length - 1;
  const matchedLevel = levels[finalIndex];

  // Определение следующего уровня, если он существует
  const nextLevel = levels[finalIndex + 1] ?? null;

  // Рассчитать очки для следующего уровня, если следующий уровень существует
  const nextLevelRewardPoints = nextLevel ? parseFloat((nextLevel.multiplier * POINTS_PER_PERCENT).toFixed(0)) : null;

  // Текущий прогресс — это значение, которое мы передали
  const currentProgress = value;

  // Минимальное количество для достижения следующего уровня — это порог следующего уровня, если он существует
  const minimumAmountForNextLevel = nextLevel ? nextLevel.threshold : null;

  return {
    levelCurrent: finalIndex + 1, // Уровни начинаются с 1
    threshold: matchedLevel.threshold,
    multiplier: matchedLevel.multiplier,
    nextLevelRewardPoints,
    currentProgress,
    minimumAmountForNextLevel,
  };
};

// Функция для расчета очков и определения уровня, текущего прогресса и минимума для следующего уровня по каждой категории
export const calculateAllCategoryPoints = (categoryValues: { [key: string]: number }) => {
  const results: {
    [key: string]: {
      levelCurrent: number;
      threshold: number;
      points: number;
      nextLevelRewardPoints: number | null;
      currentProgress: number;
      minimumAmountForNextLevel: number | null;
    };
  } = {};

  Object.entries(categoryValues).forEach(([categoryName, value]) => {
    const category = categoriesPointSystem[categoryName];
    if (!category) {
      throw new Error(`Category "${categoryName}" was not found.`);
    }

    // Найти соответствующий уровень и рассчитать очки для следующего уровня
    const { levelCurrent, threshold, multiplier, nextLevelRewardPoints, currentProgress, minimumAmountForNextLevel } =
      findLevel(category.levels, value);
    // Рассчитать текущие очки
    const points = parseFloat((multiplier * category.maxPercentage * POINTS_PER_PERCENT).toFixed(0));

    // Сохранить результат для текущей категории
    results[categoryName] = {
      levelCurrent,
      threshold,
      points,
      nextLevelRewardPoints,
      currentProgress,
      minimumAmountForNextLevel,
    };
  });

  return results;
};
