export const BadgeTypes = ['active', 'error', 'warning', 'info', 'debug', 'pending'] as const

export type BadgeType = typeof BadgeTypes extends ReadonlyArray<infer T> ? T : never
