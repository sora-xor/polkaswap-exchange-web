export const CARD_SIZE_VALUES = ['big', 'medium', 'small', 'mini'] as const
export const CARD_BORDER_RADIUS_VALUES = ['big', 'medium', 'small', 'mini'] as const
export const CARD_SHADOW_VALUES = ['always', 'hover', 'never'] as const
export const CARD_STATUS_VALUES = ['default', 'info', 'success', 'warning', 'error'] as const

export type CardSize = (typeof CARD_SIZE_VALUES)[number]
export type CardBorderRadius = (typeof CARD_BORDER_RADIUS_VALUES)[number]
export type CardShadow = (typeof CARD_SHADOW_VALUES)[number]
export type CardStatus = (typeof CARD_STATUS_VALUES)[number]
