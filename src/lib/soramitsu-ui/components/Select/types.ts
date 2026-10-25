export const SelectSize = {
  Sm: 'sm',
  Md: 'md',
  Lg: 'lg',
  Xl: 'xl',
} as const;

export type SelectSize = (typeof SelectSize)[keyof typeof SelectSize];

export const SelectButtonType = {
  Default: 'default',
  Inline: 'inline',
  // TODO(see docs/backlog.md#select) append icon-only variant once design is ready
  // Icon = 'icon'
} as const;

export type SelectButtonType = (typeof SelectButtonType)[keyof typeof SelectButtonType];

export const SelectOptionType = {
  Radio: 'radio',
  Checkbox: 'checkbox',
  Default: 'default',
} as const;

export type SelectOptionType = (typeof SelectOptionType)[keyof typeof SelectOptionType];

export interface SelectOption<T = any> {
  label: string;
  value: T;
}

export interface SelectOptionGroup<T = any> {
  header?: string;
  selectAllBtn?: boolean;
  items: SelectOption<T>[];
}
