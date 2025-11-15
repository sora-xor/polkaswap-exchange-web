import type { Config } from 'windicss/types/interfaces'

const cssVar = (token: string) => `var(--sora_${token.replace(/\./g, '_')})`

const surfaceTokens = {
  primary: cssVar('sys.color.primary'),
  'primary-hover': cssVar('sys.color.primary-hover'),
  'primary-pressed': cssVar('sys.color.primary-pressed'),
  'primary-focused': cssVar('sys.color.primary-focused'),
  'primary-bg': cssVar('sys.color.primary-background'),
  'primary-hover-bg': cssVar('sys.color.primary-hover-background'),
  'primary-pressed-bg': cssVar('sys.color.primary-pressed-background'),
  'primary-focused-bg': cssVar('sys.color.primary-focused-background'),
  'content-primary': cssVar('sys.color.content-primary'),
  'content-secondary': cssVar('sys.color.content-secondary'),
  'content-tertiary': cssVar('sys.color.content-tertiary'),
  'content-quaternary': cssVar('sys.color.content-quaternary'),
  'content-inverted': cssVar('sys.color.content-on-background-inverted'),
  background: cssVar('sys.color.background'),
  'background-hover': cssVar('sys.color.background-hover'),
  'background-inverted': cssVar('sys.color.background-inverted'),
  'border-primary': cssVar('sys.color.border-primary'),
  'border-secondary': cssVar('sys.color.border-secondary'),
  disabled: cssVar('sys.color.disabled'),
  'on-disabled': cssVar('sys.color.on-disabled'),
  util: {
    body: cssVar('sys.color.util.body'),
    surface: cssVar('sys.color.util.surface'),
    'surface-overlay': cssVar('sys.color.util.surface-overlay'),
    overlay: cssVar('sys.color.util.overlay'),
  },
  status: {
    success: cssVar('sys.color.status.success'),
    'success-bg': cssVar('sys.color.status.success-background'),
    'success-bg-hover': cssVar('sys.color.status.success-background-hover'),
    warning: cssVar('sys.color.status.warning'),
    'warning-bg': cssVar('sys.color.status.warning-background'),
    'warning-bg-hover': cssVar('sys.color.status.warning-background-hover'),
    error: cssVar('sys.color.status.error'),
    'error-bg': cssVar('sys.color.status.error-background'),
    'error-bg-hover': cssVar('sys.color.status.error-background-hover'),
    info: cssVar('sys.color.status.info'),
    'info-bg': cssVar('sys.color.status.info-background'),
    'info-bg-hover': cssVar('sys.color.status.info-background-hover'),
    debug: cssVar('sys.color.status.debug'),
    'debug-bg': cssVar('sys.color.status.debug-background'),
    'debug-bg-hover': cssVar('sys.color.status.debug-background-hover'),
  },
} as const

export const windicssPreset: Config = {
  theme: {
    extend: {
      colors: surfaceTokens,
      boxShadow: {
        'page-header': cssVar('sys.shadow.page-header'),
        'page-header-light': cssVar('sys.shadow.page-header-light'),
        'modal-window-header': cssVar('sys.shadow.modal-window-header'),
        'floating-notification': cssVar('sys.shadow.floating-notification'),
        dropdown: cssVar('sys.shadow.dropdown'),
        'active-tab': cssVar('sys.shadow.active-tab'),
      },
    },
  },
}
