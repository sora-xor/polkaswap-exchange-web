export type ColorType = 'classic' | 'deficiency' | 'traditional';
export type DirectionType = 'classic' | 'inverse';
export type Hex = `#${string}`;

export interface Side {
  buy: Hex;
  sell: Hex;
}

export interface Color {
  name: string;
  type: ColorType;
  side: Side;
}

export interface ColorDirection {
  name: string;
  type: DirectionType;
}
