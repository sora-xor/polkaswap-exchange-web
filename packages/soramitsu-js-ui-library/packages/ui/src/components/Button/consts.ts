export const BUTTON_TYPE_VALUES = ['primary', 'secondary', 'outline', 'action'] as const
export const BUTTON_SIZE_VALUES = ['xs', 'sm', 'md', 'lg'] as const
export const BUTTON_ICON_POSITION_VALUES = ['left', 'right'] as const

export const SPINNER_SIZE: Record<(typeof BUTTON_SIZE_VALUES)[number], string> = {
  xs: '12',
  sm: '18',
  md: '24',
  lg: '24',
}

export const SPINNER_WIDTH: Record<(typeof BUTTON_SIZE_VALUES)[number], string> = {
  xs: '3',
  sm: '4',
  md: '4',
  lg: '4',
}

export const FONT_SIZE: Record<(typeof BUTTON_SIZE_VALUES)[number], string> = {
  xs: 'sora-tpg-p4',
  sm: 'sora-tpg-h7',
  md: 'sora-tpg-h6',
  lg: 'sora-tpg-h5',
}
