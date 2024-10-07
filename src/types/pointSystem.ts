export interface Level {
  threshold: number; // Порог уровня
  multiplier: number; // Множитель уровня
}

export interface Category {
  maxPercentage: number; // Максимальный процент для данной категории
  levels: Level[]; // Массив уровней
}
