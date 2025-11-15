export const RADIO_SIZE_VALUES = ['md', 'lg', 'xl'] as const

export type RadioSize = typeof RADIO_SIZE_VALUES extends ReadonlyArray<infer T> ? T : never

export const RADIO_TYPE_VALUES = ['default', 'bordered', 'bordered-with-description'] as const

export type RadioType = typeof RADIO_TYPE_VALUES extends ReadonlyArray<infer T> ? T : never
