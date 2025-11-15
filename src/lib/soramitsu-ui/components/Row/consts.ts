export const ROW_JUSTIFY_VALUES = ['start', 'end', 'center', 'space-around', 'space-between'] as const;
export const ROW_ALIGN_VALUES = ['top', 'middle', 'bottom'] as const;

export type RowJustify = (typeof ROW_JUSTIFY_VALUES)[number];
export type RowAlign = (typeof ROW_ALIGN_VALUES)[number];
