export type ColorType = 'classic' | 'deficiency' | 'traditional';
export type DirectionType = 'classic' | 'inverse';
export type ColorEncoding = `#${string}` | `rgba(${string})`;

export interface Side {
  buy: ColorEncoding;
  sell: ColorEncoding;
}

interface Trend {
  up: ColorEncoding;
  down: ColorEncoding;
}

export interface Color {
  name: string;
  type: ColorType;
  side: Side;
  bookBars?: Side;
  priceChange?: Trend;
}

export interface ColorDirection {
  name: string;
  type: DirectionType;
}
