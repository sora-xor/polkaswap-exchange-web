import type { InjectionKey, DeepReadonly, Slot, FunctionalComponent } from 'vue'
import { reactive, readonly, computed } from 'vue'

export type ToastUnregisterFn = () => void

export interface ToastRegisterParams {
  slot: Slot | FunctionalComponent
}

export type RegisteredToast = ToastRegisterParams

export type ToastRegisterFn = (params: ToastRegisterParams) => ToastUnregisterFn

export interface ToastsApi {
  register: ToastRegisterFn
  toasts: DeepReadonly<Array<[key: number, toast: RegisteredToast]>>
}

export const TOASTS_API_KEY: InjectionKey<ToastsApi> = Symbol('ToastsAPI')

export function defineToastsApi(): ToastsApi {
  const toastsMap = reactive(new Map<number, RegisteredToast>())
  let keysCounter = 0

  const register: ToastRegisterFn = (params) => {
    const key = keysCounter++

    toastsMap.set(key, params)

    return () => {
      toastsMap.delete(key)
    }
  }

  const toasts = computed(() => [...toastsMap])

  return readonly({
    register,
    toasts,
  })
}
