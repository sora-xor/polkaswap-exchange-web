import type { InjectionKey } from 'vue'
import type { ToastsApi } from '../Toasts'

export const NOTIFICATIONS_API_KEY: InjectionKey<ToastsApi> = Symbol('NotificationsToastsAPI')
