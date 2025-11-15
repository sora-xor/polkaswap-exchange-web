export const themeTokens = {
  sys: {
    color: {
      primary: null,
      'primary-hover': null,
      'primary-pressed': null,
      'primary-focused': null,
      'primary-background': null,
      'primary-hover-background': null,
      'primary-pressed-background': null,
      'primary-focused-background': null,
      'content-primary': null,
      'content-secondary': null,
      'content-tertiary': null,
      'content-quaternary': null,
      'content-on-background-inverted': null,
      background: null,
      'background-hover': null,
      'background-inverted': null,
      'border-primary': null,
      'border-secondary': null,
      disabled: null,
      'on-disabled': null,
      util: {
        body: null,
        surface: null,
        'surface-overlay': null,
        overlay: null,
      },
      status: {
        success: null,
        'success-background': null,
        'success-background-hover': null,
        warning: null,
        'warning-background': null,
        'warning-background-hover': null,
        error: null,
        'error-background': null,
        'error-background-hover': null,
        info: null,
        'info-background': null,
        'info-background-hover': null,
        debug: null,
        'debug-background': null,
        'debug-background-hover': null,
      },
    },
    shadow: {
      'page-header': null,
      'page-header-light': null,
      'modal-window-header': null,
      'floating-notification': null,
      dropdown: null,
      'active-tab': null,
    },
  },
} as const

function flattenTokens(obj: Record<string, any>, prefix = ''): string[] {
  const entries: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const id = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flattenTokens(value, id))
    } else {
      entries.push(id)
    }
  }
  return entries
}

export const themeTokenIds = flattenTokens(themeTokens) as ThemeTokenId[]

type FlattenTokenIds<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? FlattenTokenIds<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${Extract<K, string>}`>
    : `${Prefix}${Prefix extends '' ? '' : '.'}${Extract<K, string>}`
}[keyof T]

export type ThemeTokens = typeof themeTokens
export type ThemeTokenId = FlattenTokenIds<ThemeTokens>
