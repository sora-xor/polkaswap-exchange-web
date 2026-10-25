/** Shared prop types for the Strategy Studio views; every label arrives translated. */

/** Text for the signal chart. */
export interface SignalChartLabels {
  price: string;
  buyPanel: string;
  sellPanel: string;
  equity: string;
  first: string;
  second: string;
  buys: string;
  sells: string;
  bot: string;
  hold: string;
  replay: string;
  stop: string;
  buyHandle: string;
  sellHandle: string;
}

/**
 * One axis of the parallel view. Numeric axes scale between `domain` (or the data's range);
 * categorical axes place each listed value at its own evenly spaced tick.
 */
export interface ParallelAxis {
  key: string;
  label: string;
  format: (value: number) => string;
  /** Category names by value for categorical axes. */
  categories?: { value: number; label: string }[];
  domain?: [number, number];
  /** Lowest value the data can take (for example -100% or zero trades); padding never goes below it. */
  floor?: number;
  /** Highest value the data can take (for example 100% of the time); padding never goes above it. */
  ceil?: number;
  /** A value the axis always includes, such as zero trades or no drop. */
  baseline?: number;
  /** Draw small values at the top, so "better" reads upward (for example a smaller drop). */
  invert?: boolean;
}
