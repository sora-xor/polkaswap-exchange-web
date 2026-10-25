import type { StrategyFlowSettings } from './strategy-explanation';

/** Screen-space illustration only: these contours are not prices, probabilities, or backtest results. */
export interface StrategyContour {
  line: string;
  area: string;
  focus: { x: number; y: number };
}

/** Build stable, layered rule illustrations without random movement or invented financial values. */
export function strategyContours(preset: StrategyFlowSettings['preset']): StrategyContour[] {
  return Array.from({ length: 12 }, (_, layer) => {
    const depth = 11 - layer;
    const start = 42 + depth * 12;
    const baseline = 208 - depth * 8;
    const center = preset === 'threshold' ? 0.61 : preset === 'sma' ? 0.42 : 0.5;
    const points = Array.from({ length: 97 }, (_, index) => {
      const fraction = index / 96;
      const width = 0.14 + depth * 0.003;
      const primary = Math.exp(-((fraction - center) ** 2) / (2 * width ** 2));
      const shoulder = preset === 'sma' ? 0.48 * Math.exp(-((fraction - 0.7) ** 2) / 0.014) : 0;
      const x = start + fraction * 570;
      const y = baseline - (primary + shoulder) * (64 - depth * 1.5);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = `M${points.join(' L')}`;
    const [x, y] = points[Math.round(center * 96)].split(',').map(Number);
    return { focus: { x, y }, line, area: `${line} L${start + 570},${baseline} L${start},${baseline} Z` };
  });
}
